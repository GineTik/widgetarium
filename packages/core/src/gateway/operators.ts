import type { FilterRow } from "./contract";
import type { FieldType } from "./fields";

export type ValueShape = "none" | "one" | "many" | "day" | "number";

export interface ConditionKind {
	id: string;
	label: string;
	op: string;
	takes: ValueShape;
	fixed?: unknown;
}

const IS: ConditionKind = { id: "is", label: "is", op: "is", takes: "one" };
const IS_NOT: ConditionKind = { id: "isNot", label: "is not", op: "ne", takes: "one" };
const EMPTY: ConditionKind = { id: "empty", label: "is empty", op: "exists", takes: "none", fixed: false };
const FILLED: ConditionKind = { id: "filled", label: "is not empty", op: "exists", takes: "none", fixed: true };

const BY_TYPE: Record<FieldType, ConditionKind[]> = {
	text: [IS, IS_NOT, { id: "contains", label: "contains", op: "contains", takes: "one" }, EMPTY, FILLED],
	number: [
		{ ...IS, takes: "number" },
		{ ...IS_NOT, takes: "number" },
		{ id: "gt", label: "is greater than", op: "gt", takes: "number" },
		{ id: "lt", label: "is less than", op: "lt", takes: "number" },
		EMPTY,
		FILLED,
	],
	date: [
		{ ...IS, takes: "day" },
		{ id: "lt", label: "is before", op: "lt", takes: "day" },
		{ id: "gt", label: "is after", op: "gt", takes: "day" },
		EMPTY,
		FILLED,
	],
	list: [
		{ id: "in", label: "has any of", op: "in", takes: "many" },
		{ id: "nin", label: "has none of", op: "nin", takes: "many" },
		EMPTY,
		FILLED,
	],
	boolean: [
		{ id: "checked", label: "is checked", op: "is", takes: "none", fixed: true },
		{ id: "unchecked", label: "is not checked", op: "ne", takes: "none", fixed: true },
	],
};

export function conditionsFor(type: FieldType): ConditionKind[] {
	return BY_TYPE[type] ?? BY_TYPE.text;
}

export function conditionById(type: FieldType, id: string): ConditionKind | null {
	return conditionsFor(type).find((kind) => kind.id === id) ?? null;
}

export function conditionOfRow(type: FieldType, row: FilterRow): ConditionKind | null {
	const held = conditionsFor(type).filter((kind) => kind.op === (row.op ?? "is"));
	if (held.length < 2) return held[0] ?? null;
	return held.find((kind) => kind.takes !== "none" || kind.fixed === row.value) ?? held[0] ?? null;
}

export function rowFor(prop: string, kind: ConditionKind, value: unknown): FilterRow {
	if (kind.takes === "none") return { prop, op: kind.op, value: kind.fixed };
	return { prop, op: kind.op, value };
}
