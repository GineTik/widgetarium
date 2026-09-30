import { slotSurfaceNamed } from "./surface-roles.js";
import type { SlotSurface, SurfaceSaid } from "./surface-roles.js";
import type { HeldRecord, SlotRecord, Tile, TileMounts, TileProp, TileProps, TileSettings } from "./board-tiles.js";

export type Hold = "slots" | "mounted";

export interface Holder {
	readonly id: string;
	readonly slots?: Readonly<Record<string, SlotRecord>>;
	readonly mounted?: Readonly<Record<string, HeldRecord>>;
}

export interface HeldLook {
	readonly surface?: SlotSurface;
}

export interface PropAka {
	readonly aka?: unknown;
}

export interface MountSpec {
	readonly was?: string | null;
	readonly default?: unknown;
}

export interface MountRow {
	readonly name: string;
	readonly widget: string;
	readonly hidden: boolean;
	readonly was: string;
}

export interface MountRowLike {
	readonly name: string;
	readonly widget?: string | null;
	readonly hidden?: boolean;
	readonly was?: string | null;
}

export interface StoredMountRow {
	readonly name: string;
	readonly widget: string;
	readonly hidden?: true;
}

export interface MountHolder {
	readonly mounts?: TileMounts;
	readonly settings?: TileSettings;
	readonly mounted?: Readonly<Record<string, HeldRecord>>;
}

export interface MountPatch {
	readonly mounts: TileMounts;
	readonly settings: TileSettings;
	readonly mounted: Readonly<Record<string, HeldRecord>>;
}

type HeldMap<Value> = Readonly<Record<string, Value>> | null | undefined;

// TRADE-OFF: the live widget wins over the record's, which is a mirror of it
export function heldTile(holder: Holder, hold: Hold, key: string, widget: string): Tile {
	const held: SlotRecord = holder[hold]?.[key] ?? {};
	return {
		id: `${holder.id}/${key}`,
		widget,
		settings: held.settings ?? {},
		mounts: held.mounts ?? {},
		props: held.props ?? {},
		slots: held.slots ?? {},
		mounted: held.mounted ?? {},
		...heldLook(held),
	};
}

export function heldLook(held: SurfaceSaid): HeldLook {
	const surface = slotSurfaceNamed(held.surface);
	return surface ? { surface } : {};
}

export function mountKeys(ids: readonly string[]): string[] {
	const taken = new Map<string, number>();
	return ids.map((id) => {
		const nth = (taken.get(id) ?? 0) + 1;
		taken.set(id, nth);
		return nth === 1 ? id : `${id}#${nth}`;
	});
}

export function uniqueName(taken: Set<string>, wanted: unknown): string {
	const base = String(wanted ?? "").trim();
	let name = base;
	let nth = 1;
	while (taken.has(name)) {
		nth += 1;
		name = `${base} ${nth}`;
	}
	taken.add(name);
	return name;
}

export function heldKey(held: HeldMap<unknown>, key: string, was?: string | null): string {
	return !held?.[key] && was && held?.[was] ? was : key;
}

export function propConfig(
	tile: { readonly props?: TileProps } | null | undefined,
	key: string,
	spec?: PropAka | null,
): TileProp {
	return tile?.props?.[propKeyHeld(tile.props, key, spec?.aka)] ?? {};
}

export function rekey<Value extends object>(
	held: HeldMap<Value>,
	key: string,
	was: string | null | undefined,
	patch: Partial<Value>,
): Record<string, Partial<Value>> {
	const rest = withoutKey(held, was);
	const legacy = held?.[String(was)];
	return { ...rest, [key]: { ...(held?.[key] ?? legacy ?? {}), ...patch } };
}

export function mountList(
	tile: { readonly mounts?: TileMounts; readonly settings?: TileSettings } | null | undefined,
	name: string,
	spec?: MountSpec | null,
): unknown {
	return (
		underEitherKey(tile?.mounts, name, spec?.was) ?? underEitherKey(tile?.settings, name, spec?.was) ?? spec?.default
	);
}

