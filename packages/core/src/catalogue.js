import { createElement as h } from "react";
import { Button, Field, Icon, List, Segmented, Sidebar, SidebarRow, SidebarSheet } from "@widgetarium/kit";
import { TemplateGrid } from "./template-gallery.js";
import { DOC_PAGES, docPage } from "./docs.js";
import { DocsPage } from "./docs-page.js";
import { fillLine } from "./catalogue-entries.js";
import { useCatalogueView } from "./catalogue-view.js";
import { Tile } from "./catalogue-tile.js";
import { Facets } from "./catalogue-facets.js";
import { DocsList } from "./catalogue-docs-list.js";

export {
	actionFor,
	cardTile,
	facetsMatching,
	facetsOf,
	filterEntries,
	measureCards,
	packOf,
	updateOffered,
} from "./catalogue-entries.js";

const SHELVES = [
	{ value: "widgets", label: "Widgets" },
	{ value: "templates", label: "Templates" },
];

const SEARCH_WIDGETS = "Search widgets";
const SEARCH_TEMPLATES = "Search templates";
const SEARCH_DOCS = "Search the docs";
const NO_TEMPLATE = "No template answers to that.";
const NOTHING_ANSWERS = "Nothing here answers to that.";
const ADD_YOUR_OWN = "Add your own widget";
const DOCUMENTATION = "Documentation";
const BACK_TO_WIDGETS = "Back to widgets";
const FILTERS = "Filters";
const SHEET_DONE = "Show {count} widgets";
const CLEAR_ALL = "Clear all";
const SHEET_SHUT_PX = 0;
const SHEET_LEAST_PX = 360;
const SHEET_SHARE = 0.76;
const COUNTED = "{count} widgets";

const SHORT_LABEL = "These want more than this slot hands down";

export function Catalogue({
	registry,
	host,
	mode = "browse",
	kind = "board",
	available = [],
	templates = [],
	rank,
	lock = null,
	onPick,
	onInstall,
	// TODO: no entrance since the card menu went — uninstall needs one of its own
	onUninstall,
	onUseTemplate,
}) {
	const view = useCatalogueView({ registry, mode, kind, available, templates, rank, lock });
	return catalogueScreen({ ...view, registry, host, mode, onPick, onInstall, onUseTemplate });
}

function catalogueScreen(view) {
	const { phone, page, onShelf, isSheetOpen, setSheetOpen, empty } = view;
	return h("div", { className: phone ? "wg-cat is-phone" : "wg-cat", ref: view.rootRef }, [
		phone ? null : sidebarOf(view),
		h("section", { className: "wg-cat-main", key: "main" }, [
			phone ? sideHead(view) : null,
			phone ? searchField(view) : null,
			page ? null : topBar(view),
			h(
				"div",
				{
					key: "scroll",
					ref: view.scrollRef,
					className: "wg-cat-scroll",
				},
				catalogueBody(view),
			),
			empty && !page
				? h("p", { className: "wg-cat-none", key: "none" }, onShelf ? NO_TEMPLATE : NOTHING_ANSWERS)
				: null,
		]),
		phone && isSheetOpen && !page && !onShelf
			? h("div", { className: "wg-cat-scrim", key: "scrim", onClick: () => setSheetOpen(false) })
			: null,
		phone && !page && !onShelf ? filterSheet(view) : null,
	]);
}

function searchField({ page, onShelf, keyword, setKeyword }) {
	return h(Field, {
		key: "search",
		block: true,
		className: "wg-cat-search",
		icon: h(Icon, { name: "search" }),
		placeholder: page ? SEARCH_DOCS : onShelf ? SEARCH_TEMPLATES : SEARCH_WIDGETS,
		value: keyword,
		onInput: (event) => setKeyword(event.target.value),
	});
}

function facetPanel(view) {
	return h(Facets, {
		key: "facets",
		counts: view.counts,
		facets: view.facets,
		showing: view.showing,
		onShowing: view.setShowing,
		pack: view.pack,
		onPack: view.setPack,
		tag: view.tag,
		onTag: view.setTag,
		packQuery: view.packQuery,
		onPackQuery: view.setPackQuery,
		tagQuery: view.tagQuery,
		onTagQuery: view.setTagQuery,
	});
}

function sideHead({ shown }) {
	return h("div", { className: "wg-cat-side-head", key: "head" }, [
		h("h2", { className: "wg-cat-side-title", key: "title" }, shown.title),
		h("p", { className: "wg-cat-side-lead", key: "lead" }, shown.lead),
	]);
}

function docsNav({ openPage }) {
	return h(List, { className: "wg-kit-side-list", key: "list" }, [
		h(SidebarRow, {
			key: "add",
			as: "button",
			className: "wg-cat-open-docs",
			icon: h(Icon, { name: "plus", size: 14 }),
			label: ADD_YOUR_OWN,
			after: h(Icon, { name: "chevron", key: "mark", size: 16 }),
			onClick: () => openPage(DOC_PAGES[0].id),
		}),
		h(SidebarRow, {
			key: "docs",
			as: "button",
			className: "wg-cat-open-docs",
			icon: h(Icon, { name: "chat", size: 14 }),
			label: DOCUMENTATION,
			after: h(Icon, { name: "chevron", key: "mark", size: 16 }),
			onClick: () => openPage(DOC_PAGES[DOC_PAGES.length - 1].id),
		}),
	]);
}

