import { propConfig } from "../model.js";
import type { TileProp } from "../model.js";
import { stableKey } from "../gateway/cache.js";
import type { AdaptedGateway } from "../gateway/adapted.js";
import { mapCollection } from "../gateway/mapped.js";
import type { MappingSpec } from "../gateway/mapped.js";
import { folderGateway, fileGateway, noteFieldOf } from "../gateway/obsidian.js";
import {
	declaredOf,
	hardcodeCollection,
	hardcodeValue,
	needsOf,
	requestedVerbs,
	typedIn,
	typedKeyOf,
} from "../gateway/props.js";
import type { CollectionGateway, FilterRow, SortRow } from "../gateway/contract.js";
import type { ChosenProps } from "../gateway/resolve-needs.js";
import {
	narrowByRefs,
	createPickedGateway,
	refCollection,
	refOf,
	refValue,
	selectionGateway,
} from "../gateway/refs.js";
import type { GatewayRefs } from "../gateway/refs.js";
import { statGateway } from "../gateway/stats.js";
import type { StatAlgorithm, StatQuery } from "../gateway/stats.js";
import { isObject } from "./is-object.js";
import { selectedRowPicking, selectionPicking } from "./row-picking.js";
import type { PickingFields } from "./row-picking.js";
import { EngineBackedRows, EngineBackedValue } from "./engine-backed.js";
import type {
	HostFields,
	HostGateway,
	HostGatewayContext,
	HostGatewayHost,
	HostSpec,
	ImplementationContext,
	ShapeReader,
} from "./engine-backed.js";

export interface TypedGatewayAsk extends HostGatewayContext {
	readonly config: HostFields | null | undefined;
}

interface FolderRowsAsk {
	readonly spec: HostSpec;
	readonly host: HostGatewayHost;
	readonly config: HostFields;
	readonly refs: GatewayRefs;
	readonly path: string;
	readonly requested: readonly string[];
}

