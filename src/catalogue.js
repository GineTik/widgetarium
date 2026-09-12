import { createElement as h, Component } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { boardWidgets, inlineWidgets } from "./registry.js";
import { isInstalled, mergeCatalogue } from "./engine/catalogue-index.js";
import {
	Button,
	Card,
	Field,
	Icon,
	IconButton,
	List,
	Popover,
	PopoverItem,
	Segmented,
	Sidebar,
	SidebarRow,
	SidebarSheet,
} from "./kit.js";
import { rankSearch } from "./engine/search.js";
import { drawnWidget } from "./mounted.js";
import { previewProps, previewSize } from "./preview.js";
import { spanToPixels } from "./layout.js";
import { classOf, GRID } from "./paths.js";
import { TemplateGrid } from "./template-gallery.js";
import { DOC_PAGES, docPage, pagesMatching } from "./docs.js";
import { DocsPage } from "./docs-page.js";
import { useBox, useWidth } from "./use-width.js";

const VERBS = { browse: "Open", place: "Add", fill: "Use", text: "Use", mount: "Add" };

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

const SHELVES = [
	{ value: "widgets", label: "Widgets" },
	{ value: "templates", label: "Templates" },
];

const EVERY_PACK = "all";

const SHOWING = {
	all: { label: "All widgets", icon: "widget" },
	installed: { label: "Installed", icon: "tick" },
	update: { label: "Update ready", icon: "update" },
};

const SHOWING_ORDER = ["all", "installed", "update"];

const TEMPLATE_CARD_TARGET_PX = 460;
const MIN_TEMPLATE_COLUMNS = 1;

const SEARCH_WIDGETS = "Search widgets";
const SEARCH_TEMPLATES = "Search templates";
const SEARCH_DOCS = "Search the docs";
const SEARCH_PACKS = "Filter packs";
const SEARCH_TAGS = "Filter tags";
const NO_TEMPLATE = "No template answers to that.";
const NOTHING_ANSWERS = "Nothing here answers to that.";
const PACKS = "Packs";
const TAGS = "Tags";
const SHOW = "Show";
const PAGES = "Pages";
const ADD_YOUR_OWN = "Add your own widget";
const DOCUMENTATION = "Documentation";
const BACK_TO_WIDGETS = "Back to widgets";
const FILTERS = "Filters";
const ADD_TO_BOARD = "Add to the board";
const UNINSTALL = "Uninstall";
const SHEET_DONE = "Show {count} widgets";
const CLEAR_ALL = "Clear all";
const MORE_TAGS = "+{count}";
const TAGS_SHOWN = 6;
const SHEET_PEEK_PX = 96;
const SHEET_PAD_PX = 12;
const COUNTED = "{count} widgets";
const WRITING = "Writing {done} of {total} files";
const FETCHING = "Fetching";
const OUTDATED = "{here} here · {there} out";
const COULD_NOT_FETCH = "could not fetch this widget";

const SHORT_LABEL = "These want more than this slot hands down";

// TRADE-OFF: below this a shape stops reading, so the widget draws a stand-in instead
const READABLE_SCALE = 0.3;

const CARD_TARGET_PX = 300;
const MIN_COLUMNS = 1;
const MAX_COLUMNS = 5;
const GAP_PX = 12;
const CARD_PAD_PX = 10;
// TRADE-OFF: the widget never touches the stage's edge — flush, a whole widget reads as a cut one
const STAGE_PAD_PX = 10;

// TRADE-OFF: six cells, not four. Four reads at 1:1 but shows too little of a board-shaped
// widget; six shrinks by about a third and still carries the shape — and the playground behind
// a press is where anything is actually read.
const MAX_SPAN = { w: 6, h: 6 };

const RING_RADIUS = 14;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const WAITING_ARC = 0.28;

