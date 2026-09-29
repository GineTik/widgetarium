import { z } from "zod";
import { propConfig } from "../model.js";
import { stableKey } from "../gateway/cache.js";
import { ENGINE_GATEWAY, gatewayOverImplementation } from "../gateway/adapted.js";
import { ICrudGateway, IValueGateway, declarationIn } from "../gateway/declared.js";
import { defineGatewayMetadata } from "../gateway/implementation-metadata.js";
import { mapCollection } from "../gateway/mapped.js";
import { parseReadsBy } from "../gateway/parsed.js";
import { problemsOf } from "../gateway/problems.js";
import { folderGateway, fileGateway, noteFieldOf } from "../gateway/obsidian.js";
import {
	allowedVerbs,
	bindingOf,
	declaredOf,
	hardcodeCollection,
	hardcodeValue,
	needsOf,
	requestedVerbs,
	typedIn,
	typedKeyOf,
	restrictToAllowed,
} from "../gateway/props.js";
import {
	narrowByRefs,
	createPickedGateway,
	refCollection,
	refOf,
	refValue,
	selectionGateway,
} from "../gateway/refs.js";
import { STAT_ALGORITHMS, statGateway } from "../gateway/stats.js";
import { selectedRowPicking, selectionPicking } from "./row-picking.js";

const ENGINE_VERBS = ["list", "get", "create", "update", "remove", "replace", "repairIds"];

export function hostGatewayFor(spec, config) {
	if (typeof config?.implementation === "string") return BY_ID.get(config.implementation) ?? null;
	if (startsFromSource(spec, config)) return BY_ID.get(spec.source.implementation) ?? null;
	const { kind, binding } = bindingOf(spec, config);
	if (binding === "stat") return BY_ID.get(`@core/stat-${config.algorithm ?? "count"}`) ?? null;
	return BY_ID.get(FROM_OLD_BINDING[kind]?.[binding]) ?? null;
}

export function bindFields(spec, config, tileId) {
	if (!startsFromSource(spec, config)) return fieldsOf(config);
	const fields = spec.source.fields ?? {};
	const named = SIBLING_FIELDS.filter((key) => typeof fields[key] === "string" && !fields[key].includes("/"));
	return { ...fields, ...Object.fromEntries(named.map((key) => [key, refOf(tileId, fields[key])])) };
}

const SIBLING_FIELDS = ["rows", "picked", "fieldFrom"];
const SOURCE_IMPLEMENTATIONS = ["@core/selection", "@core/selected-row"];

const WRITING = ["create", "update", "remove"];

// TODO: offer @core/selection in the source list once its fields have an editor
const NOT_OFFERED_YET = ["@core/selection"];

export function sourcesFor(spec) {
	const kind = spec?.kind === "value" ? "value" : "collection";
	const writes = (spec?.writes ?? []).filter((verb) => WRITING.includes(verb));
	return HOST_GATEWAYS.filter((entry) => {
		if (entry.kind !== kind || NOT_OFFERED_YET.includes(entry.id)) return false;
		if (entry.id.startsWith("@core/stat-")) return spec?.type === "number";
		if (kind === "collection" && writes.length > 0) return entry.implementation.prototype instanceof ICrudGateway;
		return true;
	});
}

export function fieldsOf(config) {
	return config?.fields ?? config ?? {};
}

export function refsOfFields(spec, config, tileId) {
	const fields = bindFields(spec, config, tileId);
	return [fields.ref, fields.rows, fields.picked, fields.fieldFrom].filter((held) => typeof held === "string");
}

export function resolveHostGateway(context) {
	const { name, spec, tile } = context;
	const config = propConfig(tile, name, spec);
	const chosen = hostGatewayFor(spec, config);
	if (!chosen) throw new Error(NO_SUCH_GATEWAY.replace("{name}", name).replace("{id}", String(config.implementation)));
	const fields = bindFields(spec, config, tile.id);
	const problems = problemsOf(context.refs).contextFor(
		refOf(tile.id, name),
		context.schema ?? z.unknown(),
		`${chosen.id}?${stableKey(fields)}`,
	);
	const tileConfig = startsFromSource(spec, config) ? { tileConfig: config } : {};
	const made = new chosen.implementation(fields, { ...context, ...tileConfig, ...problems });
	const engine = made[ENGINE_GATEWAY] ?? gatewayOverImplementation(name, declarationIn(chosen.implementation), made);
	const allow = ALLOW_OF[chosen.id];
	if (!allow) return engine;
	return restrictToAllowed(engine, allowedVerbs(spec, config, allow === "vault" ? "vault" : "hardcode"));
}

export function whereOf(spec, config) {
	return [...(spec?.where ?? []), ...(config?.where ?? [])];
}

