import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Icon } from "@widgetarium/kit";
import { CatalogueDialog } from "../catalogue-dialog.js";
import { shownEntries } from "../prop-visibility.js";
import { reactClash, slotFit } from "../fit.js";
import type { SlotFit } from "../fit.js";
import type { Fields } from "../engine/catalogue-index.js";
import { slotSpecsOf } from "../manifest-holds.js";
import type { SlotSpec } from "../manifest-holds.js";
import { SLOT_SURFACES, slotSurfaceOf } from "../surface-roles.js";
import type { WindowState } from "../settings-window.js";
import type { TilePatch } from "./settings-state.js";
import { editorPopover, enterButton, group, pickRow, titleCase, valueRow } from "./settings-rows.js";

interface SlotAt {
	readonly name: string;
	readonly spec: SlotSpec;
	readonly chosen: string;
}

export function slotGroup(state: WindowState): ReactElement | null {
	const rows = slotRows(state);
	if (rows.length === 0) return null;
	return group("slots", "Slots", rows, "A hole this widget fills with another widget.");
}

function hasOwnProps(manifest: Fields | null | undefined, fed: readonly string[]): boolean {
	return Object.keys(manifest?.["props"] ?? {}).some((key) => !fed.includes(key));
}

function slotRows(state: WindowState): ReactElement[] {
	const picks = state.tile.slots ?? {};
	return shownEntries(slotSpecsOf(state.manifest), state.seen).map(([name, spec]) =>
		slotRow(state, { name, spec, chosen: picks[name]?.widget ?? spec.default ?? "" }),
	);
}

function slotRow(state: WindowState, { name, spec, chosen }: SlotAt): ReactElement {
	const { manifest, tile, registry, host, onPatch } = state;
	const picks = tile.slots ?? {};
	const parentReact = registry.get(manifest.id)?.react;
	const clashWith = (id: string | undefined): string | null => reactClash(parentReact, registry.get(id)?.react);
	const held = registry.get(chosen);
	const key = `slot:${name}`;
	const write = (id: string | null): void => {
		const clash = clashWith(id ?? undefined);
		if (clash) {
			host?.ui?.notify(clash);
			return;
		}
		const { [name]: dropped, ...rest } = picks;
		const worn = dropped?.surface ? { surface: dropped.surface } : null;
		const slots: Readonly<Record<string, TilePatch>> = id
			? { ...picks, [name]: { ...worn, widget: id } }
			: { ...rest, ...(worn ? { [name]: worn } : {}) };
		onPatch({ slots });
		state.openEditor(null);
	};
	const wear = (surface: string): void => {
		onPatch({ slots: { ...picks, [name]: { ...picks[name], surface } } });
		state.openEditor(null);
	};
	const worn = slotSurfaceOf(spec, picks[name]);
	const fed = Object.keys(spec.gives ?? {});
	const row = valueRow({
		glyph: h(Icon, { name: "check" }),
		label: titleCase(name),
		sub: fed.length ? `Fed ${fed.join(", ")}` : null,
		value: titleOf(held?.manifest) ?? chosen,
		unset: !chosen,
		onClick: () => state.openEditor(key),
		after:
			chosen && (fed.length === 0 || hasOwnProps(held?.manifest, fed))
				? enterButton(state, { hold: "slots", key: name, widget: chosen, fed })
				: null,
	});
	return h("div", { className: "wg-set-slot", key }, [
		row,
		editorPopover(
			state,
			`slot-surface:${name}`,
			valueRow({ label: "Surface", value: titleCase(worn) }),
			h(
				"div",
				{ className: "wg-set-pop-body" },
				SLOT_SURFACES.map((surface: string) =>
					pickRow(surface, titleCase(surface), () => wear(surface), surface === worn),
				),
			),
		),
		state.openRow === key
			? h(CatalogueDialog, {
					key: "pick",
					registry,
					host,
					mode: "fill",
					rank: (candidate): SlotFit => slotFit(candidate, spec.gives, clashWith(idOf(candidate))),
					foot: spec.default
						? h(Button, { size: "s", onClick: () => write(null) }, "Back to the widget's default")
						: null,
					onPick: write,
					onClose: () => state.openEditor(null),
				})
			: null,
	]);
}

function titleOf(manifest: Fields | null | undefined): string | undefined {
	const title = manifest?.["title"];
	return typeof title === "string" ? title : undefined;
}

function idOf(candidate: Fields): string | undefined {
	const id = candidate["id"];
	return typeof id === "string" ? id : undefined;
}
