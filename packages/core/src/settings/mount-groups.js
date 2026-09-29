import { createElement as h } from "react";
import { declaredName } from "../registry.js";
import { heldKey, keepNamedRecords, mountList, mountRows, mountRowToStore, uniqueName, withoutKey } from "../model.js";
import { Icon, IconButton, Pill, Row, RowLabel, RowValue } from "@widgetarium/kit";
import { CatalogueDialog } from "../catalogue-dialog.js";
import { shownEntries } from "../prop-visibility.js";
import { editorPopover, enterButton, group, textEditor, titleCase } from "./settings-rows.js";

// TRADE-OFF: no rank — a mount hands nothing down, so slotFit has no clause to weigh
export function mountGroups(state) {
	const { manifest, tile, registry, host, onPatch } = state;
	return shownEntries(manifest.mounts, state.seen).map(([name, spec]) => {
		const rows = mountRows(mountList(tile, name, spec), (id) => declaredName(registry, id));
		const write = mountWrite(tile, name, spec, onPatch);
		const add = (id) => {
			write([
				...rows,
				{ name: uniqueName(new Set(rows.map((row) => row.name)), declaredName(registry, id)), widget: id },
			]);
			state.openEditor(null);
		};
		const key = `mount:${name}`;
		const picker = mountPicker(state, key, add);
		const rename = (next, index) =>
			write(next, moveRecord(tile.mounted, heldKey(tile.mounted, rows[index].name, rows[index].was), next[index].name));
		const drawn = rows.map((row, index) => mountRow(state, rows, index, write, rename));
		return group(key, spec?.label ?? titleCase(name), [...drawn, picker], spec?.hint ?? null);
	});
}

function moveRecord(held, from, to) {
	if (from === to || !held?.[from]) return held ?? {};
	const { [from]: moved, ...rest } = held;
	return { ...rest, [to]: moved };
}

function renameRow(rows, index, wanted) {
	const taken = new Set(rows.filter((row, at) => at !== index).map((row) => row.name));
	return rows.map((row, at) => (at === index ? { ...row, name: uniqueName(taken, wanted) } : row));
}

function moveRow(rows, index, step) {
	const to = index + step;
	if (to < 0 || to >= rows.length) return rows;
	const next = [...rows];
	[next[index], next[to]] = [next[to], next[index]];
	return next;
}

function moveButton({ rows, index, write }, step, label, glyph) {
	const at = index + step;
	if (at < 0 || at >= rows.length) return null;
	return h(
		IconButton,
		{
			size: "s",
			key: label,
			label,
			onClick: (event) => {
				event.stopPropagation();
				write(moveRow(rows, index, step));
			},
		},
		h(Icon, { name: glyph }),
	);
}

function mountRow(state, rows, index, write, rename) {
	const { registry } = state;
	const row = rows[index];
	const found = registry.get(row.widget);
	const key = `mount:${row.widget}:${index}`;
	const drop = (event) => {
		event.stopPropagation();
		write(rows.filter((entry, at) => at !== index));
	};
	const trigger = h(Row, { pressable: true, className: "wg-set-row" }, [
		h(RowLabel, { className: "wg-set-two", key: "label" }, [
			row.name,
			h("span", { className: "wg-set-sub is-mono", key: "sub" }, row.widget),
		]),
		h(RowValue, { className: "wg-set-value", key: "value" }, [
			found?.component ? null : h(Pill, { tone: "error", key: "gone" }, "Not installed"),
			moveButton({ rows, index, write }, -1, "Move up", "chevron-up"),
			moveButton({ rows, index, write }, 1, "Move down", "chevron-down"),
			found?.component
				? enterButton(state, { hold: "mounted", key: row.name, was: row.was, widget: row.widget })
				: null,
			h(IconButton, { size: "s", key: "drop", label: "Remove", onClick: drop }, h(Icon, { name: "close" })),
		]),
	]);
	const apply = (typed) => rename(renameRow(rows, index, typed.trim() || declaredName(registry, row.widget)), index);
	return editorPopover(state, key, trigger, textEditor(state, row.name, apply), row.name);
}

function mountWrite(tile, name, spec, onPatch) {
	return (next, moved) =>
		onPatch({
			mounts: { ...withoutKey(tile.mounts, spec?.was), [name]: next.map(mountRowToStore) },
			settings: withoutKey(withoutKey(tile.settings, spec?.was), name),
			mounted: keepNamedRecords(moved ?? tile.mounted, next),
		});
}

function mountPicker(state, key, onPick) {
	const trigger = h(Row, { pressable: true, className: "wg-set-row is-add", onClick: () => state.openEditor(key) }, [
		h(Icon, { name: "plus" }),
		h(RowLabel, { key: "label" }, "Add a view"),
	]);
	const dialog = h(CatalogueDialog, {
		key: "pick",
		registry: state.registry,
		host: state.host,
		mode: "mount",
		onPick,
		onClose: () => state.openEditor(null),
	});
	return h("div", { className: "wg-set-slot", key: "add" }, [trigger, state.openRow === key ? dialog : null]);
}