export function mountRows(value: unknown, nameFor?: (widget: string) => string | null | undefined): MountRow[] {
	const rows = rowsFromListOrCommaText(value);
	const widgetIdKeys = mountKeys(rows.map((row) => row.widget));
	const taken = new Set<string>();
	return rows.map((row, index) => ({
		name: uniqueName(taken, row.name || nameFor?.(row.widget) || row.widget),
		widget: row.widget,
		hidden: row.hidden,
		was: widgetIdKeys[index] ?? row.widget,
	}));
}

export function mountRowToStore(row: MountRowLike): StoredMountRow {
	return { name: row.name, widget: row.widget ?? "", ...(row.hidden ? { hidden: true } : {}) };
}

export function keysStillNamed(rows: readonly MountRowLike[]): Set<string> {
	const kept = new Set<string>();
	for (const row of rows) {
		kept.add(row.name);
		if (row.was) kept.add(row.was);
	}
	return kept;
}

export function keepNamedRecords<Value>(mounted: HeldMap<Value>, rows: readonly MountRowLike[]): Record<string, Value> {
	const kept = keysStillNamed(rows);
	return Object.fromEntries(Object.entries(mounted ?? {}).filter(([key]) => kept.has(key)));
}

export function mountPatch(
	tile: MountHolder,
	name: string,
	rows: readonly MountRowLike[],
	was?: string | null,
): MountPatch {
	const kept = new Set(rows.map((row) => row.name));
	const moved = Object.entries(afterRenames(tile.mounted, rows));
	return {
		mounts: { ...withoutKey(tile.mounts, was), [name]: rows.map(mountRowToStore) },
		settings: withoutKey(withoutKey(tile.settings, was), name),
		mounted: Object.fromEntries(moved.filter(([key]) => kept.has(key))),
	};
}

export function withoutKey<Value>(held: HeldMap<Value>, key: string | null | undefined): Record<string, Value> {
	const { [String(key)]: dropped, ...rest } = held ?? {};
	return rest;
}

function rowsFromListOrCommaText(value: unknown): { name: string; widget: string; hidden: boolean }[] {
	const list: readonly unknown[] = Array.isArray(value) ? value : String(value ?? "").split(",");
	return list
		.map((entry) => (typeof entry === "string" ? { name: "", widget: entry, hidden: false } : rowOfEntry(entry)))
		.map((row) => ({ name: row.name.trim(), widget: row.widget.trim(), hidden: row.hidden }))
		.filter(isWidgetOrViewAwaitingOne);
}

function rowOfEntry(entry: unknown): { name: string; widget: string; hidden: boolean } {
	const said: { readonly name?: unknown; readonly widget?: unknown; readonly hidden?: unknown } =
		typeof entry === "object" && entry !== null ? entry : {};
	return { name: String(said.name ?? ""), widget: String(said.widget ?? ""), hidden: said.hidden === true };
}

function isWidgetOrViewAwaitingOne(row: { readonly name: string; readonly widget: string }): boolean {
	return row.widget !== "" || row.name !== "";
}

function propKeyHeld(props: TileProps | undefined, key: string, was: unknown): string {
	if (props?.[key]) return key;
	const olds: readonly unknown[] = Array.isArray(was) ? was : [was ?? []].flat();
	return olds.find((old): old is string => typeof old === "string" && Boolean(props?.[old])) ?? key;
}

function underEitherKey(held: HeldMap<unknown>, name: string, was: string | null | undefined): unknown {
	return held?.[name] ?? (was ? held?.[was] : undefined);
}

function afterRenames(
	mounted: HeldMap<HeldRecord>,
	rows: readonly MountRowLike[],
): Readonly<Record<string, HeldRecord>> {
	let held: Readonly<Record<string, HeldRecord>> = mounted ?? {};
	for (const row of rows) {
		const moving = row.was && row.was !== row.name ? held[row.was] : undefined;
		if (!row.was || !moving) continue;
		held = { ...withoutKey(held, row.was), [row.name]: held[row.name] ?? moving };
	}
	return held;
}
