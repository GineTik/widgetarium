import type { CollectionGateway, FilterRow, Query, Row, RowsResult, SortRow } from "./contract";
import { collectionGateway } from "./create";
import { fieldsOf, isBoolean, isDay, isNumber } from "./fields";
import type { FieldReport } from "./fields";
import { fieldOf } from "./match";
import { delegatedVerbs } from "./narrow";
import type { ChosenProps, DeclaredNeeds, Resolution } from "./resolve-needs";
import { resolveNeeds } from "./resolve-needs";
import { stableKey } from "./cache";

type Held = Record<string, unknown>;

const isHeld = (value: unknown): value is Held => typeof value === "object" && value !== null;

function asDay(value: unknown): string | null {
	if (value instanceof Date) return value.toISOString().slice(0, 10);
	return isDay(value) ? String(value) : null;
}

function asNumber(value: unknown): number | null {
	return isNumber(value) ? Number(value) : null;
}

function asBoolean(value: unknown): boolean | null {
	if (!isBoolean(value)) return null;
	return value === true || value === "true";
}

function coercedOne(value: unknown, type: string): unknown {
	if (value === undefined || value === null || value === "") return null;
	if (type === "date") return asDay(value);
	if (type === "number") return asNumber(value);
	if (type === "boolean") return asBoolean(value);
	return String(value);
}

function coerced(value: unknown, type: string, many: boolean): unknown {
	if (!many) return coercedOne(value, type);
	const held = Array.isArray(value) ? value : [value];
	return held.map((one) => coercedOne(one, type)).filter((one) => one !== null);
}

function renamedValue(value: unknown, needs: DeclaredNeeds, map: Record<string, string>): unknown {
	if (!isHeld(value)) return value;
	const read: Held = { ...value };
	for (const [need, declared] of Object.entries(needs)) {
		const prop = map[need];
		if (!prop) continue;
		read[need] = coerced(fieldOf(value, prop), declared.type, Boolean(declared.many));
	}
	return read;
}

// TRADE-OFF: a clause naming a need nothing answers is dropped, so the list is not narrowed to nothing by a question still unanswered
function renamedClauses<T extends FilterRow | SortRow>(
	rows: T[] | undefined,
	needs: DeclaredNeeds,
	map: Record<string, string>,
): T[] | undefined {
	if (!rows) return rows;
	return rows
		.filter((row) => !row.prop || map[row.prop] || !needs[row.prop])
		.map((row) => (row.prop && map[row.prop] ? { ...row, prop: map[row.prop] } : row));
}

function renamedQuery(query: Query | void, needs: DeclaredNeeds, map: Record<string, string>): Query {
	const asked = query ?? {};
	return { ...asked, where: renamedClauses(asked.where, needs, map), sort: renamedClauses(asked.sort, needs, map) };
}

function renamedPatch(data: unknown, needs: DeclaredNeeds, map: Record<string, string>): unknown {
	if (!isHeld(data)) return data;
	const { props, ...rest } = data as { props?: unknown } & Held;
	const written: Held = isHeld(props) ? { ...props } : {};
	const kept: Held = {};
	for (const [key, value] of Object.entries(rest)) {
		if (needs[key] && !map[key]) {
			throw new Error(`"${key}" is not read from any property of this folder yet, so it cannot be written`);
		}
		if (map[key] && needs[key]) written[map[key]] = value;
		else kept[key] = value;
	}
	return Object.keys(written).length ? { ...kept, props: written } : kept;
}

export interface MappingSpec {
	needs: DeclaredNeeds;
	chosen?: ChosenProps;
}

async function fieldsBehind(base: CollectionGateway<unknown>): Promise<FieldReport[]> {
	const describe = (base as unknown as Held).describe as (() => Promise<FieldReport[]>) & { can(): { can: boolean } };
	if (typeof describe === "function" && describe.can().can) return describe();
	const listed = await base.list();
	return fieldsOf(listed.rows.map((row) => row.value));
}

// TRADE-OFF: the resolution is remembered for the life of the gateway, so a property added after the first read is seen on the next mount rather than at once
function rememberedResolution(base: CollectionGateway<unknown>, spec: MappingSpec) {
	let held: Promise<Resolution> | null = null;
	return () => {
		if (held) return held;
		held = fieldsBehind(base).then((fields) => resolveNeeds(spec.needs, fields, spec.chosen));
		return held;
	};
}

type Handler = (input: never) => unknown;

type Reading = () => Promise<Resolution>;

function readsRows<T>(base: CollectionGateway<T>, spec: MappingSpec, resolutionOf: Reading) {
	return async (query: Query | void): Promise<RowsResult<T>> => {
		const { map } = await resolutionOf();
		const listed = await base.list(renamedQuery(query, spec.needs, map) as Query);
		return { ...listed, rows: listed.rows.map((row) => ({ ...row, value: renamedValue(row.value, spec.needs, map) as T })) };
	};
}

function readsOne<T>(base: CollectionGateway<T>, spec: MappingSpec, resolutionOf: Reading) {
	return async (ref: string): Promise<Row<T> | null> => {
		const { map } = await resolutionOf();
		const found = await base.get(ref);
		return found ? { ...found, value: renamedValue(found.value, spec.needs, map) as T } : null;
	};
}

function writesOne<T>(base: CollectionGateway<T>, spec: MappingSpec, resolutionOf: Reading) {
	return async (input: { ref: string; data: Partial<T> }): Promise<Row<T> | null> => {
		const { map } = await resolutionOf();
		return base.update({ ref: input.ref, data: renamedPatch(input.data, spec.needs, map) as Partial<T> });
	};
}

function createsOne<T>(base: CollectionGateway<T>, spec: MappingSpec, resolutionOf: Reading) {
	return async (draft: Partial<T>): Promise<Row<T> | null> => {
		const { map } = await resolutionOf();
		return base.create(renamedPatch(draft, spec.needs, map) as Partial<T>);
	};
}

function mappedHandlers<T>(base: CollectionGateway<T>, spec: MappingSpec, resolutionOf: Reading): Record<string, Handler> {
	const mapped: Record<string, unknown> = {
		get: readsOne(base, spec, resolutionOf),
		update: writesOne(base, spec, resolutionOf),
		create: createsOne(base, spec, resolutionOf),
	};
	const delegated = delegatedVerbs(base as unknown as Record<string, unknown>);
	const handlers: Record<string, Handler> = { ...delegated, list: readsRows(base, spec, resolutionOf) as Handler };
	for (const verb of Object.keys(mapped)) {
		if (delegated[verb]) handlers[verb] = mapped[verb] as Handler;
	}
	return handlers;
}

export function mappedCollection<T>(base: CollectionGateway<T>, spec: MappingSpec): CollectionGateway<T> {
	if (Object.keys(spec.needs).length === 0) return base;
	const resolutionOf = rememberedResolution(base as unknown as CollectionGateway<unknown>, spec);
	return collectionGateway<T>({
		id: `${base.id}|needs?${stableKey({ needs: Object.keys(spec.needs), chosen: spec.chosen })}`,
		handlers: mappedHandlers(base, spec, resolutionOf),
		subscribe: base.subscribe,
		announcesOwnWrites: false,
	});
}