export function createTypedGateway({ name, spec, tile, config, refs, propsRef, patchProp }) {
	const declared = declaredOf(spec);
	const asRendered = typedIn(spec, config) ?? declared;
	const held = {
		id: `${tile.id}/${name}?${stableKey(asRendered)}`,
		readValue: () => typedIn(spec, fieldsOf(propConfig({ ...tile, props: propsRef.current }, name, spec))) ?? declared,
		mutateValue: (step) =>
			patchProp(name, (inFlight) => {
				const fields = fieldsOf(inFlight);
				const next = { [typedKeyOf(spec)]: step(typedIn(spec, fields) ?? asRendered) };
				return typeof inFlight?.implementation === "string" ? { fields: { ...fields, ...next } } : next;
			}),
		requested: requestedVerbs(spec),
		spec,
	};
	if (spec.kind === "value") return hardcodeValue(held);
	return narrowByRefs(hardcodeCollection(held), whereOf(spec, config), refs);
}

export class TypedValueGateway extends createEngineBacked(IValueGateway) {
	static build(fields, context) {
		return createTypedGateway({ ...context, config: fields });
	}
}

export class TypedRowsGateway extends createEngineBacked(ICrudGateway) {
	static build(fields, context) {
		return createTypedGateway({ ...context, config: fields });
	}
}

export class ScreenStateGateway extends createEngineBacked(IValueGateway) {
	static build(fields, context) {
		return context.cellFor(refOf(context.tile.id, context.name));
	}
}

export class FileGateway extends createEngineBacked(IValueGateway) {
	static build(fields, context) {
		const { spec, host } = context;
		const path = fields.path || "";
		const part = { field: noteFieldOf(spec, fields), type: spec.type };
		return fileGateway({ host, path, part, requested: requestedVerbs(spec) });
	}
}

export class FolderGateway extends createEngineBacked(ICrudGateway) {
	static build(fields, context) {
		const { spec, host, refs } = context;
		const path = fields.path || "";
		return folderRows({ spec, host, config: fields, refs, path, requested: requestedVerbs(spec) });
	}
}

export class FromTileValueGateway extends createEngineBacked(IValueGateway) {
	static build(fields, context) {
		return refValue(context.refs, fields.ref);
	}
}

export class FromTileRowsGateway extends createEngineBacked(ICrudGateway) {
	static build(fields, context) {
		return refCollection(context.refs, fields.ref);
	}
}

export class StatisticsGateway extends createEngineBacked(IValueGateway) {
	static algorithm = "count";

	static build(fields, context) {
		const { host, refs } = context;
		const rows = folderRows({ spec: {}, host, config: fields, refs, path: fields.path ?? "", requested: ["list"] });
		return statGateway(rows, { ...fields, algorithm: this.algorithm });
	}
}

export const STAT_TITLES = {
	count: "How many",
	sum: "Sum of a property",
	average: "Average of a property",
	min: "Smallest value",
	max: "Largest value",
	percent: "Share that counts",
	"active-days": "Share of days with a note",
	streak: "Days in a row",
	"best-streak": "Most days in a row",
	"record-streak": "Notes in a row",
	"best-record-streak": "Most notes in a row",
};

export class SelectedRowGateway extends createEngineBacked(IValueGateway) {
	static build(fields, context) {
		const { refs, tile, name, cellFor } = context;
		const own = refOf(tile.id, name);
		const picked = fields.picked ?? "";
		const inTile = context.tileConfig ? createTypedGateway({ ...context, config: context.tileConfig }) : null;
		return createPickedGateway({
			id: `${own}?selected-from=${fields.rows}&by=${picked || "screen"}${inTile ? `&kept=${inTile.id}` : ""}`,
			chosen: picked ? refValue(refs, picked) : cellFor(`${own}#picked`),
			collection: refCollection(refs, fields.rows),
			...selectedRowPicking(fields, (ref) => refs.read(ref)),
			...(inTile ? { inTile } : {}),
			watches: (listener) => refs.watch([fields.rows, ...(picked ? [picked] : [])], listener),
		});
	}
}

// TRADE-OFF: the list is read back through the registry rather than closed over, because a stable id keeps the cache attached across a write and only a live read then sees the row that write just made
export class SelectionGateway extends createEngineBacked(IValueGateway) {
	static build(fields, context) {
		const { refs, tile, name, cellFor } = context;
		const own = refOf(tile.id, name);
		return selectionGateway({
			id: own,
			memory: cellFor(own),
			collection: refCollection(refs, fields.rows),
			...selectionPicking(fields, (ref) => refs.read(ref)),
			watches: (listener) => refs.watch([fields.rows], listener),
		});
	}
}

const PropRefSchema = z.string().regex(/^[^/]+\/.+$/, "a prop of another tile, written tile/prop");
const RowsQuerySchema = {
	where: z.array(z.looseObject({})).optional(),
	sort: z.array(z.looseObject({})).optional(),
};