function clamp(value, low, high) {
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

function shortName(manifest) {
	const title = manifest.title ?? manifest.id ?? "";
	const cut = title.lastIndexOf("·");
	return cut === -1 ? title : title.slice(cut + 1).trim();
}

function initialOf(manifest) {
	return shortName(manifest).trim().charAt(0).toUpperCase() || "?";
}

export function packOf(manifest) {
	const id = String(manifest?.id ?? "");
	const cut = id.indexOf("/");
	return cut === -1 ? id : id.slice(0, cut);
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

export function facetsOf(entries) {
	return {
		packs: countBy(entries, (entry) => [packOf(entry.manifest)]),
		tags: countBy(entries, (entry) => keywordsOf(entry.manifest)),
	};
}

export function updateOffered(manifest, offer, lock) {
	const here = lock?.widgets?.[manifest?.id]?.commit;
	const there = offer?.manifest?.commit ?? offer?.commit ?? null;
	if (!here || !there || here === there) return null;
	return { here: String(here).slice(0, 7), there: String(there).slice(0, 7) };
}

export function actionFor(entry) {
	if (!entry.installed) return "install";
	if (entry.update) return "update";
	return "add";
}

export function keptBy(entries, { showing, pack, tag }) {
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

function said(line, values) {
	return Object.entries(values).reduce((held, [key, value]) => held.replace(`{${key}}`, String(value)), line);
}

class Contained extends Component {
	state = { failure: null };

	componentDidCatch(failure) {
		this.setState({ failure });
	}

	render() {
		return this.state.failure ? this.props.instead(this.state.failure) : this.props.children;
	}
}

function Standin({ manifest, line, tone }) {
	return h("div", { className: tone === "broken" ? "wg-cat-stand is-broken" : "wg-cat-stand" }, [
		h("span", { className: "wg-cat-mark", key: "mark" }, initialOf(manifest)),
		h("span", { className: "wg-cat-line", key: "line" }, line),
	]);
}

function Preview({ definition, registry, host, tile }) {
	const manifest = definition.manifest ?? {};

	if (definition.error) {
		return h(Standin, { manifest, tone: "broken", line: "This widget does not load" });
	}
	if (manifest.preview?.instead) {
		return h(Standin, { manifest, line: manifest.preview.instead });
	}
	if (!definition.component) {
		return h(Standin, { manifest, line: "Not installed yet" });
	}
	if (tile.scale < READABLE_SCALE) {
		return h(Standin, { manifest, line: "Too small to draw here" });
	}

	return h(
		Contained,
		{ instead: () => h(Standin, { manifest, tone: "broken", line: "This widget failed while drawing" }) },
		h(
			"div",
			{
				className: "wg-cat-scaled",
				style: {
					width: `${tile.size.width}px`,
					height: `${tile.size.height}px`,
					transform: `scale(${tile.scale})`,
				},
			},
			drawnWidget(definition, previewProps(definition, { registry, host })),
		),
	);
}

function Ring({ step }) {
	const measured = step?.total > 0;
	const share = measured ? clamp(step.done / step.total, 0, 1) : 0;
	return h(
		"svg",
		{
			className: measured ? "wg-cat-ring" : "wg-cat-ring is-waiting",
			viewBox: "0 0 32 32",
			width: 32,
			height: 32,
			"aria-hidden": "true",
		},
		[
			h("circle", { key: "track", className: "wg-cat-ring-track", cx: 16, cy: 16, r: RING_RADIUS }),
			h("circle", {
				key: "arc",
				className: "wg-cat-ring-arc",
				cx: 16,
				cy: 16,
				r: RING_RADIUS,
				strokeDasharray: measured ? RING_LENGTH : RING_LENGTH * WAITING_ARC,
				strokeDashoffset: measured ? RING_LENGTH * (1 - share) : 0,
			}),
		],
	);
}

const ACTION_GLYPH = { add: "plus", install: "download", update: "update", failed: "retry" };

function CardAction({ state, step, label, onPress }) {
	const press = (event) => {
		event.stopPropagation();
		onPress();
	};
	if (state === "busy") {
		return h(IconButton, { className: "wg-cat-go is-busy", variant: "ghost", size: "s", label, disabled: true }, [
			h(Ring, { key: "ring", step }),
			h("span", { className: "wg-cat-stop", key: "stop" }),
		]);
	}
	return h(
		IconButton,
		{
			className: `wg-cat-go is-${state}`,
			variant: state === "add" ? "accent" : "ghost",
			size: "s",
			label,
			onClick: press,
		},
		h(Icon, { name: ACTION_GLYPH[state], size: 15 }),
	);
}

function useInstallPress({ entry, mode, onPick, onInstall }) {
	const [isBusy, setBusy] = useState(false);
	const [step, setStep] = useState(null);
	const [failure, setFailure] = useState(null);
	const id = entry.manifest?.id;
	const state = failure ? "failed" : isBusy ? "busy" : actionFor(entry);

	const press = async () => {
		if (isBusy) return undefined;
		if (state === "add") return onPick?.(id, mode);
		setBusy(true);
		setFailure(null);
		setStep(null);
		const done = await onInstall?.(entry.definition, setStep);
		setBusy(false);
		setStep(null);
		if (!done?.ok) return setFailure(done?.failure ?? COULD_NOT_FETCH);
		return onPick?.(id, mode);
	};

	return { state, step, failure, press };
}

function tileActions({ entry, state, mode, onPick, onUninstall }) {
	const id = entry.manifest?.id;
	const placeable = state !== "add" && state !== "busy";
	return [
		placeable ? { key: "add", label: ADD_TO_BOARD, run: () => onPick?.(id, mode) } : null,
		entry.installed && onUninstall ? { key: "remove", label: UNINSTALL, run: () => onUninstall(id) } : null,
	].filter(Boolean);
}

function TileMenu({ actions, name }) {
	if (actions.length === 0) return null;
	const trigger = h(
		IconButton,
		{ className: "wg-cat-more", variant: "raised", size: "xs", label: `${name} actions`, onClick: (event) => event.stopPropagation() },
		h(Icon, { name: "dots", size: 14 }),
	);
	const item = (action) =>
		h(
			PopoverItem,
			{
				key: action.key,
				onClick: (event) => {
					event.stopPropagation();
					action.run();
				},
			},
			action.label,
		);
	return h("div", { className: "wg-cat-menu" }, h(Popover, { placement: "below", trigger }, actions.map(item)));
}

function TileStage({ definition, registry, host, tile }) {
	const lattice = { "--wg-cell": `${tile.cell}px`, "--wg-gap": `${tile.gap}px`, "--wg-cat-across": tile.w };
	const frame = { width: `${Math.round(tile.frameWidth)}px`, height: `${Math.round(tile.frameHeight)}px` };
	return h(
		"div",
		{ className: "wg-cat-stage", style: lattice },
		h(
			"div",
			{ className: "wg-cat-frame", style: frame },
			h("div", { className: "wg-cat-pic", inert: true }, h(Preview, { definition, registry, host, tile })),
		),
	);
}

function TileName({ manifest }) {
	return h("span", { className: "wg-cat-said", title: manifest.id }, [
		h("span", { className: "wg-cat-scope", key: "scope" }, packOf(manifest)),
		h("span", { className: "wg-cat-slash", key: "slash" }, "/"),
		h("span", { className: "wg-cat-name", key: "name" }, shortName(manifest)),
	]);
}

function TileLines({ entry, state, step, failure, lacks }) {
	const description = entry.manifest?.description;
	return [
		state === "busy" ? h("p", { className: "wg-cat-step", key: "step" }, step?.total > 0 ? said(WRITING, step) : FETCHING) : null,
		state !== "busy" && entry.update ? h("p", { className: "wg-cat-step", key: "update" }, said(OUTDATED, entry.update)) : null,
		// TRADE-OFF: the sentence lives on the card, because there is no detail page to hold it
		description ? h("p", { className: "wg-cat-what", key: "what" }, description) : null,
		failure ? h("p", { className: "wg-cat-lack is-failure", key: "failure" }, failure) : null,
		lacks ? h("p", { className: "wg-cat-lack", key: "lack" }, lacks) : null,
	];
}

function Tile({ entry, tile, registry, host, mode, lacks, onPick, onInstall, onUninstall }) {
	const manifest = entry.manifest ?? {};
	const name = shortName(manifest);
	const press = `${VERBS[mode] ?? VERBS.browse} ${name}`;
	const { state, step, failure, press: run } = useInstallPress({ entry, mode, onPick, onInstall });

	return h(
		Card,
		{ asChild: true, className: "wg-cat-tile" },
		h(
			"article",
			{
				role: "button",
				tabIndex: 0,
				"aria-label": press,
				"data-span": `${tile.size.w}x${tile.size.h}`,
				"data-state": state,
				onClick: run,
				onKeyDown: (event) => (event.key === "Enter" || event.key === " ") && run(),
			},
			[
				h(TileMenu, { key: "menu", name, actions: tileActions({ entry, state, mode, onPick, onUninstall }) }),
				h(TileStage, { key: "stage", definition: entry.definition, registry, host, tile }),
				h("div", { className: "wg-cat-foot", key: "foot" }, [
					h(TileName, { key: "said", manifest }),
					h(CardAction, { key: "go", state, step, label: press, onPress: run }),
				]),
				...TileLines({ entry, state, step, failure, lacks }),
			],
		),
	);
}

function laidOut(shown) {
	const fits = shown.filter((entry) => !entry.fit?.lacks);
	const short = shown.filter((entry) => entry.fit?.lacks);
	return { placed: [...fits, ...short], divide: short.length > 0 ? fits.length : null };
}

function fromManifest(entry, key) {
	return entry.manifest[key];
}

function FacetGroup({ label, placeholder, query, onQuery, children }) {
	return h("div", { className: "wg-kit-side-group wg-cat-facet" }, [
		h("span", { className: "wg-kit-side-label", key: "label" }, label),
		h(Field, {
			key: "search",
			block: true,
			size: "s",
			className: "wg-cat-facet-search",
			icon: h(Icon, { name: "search", size: 14 }),
			placeholder,
			value: query,
			onInput: (event) => onQuery(event.target.value),
		}),
		children,
	]);
}

function Facets({
	counts,
	facets,
	showing,
	onShowing,
	pack,
	onPack,
	tag,
	onTag,
	packQuery,
	onPackQuery,
	tagQuery,
	onTagQuery,
	allTags,
	onAllTags,
}) {
	const packs = facetsMatching(facets.packs, packQuery);
	const tags = facetsMatching(facets.tags, tagQuery);
	const chips = allTags ? tags : tags.slice(0, TAGS_SHOWN);
	const rest = tags.length - chips.length;

	return [
		h("div", { className: "wg-kit-side-group", key: "show" }, [
			h("span", { className: "wg-kit-side-label", key: "label" }, SHOW),
			h(
				List,
				{ className: "wg-kit-side-list", key: "list" },
				SHOWING_ORDER.map((key) =>
					h(SidebarRow, {
						key,
						as: "button",
						className: `wg-cat-show is-${key}`,
						icon: h(Icon, { name: SHOWING[key].icon, size: 14 }),
						label: SHOWING[key].label,
						value: String(counts[key]),
						selected: showing === key,
						onClick: () => onShowing(key),
					}),
				),
			),
		]),
		h(
			FacetGroup,
			{ key: "packs", label: PACKS, placeholder: SEARCH_PACKS, query: packQuery, onQuery: onPackQuery },
			h(
				List,
				{ className: "wg-kit-side-list wg-cat-packs", key: "list" },
				packs.map((facet) =>
					h(SidebarRow, {
						key: facet.name,
						as: "button",
						className: "wg-cat-pack",
						icon: h("span", { className: "wg-cat-pack-mark" }, facet.name.replace("@", "").charAt(0).toUpperCase()),
						label: facet.name,
						value: String(facet.count),
						selected: pack === facet.name,
						onClick: () => onPack(pack === facet.name ? EVERY_PACK : facet.name),
					}),
				),
			),
		),
		h(
			FacetGroup,
			{ key: "tags", label: TAGS, placeholder: SEARCH_TAGS, query: tagQuery, onQuery: onTagQuery },
			h("div", { className: "wg-cat-tags", key: "chips" }, [
				...chips.map((facet) =>
					h(
						Button,
						{
							key: facet.name,
							className: tag === facet.name ? "wg-cat-tag is-on" : "wg-cat-tag",
							size: "s",
							variant: tag === facet.name ? "accent" : "neutral",
							onClick: () => onTag(tag === facet.name ? null : facet.name),
						},
						facet.name,
					),
				),
				rest > 0
					? h(
							Button,
							{ key: "more", className: "wg-cat-tag wg-cat-more-tags", size: "s", onClick: () => onAllTags(true) },
							said(MORE_TAGS, { count: rest }),
						)
					: null,
			]),
		),
	];
}

function DocsList({ pages, page, onOpenPage }) {
	return h("div", { className: "wg-kit-side-group", key: "pages" }, [
		h("span", { className: "wg-kit-side-label", key: "label" }, PAGES),
		h(
			List,
			{ className: "wg-kit-side-list", key: "list" },
			pages.map((one) =>
				h(SidebarRow, {
					key: one.id,
					as: "button",
					className: "wg-cat-page",
					icon: h(Icon, { name: one.icon, size: 14 }),
					label: one.title,
					selected: page === one.id,
					onClick: () => onOpenPage(one.id),
				}),
			),
		),
	]);
}

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
	onUninstall,
	onUseTemplate,
}) {
	const [keyword, setKeyword] = useState("");
	const [showing, setShowing] = useState("all");
	const [pack, setPack] = useState(EVERY_PACK);
	const [tag, setTag] = useState(null);
	const [packQuery, setPackQuery] = useState("");
	const [tagQuery, setTagQuery] = useState("");
	const [shelf, setShelf] = useState(mode === "template" ? "templates" : "widgets");
	const [page, setPage] = useState(null);
	const [isSheetOpen, setSheetOpen] = useState(false);
	const [allTags, setAllTags] = useState(false);
	const [sheetHeight, setSheetHeight] = useState(SHEET_PEEK_PX);
	const rootRef = useRef(null);
	const scrollRef = useRef(null);
	const width = useWidth(scrollRef);
	const { width: roomWidth, height: roomHeight } = useBox(rootRef);
	const phone = roomWidth > 0 && classOf(roomWidth).name === "phone";
	const narrowed = showing !== "all" || pack !== EVERY_PACK || tag !== null;
	const clearAll = () => {
		setShowing("all");
		setPack(EVERY_PACK);
		setTag(null);
		setPackQuery("");
		setTagQuery("");
	};
	const cards = measureCards(Math.max(width, CARD_TARGET_PX));
	const templateCards = measureCards(
		Math.max(width, TEMPLATE_CARD_TARGET_PX),
		TEMPLATE_CARD_TARGET_PX,
		MIN_TEMPLATE_COLUMNS,
	);
	const asked = keyword.trim() !== "";
	const onShelf = mode === "template" || shelf === "templates";
	const offersBoth = mode === "browse" && templates.length > 0;
	const shown = page ? DOCS_SAID : (SAID[mode] ?? SAID.browse);

	const merged = useMemo(() => {
		const held = kind === "inline" ? inlineWidgets(registry.list()) : boardWidgets(registry.list());
		const offered = kind === "inline" ? available.filter((entry) => entry.manifest?.inline === true) : available;
		const offers = new Map(offered.map((entry) => [entry.manifest?.id, entry]));
		return mergeCatalogue(held, offered).map((definition) => ({
			definition,
			manifest: definition.manifest ?? {},
			installed: isInstalled(definition),
			update: isInstalled(definition)
				? updateOffered(definition.manifest, offers.get(definition.manifest?.id), lock)
				: null,
		}));
	}, [registry, available, kind, lock]);

	const counts = {
		all: merged.length,
		installed: merged.filter((entry) => entry.installed).length,
		update: merged.filter((entry) => entry.update).length,
	};
	const facets = facetsOf(merged);

	const kept = keptBy(merged, { showing, pack, tag }).map((entry) => ({
		...entry,
		tile: cardTile(entry.manifest, cards),
		fit: rank?.(entry.manifest) ?? null,
	}));

	// TRADE-OFF: with no query the slot's own ranking is the answer, untouched — it is what a
	// TRADE-OFF: person filling a slot came for, and a score of zero everywhere would shuffle it
	const found = asked
		? rankSearch(keyword, kept, { read: fromManifest }).map((hit) => hit.record)
		: [...kept].sort((one, other) => (one.fit?.order ?? 0) - (other.fit?.order ?? 0));

	const { placed, divide } = laidOut(found);

	const nameOf = (widget) => merged.find((entry) => entry.manifest?.id === widget)?.manifest?.title ?? widget;
	const foundTemplates = asked ? rankSearch(keyword, templates).map((hit) => hit.record) : templates;
	const empty = onShelf ? foundTemplates.length === 0 : found.length === 0;
	const docs = pagesMatching(keyword);

	const openPage = (id) => {
		setPage(id);
		setKeyword("");
		setSheetOpen(false);
	};

	const search = h(Field, {
		key: "search",
		block: true,
		className: "wg-cat-search",
		icon: h(Icon, { name: "search" }),
		placeholder: page ? SEARCH_DOCS : onShelf ? SEARCH_TEMPLATES : SEARCH_WIDGETS,
		value: keyword,
		onInput: (event) => setKeyword(event.target.value),
	});

	const facetPanel = h(Facets, {
		key: "facets",
		counts,
		facets,
		showing,
		onShowing: setShowing,
		pack,
		onPack: setPack,
		tag,
		onTag: setTag,
		packQuery,
		onPackQuery: setPackQuery,
		tagQuery,
		onTagQuery: setTagQuery,
		allTags,
		onAllTags: setAllTags,
	});

	const head = h("div", { className: "wg-cat-side-head", key: "head" }, [
		h("h2", { className: "wg-cat-side-title", key: "title" }, shown.title),
		h("p", { className: "wg-cat-side-lead", key: "lead" }, shown.lead),
	]);

	const docsNav = h(List, { className: "wg-kit-side-list", key: "list" }, [
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

	const back = h(
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

	const sidebar = h(Sidebar, { className: "wg-cat-side", key: "side" }, [
		head,
		search,
		...(page
			? [h(DocsList, { key: "pages", pages: docs, page, onOpenPage: openPage }), back]
			: [
					onShelf ? null : facetPanel,
					h("div", { className: "wg-kit-side-group wg-cat-side-foot", key: "nav" }, docsNav),
				]),
	]);

	const body = page
		? h(DocsPage, { page: docPage(page), host, onOpenPage: openPage })
		: onShelf
			? h(TemplateGrid, { templates: foundTemplates, columns: templateCards.columns, nameOf, onUse: onUseTemplate })
			: width <= 0
				? null
				: h(
						"div",
						{ className: "wg-cat-grid", style: { "--wg-cat-columns": cards.columns } },
						placed.flatMap((entry, index) => {
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
								onUninstall,
							});
							if (index !== divide) return [card];
							return [h("p", { className: "wg-cat-divide", key: "divide" }, SHORT_LABEL), card];
						}),
					);

	return h("div", { className: phone ? "wg-cat is-phone" : "wg-cat", ref: rootRef }, [
		phone ? null : sidebar,
		h("section", { className: "wg-cat-main", key: "main" }, [
			phone ? head : null,
			phone ? search : null,
			page
				? null
				: h("div", { className: "wg-cat-top", key: "top" }, [
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
							said(COUNTED, { count: onShelf ? foundTemplates.length : found.length }),
						),
						narrowed && !phone
							? h(Button, { key: "clear", className: "wg-cat-clear", variant: "plain", size: "s", onClick: clearAll }, CLEAR_ALL)
							: null,
					]),
			h(
				"div",
				{
					key: "scroll",
					ref: scrollRef,
					className: "wg-cat-scroll",
					style: phone && !page && !onShelf ? { paddingBottom: `${sheetHeight + SHEET_PAD_PX}px` } : undefined,
				},
				body,
			),
			empty && !page
				? h("p", { className: "wg-cat-none", key: "none" }, onShelf ? NO_TEMPLATE : NOTHING_ANSWERS)
				: null,
		]),
		phone && !page && !onShelf
			? h(
					SidebarSheet,
					{
						as: "aside",
						key: "sheet",
						surface: "glass",
						className: "wg-cat-sheet",
						isOpen: isSheetOpen,
						onOpen: setSheetOpen,
						peekPx: SHEET_PEEK_PX,
						maxPx: Math.max(SHEET_PEEK_PX, roomHeight - 2 * SHEET_PAD_PX),
						onHeight: setSheetHeight,
						grip: FILTERS,
						style: { left: `${SHEET_PAD_PX}px`, right: `${SHEET_PAD_PX}px`, bottom: `${SHEET_PAD_PX}px` },
					},
					[
						h("div", { className: "wg-cat-sheet-head", key: "head" }, [
							h("h2", { className: "wg-cat-side-title", key: "title" }, FILTERS),
							narrowed
								? h(Button, { key: "clear", className: "wg-cat-clear", variant: "plain", size: "s", onClick: clearAll }, CLEAR_ALL)
								: null,
						]),
						h("div", { className: "wg-cat-sheet-body", key: "body" }, facetPanel),
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
							said(SHEET_DONE, { count: found.length }),
						),
					],
				)
			: null,
	]);
}
