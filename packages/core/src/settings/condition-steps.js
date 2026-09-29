import { createElement as h } from "react";
import { Button, Field } from "@widgetarium/kit";
import { boxNamed, referenceIn } from "../ref-draft.js";
import { conditionOfRow, conditionsFor, rowFor } from "../gateway/operators.js";
import { completionRows, draftOf, offeredValues, refLabel } from "./offered-boxes.js";
import { note, pickRow, valueRow } from "./settings-rows.js";

const NOT_WIRED = "nothing on this board yet";

const PICK_FIELD = "Which property of the data are we looking at?";

const PICK_CONDITION = "How should that property be compared?";

const PICK_VALUE = "What is it compared against?";

export const OTHER_FIELD = "A property the notes here do not carry yet";

const FIELD_PLACEHOLDER = {
	text: "Anything the notes carry",
	number: "A number",
	day: "2026-09-01",
	one: "One value",
	many: "One value",
};

export function conditionSentence(state, fields, row) {
	if (row.spread) return `everything ${valueSaid(state, row.spread)} has picked`;
	const field = fieldNamed(fields, row.prop);
	const kind = conditionOfRow(field.type, row);
	if (!kind) return `${row.prop} ${row.op ?? "is"} ${valueSaid(state, row.value)}`;
	return kind.takes === "none"
		? `${row.prop} ${kind.label}`
		: `${row.prop} ${kind.label} ${valueSaid(state, row.value)}`;
}

export function stepAt(openRow, key, list) {
	const head = `${list}:${key}#`;
	if (!String(openRow ?? "").startsWith(head)) return null;
	const [index, step] = String(openRow).slice(head.length).split("|");
	return { index, step: step ?? "" };
}

export function keepRow(state, at, row, step, seed) {
	writeWhere(state, at, withRowAt(at.rows, at.index, row));
	if (step) openStep(state, at, step, seed);
	else state.openEditor(null);
}

export function conditionBody(state, at, fields, step) {
	const held = at.rows[at.index] ?? {};
	const field = fieldNamed(fields, held.prop);
	if (step === "field" || !held.prop) return fieldStep(state, at, fields);
	if (step === "op") return conditionStep(state, at, field);
	const kind = conditionOfRow(field.type, held);
	if (step === "value" && kind) return valueStep(state, at, field, kind);
	return conditionSummary(state, at, field);
}

function valueSaid(state, held) {
	if (typeof held?.ref === "string") return refLabel(state, held.ref);
	if (typeof held?.wants === "string") return NOT_WIRED;
	if (Array.isArray(held)) return held.join(", ");
	return String(held ?? "");
}

function fieldNamed(fields, prop) {
	return fields.find((field) => field.prop === prop) ?? { prop, type: "text", values: [] };
}

function writeWhere(state, at, rows) {
	const fixed = (at.config[at.list] ?? []).filter((row) => row.fixed === true);
	state.onPatch({ props: { ...(state.tile.props ?? {}), [at.key]: { ...at.config, [at.list]: [...fixed, ...rows] } } });
}

function withRowAt(rows, index, row) {
	return index < rows.length ? rows.map((held, one) => (one === index ? row : held)) : [...rows, row];
}

function openStep(state, at, step, seed) {
	state.openEditor(`${at.list}:${at.key}#${at.index}${step ? `|${step}` : ""}`, seed ?? "");
}

function fieldStep(state, at, fields) {
	const typed = String(state.draft ?? "").trim();
	const start = (prop) =>
		keepRow(state, at, { prop, op: conditionsFor(fieldNamed(fields, prop).type)[0].op, value: "" }, "op");
	return [
		note(PICK_FIELD),
		...fields.map((field) =>
			pickRow(field.prop, field.prop, () => start(field.prop), field.prop === at.rows[at.index]?.prop),
		),
		h(Field, {
			block: true,
			key: "typed",
			value: state.draft ?? "",
			placeholder: OTHER_FIELD,
			onInput: (event) => state.setDraft(event.target.value),
		}),
		h("div", { className: "wg-set-pop-foot", key: "foot" }, [
			h(
				Button,
				{ size: "s", variant: "accent", key: "apply", disabled: typed === "", onClick: () => typed && start(typed) },
				"Use it",
			),
		]),
	];
}

function conditionStep(state, at, field) {
	const held = at.rows[at.index] ?? {};
	const pick = (kind) =>
		keepRow(state, at, rowFor(field.prop, kind, held.value ?? ""), kind.takes === "none" ? null : "value");
	return [
		note(PICK_CONDITION),
		...conditionsFor(field.type).map((kind) =>
			pickRow(kind.id, kind.label, () => pick(kind), kind.id === conditionOfRow(field.type, held)?.id),
		),
	];
}

function heldValues(held) {
	if (Array.isArray(held)) return held;
	return held === undefined || held === null || held === "" ? [] : [held];
}

function valueChoices(state, at, field, kind) {
	const held = at.rows[at.index] ?? {};
	const chosen = heldValues(held.value);
	const keep = (value) => keepRow(state, at, { ...held, value }, null);
	const toggle = (value) => {
		const next = chosen.includes(value) ? chosen.filter((one) => one !== value) : [...chosen, value];
		writeWhere(state, at, withRowAt(at.rows, at.index, { ...held, value: next }));
	};
	if (kind.takes === "many")
		return field.values.map((value) => pickRow(value, value, () => toggle(value), chosen.includes(value)));
	return field.values.map((value) => pickRow(value, value, () => keep(value), held.value === value));
}

function valueStep(state, at, field, kind) {
	const held = at.rows[at.index] ?? {};
	const typed = String(state.draft ?? "").trim();
	const said = referenceIn(typed);
	const offered = offeredValues(state, "value");
	const pointedAt = boxNamed(offered, said);
	const keepValue = (value) => keepRow(state, at, { ...held, value }, null);
	const apply = () => keepValue(pointedAt ? { ref: pointedAt.ref } : kind.takes === "number" ? Number(typed) : typed);
	return [
		note(PICK_VALUE),
		...valueChoices(state, at, field, kind),
		h(Field, {
			block: true,
			key: "typed",
			className: said ? (pointedAt ? "wg-set-ref" : "wg-set-ref-unknown") : null,
			value: state.draft ?? "",
			placeholder: FIELD_PLACEHOLDER[kind.takes] ?? FIELD_PLACEHOLDER.one,
			onInput: (event) => state.setDraft(event.target.value),
		}),
		h("div", { className: "wg-set-pop-foot", key: "foot" }, [
			h(
				Button,
				{
					size: "s",
					variant: "accent",
					key: "apply",
					disabled: typed === "" || (said !== null && !pointedAt),
					onClick: apply,
				},
				"Use it",
			),
		]),
		...completionRows(state, said, offered, state.setDraft, (entry) => keepValue({ ref: entry.ref })),
	];
}

function summaryRow(state, at, step, label, value, seed) {
	return valueRow({
		label,
		value: h("span", { className: "wg-set-path" }, value),
		onClick: () => openStep(state, at, step, seed),
	});
}

function conditionSummary(state, at, field) {
	const held = at.rows[at.index] ?? {};
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
	return [
		...rows,
		h("div", { className: "wg-set-pop-foot", key: "foot" }, [
			h(
				Button,
				{
					size: "s",
					key: "remove",
					onClick: () => {
						writeWhere(
							state,
							at,
							at.rows.filter((_, one) => one !== at.index),
						);
						state.openEditor(null);
					},
				},
				"Remove",
			),
			h(Button, { size: "s", variant: "accent", key: "done", onClick: () => state.openEditor(null) }, "Done"),
		]),
	];
}
