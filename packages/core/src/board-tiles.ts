import { isObject } from "./engine/is-object.js";
import type { PropConfig } from "./gateway/props.js";
import { heldLook } from "./held-records.js";
import { slotSurfaceNamed } from "./surface-roles.js";
import type { SlotSurface } from "./surface-roles.js";

export type TileSettings = Readonly<Record<string, unknown>>;

export type TileMounts = Readonly<Record<string, unknown>>;

export type TileProp = PropConfig;

export type TileProps = Readonly<Record<string, TileProp | null>>;

export interface HeldRecord {
	readonly widget: string;
	readonly settings: TileSettings;
	readonly mounts: TileMounts;
	readonly props: TileProps;
	readonly slots: Readonly<Record<string, SlotRecord>>;
	readonly mounted: Readonly<Record<string, HeldRecord>>;
	readonly surface?: SlotSurface;
}

export type SlotRecord = Partial<HeldRecord>;

export interface Tile extends HeldRecord {
	readonly id: string;
	readonly folded?: boolean;
}

export type IdOf = (id: string) => string;

export const KEEP_ID_WITHOUT_REGISTRY: IdOf = (id) => id;

export function normalizeTile(raw: unknown, index: number, idOf: IdOf): Tile {
	const tile = isObject(raw) ? raw : {};
	const { id, widget } = tile;
	return {
		id: typeof id === "string" ? id : `w${index}`,
		widget: typeof widget === "string" ? idOf(widget) : "",
		settings: objectOrEmpty(tile["settings"]),
		mounts: objectOrEmpty(tile["mounts"]),
		props: propsIn(tile["props"]),
		slots: normalizeSlots(tile["slots"], idOf),
		mounted: normalizeMounted(tile["mounted"], idOf),
		...(tile["folded"] ? { folded: true } : {}),
	};
}

export function isTile(held: unknown): held is Tile {
	if (!isObject(held)) return false;
	const { id, widget, settings, mounts, props, slots, mounted } = held;
	return (
		typeof id === "string" && typeof widget === "string" && [settings, mounts, props, slots, mounted].every(isObject)
	);
}

export function propsIn(raw: unknown): TileProps {
	if (!isObject(raw)) return {};
	return Object.fromEntries(
		Object.entries(raw).flatMap(([key, prop]) => (isObject(prop) || prop === null ? [[key, prop] as const] : [])),
	);
}

function objectOrEmpty(raw: unknown): Readonly<Record<string, unknown>> {
	return isObject(raw) ? raw : {};
}

function widgetOfSlotOrMount(raw: unknown, keyWidget: string | null): string | null {
	if (typeof raw === "string") return raw === "" ? null : raw;
	const widget = isObject(raw) ? raw["widget"] : null;
	if (typeof widget === "string" && widget !== "") return widget;
	return keyWidget;
}

function normalizeHeld(raw: unknown, keyWidget: string | null, idOf: IdOf): HeldRecord | null {
	const widget = widgetOfSlotOrMount(raw, keyWidget);
	if (widget === null || widget === "") return null;
	const held = isObject(raw) ? raw : {};
	return {
		widget: idOf(widget),
		settings: objectOrEmpty(held["settings"]),
		mounts: objectOrEmpty(held["mounts"]),
		props: propsIn(held["props"]),
		slots: normalizeSlots(held["slots"], idOf),
		mounted: normalizeMounted(held["mounted"], idOf),
		...heldLook(held),
	};
}

function normalizeMounted(raw: unknown, idOf: IdOf): Record<string, HeldRecord> {
	if (!isObject(raw)) return {};
	return Object.fromEntries(
		Object.entries(raw).flatMap(([key, held]) => {
			const record = normalizeHeld(held, key.split("#")[0] ?? key, idOf);
			return record ? [[key, record] as const] : [];
		}),
	);
}

function normalizeSlots(raw: unknown, idOf: IdOf): Record<string, SlotRecord> {
	if (!isObject(raw)) return {};
	return Object.fromEntries(
		Object.entries(raw).flatMap(([name, held]) => {
			const slot = normalizeSlot(held, idOf);
			return slot ? [[name, slot] as const] : [];
		}),
	);
}

function normalizeSlot(held: unknown, idOf: IdOf): SlotRecord | null {
	const record = normalizeHeld(held, null, idOf);
	const said = isObject(held) ? held : {};
	const surface = slotSurfaceNamed(said["surface"]);
	const props = propsIn(said["props"]);
	const worn = surface ? { surface } : null;
	const set = Object.keys(props).length > 0 ? { props } : null;
	if (!record && !worn && !set) return null;
	return { ...set, ...record, ...worn };
}
