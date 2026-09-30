import { createElement as h } from "react";
import type { ReactElement, SyntheticEvent } from "react";
import { declaredLabel, declaredName } from "../registry.js";
import { heldKey, keepNamedRecords, mountList, mountRows, mountRowToStore, uniqueName, withoutKey } from "../model.js";
import type { HeldRecord, Tile } from "../model.js";
import type { MountRow, MountRowLike } from "../held-records.js";
import { Icon, IconButton, Pill, Row, RowLabel, RowValue } from "@widgetarium/kit";
import { CatalogueDialog } from "../catalogue-dialog.js";
import { shownEntries } from "../prop-visibility.js";
import { mountSpecsOf } from "../manifest-holds.js";
import type { MountsSpec } from "../manifest-holds.js";
import type { WindowState } from "../settings-window.js";
import type { TilePatch } from "./settings-state.js";
import { editorPopover, enterButton, group, textEditor, titleCase } from "./settings-rows.js";

type MountedRecords = Readonly<Record<string, HeldRecord>>;

type WriteRows = (next: readonly MountRowLike[], moved?: MountedRecords) => void;

type RenameRow = (next: readonly MountRow[], index: number) => void;

interface MountRowAt {
	readonly rows: readonly MountRow[];
	readonly row: MountRow;
	readonly index: number;
	readonly write: WriteRows;
	readonly rename: RenameRow;
}

interface MoveAt {
	readonly rows: readonly MountRow[];
	readonly index: number;
	readonly write: WriteRows;
}

// TRADE-OFF: no rank — a mount hands nothing down, so slotFit has no clause to weigh
export function mountGroups(state: WindowState): ReactElement[] {
	const { tile, registry, onPatch } = state;
	return shownEntries(mountSpecsOf(state.manifest), state.seen).map(([name, spec]) => {
		const rows = mountRows(mountList(tile, name, spec), (id) => declaredLabel(registry, id));
		const write = mountWrite(tile, name, spec, onPatch);
		const add = (id: string): void => {
			write([
				...rows,
				{ name: uniqueName(new Set(rows.map((row) => row.name)), declaredName(registry, id)), widget: id },
			]);
			state.openEditor(null);
		};
		const key = `mount:${name}`;
		const picker = mountPicker(state, key, add);
		const rename: RenameRow = (next, index) => {
			const was = rows[index];
			const now = next[index];
			if (!was || !now) return;
			write(next, moveRecord(tile.mounted, heldKey(tile.mounted, was.name, was.was), now.name));
		};
		const drawn = rows.map((row, index) => mountRow(state, { rows, row, index, write, rename }));
		return group(key, spec.label ?? titleCase(name), [...drawn, picker], spec.hint ?? null);
	});
}

function moveRecord(held: MountedRecords, from: string, to: string): MountedRecords {
	const { [from]: moved, ...rest } = held;
	if (from === to || !moved) return held;
	return { ...rest, [to]: moved };
}

function renameRow(rows: readonly MountRow[], index: number, wanted: string): MountRow[] {
	const taken = new Set(rows.filter((_row, at) => at !== index).map((row) => row.name));
	return rows.map((row, at) => (at === index ? { ...row, name: uniqueName(taken, wanted) } : row));
}

function moveRow(rows: readonly MountRow[], index: number, step: number): readonly MountRow[] {
	const to = index + step;
	const moving = rows[index];
	const displaced = rows[to];
	if (!moving || !displaced) return rows;
	return rows.map((row, at) => {
		if (at === index) return displaced;
		return at === to ? moving : row;
	});
}

function moveButton({ rows, index, write }: MoveAt, step: number, label: string, glyph: string): ReactElement | null {
	const at = index + step;
	if (at < 0 || at >= rows.length) return null;
	return h(
		IconButton,
		{
			size: "s",
			key: label,
			label,
			onClick: (event: SyntheticEvent) => {
				event.stopPropagation();
				write(moveRow(rows, index, step));
			},
		},
		h(Icon, { name: glyph }),
	);
}

function mountRow(state: WindowState, { rows, row, index, write, rename }: MountRowAt): ReactElement {
	const found = state.registry.get(row.widget);
	const key = `mount:${row.widget}:${index}`;
	const drop = (event: SyntheticEvent): void => {
		event.stopPropagation();
		write(rows.filter((_entry, at) => at !== index));
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
	const apply = (typed: string): void =>
		rename(renameRow(rows, index, typed.trim() || declaredLabel(state.registry, row.widget)), index);
	return editorPopover(state, key, trigger, textEditor(state, row.name, apply), row.name);
}

function mountWrite(tile: Tile, name: string, spec: MountsSpec, onPatch: (patch: TilePatch) => void): WriteRows {
	return (next, moved) =>
		onPatch({
			mounts: { ...withoutKey(tile.mounts, spec.was), [name]: next.map(mountRowToStore) },
			settings: withoutKey(withoutKey(tile.settings, spec.was), name),
			mounted: keepNamedRecords(moved ?? tile.mounted, next),
		});
}

function mountPicker(state: WindowState, key: string, onPick: (id: string) => void): ReactElement {
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
