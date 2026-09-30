import { useMemo, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { boardWidgets, inlineWidgets } from "./registry.js";
import type { WidgetLookup } from "./registry.js";
import { isInstalled, mergeCatalogue } from "./engine/catalogue-index.js";
import type { Fields } from "./engine/catalogue-index.js";
import type { WidgetLock } from "./engine/widget-lock.js";
import { rankSearch } from "./engine/search.js";
import { classOf } from "./paths.js";
import { pagesMatching } from "./docs.js";
import type { DocPage } from "./docs.js";
import { useBox, useWidth } from "./use-width.js";
import type { SlotFit } from "./fit.js";
import type { Template } from "./templates.js";
import type { CatalogueMode } from "./catalogue-install-press.js";
import {
	CARD_TARGET_PX,
	cardTile,
	EVERY_PACK,
	facetsOf,
	filterEntries,
	fromManifest,
	layOut,
	measureCards,
	updateOffered,
} from "./catalogue-entries.js";
import type {
	Cards,
	CatalogueDefinition,
	CatalogueFacets,
	MergedEntry,
	ShelfEntry,
	Showing,
} from "./catalogue-entries.js";
import type { ShowingCounts } from "./catalogue-facets.js";

export type CatalogueKind = "board" | "inline";

export type Shelf = "widgets" | "templates";

export type RankEntry = (manifest: Fields) => SlotFit | null | undefined;

export interface CatalogueViewAsk {
	readonly registry: WidgetLookup;
	readonly mode: CatalogueMode;
	readonly kind: CatalogueKind;
	readonly available: readonly CatalogueDefinition[];
	readonly templates: readonly Template[];
	readonly rank?: RankEntry | undefined;
	readonly lock: WidgetLock | null;
}

export interface CatalogueFilters {
	readonly keyword: string;
	readonly setKeyword: (keyword: string) => void;
	readonly showing: Showing;
	readonly setShowing: (showing: Showing) => void;
	readonly pack: string;
	readonly setPack: (pack: string) => void;
	readonly tag: string | null;
	readonly setTag: (tag: string | null) => void;
	readonly packQuery: string;
	readonly setPackQuery: (query: string) => void;
	readonly tagQuery: string;
	readonly setTagQuery: (query: string) => void;
	readonly shelf: Shelf;
	readonly setShelf: (shelf: Shelf) => void;
	readonly page: string | null;
	readonly setPage: (page: string | null) => void;
	readonly isSheetOpen: boolean;
	readonly setSheetOpen: (isOpen: boolean) => void;
	readonly narrowed: boolean;
	readonly clearAll: () => void;
	readonly openPage: (id: string) => void;
}

export interface CatalogueRoom {
	readonly rootRef: RefObject<HTMLDivElement | null>;
	readonly scrollRef: RefObject<HTMLDivElement | null>;
	readonly width: number;
	readonly roomHeight: number;
	readonly phone: boolean;
}

export interface ShelfSaid {
	readonly title: string;
	readonly lead: string;
}

export interface CatalogueShelf {
	readonly cards: Cards;
	readonly templateCards: Cards;
	readonly onShelf: boolean;
	readonly offersBoth: boolean;
	readonly shown: ShelfSaid;
	readonly counts: ShowingCounts;
	readonly facets: CatalogueFacets;
	readonly found: ShelfEntry[];
	readonly placed: ShelfEntry[];
	readonly divide: number | null;
	readonly nameOf: (widget: string | null) => ReactNode;
	readonly foundTemplates: readonly Template[];
	readonly empty: boolean;
	readonly docs: readonly DocPage[];
}

export type CatalogueView = CatalogueFilters & CatalogueRoom & CatalogueShelf & { readonly merged: MergedEntry[] };

const BROWSE_SAID: ShelfSaid = { title: "Widgets", lead: "Every widget this vault can draw, shown as it really looks" };

const SAID: Readonly<Partial<Record<CatalogueMode, ShelfSaid>>> = {
	browse: BROWSE_SAID,
	place: { title: "Add a widget", lead: "Pick one and it lands on this board" },
	fill: { title: "Fill this slot", lead: "Pick the widget this slot draws for every row" },
	text: { title: "Pick a widget", lead: "The widget this trigger draws, wherever the text appears" },
	mount: { title: "Add a view", lead: "Pick a widget and it becomes a view with a name of your own" },
	template: { title: "Templates", lead: "Pick one and it becomes a page, with every widget it stands on" },
};

const DOCS_SAID: ShelfSaid = {
	title: "Documentation",
	lead: "The plugin's own pages, one per file, shipped with the version you are running",
};

const TEMPLATE_CARD_TARGET_PX = 460;
const MIN_TEMPLATE_COLUMNS = 1;

export function useCatalogueView({
	registry,
	mode,
	kind,
	available,
	templates,
	rank,
	lock,
}: CatalogueViewAsk): CatalogueView {
	const filters = useCatalogueFilters(mode);
	const room = useCatalogueRoom();
	const merged = useMergedEntries({ registry, available, kind, lock });
	return { ...filters, ...room, ...shelfOf({ filters, room, merged, mode, templates, rank }), merged };
}

function useCatalogueFilters(mode: CatalogueMode): CatalogueFilters {
	const [keyword, setKeyword] = useState("");
	const [showing, setShowing] = useState<Showing>("all");
	const [pack, setPack] = useState(EVERY_PACK);
	const [tag, setTag] = useState<string | null>(null);
	const [packQuery, setPackQuery] = useState("");
	const [tagQuery, setTagQuery] = useState("");
	const [shelf, setShelf] = useState<Shelf>(mode === "template" ? "templates" : "widgets");
	const [page, setPage] = useState<string | null>(null);
	const [isSheetOpen, setSheetOpen] = useState(false);
	const clearAll = (): void => {
		setShowing("all");
		setPack(EVERY_PACK);
		setTag(null);
		setPackQuery("");
		setTagQuery("");
	};
	const openPage = (id: string): void => {
		setPage(id);
		setKeyword("");
		setSheetOpen(false);
	};
	return {
		keyword,
		setKeyword,
		showing,
		setShowing,
		pack,
		setPack,
		tag,
		setTag,
		packQuery,
		setPackQuery,
		tagQuery,
		setTagQuery,
		shelf,
		setShelf,
		page,
		setPage,
		isSheetOpen,
		setSheetOpen,
		narrowed: showing !== "all" || pack !== EVERY_PACK || tag !== null,
		clearAll,
		openPage,
	};
}

function useCatalogueRoom(): CatalogueRoom {
	const rootRef = useRef<HTMLDivElement | null>(null);
	const scrollRef = useRef<HTMLDivElement | null>(null);
	const width = useWidth(scrollRef);
	const { width: roomWidth, height: roomHeight } = useBox(rootRef);
	return { rootRef, scrollRef, width, roomHeight, phone: roomWidth > 0 && classOf(roomWidth).name === "phone" };
}

function useMergedEntries({
	registry,
	available,
	kind,
	lock,
}: Omit<CatalogueViewAsk, "mode" | "templates" | "rank">): MergedEntry[] {
	return useMemo(() => {
		const held: CatalogueDefinition[] =
			kind === "inline" ? inlineWidgets(registry.list()) : boardWidgets(registry.list());
		const offered = kind === "inline" ? available.filter((entry) => entry.manifest?.["inline"] === true) : available;
		const offers = new Map(offered.map((entry) => [entry.manifest?.["id"], entry] as const));
		return mergeCatalogue(held, offered).map((definition) => {
			const offer = offers.get(definition.manifest?.["id"]) ?? null;
			return {
				definition,
				offer,
				manifest: definition.manifest ?? {},
				installed: isInstalled(definition),
				update: isInstalled(definition) ? updateOffered(definition.manifest, offer, lock) : null,
			};
		});
	}, [registry, available, kind, lock]);
}

interface ShelfAsk {
	readonly filters: CatalogueFilters;
	readonly room: CatalogueRoom;
	readonly merged: MergedEntry[];
	readonly mode: CatalogueMode;
	readonly templates: readonly Template[];
	readonly rank?: RankEntry | undefined;
}

function shelfOf({ filters, room, merged, mode, templates, rank }: ShelfAsk): CatalogueShelf {
	const { keyword, page } = filters;
	const cards = measureCards(Math.max(room.width, CARD_TARGET_PX));
	const asked = keyword.trim() !== "";
	const onShelf = mode === "template" || filters.shelf === "templates";
	const found = foundEntries(filters, merged, cards, rank);
	const foundTemplates = asked ? rankSearch(keyword, templates).map((hit) => hit.record) : templates;
	return {
		cards,
		templateCards: measureCards(
			Math.max(room.width, TEMPLATE_CARD_TARGET_PX),
			TEMPLATE_CARD_TARGET_PX,
			MIN_TEMPLATE_COLUMNS,
		),
		onShelf,
		offersBoth: mode === "browse" && templates.length > 0,
		shown: page ? DOCS_SAID : (SAID[mode] ?? BROWSE_SAID),
		counts: {
			all: merged.length,
			installed: merged.filter((entry) => entry.installed).length,
			update: merged.filter((entry) => entry.update).length,
		},
		facets: facetsOf(merged),
		found,
		...layOut(found),
		nameOf: (widget) => nameIn(merged, widget),
		foundTemplates,
		empty: onShelf ? foundTemplates.length === 0 : found.length === 0,
		docs: pagesMatching(keyword),
	};
}

function foundEntries(
	{ keyword, showing, pack, tag }: CatalogueFilters,
	merged: readonly MergedEntry[],
	cards: Cards,
	rank: RankEntry | undefined,
): ShelfEntry[] {
	const kept = filterEntries(merged, { showing, pack, tag }).map((entry) => ({
		...entry,
		tile: cardTile(entry.manifest, cards),
		fit: rank?.(entry.manifest) ?? null,
	}));
	// TRADE-OFF: with no query the slot's own ranking is the answer, untouched — it is what a
	// TRADE-OFF: person filling a slot came for, and a score of zero everywhere would shuffle it
	if (keyword.trim() !== "") return rankSearch(keyword, kept, { read: fromManifest }).map((hit) => hit.record);
	return [...kept].sort((one, other) => (one.fit?.order ?? 0) - (other.fit?.order ?? 0));
}

function nameIn(merged: readonly MergedEntry[], widget: string | null): ReactNode {
	const title = merged.find((entry) => entry.manifest["id"] === widget)?.manifest["title"];
	return typeof title === "string" ? title : widget;
}
