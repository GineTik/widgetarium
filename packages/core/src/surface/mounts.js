import { createElement as h } from "react";
import { PLATES_ABOVE } from "@widgetarium/kit/surface";
import { heldKey, heldTile, mountList, mountRows } from "../model.js";
import { declaredName } from "../registry.js";
import { leaseFor } from "../engine/render.js";
import { stableKey } from "../gateway/cache.js";
import { arrayGateway } from "../gateway/create.js";
import { refOf } from "../gateway/refs.js";
import { isDrawable } from "./is-drawable.js";
import { behindBoundary } from "./behind-boundary.js";
import { MountedWidget, stepInto } from "./mounted-widget.js";

export function resolveMounts(manifest, registry, mount) {
	const mounts = {};
	for (const [name, spec] of Object.entries(manifest.mounts ?? {})) {
		const rows = mountRows(mountList(mount.tile, name, spec), (id) => declaredName(registry, id));
		mounts[name] = rows.map((row) => mountEntry(row, registry, mount));
	}
	return mounts;
}

export function mountsCollection(tile, name, entries) {
	const rows = entries.map((entry) => ({
		ref: entry.name,
		value: { name: entry.name, value: entry.name, widget: entry.id, hidden: entry.hidden },
	}));
	return arrayGateway(() => rows, {}, `${refOf(tile.id, name)}?${stableKey(rows)}`);
}

function mountEntry(row, registry, mount) {
	const held = row.widget ? registry.get(row.widget) : null;
	const drawable = isDrawable(held);
	return {
		name: row.name,
		enter: drawable ? entryPress(row, mount.enterMount) : null,
		...lookOfMount(mount.tile, row),
		id: row.widget,
		hidden: row.hidden === true,
		title: held?.manifest?.title || row.widget || row.name,
		manifest: held?.manifest ? { ...held.manifest } : null,
		problem: drawable ? null : row.widget ? (held ? "failed" : "not-found") : "empty",
		failure: held?.error ? String(held.error.message ?? held.error) : null,
		drawInto: drawable
			? (element, platesAbove) =>
					drawMounted(
						element,
						row.widget,
						h(MountedWidget, { ...mount, name: row.name, was: row.was, widget: row.widget, definition: held }),
						platesAbove,
					)
			: null,
	};
}

function entryPress(row, enterMount) {
	if (!enterMount) return null;
	return () => enterMount([stepInto(row)]);
}

function lookOfMount(tile, row) {
	const record = heldTile(tile, "mounted", heldKey(tile.mounted, row.name, row.was), row.widget);
	return { surface: record.surface ?? null };
}

function drawMounted(element, widget, child, platesAbove) {
	const { draw, release } = leaseFor(element);
	const seated = platesAbove ? h(PLATES_ABOVE.Provider, { value: platesAbove }, child) : child;
	draw(behindBoundary(widget, seated));
	return release;
}
