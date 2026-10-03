import { WHAT_A_FOLDER_WAS_STAMPED_BEFORE_STAMPS } from "./engine/widget-source.js";
import type { Fields } from "./engine/catalogue-index.js";
import type { WidgetLock } from "./engine/widget-lock.js";
import { isObject } from "./engine/is-object.js";
import { previewSize } from "./preview.js";
import type { PreviewSpan } from "./preview.js";
import { GRID, spanToPixels } from "./paths.js";
import type { ReactIdentity, SlotFit } from "./fit.js";
import type { WidgetComponent } from "./registry-scope.js";
import type { DrawWidget } from "./mounted.js";
import type { GivenProps } from "./declared-widget.js";

export interface CatalogueDefinition {
	readonly manifest?: Fields | null | undefined;
	readonly installed?: boolean | undefined;
	readonly component?: WidgetComponent | undefined;
	readonly error?: unknown;
	readonly react?: ReactIdentity | null | undefined;
	readonly draw?: DrawWidget<GivenProps> | null | undefined;
	readonly origin?: unknown;
	readonly commit?: unknown;
	readonly from?: { readonly folder?: string | null | undefined } | null | undefined;
}

interface UpdateOffered {
	readonly here: string;
	readonly there: string;
}

export interface MergedEntry {
	readonly definition: CatalogueDefinition;
	readonly offer: CatalogueDefinition | null;
	readonly manifest: Fields;
	readonly installed: boolean;
	readonly update: UpdateOffered | null;
}

export interface Cards {
	readonly columns: number;
	readonly columnPx: number;
}

export interface CardTile {
	readonly size: PreviewSpan;
	readonly w: number;
	readonly h: number;
	readonly scale: number;
	readonly cell: number;
	readonly gap: number;
	readonly frameWidth: number;
	readonly frameHeight: number;
}

export interface ShelfEntry extends MergedEntry {
	readonly tile: CardTile;
	readonly fit: SlotFit | null;
}

export interface Facet {
	readonly name: string;
	readonly count: number;
}

export interface CatalogueFacets {
	readonly packs: Facet[];
	readonly tags: Facet[];
}

export type Showing = "all" | "installed" | "update";

interface EntryFilter {
	readonly showing: Showing;
	readonly pack: string;
	readonly tag: string | null;
}

export type EntryAction = "install" | "update" | "add";

interface LaidOut<Entry> {
	readonly placed: Entry[];
	readonly divide: number | null;
}

export const EVERY_PACK = "all";

export const CARD_TARGET_PX = 300;

const MIN_COLUMNS = 1;

const MAX_COLUMNS = 5;

const GAP_PX = 12;

const CARD_PAD_PX = 10;

// TRADE-OFF: the widget never touches the stage's edge — flush, a whole widget reads as a cut one
const STAGE_PAD_PX = 10;

// TRADE-OFF: six cells, not four — four reads at 1:1 but shows too little of a board-shaped widget; six still carries the shape
const MAX_SPAN = { w: 6, h: 6 };

export function clamp(value: number, low: number, high: number): number {
	return Math.max(low, Math.min(value, high));
}

export function measureCards(width: number, target = CARD_TARGET_PX, fewest = MIN_COLUMNS): Cards {
	const columns = clamp(Math.round((width + GAP_PX) / (target + GAP_PX)), fewest, MAX_COLUMNS);
	return { columns, columnPx: (width - (columns - 1) * GAP_PX) / columns };
}

export function cardTile(manifest: Fields, cards: Cards): CardTile {
	const size = previewSize(manifest, GRID.cellPx, GRID.gapPx);
	const w = Math.min(size.w, MAX_SPAN.w);
	const h = Math.min(size.h, MAX_SPAN.h);
	const room = cards.columnPx - 2 * CARD_PAD_PX - 2 * STAGE_PAD_PX;
	const spanWidth = spanToPixels(w, GRID.cellPx, GRID.gapPx);
	const spanHeight = spanToPixels(h, GRID.cellPx, GRID.gapPx);
	const scale = Math.min(1, room / spanWidth);
	return {
		size,
		w,
		h,
		scale,
		cell: GRID.cellPx * scale,
		gap: GRID.gapPx * scale,
		frameWidth: spanWidth * scale,
		frameHeight: spanHeight * scale,
	};
}