export const HOST_GATEWAYS = [
	defineGatewayMetadata(TypedValueGateway, {
		id: "@core/typed-value",
		title: "Typed here",
		description: "A value typed into the tile and kept in the note.",
		fields: z.looseObject({ value: z.unknown().optional() }),
	}),
	defineGatewayMetadata(TypedRowsGateway, {
		id: "@core/typed-rows",
		title: "Typed here",
		description: "Rows typed into the tile and kept in the note.",
		fields: z.looseObject({ rows: z.array(z.unknown()).optional(), ...RowsQuerySchema }),
	}),
	defineGatewayMetadata(ScreenStateGateway, {
		id: "@core/screen-state",
		title: "This screen",
		description: "A value that lives while the screen is open and never reaches the note.",
		fields: z.looseObject({}),
	}),
	defineGatewayMetadata(FileGateway, {
		id: "@core/file",
		title: "File",
		description: "One note, or one property of it.",
		fields: z.looseObject({ path: z.string().optional(), field: z.string().optional() }),
	}),
	defineGatewayMetadata(FolderGateway, {
		id: "@core/folder",
		title: "Folder",
		description: "Every note in a folder, one row per note.",
		fields: z.looseObject({
			path: z.string().optional(),
			map: z.record(z.string(), z.string()).optional(),
			...RowsQuerySchema,
		}),
	}),
	defineGatewayMetadata(FromTileValueGateway, {
		id: "@core/from-tile-value",
		title: "From a widget",
		description: "The value another tile on this board holds.",
		fields: z.looseObject({ ref: PropRefSchema }),
	}),
	defineGatewayMetadata(FromTileRowsGateway, {
		id: "@core/from-tile-rows",
		title: "From a widget",
		description: "The rows another tile on this board holds.",
		fields: z.looseObject({ ref: PropRefSchema }),
	}),
	...STAT_ALGORITHMS.map((algorithm) =>
		defineGatewayMetadata(statisticsGatewayFor(algorithm), {
			id: `@core/stat-${algorithm}`,
			title: STAT_TITLES[algorithm] ?? algorithm,
			description: "One number counted over the notes of a folder.",
			fields: z.looseObject({ path: z.string().optional() }),
		}),
	),
	defineGatewayMetadata(SelectedRowGateway, {
		id: "@core/selected-row",
		title: "Picked in a widget",
		description: "The row of a list that another widget, or this screen, has picked.",
		fields: z.looseObject({
			rows: PropRefSchema,
			picked: PropRefSchema.optional(),
			field: z.string().optional(),
			fieldFrom: PropRefSchema.optional(),
			whenNothingPicked: z.enum(["none", "first"]).default("first"),
		}),
	}),
	defineGatewayMetadata(SelectionGateway, {
		id: "@core/selection",
		title: "Chosen from a list",
		description: "Which row of a list is chosen, kept while the screen is open.",
		fields: z.looseObject({
			rows: PropRefSchema,
			field: z.string().optional(),
			fieldFrom: PropRefSchema.optional(),
			whenNothingPicked: z.enum(["none", "first"]).default("none"),
		}),
	}),
];

const BY_ID = new Map(HOST_GATEWAYS.map((entry) => [entry.id, entry]));

const FROM_OLD_BINDING = {
	value: {
		hardcode: "@core/typed-value",
		memory: "@core/screen-state",
		vault: "@core/file",
		ref: "@core/from-tile-value",
	},
	collection: {
		hardcode: "@core/typed-rows",
		vault: "@core/folder",
		ref: "@core/from-tile-rows",
	},
};

const ALLOW_OF = {
	"@core/typed-value": "declared",
	"@core/typed-rows": "declared",
	"@core/file": "vault",
	"@core/folder": "vault",
};

const NO_SUCH_GATEWAY = 'prop "{name}" names the gateway "{id}", which this host does not offer';

function startsFromSource(spec, config) {
	return (
		SOURCE_IMPLEMENTATIONS.includes(spec?.source?.implementation) &&
		typeof config?.implementation !== "string" &&
		!config?.ref
	);
}

function pascalOf(word) {
	return word.replace(/(^|-)(\w)/g, (_, dash, letter) => letter.toUpperCase());
}

function statisticsGatewayFor(algorithm) {
	const Counted = class extends StatisticsGateway {
		static algorithm = algorithm;
	};
	Object.defineProperty(Counted, "name", { value: `${pascalOf(algorithm)}Gateway` });
	return Counted;
}

function createEngineBacked(Interface) {
	class EngineBacked extends Interface {
		constructor(fields, context) {
			super();
			const built = this.constructor.build(fields ?? {}, context);
			const kind = declarationIn(this.constructor).kind;
			this[ENGINE_GATEWAY] = context?.parse ? parseReadsBy(built, context, kind) : built;
		}

		subscribe(changed) {
			return this[ENGINE_GATEWAY].subscribe(() => changed());
		}
	}
	for (const verb of ENGINE_VERBS)
		Object.defineProperty(EngineBacked.prototype, verb, {
			value(input) {
				return this[ENGINE_GATEWAY][verb](input);
			},
		});
	return EngineBacked;
}

function mappingFor(spec, config, shapes, path) {
	const needs = needsOf(spec);
	if (Object.keys(needs).length === 0) return null;
	return { needs, chosen: { ...shapes?.readShape(path), ...(config.map ?? {}) } };
}

function folderRows({ spec, host, config, refs, path, requested }) {
	const baked = { sort: [...(spec.sort ?? []), ...(config.sort ?? [])] };
	const base = folderGateway({ host, path, baked, requested });
	const mapping = mappingFor(spec, config, host?.shapes, path);
	return narrowByRefs(mapping ? mapCollection(base, mapping) : base, whereOf(spec, config), refs);
}
