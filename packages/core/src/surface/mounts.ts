import { createElement as h } from "react";
import type { ReactElement } from "react";
import { PLATES_ABOVE } from "@widgetarium/kit/surface";
import { heldKey, heldTile, mountList, mountRows } from "../model.js";
import type { Tile } from "../model.js";
import type { MountRow } from "../held-records.js";
import { declaredLabel } from "../registry.js";
import type { WidgetDefinition } from "../registry.js";
import type { EngineManifest } from "../engine/catalogue-index.js";
import { failureMessage } from "../engine/failure-message.js";
import { leaseFor } from "../engine/render.js";
import { stableKey } from "../gateway/cache.js";
import { arrayGateway } from "../gateway/create.js";
import type { CollectionGateway } from "../gateway/contract.js";
import type { Release } from "../gateway/host.js";
import { refOf } from "../gateway/refs.js";
import { mountSpecsOf } from "../manifest-holds.js";
import type { PlatesAbove } from "../mounted.js";
import type { SlotSurface } from "../surface-roles.js";
import { isDrawable } from "./is-drawable.js";
import { behindBoundary } from "./behind-boundary.js";
import { MountedWidget, stepInto } from "./mounted-widget.js";
import type { BoardRegistry } from "./use-surface-shared.js";
import type { EnterMount, MountContext } from "./widget-host.js";

type MountProblem = "failed" | "not-found" | "empty";

type DrawMount = (element: HTMLElement, platesAbove: PlatesAbove | null | undefined) => Release;

interface ResolvedMount {
	readonly name: string;
	readonly enter: (() => void) | null;
	readonly surface: SlotSurface | null;
	readonly id: string;
	readonly hidden: boolean;
	readonly title: string;
	readonly manifest: EngineManifest | null;
	readonly problem: MountProblem | null;
	readonly failure: string | null;
	readonly drawInto: DrawMount | null;
}

export type ResolvedMounts = Readonly<Record<string, readonly ResolvedMount[]>>;

interface MountListRow {
	readonly name: string;
	readonly value: string;
	readonly widget: string;
	readonly hidden: boolean;
}

export function resolveMounts(manifest: EngineManifest, registry: BoardRegistry, mount: MountContext): ResolvedMounts {
	return Object.fromEntries(
		Object.entries(mountSpecsOf(manifest)).map(([name, spec]) => {
			const rows = mountRows(mountList(mount.tile, name, spec), (id) => declaredLabel(registry, id));
			return [name, rows.map((row) => mountEntry(row, registry, mount))];
		}),
	);
}

export function mountsCollection(
	tile: Pick<Tile, "id">,
	name: string,
	entries: readonly ResolvedMount[],
): CollectionGateway<MountListRow> {
	const rows = entries.map((entry) => ({
		ref: entry.name,
		value: { name: entry.name, value: entry.name, widget: entry.id, hidden: entry.hidden },
	}));
	return arrayGateway<MountListRow>(() => rows, {}, `${refOf(tile.id, name)}?${stableKey(rows)}`);
}

function mountEntry(row: MountRow, registry: BoardRegistry, mount: MountContext): ResolvedMount {
	const held = row.widget ? registry.get(row.widget) : null;
	return {
		name: row.name,
		enter: isDrawable(held) ? entryPress(row, mount.enterMount) : null,
		surface: lookOfMount(mount.tile, row),
		id: row.widget,
		hidden: row.hidden === true,
		title: titleOf(held, row),
		manifest: held?.manifest ? { ...held.manifest } : null,
		problem: problemOf(held, row),
		failure: held?.error ? failureMessage(held.error) : null,
		drawInto: isDrawable(held)
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

function problemOf(held: WidgetDefinition | null, row: MountRow): MountProblem | null {
	if (isDrawable(held)) return null;
	if (!row.widget) return "empty";
	return held ? "failed" : "not-found";
}

function titleOf(held: WidgetDefinition | null, row: MountRow): string {
	const title = held?.manifest["title"];
	return (typeof title === "string" && title) || row.widget || row.name;
}

function entryPress(row: MountRow, enterMount: EnterMount | null | undefined): (() => void) | null {
	if (!enterMount) return null;
	return () => enterMount([stepInto(row)]);
}

function lookOfMount(tile: Tile, row: MountRow): SlotSurface | null {
	const record = heldTile(tile, "mounted", heldKey(tile.mounted, row.name, row.was), row.widget);
	return record.surface ?? null;
}

function drawMounted(
	element: HTMLElement,
	widget: string,
	child: ReactElement,
	platesAbove: PlatesAbove | null | undefined,
): Release {
	const lease = leaseFor(element);
	const seated = platesAbove ? h(PLATES_ABOVE.Provider, { value: platesAbove }, child) : child;
	lease.draw(behindBoundary(widget, seated));
	return () => lease.release();
}
