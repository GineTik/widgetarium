import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Field, Icon, List, Segmented, Sidebar, SidebarRow, SidebarSheet } from "@widgetarium/kit";
import { DOC_PAGES } from "./docs.js";
import { fillLine } from "./catalogue-entries.js";
import type { CatalogueView } from "./catalogue-view.js";
import { Facets } from "./catalogue-facets.js";
import { DocsList } from "./catalogue-docs-list.js";

const SHELVES = [
	{ value: "widgets", label: "Widgets" },
	{ value: "templates", label: "Templates" },
];

const SEARCH_WIDGETS = "Search widgets";
const SEARCH_TEMPLATES = "Search templates";
const SEARCH_DOCS = "Search the docs";
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

export function sidebarOf(view: CatalogueView): ReactElement {
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

export function sideHead({ shown }: CatalogueView): ReactElement {
	return h("div", { className: "wg-cat-side-head", key: "head" }, [
		h("h2", { className: "wg-cat-side-title", key: "title" }, shown.title),
		h("p", { className: "wg-cat-side-lead", key: "lead" }, shown.lead),
	]);
}

export function searchField({ page, onShelf, keyword, setKeyword }: CatalogueView): ReactElement {
	// TODO: Field props are unchecked until the kit types LooseProps
	return h(Field, {
		key: "search",
		block: true,
		className: "wg-cat-search",
		icon: h(Icon, { name: "search" }),
		placeholder: searchPlaceholderOf(page, onShelf),
		value: keyword,
		onValueChange: setKeyword,
	});
}

export function topBar(view: CatalogueView): ReactElement {
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

export function filterSheet(view: CatalogueView): ReactElement {
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

function searchPlaceholderOf(page: string | null, onShelf: boolean): string {
	if (page) return SEARCH_DOCS;
	return onShelf ? SEARCH_TEMPLATES : SEARCH_WIDGETS;
}

function facetPanel(view: CatalogueView): ReactElement {
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

function docsNav({ openPage }: CatalogueView): ReactElement {
	const first = DOC_PAGES[0];
	const last = DOC_PAGES[DOC_PAGES.length - 1];
	return h(List, { className: "wg-kit-side-list", key: "list" }, [
		h(SidebarRow, {
			key: "add",
			as: "button",
			className: "wg-cat-open-docs",
			icon: h(Icon, { name: "plus", size: 14 }),
			label: ADD_YOUR_OWN,
			after: h(Icon, { name: "chevron", key: "mark", size: 16 }),
			onClick: () => first && openPage(first.id),
		}),
		h(SidebarRow, {
			key: "docs",
			as: "button",
			className: "wg-cat-open-docs",
			icon: h(Icon, { name: "chat", size: 14 }),
			label: DOCUMENTATION,
			after: h(Icon, { name: "chevron", key: "mark", size: 16 }),
			onClick: () => last && openPage(last.id),
		}),
	]);
}

function backToWidgets({ setPage }: CatalogueView): ReactElement {
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

function clearAllButton({ clearAll }: CatalogueView): ReactElement {
	return h(
		Button,
		{ key: "clear", className: "wg-cat-clear", variant: "plain", size: "s", onClick: clearAll },
		CLEAR_ALL,
	);
}
