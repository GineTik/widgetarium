import { createElement as h } from "react";
import { Row, RowLabel, RowValue, Switch } from "@widgetarium/kit";
import { isShown } from "../prop-visibility.js";
import { clamp } from "./canvas-input.js";
import { boundProp, declaredProps, propRow } from "./prop-row.js";
import { editorPopover, group, textEditor, valueRow } from "./settings-rows.js";
import { mountSurfaceGroup, surfaceGroup } from "./surface-group.js";

export function designGroups(state) {
	const own = declaredProps(state.manifest, (spec) => spec.design === true)
		.filter(([, spec]) => isShown(spec, state.seen))
		.map(([key, spec]) => propRow(state, boundProp(state, key, spec)));
	const placement = state.isMount
		? [mountSurfaceGroup(state)]
		: [surfaceGroup(state), sizeOnBoardGroup(state), foldGroup(state)];
	const groups = [...placement, own.length > 0 ? group("design:own", "This widget", own, null) : null].filter(Boolean);
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

function sizeOnBoardGroup(state) {
	const { place, columns, onResize } = state;
	const sizeRow = (axis, label, cellsNow, apply) =>
		editorPopover(
			state,
			`size:${axis}`,
			valueRow({ label, value: `${cellsNow} cells` }),
			textEditor(state, String(cellsNow), (typed) => apply(Number(typed))),
		);
	if (!onResize) return null;
	return group(
		"size",
		"Size on the board",
		[
			sizeRow("w", "Width", place.w, (cellsWanted) =>
				onResize({ w: clamp(Number.isFinite(cellsWanted) ? cellsWanted : place.w, 1, columns) }),
			),
			sizeRow("h", "Height", place.h, (cellsWanted) =>
				onResize({ h: Math.max(1, Number.isFinite(cellsWanted) ? cellsWanted : place.h) }),
			),
		],
		"The widget is drawn at the size it has on the board, so a change here is visible behind the panel.",
	);
}

function foldGroup({ isCollapsed, onCollapse, onExpand }) {
	if (!onCollapse) return null;
	const switching = h(Switch, {
		checked: isCollapsed,
		label: "Folded",
		onChange: (next) => (next ? onCollapse() : onExpand()),
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
