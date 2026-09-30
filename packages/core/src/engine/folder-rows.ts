import { mapCollection } from "../gateway/mapped.js";
import type { MappingSpec } from "../gateway/mapped.js";
import { folderGateway } from "../gateway/obsidian.js";
import { needsOf } from "../gateway/props.js";
import type { CollectionGateway, FilterRow, SortRow } from "../gateway/contract.js";
import type { ChosenProps } from "../gateway/resolve-needs.js";
import { narrowByRefs } from "../gateway/refs.js";
import type { GatewayRefs } from "../gateway/refs.js";
import { isObject } from "./is-object.js";
import type { HostFields, HostGatewayHost, HostSpec, ShapeReader } from "./engine-backed.js";

interface FolderRowsAsk {
	readonly spec: HostSpec;
	readonly host: HostGatewayHost;
	readonly config: HostFields;
	readonly refs: GatewayRefs;
	readonly path: string;
	readonly requested: readonly string[];
}

export function whereOf(spec: HostSpec | null | undefined, config: HostFields | null | undefined): FilterRow[] {
	return [...(spec?.where ?? []), ...filterRowsIn(config?.where)];
}

export function filterRowsIn(held: unknown): FilterRow[] {
	return Array.isArray(held) ? held.filter(isFilterRow) : [];
}

export function sortRowsIn(held: unknown): SortRow[] {
	return Array.isArray(held) ? held.filter(isSortRow) : [];
}

export function folderRows({ spec, host, config, refs, path, requested }: FolderRowsAsk): CollectionGateway<unknown> {
	const baked = { sort: [...(spec.sort ?? []), ...sortRowsIn(config.sort)] };
	const base = folderGateway({ host, path, baked, requested });
	const mapping = mappingFor(spec, config, host?.shapes, path);
	return narrowByRefs(mapping ? mapCollection(base, mapping) : base, whereOf(spec, config), refs);
}

function isFilterRow(held: unknown): held is FilterRow {
	return isObject(held);
}

function isSortRow(held: unknown): held is SortRow {
	return isObject(held) && typeof held["prop"] === "string";
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
