import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Row, RowLabel, RowValue, Switch } from "@widgetarium/kit";
import { isShown } from "../prop-visibility.js";
import { clamp } from "./canvas-input.js";
import { boundProp, declaredProps, propRow } from "./prop-row.js";
import { editorPopover, group, textEditor, valueRow } from "./settings-rows.js";
import type { SettingsState } from "./settings-state.js";
import { mountSurfaceGroup, surfaceGroup } from "./surface-group.js";
import type { Place } from "./window-geometry.js";

const SIZE_ON_THE_BOARD =
	"The widget is drawn at the size it has on the board, so a change here is visible behind the panel.";

type Axis = keyof Place;

export function designGroups(state: SettingsState): ReactElement[] {
	const own = declaredProps(state.manifest, (spec) => spec.design === true)
		.filter(([, spec]) => isShown(spec, state.seen))
		.map(([key, spec]) => propRow(state, boundProp(state, key, spec)));
	const placement = state.isMount
		? [mountSurfaceGroup(state)]
		: [surfaceGroup(state), sizeOnBoardGroup(state), foldGroup(state)];
	const groups = [...placement, own.length > 0 ? group("design:own", "This widget", own, null) : null].filter(
		(drawn): drawn is ReactElement => drawn !== null,
	);
	if (groups.length > 0) return groups;
	return [
		group(
			"no-design",
			"Design",
			h(Row, { className: "wg-set-row" }, h(RowLabel, null, "This widget is drawn at the size its row gives it")),
			null,
		),
	];
}

function sizeRow(state: SettingsState, axis: Axis, label: string, apply: (cellsWanted: number) => void): ReactElement {
	const cellsNow = state.place[axis];
	return editorPopover(
		state,
		`size:${axis}`,
		valueRow({ label, value: `${cellsNow} cells` }),
		textEditor(state, String(cellsNow), (typed) => apply(Number(typed))),
	);
}

function sizeOnBoardGroup(state: SettingsState): ReactElement | null {
	const { place, columns, onResize } = state;
	if (!onResize) return null;
	const cellsOr = (cellsWanted: number, cellsNow: number): number =>
		Number.isFinite(cellsWanted) ? cellsWanted : cellsNow;
	return group(
		"size",
		"Size on the board",
		[
			sizeRow(state, "w", "Width", (cellsWanted) => onResize({ w: clamp(cellsOr(cellsWanted, place.w), 1, columns) })),
			sizeRow(state, "h", "Height", (cellsWanted) => onResize({ h: Math.max(1, cellsOr(cellsWanted, place.h)) })),
		],
		SIZE_ON_THE_BOARD,
	);
}

function foldGroup({ isCollapsed, onCollapse, onExpand }: SettingsState): ReactElement | null {
	if (!onCollapse) return null;
	const switching = h(Switch, {
		checked: isCollapsed,
		label: "Folded",
		onChange: (next: boolean) => (next ? onCollapse() : onExpand?.()),
	});
	return group(
		"fold",
		"Folded",
		h(Row, { className: "wg-set-row" }, [
			h(RowLabel, { key: "label" }, "Fold to one column"),
			h(RowValue, { className: "wg-set-value", key: "value" }, switching),
		]),
		null,
	);
}
