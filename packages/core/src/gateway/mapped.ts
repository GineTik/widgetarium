import { z } from "zod";
import type { CollectionGateway, FilterRow, Query, RecordRef, Row, RowsResult, SortRow } from "./contract";
import { collectionGateway, valueIn } from "./create";
import { fieldsOf, isBoolean, isDay, isNumber } from "./fields";
import type { FieldReport } from "./fields";
import { fieldOf } from "./match";
import { delegateVerbs } from "./narrow";
import type { ChosenProps, DeclaredNeeds, Resolution } from "./resolve-needs";
import { resolveNeeds } from "./resolve-needs";
import { stableKey } from "./cache";
import { pageIn } from "./paged-read";
import { problemsOf, reportDroppedSort, UnansweredFilterError } from "./problems";
import type { Problem } from "./problems";
import { actionOf } from "./verbs-of";
import type { LooseAction } from "./verbs-of";
import { isObject } from "../engine/is-object";

type Held = Record<string, unknown>;

type Fields = Record<string, string>;

type Report = (problem: Problem) => void;

interface Mapping {
	readonly needs: DeclaredNeeds;
	readonly map: Fields;
	readonly report: Report;
}

export function coerceOne(value: unknown, type: string): unknown {
	if (value === undefined || value === null || value === "") return null;
	if (type === "date") return asDay(value);
	if (type === "number") return asNumber(value);
	if (type === "boolean") return asBoolean(value);
	return String(value);
}

export interface MappingSpec {
	needs: DeclaredNeeds;
	chosen?: ChosenProps;
	report?: Report;
}

type Handler = (input: never) => unknown;

type Reading = () => Promise<Resolution>;

type RenamingSpec = MappingSpec & { readonly report: Report };

export function mapCollection<T>(base: CollectionGateway<T>, spec: MappingSpec): CollectionGateway<T> {
	if (Object.keys(spec.needs).length === 0) return base;
	const resolutionOf = rememberResolution(base, spec);
	const report = spec.report ?? problemsOf(base).contextFor(base.id, z.unknown()).report;
	return collectionGateway<T>({
		id: `${base.id}|needs?${stableKey({ needs: Object.keys(spec.needs), chosen: spec.chosen })}`,
		handlers: mapHandlers(base, { ...spec, report }, resolutionOf),
		subscribe: base.subscribe,
		announcesOwnWrites: false,
	});
}

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

function coerce(value: unknown, type: string, many: boolean): unknown {
	if (!many) return coerceOne(value, type);
	const held = Array.isArray(value) ? value : [value];
	return held.map((one) => coerceOne(one, type)).filter((one) => one !== null);
}

function renameValue(value: unknown, needs: DeclaredNeeds, map: Record<string, string>): unknown {
	if (!isHeld(value)) return value;
	const read: Held = { ...value };
	for (const [need, declared] of Object.entries(needs)) {
		const prop = map[need];
		if (!prop) continue;
		read[need] = coerce(fieldOf(value, prop), declared.type, Boolean(declared.many));
	}
	return read;
}

function unansweredIn(rows: readonly (FilterRow | SortRow)[] | undefined, needs: DeclaredNeeds, map: Fields): string[] {
	return (rows ?? []).flatMap((row) => (row.prop && needs[row.prop] && !map[row.prop] ? [row.prop] : []));
}

function renameClause<T extends FilterRow | SortRow>(row: T, map: Fields): T {
	const prop = row.prop ? map[row.prop] : undefined;
	return prop ? { ...row, prop } : row;
}

function renameWhere(where: FilterRow[] | undefined, { needs, map }: Mapping): FilterRow[] | undefined {
	const unanswered = unansweredIn(where, needs, map);
	if (unanswered.length > 0) throw new UnansweredFilterError(unanswered);
	return where?.map((row) => renameClause(row, map));
}

function renameSort(sort: SortRow[] | undefined, { needs, map, report }: Mapping): SortRow[] | undefined {
	const unanswered = unansweredIn(sort, needs, map);
	reportDroppedSort(unanswered, report);
	return sort?.filter((row) => !unanswered.includes(row.prop)).map((row) => renameClause(row, map));
}

function renameQuery(query: Query | void, mapping: Mapping): Query {
	const asked = query ?? {};
	const where = renameWhere(asked.where, mapping);
	const sort = renameSort(asked.sort, mapping);
	return { ...asked, ...(where ? { where } : {}), ...(sort ? { sort } : {}) };
}

function renameAsked(asked: unknown, mapping: Mapping): unknown {
	if (!isObject(asked)) return asked;
	const where = renameWhere(rowsIn(asked["where"], isFilterRow), mapping);
	const sort = renameSort(rowsIn(asked["sort"], isSortRow), mapping);
	return { ...asked, ...(where ? { where } : {}), ...(sort ? { sort } : {}) };
}

