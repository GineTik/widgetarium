import { createElement as h } from "react";
import type { ReactElement } from "react";
import { SidebarGroup } from "@widgetarium/kit";
import { matchesNeedle, referenceText, widgetsOffering } from "../ref-draft.js";
import type { ReferenceDraft } from "../ref-draft.js";
import type { GatewayRefs, RefDescription } from "../gateway/refs.js";
import { isObject } from "../engine/is-object.js";
import { note, pickRow } from "./settings-rows.js";
import type { SettingsState } from "./settings-state.js";

export const NOTHING_OFFERED = "Nothing else on this board offers a value yet.";

const FROM_A_WIDGET = "From another widget";

const PICK_WIDGET = "Which widget is it read from?";

const PICK_ITS_FIELD = "Which of its fields?";

const NO_SUCH_BOX = "Nothing on this board is called that.";

export type OfferedEntry = RefDescription & { readonly ref: string };

export type OfferingState = Pick<SettingsState, "refs">;

type BoxesState = Pick<SettingsState, "refs" | "manifest" | "tile">;

type PickEntry = (entry: OfferedEntry) => void;

export function offeredEntries(refs: GatewayRefs | null | undefined): OfferedEntry[] {
	return (refs?.offered?.() ?? []).filter(hasRef);
}

export function refLabel(state: OfferingState, ref: unknown): string {
	const found = offeredEntries(state.refs).find((entry) => entry.ref === ref);
	return found ? offeredLabelOf(found) : String(ref ?? "");
}

export function offeredLabelOf(entry: OfferedEntry): string {
	return `${entry.title} · ${entry.label}`;
}

export function offeredBoxes(state: BoxesState, shape: string): Map<string, OfferedEntry[]> {
	const mine = new Set(Object.keys(state.manifest.props ?? {}).map((name) => `${state.tile.id}/${name}`));
	const byTitle = new Map<string, OfferedEntry[]>();
	for (const entry of offeredEntries(state.refs)) {
		if (!fitsSlot(entry, shape, mine)) continue;
		byTitle.set(entry.title, [...(byTitle.get(entry.title) ?? []), entry]);
	}
	return byTitle;
}

export function boxRows(state: BoxesState, shape: string, onPick: PickEntry): ReactElement[] {
	const offered = offeredValues(state, shape);
	if (offered.length === 0) return [note(NOTHING_OFFERED)];
	return [
		h(
			SidebarGroup,
			{ key: "boxes", label: FROM_A_WIDGET },
			offered.map((entry) => pickRow(entry.ref, `${entry.title} · ${entry.label}`, () => onPick(entry))),
		),
	];
}

export function offeredValues(state: BoxesState, shape: string): OfferedEntry[] {
	return [...offeredBoxes(state, shape).values()].flat();
}

export function completionRows(
	said: ReferenceDraft | null,
	offered: readonly OfferedEntry[],
	setDraft: (next: string) => void,
	onPick: PickEntry,
): ReactElement[] {
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

export function draftOf(value: unknown, state: OfferingState): string {
	const ref = isObject(value) ? value["ref"] : undefined;
	if (typeof ref !== "string") return typeof value === "object" ? "" : String(value ?? "");
	const found = offeredEntries(state.refs).find((entry) => entry.ref === ref);
	return found ? referenceText(found.tile, found.prop) : "";
}

function hasRef(entry: RefDescription): entry is OfferedEntry {
	return typeof entry.ref === "string";
}

function fitsSlot(entry: OfferedEntry, shape: string, mine: ReadonlySet<string>): boolean {
	return !mine.has(entry.ref) && entry.kind === "value" && (entry.shape ?? "value") === shape;
}

function widgetRows(offered: readonly OfferedEntry[], needle: string, onPick: (tile: string) => void): ReactElement[] {
	return widgetsOffering(offered)
		.filter((entry) => matchesNeedle(entry.tile, needle) || matchesNeedle(entry.title, needle))
		.map((entry) => pickRow(entry.tile, entry.tile, () => onPick(entry.tile)));
}

function boxFieldRows(
	offered: readonly OfferedEntry[],
	tile: string,
	needle: string,
	onPick: PickEntry,
): ReactElement[] {
	return offered
		.filter((entry) => entry.tile === tile && (matchesNeedle(entry.prop, needle) || matchesNeedle(entry.label, needle)))
		.map((entry) => pickRow(entry.ref, entry.prop, () => onPick(entry)));
}
