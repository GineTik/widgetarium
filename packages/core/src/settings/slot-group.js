import { createElement as h } from "react";
import { Button, Icon } from "@widgetarium/kit";
import { CatalogueDialog } from "../catalogue-dialog.js";
import { shownEntries } from "../prop-visibility.js";
import { reactClash, slotFit } from "../fit.js";
import { SLOT_SURFACES, slotSurfaceOf } from "../surface-roles.js";
import { editorPopover, enterButton, group, pickRow, titleCase, valueRow } from "./settings-rows.js";

export function slotGroup(state) {
	const rows = slotRows(state);
	if (rows.length === 0) return null;
	return group("slots", "Slots", rows, "A hole this widget fills with another widget.");
}

const hasOwnProps = (manifest, fed) => Object.keys(manifest?.props ?? {}).some((key) => !fed.includes(key));

function slotRows(state) {
	const picks = state.tile.slots ?? {};
	return shownEntries(state.manifest.slots, state.seen).map(([name, spec]) =>
		slotRow(state, name, spec, picks[name]?.widget ?? spec.default ?? ""),
	);
}

function slotRow(state, name, spec, chosen) {
	const { manifest, tile, registry, host, onPatch } = state;
	const picks = tile.slots ?? {};
	const parentReact = registry.get(manifest.id)?.react;
	const clashWith = (id) => reactClash(parentReact, registry.get(id)?.react);
	const held = registry.get(chosen);
	const key = `slot:${name}`;
	const write = (id) => {
		const clash = clashWith(id);
		if (clash) {
			state.host?.ui?.notify(clash);
			return;
		}
		const { [name]: dropped, ...rest } = picks;
		const worn = dropped?.surface ? { surface: dropped.surface } : null;
		onPatch({
			slots: id ? { ...picks, [name]: { ...worn, widget: id } } : { ...rest, ...(worn ? { [name]: worn } : {}) },
		});
		state.openEditor(null);
	};
	const wear = (surface) => {
		onPatch({ slots: { ...picks, [name]: { ...picks[name], surface } } });
		state.openEditor(null);
	};
	const worn = slotSurfaceOf(spec, picks[name]);
	const fed = Object.keys(spec.gives ?? {});
	const row = valueRow({
		glyph: h(Icon, { name: "check" }),
		label: titleCase(name),
		sub: fed.length ? `Fed ${fed.join(", ")}` : null,
		value: held?.manifest?.title ?? chosen ?? "Nothing",
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
				SLOT_SURFACES.map((surface) => pickRow(surface, titleCase(surface), () => wear(surface), surface === worn)),
			),
		),
		state.openRow === key
			? h(CatalogueDialog, {
					key: "pick",
					registry,
					host,
					mode: "fill",
					rank: (candidate) => slotFit(candidate, spec.gives, clashWith(candidate.id)),
					foot: spec.default
						? h(Button, { size: "s", onClick: () => write(null) }, "Back to the widget's default")
						: null,
					onPick: write,
					onClose: () => state.openEditor(null),
				})
			: null,
	]);
}
