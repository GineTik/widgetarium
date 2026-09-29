import { createElement as h } from "react";
import { SidebarGroup } from "@widgetarium/kit";
import { matchesNeedle, referenceText, widgetsOffering } from "../ref-draft.js";
import { note, pickRow } from "./settings-rows.js";

export const NOTHING_OFFERED = "Nothing else on this board offers a value yet.";

const FROM_A_WIDGET = "From another widget";

const PICK_WIDGET = "Which widget is it read from?";

const PICK_ITS_FIELD = "Which of its fields?";

const NO_SUCH_BOX = "Nothing on this board is called that.";

export function refLabel(state, ref) {
	const found = state.refs?.offered?.().find((entry) => entry.ref === ref);
	return found ? `${found.title} · ${found.label}` : ref;
}

export function offeredBoxes(state, shape) {
	const mine = new Set(Object.keys(state.manifest.props ?? {}).map((name) => `${state.tile.id}/${name}`));
	const byTitle = new Map();
	for (const entry of state.refs?.offered?.() ?? []) {
		if (!fitsSlot(entry, shape, mine)) continue;
		byTitle.set(entry.title, [...(byTitle.get(entry.title) ?? []), entry]);
	}
	return byTitle;
}

export function boxRows(state, shape, onPick) {
	const offered = [...offeredBoxes(state, shape).values()].flat();
	if (offered.length === 0) return [note(NOTHING_OFFERED)];
	return [
		h(
			SidebarGroup,
			{ key: "boxes", label: FROM_A_WIDGET },
			offered.map((entry) => pickRow(entry.ref, `${entry.title} · ${entry.label}`, () => onPick(entry))),
		),
	];
}

export function offeredValues(state, shape) {
	return [...offeredBoxes(state, shape).values()].flat();
}

export function completionRows(state, said, offered, setDraft, onPick) {
	if (!said)
		return [
			h(
				SidebarGroup,
				{ key: "boxes", label: FROM_A_WIDGET },
				widgetRows(offered, "", (tile) => setDraft(referenceText(tile))),
			),
		];
	if (said.tile === null) {
		return [
			note(PICK_WIDGET),
			h(
				SidebarGroup,
				{ key: "boxes", label: FROM_A_WIDGET },
				widgetRows(offered, said.needle, (tile) => setDraft(referenceText(tile))),
			),
		];
	}
	const rows = boxFieldRows(offered, said.tile, said.needle, onPick);
	return [
		note(rows.length === 0 ? NO_SUCH_BOX : PICK_ITS_FIELD),
		h(SidebarGroup, { key: "boxes", label: FROM_A_WIDGET }, rows),
	];
}

export function draftOf(value, state) {
	if (typeof value?.ref !== "string") return typeof value === "object" ? "" : String(value ?? "");
	const found = state.refs?.offered?.().find((entry) => entry.ref === value.ref);
	return found ? referenceText(found.tile, found.prop) : "";
}

function fitsSlot(entry, shape, mine) {
	return !mine.has(entry.ref) && entry.kind === "value" && (entry.shape ?? "value") === shape;
}

function widgetRows(offered, needle, onPick) {
	return widgetsOffering(offered)
		.filter((entry) => matchesNeedle(entry.tile, needle) || matchesNeedle(entry.title, needle))
		.map((entry) => pickRow(entry.tile, entry.tile, () => onPick(entry.tile)));
}

function boxFieldRows(offered, tile, needle, onPick) {
	return offered
		.filter((entry) => entry.tile === tile && (matchesNeedle(entry.prop, needle) || matchesNeedle(entry.label, needle)))
		.map((entry) => pickRow(entry.ref, entry.prop, () => onPick(entry)));
}
