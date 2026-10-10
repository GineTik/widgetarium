import { bound, keptValue } from "../shared/board-bindings.js";
import type { Binding } from "../shared/board-bindings.js";

type Tile = { readonly id: string; readonly widget: string; readonly props: Readonly<Record<string, Binding>> };

export type CatalogueBoardName = "catalogue" | "docs";

const FILTERED_BY = {
	keyword: "search/getValue",
	showing: "show/getSelection",
	pack: "packs/getSelection",
	tag: "tags/getSelection",
} as const;

const FILTER_PICKS = [FILTERED_BY.showing, FILTERED_BY.pack, FILTERED_BY.tag];

const CATALOGUE_TILES: readonly Tile[] = [
	tileOf("head", "head", { getSaid: bound("@catalogue/said"), getView: keptValue("catalogue") }),
	tileOf("views", "view-switch", {
		getViews: bound("@core/from-tile-rows", { ref: "shelf/holds" }),
		getView: bound("@core/from-tile-value", { ref: "shelf/selection" }),
	}),
	tileOf("search", "search", { getPlaceholder: keptValue("Search widgets and templates") }),
	tileOf("bar", "filter-bar", {
		getView: bound("@core/from-tile-value", { ref: "shelf/selection" }),
		getHiddenInView: keptValue("Templates"),
		getShown: counted("shown"),
		getNarrowed: counted("narrowed"),
		clearFilters: bound("@catalogue/clear-filters", { targets: FILTER_PICKS }),
	}),
	tileOf("sheethead", "sheet-head", {
		getNarrowed: counted("narrowed"),
		clearFilters: bound("@catalogue/clear-filters", { targets: FILTER_PICKS }),
	}),
	tileOf("show", "facet-list", { getHeading: keptValue("Show"), getRows: bound("@catalogue/showing", FILTERED_BY) }),
	tileOf("packs", "facet-list", {
		getHeading: keptValue("Packs"),
		getRows: bound("@catalogue/packs", { keyword: "packs/getFilter" }),
		getFilterPlaceholder: keptValue("Filter packs"),
	}),
	tileOf("tags", "chip-group", {
		getHeading: keptValue("Tags"),
		getChips: bound("@catalogue/tags", { keyword: "tags/getFilter" }),
		getFilterPlaceholder: keptValue("Filter tags"),
	}),
	tileOf("done", "sheet-done", {
		getShown: counted("shown"),
		close: bound("@core/value-set", { target: "bar/getIsOpen" }),
	}),
	tileOf("widgets", "widget-list", {
		getEntries: bound("@catalogue/entries", FILTERED_BY),
		getSaid: bound("@catalogue/said"),
	}),
	tileOf("templates", "template-list", {
		getTemplates: bound("@catalogue/templates", { keyword: FILTERED_BY.keyword }),
		getNoneSaid: bound("@catalogue/no-templates-said"),
	}),
];

const FILTERS_SHEET = {
	dir: "column",
	collapse: { into: "sheet", toggle: "always", docks: false },
	trigger: "bar/getIsOpen",
	name: "Filters",
	of: [{ id: "sheethead" }, { id: "show" }, { id: "packs" }, { id: "tags" }, { id: "done" }],
};

const CATALOGUE_LAYOUT = {
	dir: "row",
	of: [
		{
			dir: "column",
			keep: true,
			of: [
				{ id: "head" },
				{
					dir: "row",
					of: [
						{ id: "views", ratio: 3 },
						{ id: "search", ratio: 4 },
						{ id: "bar", ratio: 2 },
					],
				},
				{
					dir: "swap",
					id: "shelf",
					strip: false,
					of: [
						{ dir: "column", name: "Widgets", of: [FILTERS_SHEET, { id: "widgets" }] },
						{ dir: "column", name: "Templates", of: [{ id: "templates" }] },
					],
				},
			],
		},
	],
};

const DOCS_TILES: readonly Tile[] = [
	tileOf("head", "head", { getSaid: bound("@catalogue/docs-said"), getView: keptValue("docs") }),
	tileOf("search", "search", { getPlaceholder: keptValue("Search the docs") }),
	tileOf("pages", "facet-list", {
		getHeading: keptValue("Pages"),
		getRows: bound("@catalogue/doc-pages", { keyword: FILTERED_BY.keyword }),
	}),
	tileOf("page", "doc-page", {
		getPage: bound("@catalogue/doc-page", { picked: "pages/getSelection" }),
		openPage: bound("@core/value-set", { target: "pages/getSelection" }),
	}),
];

const DOCS_LAYOUT = {
	dir: "row",
	of: [{ dir: "column", keep: true, of: DOCS_TILES.map(({ id }) => ({ id })) }],
};

export const CATALOGUE_BOARDS: Readonly<Record<CatalogueBoardName, Readonly<Record<string, unknown>>>> = {
	catalogue: { v: 2, tiles: CATALOGUE_TILES, layout: CATALOGUE_LAYOUT },
	docs: { v: 2, tiles: DOCS_TILES, layout: DOCS_LAYOUT },
};

function tileOf(id: string, widget: string, props: Readonly<Record<string, Binding>>): Tile {
	return { id, widget: `@catalogue/${widget}`, props };
}

function counted(which: "shown" | "narrowed"): Binding {
	return bound("@catalogue/count", { which, ...FILTERED_BY });
}
