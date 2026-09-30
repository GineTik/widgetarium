import type { CollectionGateway, FilterRow, Query } from "./contract";
import { collectionGateway } from "./create";
import { stableKey } from "./cache";
import { KNOWN_OPERATORS } from "./match";
import { isAction, verbOf } from "./verbs-of";

export type NarrowClause = Record<string, unknown>;

export type Narrowing = NarrowClause | FilterRow[] | null | undefined;

const OPERATORS = new Set(KNOWN_OPERATORS);

export type RowsResolver = (rows: FilterRow[]) => Promise<FilterRow[]> | FilterRow[];

type Subscribe = CollectionGateway<unknown>["subscribe"];

export function isEmpty(value: unknown): boolean {
	if (value === undefined || value === null || value === "") return true;
	return Array.isArray(value) && value.length === 0;
}

export function normalizeWhere(where: Narrowing, by?: string): FilterRow[] {
	if (!where) return [];
	const marked = by === undefined ? {} : { by };
	if (Array.isArray(where))
		return where.filter((row) => row && !isEmpty(row.value ?? row.spread)).map((row) => ({ ...marked, ...row }));
	return Object.entries(where).flatMap(([prop, value]) => clausesFor(prop, value, by));
}

export function delegateVerbs(base: object): Record<string, (input: never) => unknown> {
	const handlers: Record<string, (input: never) => unknown> = {};
	for (const verb of Object.keys(base)) {
		const held = verbOf(base, verb);
		if (verb === "list" || !isAction(held)) continue;
		if (held.can().can === false) continue;
		handlers[verb] = (input: never) => held(input);
	}
	return handlers;
}

export function narrowCollection<T>(
	base: CollectionGateway<T>,
	rows: FilterRow[],
	resolve?: RowsResolver,
	subscribe?: Subscribe,
): CollectionGateway<T> {
	if (rows.length === 0) return base;
	const list = async (asked: Query | void) => {
		const held = asked ?? {};
		const where = resolve ? await resolve(rows) : rows;
		return base.list({ ...held, where: [...where, ...(held.where ?? [])] });
	};
	return collectionGateway<T>({
		id: `${base.id}|where?${stableKey(rows)}`,
		handlers: { ...delegateVerbs(base), list },
		subscribe: subscribe ?? base.subscribe,
		announcesOwnWrites: false,
	}) as CollectionGateway<T>;
}

export function narrow<T>(base: CollectionGateway<T>, where: Narrowing, by?: string): CollectionGateway<T> {
	return narrowCollection<T>(base, normalizeWhere(where, by));
}

function isOperatorMap(value: unknown): value is Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	const keys = Object.keys(value);
	return keys.length > 0 && keys.every((key) => OPERATORS.has(key));
}

function clausesFor(prop: string, value: unknown, by?: string): FilterRow[] {
	if (isEmpty(value)) return [];
	const marked = by === undefined ? {} : { by };
	if (isOperatorMap(value)) {
		return Object.entries(value)
			.filter(([, held]) => !isEmpty(held))
			.map(([op, held]) => ({ prop, op, value: held, ...marked }));
	}
	if (Array.isArray(value)) return [{ prop, op: "in", value, ...marked }];
	return [{ prop, op: "is", value, ...marked }];
}