function rowsIn<Clause>(held: unknown, isClause: (row: unknown) => row is Clause): Clause[] | undefined {
	return Array.isArray(held) ? held.filter(isClause) : undefined;
}

function isFilterRow(held: unknown): held is FilterRow {
	return isObject(held);
}

function isSortRow(held: unknown): held is SortRow {
	return isObject(held) && typeof held["prop"] === "string";
}

function renameItem(item: unknown, { needs, map }: Mapping): unknown {
	if (!isObject(item) || typeof item["ref"] !== "string") return item;
	return { ...(renameValue(valueIn(item as Row<unknown>), needs, map) as object), ref: item["ref"] };
}

function renamePatch(data: unknown, needs: DeclaredNeeds, map: Record<string, string>): unknown {
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

async function fieldsBehind<T>(base: CollectionGateway<T>): Promise<FieldReport[]> {
	const described = await describedFieldsOf(base);
	if (described) return described;
	const listed = await base.list();
	return fieldsOf(listed.rows.map(valueIn));
}

async function describedFieldsOf(base: object): Promise<FieldReport[] | null> {
	const describe = actionOf(base, "describe");
	if (!describe?.can().can) return null;
	const described = await describe();
	return isFieldReportList(described) ? described : null;
}

function isFieldReportList(held: unknown): held is FieldReport[] {
	return Array.isArray(held) && held.every((row: unknown) => isObject(row) && typeof row["prop"] === "string");
}

// TRADE-OFF: the resolution is remembered for the life of the gateway, so a property added after the first read is seen on the next mount rather than at once
function rememberResolution<T>(base: CollectionGateway<T>, spec: MappingSpec) {
	let held: Promise<Resolution> | null = null;
	return () => {
		if (held) return held;
		held = fieldsBehind(base).then((fields) => resolveNeeds(spec.needs, fields, spec.chosen));
		return held;
	};
}

function readsRows<T>(base: CollectionGateway<T>, spec: RenamingSpec, resolutionOf: Reading) {
	return async (query: Query | void): Promise<RowsResult<T>> => {
		const { map } = await resolutionOf();
		const listed = await base.list(renameQuery(query, { ...spec, map }));
		return {
			...listed,
			rows: listed.rows.map(
				(row) => ({ ...(renameValue(valueIn(row), spec.needs, map) as object), ref: row.ref }) as Row<T>,
			),
		};
	};
}

function readsPage(query: LooseAction, spec: RenamingSpec, resolutionOf: Reading) {
	return async (asked: unknown, signal?: AbortSignal) => {
		const mapping = { ...spec, map: (await resolutionOf()).map };
		const page = pageIn(await query(renameAsked(asked, mapping), signal));
		return { ...page, items: page.items.map((item) => renameItem(item, mapping)) };
	};
}

function readsOne<T>(base: CollectionGateway<T>, spec: MappingSpec, resolutionOf: Reading) {
	return async (ref: RecordRef): Promise<Row<T> | null> => {
		const { map } = await resolutionOf();
		const found = await base.get(ref);
		return found ? ({ ...(renameValue(valueIn(found), spec.needs, map) as object), ref: found.ref } as Row<T>) : null;
	};
}

function writesOne<T>(base: CollectionGateway<T>, spec: MappingSpec, resolutionOf: Reading) {
	return async (input: { ref: RecordRef; data: Partial<T> }): Promise<Row<T> | null> => {
		const { map } = await resolutionOf();
		return base.update({ ref: input.ref, data: renamePatch(input.data, spec.needs, map) as Partial<T> });
	};
}

function createsOne<T>(base: CollectionGateway<T>, spec: MappingSpec, resolutionOf: Reading) {
	return async (draft: Partial<T>): Promise<Row<T> | null> => {
		const { map } = await resolutionOf();
		return base.create(renamePatch(draft, spec.needs, map) as Partial<T>);
	};
}

function mapHandlers<T>(
	base: CollectionGateway<T>,
	spec: RenamingSpec,
	resolutionOf: Reading,
): Record<string, Handler> {
	const query = actionOf(base, "query");
	const mapped: Record<string, Handler> = {
		get: readsOne(base, spec, resolutionOf),
		update: writesOne(base, spec, resolutionOf),
		create: createsOne(base, spec, resolutionOf),
	};
	const delegated = delegateVerbs(base);
	const handlers: Record<string, Handler> = {
		...delegated,
		list: readsRows(base, spec, resolutionOf) as Handler,
		...(query ? { query: readsPage(query, spec, resolutionOf) as Handler } : {}),
	};
	for (const verb of Object.keys(mapped)) {
		const held = mapped[verb];
		if (delegated[verb] && held) handlers[verb] = held;
	}
	return handlers;
}