export const STAT_TITLES: Readonly<Record<string, string>> = {
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

export function fieldsOf(config: HostFields | null | undefined): HostFields {
	if (isObject(config?.fields)) return config.fields;
	return config ?? {};
}

export function whereOf(spec: HostSpec | null | undefined, config: HostFields | null | undefined): FilterRow[] {
	return [...(spec?.where ?? []), ...filterRowsIn(config?.where)];
}

export function createTypedGateway({
	name,
	spec,
	tile,
	config,
	refs,
	propsRef,
	patchProp,
}: TypedGatewayAsk): AdaptedGateway {
	const declared = declaredOf(spec);
	const asRendered = typedIn(spec, config) ?? declared;
	const held = {
		id: `${tile.id}/${name}?${stableKey(asRendered)}`,
		readValue: () => typedIn(spec, fieldsOf(propConfig({ ...tile, props: propsRef.current }, name, spec))) ?? declared,
		mutateValue: (step: (stored: unknown) => unknown) =>
			patchProp(name, (inFlight) => {
				const fields = fieldsOf(inFlight);
				const next = { [typedKeyOf(spec)]: step(typedIn(spec, fields) ?? asRendered) };
				return typeof inFlight?.implementation === "string" ? { fields: { ...fields, ...next } } : next;
			}),
		requested: requestedVerbs(spec),
	};
	if (spec.kind === "value") return hardcodeValue(held);
	return narrowByRefs(hardcodeCollection(held), whereOf(spec, config), refs);
}

export class TypedValueGateway extends EngineBackedValue {
	static override build(fields: HostFields, context: ImplementationContext): HostGateway {
		return createTypedGateway({ ...context, config: fields });
	}
}

export class TypedRowsGateway extends EngineBackedRows {
	static override build(fields: HostFields, context: ImplementationContext): HostGateway {
		return createTypedGateway({ ...context, config: fields });
	}
}

export class ScreenStateGateway extends EngineBackedValue {
	static override build(_fields: HostFields, context: ImplementationContext): HostGateway {
		return context.cellFor(refOf(context.tile.id, context.name));
	}
}

export class FileGateway extends EngineBackedValue {
	static override build(fields: HostFields, context: ImplementationContext): HostGateway {
		const { spec, host } = context;
		const path = textIn(fields.path);
		const part = { field: noteFieldOf(spec, { field: textOrUndefined(fields.field) }), type: spec.type };
		return fileGateway({ host, path, part, requested: requestedVerbs(spec) });
	}
}

export class FolderGateway extends EngineBackedRows {
	static override build(fields: HostFields, context: ImplementationContext): HostGateway {
		const { spec, host, refs } = context;
		const path = textIn(fields.path);
		return folderRows({ spec, host, config: fields, refs, path, requested: requestedVerbs(spec) });
	}
}

export class FromTileValueGateway extends EngineBackedValue {
	static override build(fields: HostFields, context: ImplementationContext): HostGateway {
		return refValue(context.refs, String(fields.ref));
	}
}

export class FromTileRowsGateway extends EngineBackedRows {
	static override build(fields: HostFields, context: ImplementationContext): HostGateway {
		return refCollection(context.refs, String(fields.ref));
	}
}

export class StatisticsGateway extends EngineBackedValue {
	static algorithm: string = "count";

	static override build(fields: HostFields, context: ImplementationContext): HostGateway {
		const { host, refs } = context;
		const path = fields.path === undefined || fields.path === null ? "" : String(fields.path);
		const rows = folderRows({ spec: {}, host, config: fields, refs, path, requested: ["list"] });
		return statGateway(rows, statQueryOf(fields, this.algorithm));
	}
}

export class SelectedRowGateway extends EngineBackedValue {
	static override build(fields: HostFields, context: ImplementationContext): HostGateway {
		const { refs, tile, name, cellFor } = context;
		const own = refOf(tile.id, name);
		const rows = String(fields.rows);
		const picked = fields.picked ? String(fields.picked) : "";
		const inTile = context.tileConfig ? createTypedGateway({ ...context, config: context.tileConfig }) : null;
		return createPickedGateway({
			id: `${own}?selected-from=${rows}&by=${picked || "screen"}${inTile ? `&kept=${inTile.id}` : ""}`,
			chosen: picked ? refValue(refs, picked) : cellFor(`${own}#picked`),
			collection: refCollection(refs, rows),
			...selectedRowPicking(pickingFieldsOf(fields), (ref) => refs.read(ref)),
			...(inTile?.kind === "value" ? { inTile } : {}),
			watches: (listener) => refs.watch([rows, ...(picked ? [picked] : [])], () => listener({})),
		});
	}
}

// TRADE-OFF: the list is read back through the registry rather than closed over, because a stable id keeps the cache attached across a write and only a live read then sees the row that write just made
export class SelectionGateway extends EngineBackedValue {
	static override build(fields: HostFields, context: ImplementationContext): HostGateway {
		const { refs, tile, name, cellFor } = context;
		const own = refOf(tile.id, name);
		const rows = String(fields.rows);
		return selectionGateway({
			id: own,
			memory: cellFor(own),
			collection: refCollection(refs, rows),
			...selectionPicking(pickingFieldsOf(fields), (ref) => refs.read(ref)),
			watches: (listener) => refs.watch([rows], () => listener({})),
		});
	}
}

export function statisticsGatewayFor(algorithm: StatAlgorithm): typeof StatisticsGateway {
	const Counted = class extends StatisticsGateway {
		static override algorithm = algorithm;
	};
	Object.defineProperty(Counted, "name", { value: `${pascalOf(algorithm)}Gateway` });
	return Counted;
}

export function filterRowsIn(held: unknown): FilterRow[] {
	return Array.isArray(held) ? held.filter(isFilterRow) : [];
}

export function sortRowsIn(held: unknown): SortRow[] {
	return Array.isArray(held) ? held.filter(isSortRow) : [];
}

function isFilterRow(held: unknown): held is FilterRow {
	return isObject(held);
}

function isSortRow(held: unknown): held is SortRow {
	return isObject(held) && typeof held["prop"] === "string";
}

function textIn(held: unknown): string {
	return held ? String(held) : "";
}

function textOrUndefined(held: unknown): string | undefined {
	return typeof held === "string" ? held : undefined;
}

function textOrNull(held: unknown): string | null {
	return typeof held === "string" ? held : null;
}

function pickingFieldsOf(fields: HostFields): PickingFields {
	return {
		whenNothingPicked: fields.whenNothingPicked,
		fieldFrom: textOrNull(fields.fieldFrom),
		field: textOrNull(fields.field),
	};
}

function statQueryOf(fields: HostFields, algorithm: string): StatQuery {
	const query = { ...fields, algorithm };
	return isStatQuery(query) ? query : { algorithm };
}

function isStatQuery(
	held: TileProp & { readonly algorithm: string },
): held is TileProp & { readonly algorithm: string } & StatQuery {
	const texts = [held.field, held.date, held.window, held.compare];
	const isText = (text: unknown): boolean => text === undefined || typeof text === "string";
	return texts.every(isText) && (held.counts === undefined || Array.isArray(held.counts));
}

function pascalOf(word: string): string {
	return word.replace(/(^|-)(\w)/g, (_whole, _dash, letter: string) => letter.toUpperCase());
}

function mappingFor(
	spec: HostSpec,
	config: HostFields,
	shapes: ShapeReader | null | undefined,
	path: string,
): MappingSpec | null {
	const needs = needsOf(spec);
	if (Object.keys(needs).length === 0) return null;
	return { needs, chosen: { ...chosenIn(shapes?.readShape?.(path)), ...chosenIn(config.map) } };
}

function chosenIn(held: unknown): ChosenProps {
	if (!isObject(held)) return {};
	return Object.fromEntries(
		Object.entries(held).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
	);
}

function folderRows({ spec, host, config, refs, path, requested }: FolderRowsAsk): CollectionGateway<unknown> {
	const baked = { sort: [...(spec.sort ?? []), ...sortRowsIn(config.sort)] };
	const base = folderGateway({ host, path, baked, requested });
	const mapping = mappingFor(spec, config, host?.shapes, path);
	return narrowByRefs(mapping ? mapCollection(base, mapping) : base, whereOf(spec, config), refs);
}
