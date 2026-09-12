import type { FilterRow, Row, SortRow } from "./contract";

type Held = Record<string, unknown>;

function isHeld(record: unknown): record is Held {
	return typeof record === "object" && record !== null;
}

export function fieldOf(record: unknown, prop: string): unknown {
	if (!isHeld(record) || !prop) return undefined;
	const carried = record["props"];
	if (isHeld(carried) && carried[prop] !== undefined) return carried[prop];
	return record[prop];
}

export function textOf(record: unknown, prop: string): string {
	const found = fieldOf(record, prop);
	return found === undefined || found === null ? "" : String(found);
}

export function valueOf(record: unknown, prop: string): unknown {
	if (!isHeld(record) || !prop) return undefined;
	if (prop === "name" || prop === "title") return record["name"] ?? fieldOf(record, prop);
	if (prop === "path" || prop === "type") return record[prop];
	return fieldOf(record, prop);
}

function meets(left: unknown, right: unknown): boolean {
	if (!Array.isArray(right)) return false;
	const held = Array.isArray(left) ? left : [left];
	return held.some((value) => right.includes(value));
}

const OPERATIONS: Record<string, (left: unknown, right: unknown) => boolean> = {
	eq: (left, right) => left === right,
	is: (left, right) => left === right,
	ne: (left, right) => left !== right,
	in: (left, right) => meets(left, right),
	nin: (left, right) => !meets(left, right),
	contains: (left, right) => String(left ?? "").toLowerCase().includes(String(right).toLowerCase()),
	gt: (left, right) => (left as number) > (right as number),
	lt: (left, right) => (left as number) < (right as number),
	exists: (left, right) => (right === false ? left == null : left != null),
};

export function isMatch(record: unknown, where?: FilterRow[] | null): boolean {
	if (!where || where.length === 0) return true;
	return where.every((clause) => {
		const name = clause.op ?? "eq";
		const operation = OPERATIONS[name];
		if (!operation) {
			console.warn(`Widgetarium: filter operator "${name}" is not known — the clause is ignored`);
			return true;
		}
		return operation(valueOf(record, clause.prop ?? ""), clause.value);
	});
}

export const KNOWN_OPERATORS = Object.keys(OPERATIONS);

function isNumeric(held: unknown): boolean {
	return held !== "" && held !== true && held !== false && Number.isFinite(Number(held));
}

const isBlank = (held: unknown) => held === undefined || held === null || held === "";

function compareSortable(left: unknown, right: unknown): number {
	if (left === right) return 0;
	if (isBlank(left) || isBlank(right)) return isBlank(left) ? 1 : -1;
	if (isNumeric(left) && isNumeric(right)) return Number(left) - Number(right);
	return String(left).localeCompare(String(right));
}

export function sortedRows<T>(rows: Row<T>[], sort?: SortRow[] | null): Row<T>[] {
	if (!sort || sort.length === 0) return rows;
	return [...rows].sort((left, right) => {
		for (const clause of sort) {
			const step = compareSortable(valueOf(left.value, clause.prop), valueOf(right.value, clause.prop));
			if (step !== 0) return clause.dir === "desc" ? -step : step;
		}
		return 0;
	});
}
