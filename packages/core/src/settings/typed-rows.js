import { createElement as h } from "react";
import { Button, CodeArea, Icon, Row, RowLabel, RowValue, SidebarGroup } from "@widgetarium/kit";
import { declaredOf, describedFields, typedIn, withTyped } from "../gateway/props.js";
import { readYaml, yamlOf } from "./item-yaml.js";
import { FIELDS_SHOWN, TYPED_HERE, writeProp, writtenText } from "./prop-writing.js";
import { shownValue } from "./settings-rows.js";

const ITEM_IS_YAML = "YAML, one field per line. A field marked optional may stay empty.";

export function openedItem(openRow, key) {
	const at = String(openRow ?? "").startsWith(`prop:${key}#`) ? Number(String(openRow).split("#")[1]) : NaN;
	return Number.isInteger(at) ? at : null;
}

export function itemBody(state, key, spec, config, index) {
	const fields = itemFields(spec);
	const rows = listedItems(spec, config);
	const isExisting = index < rows.length;
	const read = readYaml(state.draft, fields);
	const write = (next) => {
		writeProp(state, key, spec, withTyped(spec, { ...config, from: TYPED_HERE }, next));
		state.openEditor(`prop:${key}`, writtenText(spec, next));
	};
	return [
		h(CodeArea, { key: "yaml", value: state.draft ?? "", onInput: (event) => state.setDraft(event.target.value) }),
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
				{
					size: "s",
					variant: "accent",
					key: "apply",
					disabled: Boolean(read.failure),
					onClick: () => {
						if (read.failure) return;
						write(
							isExisting ? rows.map((row, at) => (at === index ? rowWith(row, read.item) : row)) : [...rows, read.item],
						);
					},
				},
				"Apply",
			),
		]),
	];
}

export function itemRows(state, key, spec, config) {
	const fields = itemFields(spec);
	const rows = listedItems(spec, config);
	const open = (index, item) => state.openEditor(`prop:${key}#${index}`, yamlOf(fields, item));
	const listed = rows.map((row, index) => {
		const item = itemOf(row);
		return h(Row, { key: `item${index}`, pressable: true, className: "wg-set-row", onClick: () => open(index, item) }, [
			h(RowLabel, { key: "label" }, String(item[fields[0].key] ?? "") || "Empty"),
			h(RowValue, { className: "wg-set-value", key: "value" }, shownValue(item[fields[1]?.key], null) ?? ""),
		]);
	});
	const add = h(
		Row,
		{ key: "add", pressable: true, className: "wg-set-row is-add", onClick: () => open(rows.length, {}) },
		[h(Icon, { name: "plus", key: "plus" }), h(RowLabel, { key: "label" }, "Add item")],
	);
	return [h(SidebarGroup, { className: "wg-set-group", key: "items" }, [...listed, add])];
}

export function collectionFields(spec) {
	return spec.kind !== "value" && itemFields(spec);
}

export function listedFields(spec, binding) {
	return binding === "hardcode" && collectionFields(spec);
}

function itemFields(spec) {
	const fields = describedFields(spec).slice(0, FIELDS_SHOWN);
	return fields.length > 0 ? fields : null;
}

function listedItems(spec, config) {
	const held = typedIn(spec, config) ?? declaredOf(spec);
	return Array.isArray(held) ? held : [];
}

const isWrappedRow = (row) => Boolean(row) && typeof row === "object" && "id" in row && "value" in row;

const itemOf = (row) => (isWrappedRow(row) ? row.value : row) ?? {};

const rowWith = (row, item) => (isWrappedRow(row) ? { ...row, value: item } : item);
