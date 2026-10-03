import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Button, Field } from "@widgetarium/kit";
import { boxNamed, referenceIn } from "../ref-draft.js";
import type { ReferenceDraft } from "../ref-draft.js";
import { conditionOfRow, conditionsFor, rowFor } from "../gateway/operators.js";
import type { ConditionKind, ValueShape } from "../gateway/operators.js";
import type { FilterRow } from "../gateway/contract.js";
import type { FieldReport } from "../gateway/fields.js";
import type { TileProp } from "../model.js";
import { filterRowsIn } from "../engine/held-reading.js";
import { fieldsIn, withFieldsPatched } from "../gateway/props.js";
import { isObject } from "../engine/is-object.js";
import { completionRows, draftOf, offeredValues, refLabel } from "./offered-boxes.js";
import type { OfferedEntry } from "./offered-boxes.js";
import { draftOnInput, note, pickRow, useItButton, valueRow } from "./settings-rows.js";
import type { SettingsState } from "./settings-state.js";

const NOT_WIRED = "nothing on this board yet";

const PICK_FIELD = "Which property of the data are we looking at?";

const PICK_CONDITION = "How should that property be compared?";

const PICK_VALUE = "What is it compared against?";

export const OTHER_FIELD = "A property the notes here do not carry yet";

const FIELD_PLACEHOLDER: Readonly<Partial<Record<ValueShape, string>>> = {
	number: "A number",
	day: "2026-09-01",
	one: "One value",
	many: "One value",
};

export type ConditionList = "where" | "counts";

export type ConditionField = Pick<FieldReport, "prop" | "type" | "values">;

export type RowIndex = number | "spread";

export interface ConditionAt {
	readonly key: string;
	readonly list: ConditionList;
	readonly config: TileProp;
	readonly rows: readonly FilterRow[];
	readonly index: RowIndex;
	readonly step: string | null;
}

export interface OpenStep {
	readonly index: string;
	readonly step: string;
}

type Fields = readonly ConditionField[];

export function conditionRowsIn(config: TileProp, list: ConditionList): FilterRow[] {
	return filterRowsIn(fieldsIn(config.fields)[list]);
}

export function conditionSentence(state: SettingsState, fields: Fields, row: FilterRow): string {
	if (row.spread) return `everything ${valueSaid(state, row.spread)} has picked`;
	const field = fieldNamed(fields, row.prop);
	const kind = conditionOfRow(field.type, row);
	if (!kind) return `${row.prop} ${row.op ?? "is"} ${valueSaid(state, row.value)}`;
	return kind.takes === "none"
		? `${row.prop} ${kind.label}`
		: `${row.prop} ${kind.label} ${valueSaid(state, row.value)}`;
}

export function stepAt(openRow: string | null, key: string, list: ConditionList): OpenStep | null {
	const head = `${list}:${key}#`;
	if (!String(openRow ?? "").startsWith(head)) return null;
	const [index = "", step] = String(openRow).slice(head.length).split("|");
	return { index, step: step ?? "" };
}

export function keepRow(
	state: SettingsState,
	at: ConditionAt,
	row: FilterRow,
	step: string | null,
	seed?: string,
): void {
	writeWhere(state, at, withRowAt(at.rows, at.index, row));
	if (step) openStep(state, at, step, seed);
	else state.openEditor(null);
}

export function conditionBody(state: SettingsState, at: ConditionAt, fields: Fields, step: string): ReactNode[] {
	const held = rowAt(at);
	const field = fieldNamed(fields, held.prop);
	if (step === "field" || !held.prop) return fieldStep(state, at, fields);
	if (step === "op") return conditionStep(state, at, field);
	const kind = conditionOfRow(field.type, held);
	if (step === "value" && kind) return valueStep(state, at, field, kind);
	return conditionSummary(state, at, field);
}

function rowAt(at: ConditionAt): FilterRow {
	return typeof at.index === "number" ? (at.rows[at.index] ?? {}) : {};
}

function valueSaid(state: SettingsState, held: unknown): string {
	if (isObject(held) && typeof held["ref"] === "string") return refLabel(state, held["ref"]);
	if (isObject(held) && typeof held["wants"] === "string") return NOT_WIRED;
	if (Array.isArray(held)) return held.join(", ");
	return String(held ?? "");
}

function fieldNamed(fields: Fields, prop: string | undefined): ConditionField {
	return fields.find((field) => field.prop === prop) ?? { prop: String(prop), type: "text", values: [] };
}

function writeWhere(state: SettingsState, at: ConditionAt, rows: readonly FilterRow[]): void {
	const fixed = conditionRowsIn(at.config, at.list).filter((row) => row.fixed === true);
	state.onPatch({ props: { ...(state.tile.props ?? {}), [at.key]: withListIn(at, [...fixed, ...rows]) } });
}

function withListIn(at: ConditionAt, rows: readonly FilterRow[]): TileProp {
	return withFieldsPatched(at.config, { [at.list]: rows });
}

function withRowAt(rows: readonly FilterRow[], index: RowIndex, row: FilterRow): FilterRow[] {
	if (typeof index === "number" && index < rows.length) return rows.map((held, one) => (one === index ? row : held));
	return [...rows, row];
}

function openStep(state: SettingsState, at: ConditionAt, step: string, seed?: string): void {
	state.openEditor(`${at.list}:${at.key}#${at.index}${step ? `|${step}` : ""}`, seed ?? "");
}

