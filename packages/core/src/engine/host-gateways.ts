import { z } from "zod";
import { propConfig } from "../model.js";
import type { TileProp } from "../model.js";
import { stableKey } from "../gateway/cache.js";
import { ENGINE_GATEWAY } from "../gateway/adapted.js";
import { ICrudGateway } from "../gateway/declared.js";
import { defineGatewayMetadata } from "../gateway/implementation-metadata.js";
import type { GatewayMetadata } from "../gateway/implementation-metadata.js";
import { problemsOf } from "../gateway/problems.js";
import { allowedVerbs, bindingOf, restrictToAllowed } from "../gateway/props.js";
import { refOf } from "../gateway/refs.js";
import { STAT_ALGORITHMS } from "../gateway/stats.js";
import { isObject } from "./is-object.js";
import type {
	EngineBackedRows,
	EngineBackedValue,
	HostFields,
	HostGateway,
	HostGatewayContext,
	HostSpec,
} from "./engine-backed.js";
import {
	FileGateway,
	FolderGateway,
	FromTileRowsGateway,
	FromTileValueGateway,
	STAT_TITLES,
	ScreenStateGateway,
	SelectedRowGateway,
	SelectionGateway,
	TypedRowsGateway,
	TypedValueGateway,
	fieldsOf,
	statisticsGatewayFor,
} from "./host-gateway-classes.js";

export {
	FileGateway,
	FolderGateway,
	FromTileRowsGateway,
	FromTileValueGateway,
	STAT_TITLES,
	ScreenStateGateway,
	SelectedRowGateway,
	SelectionGateway,
	StatisticsGateway,
	TypedRowsGateway,
	TypedValueGateway,
	createTypedGateway,
	fieldsOf,
	whereOf,
	filterRowsIn,
	sortRowsIn,
} from "./host-gateway-classes.js";
export type { TypedGatewayAsk } from "./host-gateway-classes.js";
export type {
	HostFields,
	HostGateway,
	HostGatewayContext,
	HostGatewayHost,
	HostSource,
	HostSpec,
	HostTile,
	ImplementationContext,
	PatchStep,
	ShapeReader,
} from "./engine-backed.js";

export type HostGatewayEntry = GatewayMetadata<typeof EngineBackedValue | typeof EngineBackedRows>;

type AllowedBy = "declared" | "vault";

type BoundKind = "value" | "collection";

const SIBLING_FIELDS = ["rows", "picked", "fieldFrom"] as const;

const SOURCE_IMPLEMENTATIONS: readonly unknown[] = ["@core/selection", "@core/selected-row"];

const WRITING: readonly string[] = ["create", "update", "remove"];

// TODO: offer @core/selection in the source list once its fields have an editor
const NOT_OFFERED_YET = ["@core/selection"];

const NO_SUCH_GATEWAY = 'prop "{name}" names the gateway "{id}", which this host does not offer';

const PropRefSchema = z.string().regex(/^[^/]+\/.+$/, "a prop of another tile, written tile/prop");

const RowsQuerySchema = {
	where: z.array(z.looseObject({})).optional(),
	sort: z.array(z.looseObject({})).optional(),
};

export const HOST_GATEWAYS: readonly HostGatewayEntry[] = [
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

const BY_ID = new Map(HOST_GATEWAYS.map((entry) => [entry.id, entry] as const));

const FROM_OLD_BINDING: Readonly<Record<BoundKind, Readonly<Partial<Record<string, string>>>>> = {
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

const ALLOW_OF: ReadonlyMap<string, AllowedBy> = new Map<string, AllowedBy>([
	["@core/typed-value", "declared"],
	["@core/typed-rows", "declared"],
	["@core/file", "vault"],
	["@core/folder", "vault"],
]);

export function hostGatewayFor(
	spec: HostSpec | null | undefined,
	config: TileProp | null | undefined,
): HostGatewayEntry | null {
	if (typeof config?.implementation === "string") return BY_ID.get(config.implementation) ?? null;
	const sourced = sourceOf(spec, config);
	if (sourced) return BY_ID.get(sourced) ?? null;
	const { kind, binding } = bindingOf(spec, config);
	if (binding === "stat") return BY_ID.get(`@core/stat-${config?.algorithm ?? "count"}`) ?? null;
	return BY_ID.get(FROM_OLD_BINDING[kind][binding] ?? "") ?? null;
}

export function bindFields(
	spec: HostSpec | null | undefined,
	config: TileProp | null | undefined,
	tileId: string,
): HostFields {
	if (!sourceOf(spec, config)) return fieldsOf(config);
	const fields = fieldsIn(spec?.source?.fields);
	const named = SIBLING_FIELDS.flatMap((key) => {
		const sibling = fields[key];
		return typeof sibling === "string" && !sibling.includes("/") ? [[key, refOf(tileId, sibling)] as const] : [];
	});
	return { ...fields, ...Object.fromEntries(named) };
}

export function sourcesFor(spec: HostSpec | null | undefined): HostGatewayEntry[] {
	const kind = spec?.kind === "value" ? "value" : "collection";
	const writes = (spec?.writes ?? []).filter((verb) => WRITING.includes(verb));
	return HOST_GATEWAYS.filter((entry) => {
		if (entry.kind !== kind || NOT_OFFERED_YET.includes(entry.id)) return false;
		if (entry.id.startsWith("@core/stat-")) return spec?.type === "number";
		if (kind === "collection" && writes.length > 0) return entry.implementation.prototype instanceof ICrudGateway;
		return true;
	});
}

export function refsOfFields(
	spec: HostSpec | null | undefined,
	config: TileProp | null | undefined,
	tileId: string,
): string[] {
	const fields = bindFields(spec, config, tileId);
	return [fields.ref, fields.rows, fields.picked, fields.fieldFrom].filter(
		(held): held is string => typeof held === "string",
	);
}

export function resolveHostGateway(context: HostGatewayContext): HostGateway {
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
	const tileConfig = sourceOf(spec, config) ? { tileConfig: config } : {};
	const engine = new chosen.implementation(fields, { ...context, ...tileConfig, ...problems })[ENGINE_GATEWAY];
	const allow = ALLOW_OF.get(chosen.id);
	if (!allow) return engine;
	return restrictToAllowed(engine, allowedVerbs(spec, config, allow === "vault" ? "vault" : "hardcode")) ?? engine;
}

function sourceOf(spec: HostSpec | null | undefined, config: TileProp | null | undefined): string | null {
	const implementation = spec?.source?.implementation;
	if (!SOURCE_IMPLEMENTATIONS.includes(implementation) || typeof implementation !== "string") return null;
	if (typeof config?.implementation === "string" || config?.ref) return null;
	return implementation;
}

function fieldsIn(held: unknown): HostFields {
	return isObject(held) ? held : {};
}
