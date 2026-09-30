import { createElement as h } from "react";
import type { ReactElement } from "react";
import { PopoverItem } from "@widgetarium/kit";
import { SLOT_SURFACES } from "../surface-roles.js";
import { APART, SIDES } from "../tree.js";
import { saidRefusal } from "../surface-laws.js";
import type { SurfaceChoice } from "../surface-laws.js";
import type { SurfaceSide } from "../tree-nodes.js";
import { editorPopover, group, pickRow, titleCase, valueRow } from "./settings-rows.js";
import type { SettingsState } from "./settings-state.js";

export interface TileSurface {
	readonly now: string;
	readonly side: SurfaceSide | null;
	readonly choices: () => readonly SurfaceChoice[];
	readonly wear: (surface: string, side: SurfaceSide | string | null) => void;
}

interface ChoiceRow {
	readonly key: string;
	readonly label: string;
	readonly said: string | undefined;
	readonly refusal: SurfaceChoice["refusal"];
	readonly selected: boolean;
	readonly onPick: () => void;
}

type SurfaceState = Pick<SettingsState, "surface" | "openRow" | "openEditor" | "draft" | "setDraft">;

type MountSurfaceState = Pick<SettingsState, "tile" | "onPatch" | "openRow" | "openEditor" | "draft" | "setDraft">;

const SURFACE_SAYS: Readonly<Record<string, string>> = {
	group: "A white plate on the grey page.",
	apart: "One straight line.",
	none: "Nothing is drawn.",
};

const SIDE_SAYS: Readonly<Record<string, string>> = { start: "Above it, or before it.", end: "Below it, or after it." };

const SURFACE_HERE = "What is drawn around this widget where it stands. The board decides its corners and its padding.";

const AS_ITS_HOLDER_DRAWS_IT = "As its holder draws it";

const MOUNT_SURFACE_NOTE = "The plate this widget stands on inside the one holding it.";

export function surfaceGroup(state: SurfaceState): ReactElement | null {
	const worn = state.surface;
	if (!worn) return null;
	const rows = [surfaceRow(state, worn), sideRow(state, worn)].filter(Boolean);
	return group("surface", "Surface", rows, SURFACE_HERE);
}

export function mountSurfaceGroup(state: MountSurfaceState): ReactElement {
	const worn = state.tile.surface ?? null;
	const wear = (surface: string | null): void => {
		state.onPatch({ surface: surface ?? undefined });
		state.openEditor(null);
	};
	const choices = [
		pickRow("holder", AS_ITS_HOLDER_DRAWS_IT, () => wear(null), worn === null),
		...SLOT_SURFACES.map((surface) => pickRow(surface, titleCase(surface), () => wear(surface), surface === worn)),
	];
	const trigger = valueRow({ label: "Surface", value: worn ? titleCase(worn) : AS_ITS_HOLDER_DRAWS_IT });
	const row = editorPopover(state, "mount-surface", trigger, h("div", { className: "wg-set-pop-body" }, choices));
	return group("mount-surface", "Surface", row, MOUNT_SURFACE_NOTE);
}

function choiceRow({ key, label, said, refusal, selected, onPick }: ChoiceRow): ReactElement {
	return h(
		PopoverItem,
		{
			key,
			checked: selected,
			sub: refusal ? saidRefusal(refusal) : said,
			disabled: Boolean(refusal),
			onClick: refusal ? undefined : onPick,
		},
		[h("span", { className: "wg-set-pop-name", key: "name" }, label)],
	);
}

function surfacePicks(state: SurfaceState, worn: TileSurface): ReactElement[] {
	const pick = (surface: string): void => {
		worn.wear(surface, worn.side);
		state.openEditor(null);
	};
	return worn.choices().map(({ surface, refusal }) =>
		choiceRow({
			key: surface,
			label: titleCase(surface),
			said: SURFACE_SAYS[surface],
			refusal,
			selected: surface === worn.now,
			onPick: () => pick(surface),
		}),
	);
}

function sidePicks(state: SurfaceState, worn: TileSurface): ReactElement[] {
	const facing = worn.side ?? "end";
	const pick = (side: string): void => {
		worn.wear(APART, side);
		state.openEditor(null);
	};
	return SIDES.map((side) =>
		choiceRow({
			key: side,
			label: titleCase(side),
			said: SIDE_SAYS[side],
			refusal: null,
			selected: side === facing,
			onPick: () => pick(side),
		}),
	);
}

// TRADE-OFF: the laws are walked only while the popover stands open — the trigger renders on every pan frame, and six walks of the tree per frame is what that cost
function surfaceRow(state: SurfaceState, worn: TileSurface): ReactElement {
	const body =
		state.openRow === "surface" ? h("div", { className: "wg-set-pop-body" }, surfacePicks(state, worn)) : null;
	return editorPopover(state, "surface", valueRow({ label: "Surface", value: titleCase(worn.now) }), body);
}

function sideRow(state: SurfaceState, worn: TileSurface): ReactElement | null {
	if (worn.now !== APART) return null;
	const body = h("div", { className: "wg-set-pop-body" }, sidePicks(state, worn));
	return editorPopover(state, "surface-side", valueRow({ label: "Side", value: titleCase(worn.side ?? "end") }), body);
}