function useItFoot(disabled: boolean, onClick: () => void): ReactElement {
	return h("div", { className: "wg-set-pop-foot", key: "foot" }, [useItButton(disabled, onClick)]);
}

function fieldStep(state: SettingsState, at: ConditionAt, fields: Fields): ReactNode[] {
	const typed = String(state.draft ?? "").trim();
	const start = (prop: string): void => {
		const first = conditionsFor(fieldNamed(fields, prop).type)[0];
		keepRow(state, at, { prop, ...(first ? { op: first.op } : {}), value: "" }, "op");
	};
	return [
		note(PICK_FIELD),
		...fields.map((field) => pickRow(field.prop, field.prop, () => start(field.prop), field.prop === rowAt(at).prop)),
		h(Field, {
			block: true,
			key: "typed",
			value: state.draft ?? "",
			placeholder: OTHER_FIELD,
			onInput: draftOnInput(state),
		}),
		useItFoot(typed === "", () => typed && start(typed)),
	];
}

function conditionStep(state: SettingsState, at: ConditionAt, field: ConditionField): ReactNode[] {
	const held = rowAt(at);
	const pick = (kind: ConditionKind): void =>
		keepRow(state, at, rowFor(field.prop, kind, held.value ?? ""), kind.takes === "none" ? null : "value");
	return [
		note(PICK_CONDITION),
		...conditionsFor(field.type).map((kind) =>
			pickRow(kind.id, kind.label, () => pick(kind), kind.id === conditionOfRow(field.type, held)?.id),
		),
	];
}

function heldValues(held: unknown): readonly unknown[] {
	if (Array.isArray(held)) return held;
	return held === undefined || held === null || held === "" ? [] : [held];
}

function valueChoices(
	state: SettingsState,
	at: ConditionAt,
	field: ConditionField,
	kind: ConditionKind,
): ReactElement[] {
	const held = rowAt(at);
	const chosen = heldValues(held.value);
	const keep = (value: string): void => keepRow(state, at, { ...held, value }, null);
	const toggle = (value: string): void => {
		const next = chosen.includes(value) ? chosen.filter((one) => one !== value) : [...chosen, value];
		writeWhere(state, at, withRowAt(at.rows, at.index, { ...held, value: next }));
	};
	if (kind.takes === "many")
		return field.values.map((value) => pickRow(value, value, () => toggle(value), chosen.includes(value)));
	return field.values.map((value) => pickRow(value, value, () => keep(value), held.value === value));
}

function referenceClassOf(said: ReferenceDraft | null, pointedAt: OfferedEntry | null): string | null {
	if (!said) return null;
	return pointedAt ? "wg-set-ref" : "wg-set-ref-unknown";
}

function valueStep(state: SettingsState, at: ConditionAt, field: ConditionField, kind: ConditionKind): ReactNode[] {
	const held = rowAt(at);
	const typed = String(state.draft ?? "").trim();
	const said = referenceIn(typed);
	const offered = offeredValues(state, "value");
	const pointedAt = boxNamed(offered, said);
	const keepValue = (value: unknown): void => keepRow(state, at, { ...held, value }, null);
	const apply = (): void => keepValue(pointedAt ? { ref: pointedAt.ref } : typedValueOf(kind, typed));
	return [
		note(PICK_VALUE),
		...valueChoices(state, at, field, kind),
		h(Field, {
			block: true,
			key: "typed",
			className: referenceClassOf(said, pointedAt) ?? undefined,
			value: state.draft ?? "",
			placeholder: FIELD_PLACEHOLDER[kind.takes] ?? FIELD_PLACEHOLDER.one,
			onInput: draftOnInput(state),
		}),
		useItFoot(typed === "" || (said !== null && !pointedAt), apply),
		...completionRows(said, offered, state.setDraft, (entry) => keepValue({ ref: entry.ref })),
	];
}

function typedValueOf(kind: ConditionKind, typed: string): string | number {
	return kind.takes === "number" ? Number(typed) : typed;
}

function summaryRow(
	state: SettingsState,
	at: ConditionAt,
	step: string,
	label: string,
	value: string,
	seed: string,
): ReactElement {
	return valueRow({
		label,
		value: h("span", { className: "wg-set-path" }, value),
		onClick: () => openStep(state, at, step, seed),
	});
}

function conditionSummary(state: SettingsState, at: ConditionAt, field: ConditionField): ReactNode[] {
	const held = rowAt(at);
	const kind = conditionOfRow(field.type, held);
	const rows = [
		summaryRow(state, at, "field", "Property", held.prop ?? "Pick one", ""),
		summaryRow(state, at, "op", "Condition", kind?.label ?? "Pick one", ""),
	];
	if (kind && kind.takes !== "none") {
		rows.push(
			summaryRow(state, at, "value", "Value", valueSaid(state, held.value) || "Pick one", draftOf(held.value, state)),
		);
	}
	return [...rows, summaryFoot(state, at)];
}

function summaryFoot(state: SettingsState, at: ConditionAt): ReactElement {
	const remove = (): void => {
		writeWhere(
			state,
			at,
			at.rows.filter((_, one) => one !== at.index),
		);
		state.openEditor(null);
	};
	return h("div", { className: "wg-set-pop-foot", key: "foot" }, [
		h(Button, { size: "s", key: "remove", onClick: remove }, "Remove"),
		h(Button, { size: "s", variant: "accent", key: "done", onClick: () => state.openEditor(null) }, "Done"),
	]);
}
