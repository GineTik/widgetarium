import { useMemo, useRef, useState } from "react";
import { boardWidgets, inlineWidgets } from "./registry.js";
import { isInstalled, mergeCatalogue } from "./engine/catalogue-index.js";
import { rankSearch } from "./engine/search.js";
import { classOf } from "./paths.js";
import { pagesMatching } from "./docs.js";
import { useBox, useWidth } from "./use-width.js";
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

const SAID = {
	browse: { title: "Widgets", lead: "Every widget this vault can draw, shown as it really looks" },
	place: { title: "Add a widget", lead: "Pick one and it lands on this board" },
	fill: { title: "Fill this slot", lead: "Pick the widget this slot draws for every row" },
	text: { title: "Pick a widget", lead: "The widget this trigger draws, wherever the text appears" },
	mount: { title: "Add a view", lead: "Pick a widget and it becomes a view with a name of your own" },
	template: { title: "Templates", lead: "Pick one and it becomes a page, with every widget it stands on" },
};

const DOCS_SAID = {
	title: "Documentation",
	lead: "The plugin's own pages, one per file, shipped with the version you are running",
};

const TEMPLATE_CARD_TARGET_PX = 460;
const MIN_TEMPLATE_COLUMNS = 1;

export function useCatalogueView({ registry, mode, kind, available, templates, rank, lock }) {
	const filters = useCatalogueFilters(mode);
	const room = useCatalogueRoom();
	const merged = useMergedEntries({ registry, available, kind, lock });
	return { ...filters, ...room, ...shelfOf({ filters, room, merged, mode, templates, rank }), merged };
}

function useCatalogueFilters(mode) {
	const [keyword, setKeyword] = useState("");
	const [showing, setShowing] = useState("all");
	const [pack, setPack] = useState(EVERY_PACK);
	const [tag, setTag] = useState(null);
	const [packQuery, setPackQuery] = useState("");
	const [tagQuery, setTagQuery] = useState("");
	const [shelf, setShelf] = useState(mode === "template" ? "templates" : "widgets");
	const [page, setPage] = useState(null);
	const [isSheetOpen, setSheetOpen] = useState(false);
	const clearAll = () => {
		setShowing("all");
		setPack(EVERY_PACK);
		setTag(null);
		setPackQuery("");
		setTagQuery("");
	};
	const openPage = (id) => {
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

function useCatalogueRoom() {
	const rootRef = useRef(null);
	const scrollRef = useRef(null);
	const width = useWidth(scrollRef);
	const { width: roomWidth, height: roomHeight } = useBox(rootRef);
	return { rootRef, scrollRef, width, roomHeight, phone: roomWidth > 0 && classOf(roomWidth).name === "phone" };
}

function useMergedEntries({ registry, available, kind, lock }) {
	return useMemo(() => {
		const held = kind === "inline" ? inlineWidgets(registry.list()) : boardWidgets(registry.list());
		const offered = kind === "inline" ? available.filter((entry) => entry.manifest?.inline === true) : available;
		const offers = new Map(offered.map((entry) => [entry.manifest?.id, entry]));
		return mergeCatalogue(held, offered).map((definition) => {
			const offer = offers.get(definition.manifest?.id) ?? null;
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

function shelfOf({ filters, room, merged, mode, templates, rank }) {
	const { keyword, showing, pack, tag, shelf, page } = filters;
	const cards = measureCards(Math.max(room.width, CARD_TARGET_PX));
	const asked = keyword.trim() !== "";
	const onShelf = mode === "template" || shelf === "templates";
	const kept = filterEntries(merged, { showing, pack, tag }).map((entry) => ({
		...entry,
		tile: cardTile(entry.manifest, cards),
		fit: rank?.(entry.manifest) ?? null,
	}));
	// TRADE-OFF: with no query the slot's own ranking is the answer, untouched — it is what a
	// TRADE-OFF: person filling a slot came for, and a score of zero everywhere would shuffle it
	const found = asked
		? rankSearch(keyword, kept, { read: fromManifest }).map((hit) => hit.record)
		: [...kept].sort((one, other) => (one.fit?.order ?? 0) - (other.fit?.order ?? 0));
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
		shown: page ? DOCS_SAID : (SAID[mode] ?? SAID.browse),
		counts: {
			all: merged.length,
			installed: merged.filter((entry) => entry.installed).length,
			update: merged.filter((entry) => entry.update).length,
		},
		facets: facetsOf(merged),
		found,
		...layOut(found),
		nameOf: (widget) => merged.find((entry) => entry.manifest?.id === widget)?.manifest?.title ?? widget,
		foundTemplates,
		empty: onShelf ? foundTemplates.length === 0 : found.length === 0,
		docs: pagesMatching(keyword),
	};
}
