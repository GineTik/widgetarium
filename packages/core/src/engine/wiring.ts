// TRADE-OFF: a widget id in a manifest, the way a slot already names its default widget — a bare prop name would collide, since two widgets both offer `selection`
import { widgetKeyOf } from "./widget-ref.js";
import { isObject } from "./is-object.js";
import type { Fields } from "./catalogue-index.js";
import type { HeldRecord, Tile, TileProp, TileProps } from "../model.js";

export interface StandingTile {
	readonly widget: string;
	readonly id: string;
}

interface WiringRegistry {
	resolveId?(id: string): string | null | undefined;
	get(id: string | undefined): { readonly manifest?: Fields | null } | null | undefined;
}

type Standing = ReadonlyMap<string, string>;

// TRADE-OFF: a box standing in for a widget is passed in rather than found here, because a layout node is not a tile and wiring reads tiles
export function wireTiles(
	tiles: readonly Tile[],
	registry: WiringRegistry,
	standsFor: readonly StandingTile[] = [],
): Tile[] {
	const standing = tilesByWidget(tiles, (id) => registry.resolveId?.(id) ?? id, standsFor);
	return tiles.map((tile) => wireHeld(tile, registry, standing));
}

function mountedTiles(tile: HeldRecord): Tile[] {
	return Object.entries(tile.mounted ?? {}).map(([name, held]) => ({ ...held, id: name }));
}

function refFor(wants: unknown, standing: Standing): string | null {
	const asked = String(wants ?? "");
	const at = asked.lastIndexOf("/");
	if (at < 0) return null;
	const held = standing.get(asked.slice(0, at));
	return held ? `${held}/${asked.slice(at + 1)}` : null;
}

function wantsIn(held: unknown): string | null {
	const wants = isObject(held) ? held["wants"] : null;
	return typeof wants === "string" ? wants : null;
}

function wantedIn(row: Fields): string | null {
	return wantsIn(row["spread"]) ?? wantsIn(row["value"]);
}

function wireRow(row: unknown, standing: Standing): Fields | null {
	if (!isObject(row)) return null;
	const ref = refFor(wantedIn(row), standing);
	if (!ref) return null;
	return row["spread"] ? { ...row, spread: { ref }, fixed: true } : { ...row, value: { ref }, fixed: true };
}

function rowsOf(held: unknown): readonly unknown[] {
	return Array.isArray(held) ? held : [];
}

function wireWhere(spec: Fields, config: TileProp, standing: Standing): unknown[] | null {
	const rows = rowsOf(spec["where"])
		.map((row) => wireRow(row, standing))
		.filter((row): row is Fields => row !== null);
	const own = rowsOf(config.where).filter((row) => !isObject(row) || row["fixed"] !== true);
	if (rows.length === 0) return null;
	return [...rows, ...own];
}

function wireProp(spec: Fields, config: TileProp, standing: Standing): TileProp | null {
	if (typeof spec["wants"] === "string") {
		if (typeof config.ref === "string") return null;
		const ref = refFor(spec["wants"], standing);
		return ref ? { ...config, from: "ref", ref } : null;
	}
	const where = wireWhere(spec, config, standing);
	if (!where) return null;
	return stableWhere(where) === stableWhere(config.where) ? null : { ...config, where };
}

function stableWhere(rows: unknown): string {
	return JSON.stringify(rows ?? []);
}

function wireProps(tile: HeldRecord, manifest: Fields | null | undefined, standing: Standing): TileProps | null {
	const held = tile.props ?? {};
	const specs = manifest?.["props"];
	const wired = Object.entries(isObject(specs) ? specs : {})
		.map(([name, spec]) => [name, wireProp(isObject(spec) ? spec : {}, held[name] ?? {}, standing)] as const)
		.filter((entry): entry is readonly [string, TileProp] => entry[1] !== null);
	return wired.length === 0 ? null : { ...held, ...Object.fromEntries(wired) };
}

function wireHeld<Held extends HeldRecord>(held: Held, registry: WiringRegistry, standing: Standing): Held {
	const props = wireProps(held, registry.get(held.widget)?.manifest, standing);
	const mounted = wireMounted(held.mounted, registry, standing);
	if (!props && !mounted) return held;
	return { ...held, ...(props ? { props } : {}), ...(mounted ? { mounted } : {}) };
}

function wireMounted(
	mounted: Readonly<Record<string, HeldRecord>>,
	registry: WiringRegistry,
	standing: Standing,
): Readonly<Record<string, HeldRecord>> | null {
	const entries = Object.entries(mounted ?? {});
	if (entries.length === 0) return null;
	const wired = entries.map(([name, held]) => [name, wireHeld(held, registry, standing)] as const);
	return wired.some(([name, held]) => held !== mounted?.[name]) ? Object.fromEntries(wired) : null;
}

function tilesByWidget(
	tiles: readonly Tile[] | null | undefined,
	currentId: (id: string) => string = (id) => id,
	standing: readonly StandingTile[] = [],
): Map<string, string> {
	const seen = new Map(standing.map((held) => [widgetKeyOf(held.widget), held.id] as const));
	const walk = (held: readonly Tile[] | null | undefined, at: string | null): void => {
		for (const tile of held ?? []) {
			const id = at ? `${at}/${tile.id}` : tile.id;
			const widget = tile.widget && widgetKeyOf(currentId(tile.widget));
			if (widget && !seen.has(widget)) seen.set(widget, id);
			walk(mountedTiles(tile), id);
		}
	};
	walk(tiles, null);
	return seen;
}
