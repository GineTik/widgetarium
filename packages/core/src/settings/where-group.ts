import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, Pill, Row, RowLabel, RowValue } from "@widgetarium/kit";
import type { TileProp } from "../model.js";
import { bindingOf, declaredOf, storedRows, typedIn } from "../gateway/props.js";
import { valueIn } from "../gateway/create.js";
import { fieldsOf } from "../gateway/fields.js";
import type { FilterRow } from "../gateway/contract.js";
import { conditionBody, conditionRowsIn, conditionSentence, keepRow, stepAt } from "./condition-steps.js";
import type { ConditionAt, ConditionField, ConditionList, RowIndex } from "./condition-steps.js";
import { boxRows, offeredBoxes } from "./offered-boxes.js";
import { editorPopover, group, note, valueRow } from "./settings-rows.js";
import type { SettingsSpec, SettingsState } from "./settings-state.js";
import { boundPath } from "./vault-paths.js";

const PICK_SPREAD = "Everything a filter has picked arrives as conditions of its own.";

const CONDITION_LISTS: Readonly<Record<ConditionList, { readonly heading: string; readonly hint: string }>> = {
	where: {
		heading: "Where",
		hint: "These decide which data arrives. A condition the widget declares cannot be edited here.",
	},
	counts: {
		heading: "Counts when",
		hint: "A note that arrives and does not match still belongs to the whole: a percent divides by it, and a run breaks on it.",
	},
};

type Fields = readonly ConditionField[];

export function whereGroup(
	state: SettingsState,
	key: string,
	spec: SettingsSpec,
	config: TileProp,
	list: ConditionList = "where",
): ReactElement {
	const fields = fieldsFor(state, spec, config);
	const held = conditionRowsIn(config, list);
	const rows = held.filter((row) => row.fixed !== true);
	const open = stepAt(state.openRow, key, list);
	const at = (index: RowIndex): ConditionAt => ({
		key,
		list,
		config,
		rows,
		index,
		step: open?.index === String(index) ? open.step : null,
	});
	const drawn = [
		...held.filter((row) => row.fixed === true).map((row, index) => fixedCondition(state, fields, row, index)),
		...rows.map((row, index) =>
			conditionRow(state, at(index), fields, valueRow({ label: conditionSentence(state, fields, row), value: "" })),
		),
		conditionRow(state, at(rows.length), fields, addRow("Add condition")),
	];
	if (list === "where" && offeredBoxes(state, "conditions").size > 0) {
		drawn.push(conditionRow(state, at("spread"), fields, addRow("Everything a filter has picked")));
	}
	return group(
		`${list}:${key}`,
		`${CONDITION_LISTS[list].heading} · ${spec.label ?? key}`,
		drawn,
		CONDITION_LISTS[list].hint,
	);
}

function fieldsFor(state: SettingsState, spec: SettingsSpec, config: TileProp): Fields {
	if (bindingOf(spec, config).binding === "hardcode")
		return fieldsOf(storedRows(typedIn(spec, config) ?? declaredOf(spec)).map(valueIn));
	return state.vaultFields?.[boundPath(config)] ?? [];
}

function spreadBody(state: SettingsState, at: ConditionAt): ReactElement[] {
	return [
		note(PICK_SPREAD),
		...boxRows(state, "conditions", (entry) => keepRow(state, at, { spread: { ref: entry.ref } }, null)),
	];
}

function conditionRow(state: SettingsState, at: ConditionAt, fields: Fields, trigger: ReactElement): ReactElement {
	const body = at.index === "spread" ? spreadBody(state, at) : conditionBody(state, at, fields, at.step ?? "");
	return editorPopover(
		state,
		`${at.list}:${at.key}#${at.index}`,
		trigger,
		h("div", { className: "wg-set-pop-body" }, body),
		"",
		at.step !== null,
	);
}

function fixedCondition(state: SettingsState, fields: Fields, row: FilterRow, index: number): ReactElement {
	return h(Row, { className: "wg-set-row", key: `fixed${index}` }, [
		h(RowLabel, { key: "label" }, conditionSentence(state, fields, row)),
		h(RowValue, { className: "wg-set-value", key: "value" }, h(Pill, null, "Fixed")),
	]);
}

function addRow(said: string): ReactElement {
	return h(Row, { className: "wg-set-row is-add", pressable: true }, [
		h(Icon, { name: "plus", key: "plus" }),
		h(RowLabel, { key: "label" }, said),
	]);
}
