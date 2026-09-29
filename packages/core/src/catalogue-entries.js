import { WHAT_A_FOLDER_WAS_STAMPED_BEFORE_STAMPS } from "./engine/widget-source.js";
import { previewSize } from "./preview.js";
import { GRID, spanToPixels } from "./paths.js";

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

export function clamp(value, low, high) {
	return Math.max(low, Math.min(value, high));
}

export function measureCards(width, target = CARD_TARGET_PX, fewest = MIN_COLUMNS) {
	const columns = clamp(Math.round((width + GAP_PX) / (target + GAP_PX)), fewest, MAX_COLUMNS);
	return { columns, columnPx: (width - (columns - 1) * GAP_PX) / columns };
}

export function cardTile(manifest, cards) {
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

export function shortName(manifest) {
	const title = manifest.title ?? manifest.id ?? "";
	const cut = title.lastIndexOf("·");
	return cut === -1 ? title : title.slice(cut + 1).trim();
}

export function initialOf(manifest) {
	return shortName(manifest).trim().charAt(0).toUpperCase() || "?";
}

export function packOf(manifest) {
	const id = String(manifest?.id ?? "");
	const cut = id.indexOf("/");
	return cut === -1 ? id : id.slice(0, cut);
}

export function facetsOf(entries) {
	return {
		packs: countBy(entries, (entry) => [packOf(entry.manifest)]),
		tags: countBy(entries, (entry) => keywordsOf(entry.manifest)),
	};
}

export function updateOffered(manifest, offer, lock) {
	const here = lock?.widgets?.[manifest?.id]?.commit;
	const there = offer?.manifest?.commit ?? offer?.commit ?? null;
	if (here === WHAT_A_FOLDER_WAS_STAMPED_BEFORE_STAMPS) return null;
	if (!here || !there || here === there) return null;
	return { here: String(here).slice(0, 7), there: String(there).slice(0, 7) };
}

export function actionFor(entry) {
	if (!entry.installed) return "install";
	if (entry.update) return "update";
	return "add";
}

export function filterEntries(entries, { showing, pack, tag }) {
	return entries.filter((entry) => {
		if (showing === "installed" && !entry.installed) return false;
		if (showing === "update" && !entry.update) return false;
		if (pack !== EVERY_PACK && packOf(entry.manifest) !== pack) return false;
		if (tag && !keywordsOf(entry.manifest).includes(tag)) return false;
		return true;
	});
}

export function facetsMatching(facets, keyword) {
	const asked = keyword.trim().toLowerCase();
	if (!asked) return facets;
	return facets.filter((facet) => facet.name.toLowerCase().includes(asked));
}

export function fillLine(line, values) {
	return Object.entries(values).reduce((held, [key, value]) => held.replace(`{${key}}`, String(value)), line);
}

export function layOut(shown) {
	const fits = shown.filter((entry) => !entry.fit?.lacks);
	const short = shown.filter((entry) => entry.fit?.lacks);
	return { placed: [...fits, ...short], divide: short.length > 0 ? fits.length : null };
}

export function fromManifest(entry, key) {
	return entry.manifest[key];
}

function keywordsOf(manifest) {
	return Array.isArray(manifest?.keywords) ? manifest.keywords : [];
}

function countBy(entries, read) {
	const counts = new Map();
	for (const entry of entries) {
		for (const key of read(entry)) counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	return [...counts]
		.map(([name, count]) => ({ name, count }))
		.sort((one, other) => other.count - one.count || one.name.localeCompare(other.name));
}