export function shortName(manifest: Fields): string {
	const title = String(manifest["title"] ?? manifest["id"] ?? "");
	const cut = title.lastIndexOf("·");
	return cut === -1 ? title : title.slice(cut + 1).trim();
}

export function initialOf(manifest: Fields): string {
	return shortName(manifest).trim().charAt(0).toUpperCase() || "?";
}

export function packOf(manifest: Fields | null | undefined): string {
	const id = String(manifest?.["id"] ?? "");
	const cut = id.indexOf("/");
	return cut === -1 ? id : id.slice(0, cut);
}

export function facetsOf(entries: readonly MergedEntry[]): CatalogueFacets {
	return {
		packs: countBy(entries, (entry) => [packOf(entry.manifest)]),
		tags: countBy(entries, (entry) => keywordsOf(entry.manifest)),
	};
}

export function updateOffered(
	manifest: Fields | null | undefined,
	offer: CatalogueDefinition | null | undefined,
	lock: WidgetLock | null | undefined,
): UpdateOffered | null {
	const here = lockedCommitOf(lock, manifest?.["id"]);
	const there = offer?.manifest?.["commit"] ?? offer?.commit ?? null;
	if (here === WHAT_A_FOLDER_WAS_STAMPED_BEFORE_STAMPS) return null;
	if (!here || !there || here === there) return null;
	return { here: String(here).slice(0, 7), there: String(there).slice(0, 7) };
}

export function actionFor(entry: Pick<MergedEntry, "installed" | "update">): EntryAction {
	if (!entry.installed) return "install";
	if (entry.update) return "update";
	return "add";
}

export function filterEntries<Entry extends MergedEntry>(
	entries: readonly Entry[],
	{ showing, pack, tag }: EntryFilter,
): Entry[] {
	return entries.filter((entry) => {
		if (showing === "installed" && !entry.installed) return false;
		if (showing === "update" && !entry.update) return false;
		if (pack !== EVERY_PACK && packOf(entry.manifest) !== pack) return false;
		if (tag && !keywordsOf(entry.manifest).includes(tag)) return false;
		return true;
	});
}

export function facetsMatching(facets: readonly Facet[], keyword: string): readonly Facet[] {
	const asked = keyword.trim().toLowerCase();
	if (!asked) return facets;
	return facets.filter((facet) => facet.name.toLowerCase().includes(asked));
}

export function fillLine(line: string, values: object): string {
	return Object.entries(values).reduce((held, [key, value]) => held.replace(`{${key}}`, String(value)), line);
}

export function layOut<Entry extends { readonly fit: SlotFit | null }>(shown: readonly Entry[]): LaidOut<Entry> {
	const fits = shown.filter((entry) => !entry.fit?.lacks);
	const short = shown.filter((entry) => entry.fit?.lacks);
	return { placed: [...fits, ...short], divide: short.length > 0 ? fits.length : null };
}

export function fromManifest(entry: { readonly manifest: Fields }, key: string): unknown {
	return entry.manifest[key];
}

export function keywordsOf(manifest: Fields | null | undefined): string[] {
	const keywords = manifest?.["keywords"];
	return Array.isArray(keywords) ? keywords.filter((keyword): keyword is string => typeof keyword === "string") : [];
}

function lockedCommitOf(lock: WidgetLock | null | undefined, id: unknown): unknown {
	const entry = typeof id === "string" ? lock?.widgets[id] : undefined;
	return isObject(entry) ? entry["commit"] : undefined;
}

function countBy(entries: readonly MergedEntry[], read: (entry: MergedEntry) => readonly string[]): Facet[] {
	const counts = new Map<string, number>();
	for (const entry of entries) {
		for (const key of read(entry)) counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	return [...counts]
		.map(([name, count]) => ({ name, count }))
		.sort((one, other) => other.count - one.count || one.name.localeCompare(other.name));
}