function backToWidgets({ setPage }) {
	return h(
		"div",
		{ className: "wg-kit-side-group wg-cat-side-foot", key: "back" },
		h(
			List,
			{ className: "wg-kit-side-list" },
			h(SidebarRow, {
				as: "button",
				className: "wg-cat-back",
				icon: h(Icon, { name: "fold", size: 14 }),
				label: BACK_TO_WIDGETS,
				onClick: () => setPage(null),
			}),
		),
	);
}

function sidebarOf(view) {
	const { page, docs, openPage, onShelf } = view;
	return h(Sidebar, { className: "wg-cat-side", key: "side" }, [
		sideHead(view),
		searchField(view),
		...(page
			? [h(DocsList, { key: "pages", pages: docs, page, onOpenPage: openPage }), backToWidgets(view)]
			: [
					onShelf ? null : facetPanel(view),
					h("div", { className: "wg-kit-side-group wg-cat-side-foot", key: "nav" }, docsNav(view)),
				]),
	]);
}

function catalogueBody(view) {
	const { page, host, openPage, onShelf, width } = view;
	if (page) return h(DocsPage, { page: docPage(page), host, onOpenPage: openPage });
	if (onShelf)
		return h(TemplateGrid, {
			templates: view.foundTemplates,
			columns: view.templateCards.columns,
			nameOf: view.nameOf,
			onUse: view.onUseTemplate,
		});
	if (width <= 0) return null;
	return h(
		"div",
		{ className: "wg-cat-grid", style: { "--wg-cat-columns": view.cards.columns } },
		view.placed.flatMap((entry, index) => tileWithDivide(view, entry, index)),
	);
}

function tileWithDivide({ registry, host, mode, onPick, onInstall, divide }, entry, index) {
	const card = h(Tile, {
		key: entry.manifest?.id ?? index,
		entry,
		tile: entry.tile,
		registry,
		host,
		mode,
		lacks: entry.fit?.lacks ?? null,
		onPick,
		onInstall,
	});
	if (index !== divide) return [card];
	return [h("p", { className: "wg-cat-divide", key: "divide" }, SHORT_LABEL), card];
}

function clearAllButton({ clearAll }) {
	return h(
		Button,
		{ key: "clear", className: "wg-cat-clear", variant: "plain", size: "s", onClick: clearAll },
		CLEAR_ALL,
	);
}

function topBar(view) {
	const { phone, onShelf, narrowed, setSheetOpen, offersBoth, shelf, setShelf } = view;
	return h("div", { className: "wg-cat-top", key: "top" }, [
		phone && !onShelf
			? h(
					Button,
					{
						key: "filters",
						className: narrowed ? "wg-cat-filters is-on" : "wg-cat-filters",
						size: "s",
						onClick: () => setSheetOpen(true),
					},
					[h(Icon, { name: "filter", key: "mark", size: 15 }), h("span", { key: "said" }, FILTERS)],
				)
			: null,
		offersBoth
			? h(Segmented, {
					key: "shelf",
					className: "wg-cat-shelf",
					items: SHELVES,
					value: shelf,
					onChange: setShelf,
				})
			: null,
		h(
			"span",
			{ className: "wg-cat-count", key: "count" },
			fillLine(COUNTED, { count: onShelf ? view.foundTemplates.length : view.found.length }),
		),
		narrowed && !phone ? clearAllButton(view) : null,
	]);
}

function filterSheet(view) {
	const { isSheetOpen, setSheetOpen, roomHeight, narrowed } = view;
	return h(
		SidebarSheet,
		{
			as: "aside",
			key: "sheet",
			surface: "glass",
			className: isSheetOpen ? "wg-cat-sheet is-open" : "wg-cat-sheet",
			isOpen: isSheetOpen,
			onOpen: setSheetOpen,
			peekPx: SHEET_SHUT_PX,
			maxPx: Math.max(SHEET_LEAST_PX, Math.round(roomHeight * SHEET_SHARE)),
			grip: FILTERS,
		},
		[
			h("div", { className: "wg-cat-sheet-head", key: "head" }, [
				h("h2", { className: "wg-cat-side-title", key: "title" }, FILTERS),
				narrowed ? clearAllButton(view) : null,
			]),
			h("div", { className: "wg-cat-sheet-body", key: "body" }, facetPanel(view)),
			h(
				Button,
				{
					key: "done",
					block: true,
					variant: "accent",
					size: "l",
					className: "wg-cat-sheet-done",
					onClick: () => setSheetOpen(false),
				},
				fillLine(SHEET_DONE, { count: view.found.length }),
			),
		],
	);
}
