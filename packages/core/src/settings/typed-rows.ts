import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Button, CodeArea, Icon, Row, RowLabel, RowValue, SidebarGroup } from "@widgetarium/kit";
import type { TileProp } from "../model.js";
import { declaredOf, describedFields, typedIn, withTyped } from "../gateway/props.js";
import type { DescribedField, PropBinding } from "../gateway/props.js";
import { isObject } from "../engine/is-object.js";
import { readYaml, yamlOf } from "./item-yaml.js";
import type { Item } from "./item-yaml.js";
import { FIELDS_SHOWN, TYPED_HERE, writeProp, writtenText } from "./prop-writing.js";
import { draftOnInput, shownValue } from "./settings-rows.js";
import type { SettingsSpec, SettingsState } from "./settings-state.js";

const ITEM_IS_YAML = "YAML, one field per line. A field marked optional may stay empty.";

interface WrappedRow {
	readonly id: unknown;
	readonly value: unknown;
}

export function openedItem(openRow: string | null, key: string): number | null {
	const at = String(openRow ?? "").startsWith(`prop:${key}#`) ? Number(String(openRow).split("#")[1]) : NaN;
	return Number.isInteger(at) ? at : null;
}

export function itemBody(
	state: SettingsState,
	key: string,
	spec: SettingsSpec,
	config: TileProp,
	index: number,
): ReactNode[] {
	const fields = itemFields(spec) ?? [];
	const rows = listedItems(spec, config);
	const isExisting = index < rows.length;
	const read = readYaml(state.draft, fields);
	const write = (next: readonly unknown[]): void => {
		writeProp(state, key, spec, withTyped(spec, { ...config, from: TYPED_HERE }, next));
		state.openEditor(`prop:${key}`, writtenText(spec, next));
	};
	const apply = (): void => {
		if (read.failure !== undefined) return;
		write(isExisting ? rows.map((row, at) => (at === index ? rowWith(row, read.item) : row)) : [...rows, read.item]);
	};
	return [
		h(CodeArea, { key: "yaml", value: state.draft ?? "", onInput: draftOnInput(state) }),
		h(
			"p",
			{ className: read.failure ? "wg-set-pop-error" : "wg-set-pop-note", key: "note" },
			read.failure ?? ITEM_IS_YAML,
		),
		h("div", { className: "wg-set-pop-foot", key: "foot" }, [
			isExisting
				? h(Button, { size: "s", key: "remove", onClick: () => write(rows.filter((_, at) => at !== index)) }, "Remove")
				: h(Button, { size: "s", key: "back", onClick: () => state.openEditor(`prop:${key}`, "") }, "Back"),
			h(
				Button,
				{ size: "s", variant: "accent", key: "apply", disabled: Boolean(read.failure), onClick: apply },
				"Apply",
			),
		]),
	];
}

export function itemRows(state: SettingsState, key: string, spec: SettingsSpec, config: TileProp): ReactElement[] {
	const fields = itemFields(spec) ?? [];
	const open = (index: number, item: Item): void => state.openEditor(`prop:${key}#${index}`, yamlOf(fields, item));
	const listed = listedItems(spec, config).map((row, index) => {
		const item = itemOf(row);
		return h(Row, { key: `item${index}`, pressable: true, className: "wg-set-row", onClick: () => open(index, item) }, [
			h(RowLabel, { key: "label" }, String(item[fields[0]?.key ?? ""] ?? "") || "Empty"),
			h(RowValue, { className: "wg-set-value", key: "value" }, shownValue(item[fields[1]?.key ?? ""], null) ?? ""),
		]);
	});
	const add = h(
		Row,
		{ key: "add", pressable: true, className: "wg-set-row is-add", onClick: () => open(listed.length, {}) },
		[h(Icon, { name: "plus", key: "plus" }), h(RowLabel, { key: "label" }, "Add item")],
	);
	return [h(SidebarGroup, { className: "wg-set-group", key: "items" }, [...listed, add])];
}

export function collectionFields(spec: SettingsSpec): readonly DescribedField[] | null {
	return spec.kind !== "value" ? itemFields(spec) : null;
}

export function listedFields(spec: SettingsSpec, binding: PropBinding): readonly DescribedField[] | null {
	return binding === "hardcode" ? collectionFields(spec) : null;
}

function itemFields(spec: SettingsSpec): readonly DescribedField[] | null {
	const fields = describedFields(spec).slice(0, FIELDS_SHOWN);
	return fields.length > 0 ? fields : null;
}

function listedItems(spec: SettingsSpec, config: TileProp): readonly unknown[] {
	const held = typedIn(spec, config) ?? declaredOf(spec);
	return Array.isArray(held) ? held : [];
}

function isWrappedRow(row: unknown): row is WrappedRow {
	return isObject(row) && "id" in row && "value" in row;
}

function itemOf(row: unknown): Item {
	const held = isWrappedRow(row) ? row.value : row;
	return isObject(held) ? held : {};
}

function rowWith(row: unknown, item: Item): unknown {
	return isWrappedRow(row) ? { ...row, value: item } : item;
}
