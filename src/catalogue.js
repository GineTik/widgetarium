import { createElement as h, Component } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { boardWidgets, inlineWidgets } from "./registry.js";
import { isInstalled, mergeCatalogue } from "./engine/catalogue-index.js";
import { Button, Card, Field, Icon, IconButton, Pill, Popover, Segmented } from "./kit.js";
import { rankSearch } from "./engine/search.js";
import { previewProps, previewSize } from "./preview.js";
import { spanToPixels } from "./layout.js";
import { SizeGrid } from "./size-grid.js";
import { classOf, GRID } from "./paths.js";

// CONTEXT: the entry point's own verb is the only thing a mode changes
const VERBS = { browse: "Open", place: "Add", fill: "Use", text: "Use", mount: "Add" };

// CONTEXT: a filter over ONE merged list, not two code paths — and never a second look for the
// card, which stays the same whether the widget is already here or still has to be fetched
const SHOWN = [
	{ value: "all", label: "All" },
	{ value: "installed", label: "Installed" },
];

// TRADE-OFF: the typed strings are the state, so half a bound reads as "from 3", not as a gap
export const NO_SIZE = { wFrom: "", wTo: "", hFrom: "", hTo: "" };

function edgeOf(typed) {
	const cells = Number.parseInt(typed, 10);
	return Number.isFinite(cells) && cells > 0 ? cells : null;
}

export function sizeBounds(typed) {
	return {
		wFrom: edgeOf(typed.wFrom),
		wTo: edgeOf(typed.wTo),
		hFrom: edgeOf(typed.hFrom),
		hTo: edgeOf(typed.hTo),
	};
}

export function narrowsSize(bounds) {
	return bounds.wFrom !== null || bounds.wTo !== null || bounds.hFrom !== null || bounds.hTo !== null;
}

// CONTEXT: `size` is the tile's own, the very object the card's pill prints, so the two cannot drift
export function withinSize(size, bounds) {
	if (bounds.wFrom !== null && size.w < bounds.wFrom) return false;
	if (bounds.wTo !== null && size.w > bounds.wTo) return false;
	if (bounds.hFrom !== null && size.h < bounds.hFrom) return false;
	if (bounds.hTo !== null && size.h > bounds.hTo) return false;
	return true;
}

function axisSaid(from, to) {
	if (from !== null && to !== null) return from === to ? `${from}` : `${from}\u2013${to}`;
	if (from !== null) return `${from}+`;
	if (to !== null) return `\u2264${to}`;
	return "any";
}

export function sizeSaid(bounds) {
	if (!narrowsSize(bounds)) return "Any size";
	return `${axisSaid(bounds.wFrom, bounds.wTo)} \u00d7 ${axisSaid(bounds.hFrom, bounds.hTo)}`;
}

// CONTEXT: the divider a ranked list draws above the first candidate that falls short
const SHORT_LABEL = "These want more than this slot hands down";

// TRADE-OFF: below this a shape stops reading, so the widget draws a stand-in instead
const READABLE_SCALE = 0.3;

// CARDS, NOT ONE SHARED BOARD. Laid on a single lattice the widgets ran together — no edge said
// where one ended and the next began, and a name band under each ate a whole row of cells to say
// so. A card separates a widget from the space around it, which is the one thing the lattice
// could not do. The lattice moves INSIDE the card, where it is the widget's own playground.
const CARD_TARGET_PX = 300;
const MIN_COLUMNS = 2;
const MAX_COLUMNS = 5;
const GAP_PX = 12;
const CARD_PAD_PX = 10;
// TRADE-OFF: the widget never touches the stage's edge — flush, a whole widget reads as a cut one
const STAGE_PAD_PX = 10;

// TRADE-OFF: six cells, not four. Four reads at 1:1 but shows too little of a board-shaped
// widget; six shrinks by about a third and still carries the shape — and the playground behind
// a press is where anything is actually read.
const MAX_SPAN = { w: 6, h: 6 };

// INSTALLED IS NOT A STATE WORTH DRAWING. Fetching a widget and placing one both happen at the
// press, so a badge, a legend and a second verb were three ways of saying a difference nobody
// waits through. One card, one button, one word.
function clamp(value, low, high) {
	return Math.max(low, Math.min(value, high));
}

export function measureCards(width) {
	const columns = clamp(Math.round((width + GAP_PX) / (CARD_TARGET_PX + GAP_PX)), MIN_COLUMNS, MAX_COLUMNS);
	return { columns, columnPx: (width - (columns - 1) * GAP_PX) / columns };
}

// the stage is the widget's own span, capped, drawn at whatever scale that span needs to fit
// THE LATTICE AND THE WIDGET ARE ONE BOX. Drawn as two layers with two insets they could not
// line up: no widget ever landed on a cell and the lattice stopped short of its own span. This
// returns the span's box at one scale; both the cells and the widget are laid inside THAT.
export function cardTile(manifest, cards) {
	const size = previewSize(manifest, GRID.cellPx, GRID.gapPx);
	const w = Math.min(size.w, MAX_SPAN.w);
	const h = Math.min(size.h, MAX_SPAN.h);
	// CONTEXT: air on every side — a widget touching the card's edge is what reads as overlap
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
	// CONTEXT: a widget whose face is a dialog would portal onto <body> and cover the catalogue
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
		// CONTEXT: a transform leaves the layout box full size, so the frame is taken out of flow
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
			h(definition.component, previewProps(definition, { registry, host })),
		),
	);
}

function Tile({ definition, tile, registry, host, mode, kind, lacks, onPick, onInstall }) {
	const manifest = definition.manifest ?? {};
	const verb = VERBS[mode] ?? VERBS.browse;
	const [busy, setBusy] = useState(false);
	const [failure, setFailure] = useState(null);

	// ONE PRESS, ONE WORD. Fetching a widget is a step the press takes on the way, never a second
	// button and never a second verb — but it can fail, and the card says so where it happened.
	const press = async () => {
		if (isInstalled(definition)) return onPick?.(manifest.id, mode);
		setBusy(true);
		setFailure(null);
		const done = await onInstall?.(definition);
		setBusy(false);
		if (!done?.ok) return setFailure(done?.failure ?? "could not fetch this widget");
		onPick?.(manifest.id, mode);
	};
	const name = shortName(manifest);
	const scope = String(manifest.id ?? "").split("/")[0];

	return h(
		Card,
		{
			asChild: true,
			className: "wg-cat-tile",
		},
		h(
			"article",
			{
				role: "button",
				tabIndex: 0,
				"aria-label": `${verb} ${name}`,
				"data-span": `${tile.size.w}x${tile.size.h}`,
				onClick: press,
				onKeyDown: (event) => (event.key === "Enter" || event.key === " ") && press(),
			},
			[
			// THE STAGE IS THE WIDGET'S OWN PLAYGROUND: the board's lattice at the scale this
			// span needs, so the card shows how much room the widget takes, inside its own edge.
			h(
				"div",
				{
					className: "wg-cat-stage",
					key: "stage",
					style: {
						"--wg-cell": `${tile.cell}px`,
						"--wg-gap": `${tile.gap}px`,
						"--wg-cat-across": tile.w,
					},
				},
				h(
					"div",
					{
						className: "wg-cat-frame",
						style: { width: `${Math.round(tile.frameWidth)}px`, height: `${Math.round(tile.frameHeight)}px` },
					},
					// NO LATTICE AT ALL. A card is what separates a widget from the space around it;
					// cells behind it drew a second grid nothing ever stood on.
					h("div", { className: "wg-cat-pic", key: "pic" }, h(Preview, { definition, registry, host, tile })),
				),
			),
			// THE FOOT, IN THE CARD'S OWN GREY. Floating on the picture as glass the strip both
			// covered the widget and cost the stage the room it stood in; laid below the stage it is
			// an ordinary row, and the widget gets the whole stage back.
			h("div", { className: "wg-cat-foot", key: "foot" }, [
				// CONTEXT: one line, pack first — "@task / Task card" reads as a path, which is what it is
				h("span", { className: "wg-cat-said", key: "said", title: manifest.id }, [
					h("span", { className: "wg-cat-scope", key: "scope" }, scope),
					h("span", { className: "wg-cat-slash", key: "slash" }, "/"),
					h("span", { className: "wg-cat-name", key: "name" }, name),
				]),
				kind === "inline" ? null : h(Pill, { className: "wg-cat-span", key: "span" }, `${tile.size.w}\u00d7${tile.size.h}`),
				// THE KIT OWNS THE BUTTON. Its accent ground is painted by a ::before, so a
				// hand-rolled background is a different button wearing the same colour.
				h(
					IconButton,
					{
						key: "go",
						className: "wg-cat-go",
						variant: "accent",
						size: "s",
						label: `${verb} ${name}`,
						disabled: busy,
						onClick: (event) => {
							event.stopPropagation();
							press();
						},
					},
					h(Icon, { name: "plus", size: 15 }),
				),
			]),
			// TRADE-OFF: the sentence lives on the card, because there is no detail page to hold it
			manifest.description ? h("p", { className: "wg-cat-what", key: "what" }, manifest.description) : null,
			failure ? h("p", { className: "wg-cat-lack is-failure", key: "failure" }, failure) : null,
			lacks ? h("p", { className: "wg-cat-lack", key: "lack" }, lacks) : null,
		],
		),
	);
}

// CONTEXT: the panel is remounted per opening, because a fresh grid holds nothing selected
export function SizeFilter({ typed, onTyped, phone }) {
	const bounds = sizeBounds(typed);
	const narrowed = narrowsSize(bounds);
	const [open, setOpen] = useState(false);
	const [openings, setOpenings] = useState(0);

	return h(
		Popover,
		{
			placement: "below",
			open,
			onOpenChange: (next) => {
				setOpen(next);
				if (next) setOpenings((count) => count + 1);
			},
			trigger: h(Button, { className: narrowed ? "wg-cat-size is-on" : "wg-cat-size" }, [
				h(Icon, { name: "widget", key: "mark" }),
				h("span", { key: "said" }, sizeSaid(bounds)),
			]),
		},
		h(SizeGrid, {
			key: `pick-${openings}`,
			phone,
			onClear: () => {
				onTyped(NO_SIZE);
				setOpen(false);
			},
			onApply: (next) => {
				onTyped(next);
				setOpen(false);
			},
		}),
	);
}

// CONTEXT: the divider comes from the data, so nothing here knows what a slot is
function laidOut(shown) {
	const fits = shown.filter((entry) => !entry.fit?.lacks);
	const short = shown.filter((entry) => entry.fit?.lacks);
	return { placed: [...fits, ...short], divide: short.length > 0 ? fits.length : null };
}

// CONTEXT: search.js knows nothing of widgets, so the caller says where each field lives
function fromManifest(entry, key) {
	return entry.manifest[key];
}

function useWidth(nodeRef) {
	const [width, setWidth] = useState(0);

	useEffect(() => {
		const node = nodeRef.current;
		if (!node) return undefined;
		const read = () => setWidth(node.clientWidth);
		read();
		const watch = new ResizeObserver(read);
		watch.observe(node);
		return () => watch.disconnect();
	}, [nodeRef]);

	return width;
}

// TRADE-OFF: the board's own cell class, so a second answer to "how big is a cell" cannot drift in

export function Catalogue({ registry, host, mode = "browse", kind = "board", available = [], rank, onPick, onInstall }) {
	const [keyword, setKeyword] = useState("");
	const [showing, setShowing] = useState("all");
	const [typedSize, setTypedSize] = useState(NO_SIZE);
	const scrollRef = useRef(null);
	const width = useWidth(scrollRef);
	const cards = measureCards(Math.max(width, CARD_TARGET_PX));
	const asked = keyword.trim() !== "";
	// CONTEXT: an inline widget has no footprint, so the head does not offer to narrow by one
	const bounds = sizeBounds(kind === "inline" ? NO_SIZE : typedSize);

	// CONTEXT: local wins over a repository entry of the same id, so an own widget is never replaced
	const merged = useMemo(() => {
		const held = kind === "inline" ? inlineWidgets(registry.list()) : boardWidgets(registry.list());
		const offered = kind === "inline" ? available.filter((entry) => entry.manifest?.inline === true) : available;
		return mergeCatalogue(held, offered);
	}, [registry, available, kind]);

	const kept = merged
		.filter((definition) => showing === "all" || isInstalled(definition))
		.map((definition) => {
			const manifest = definition.manifest ?? {};
			return { definition, manifest, tile: cardTile(manifest, cards), fit: rank?.(manifest) ?? null };
		})
		.filter((entry) => withinSize(entry.tile.size, bounds));

	// TRADE-OFF: with no query the slot's own ranking is the answer, untouched — it is what a
	// TRADE-OFF: person filling a slot came for, and a score of zero everywhere would shuffle it
	const shown = asked
		? rankSearch(keyword, kept, { read: fromManifest }).map((hit) => hit.record)
		: [...kept].sort((one, other) => (one.fit?.order ?? 0) - (other.fit?.order ?? 0));

	const { placed, divide } = laidOut(shown);

	return h("div", { className: "wg-cat" }, [
		h("header", { className: "wg-cat-head", key: "head" }, [
			h(Field, {
				key: "search",
				block: true,
				className: "wg-cat-search",
				icon: h(Icon, { name: "search" }),
				placeholder: "Search widgets",
				value: keyword,
				onInput: (event) => setKeyword(event.target.value),
			}),
			h(Segmented, { key: "shown", className: "wg-cat-shown", items: SHOWN, value: showing, onChange: setShowing }),
			kind === "inline"
				? null
				: h(SizeFilter, { key: "size", typed: typedSize, onTyped: setTypedSize, phone: width > 0 && classOf(width).name === "phone" }),
		]),
		h(
			"div",
			{ key: "scroll", ref: scrollRef, className: "wg-cat-scroll" },
			width <= 0
				? null
				: h(
						"div",
						{ className: "wg-cat-grid", style: { "--wg-cat-columns": cards.columns } },
						placed.flatMap((entry, index) => {
							const card = h(Tile, {
								key: entry.definition.manifest?.id ?? index,
								definition: entry.definition,
								tile: entry.tile,
								registry,
								host,
								mode,
								kind,
								lacks: entry.fit?.lacks ?? null,
								onPick,
								onInstall,
							});
							if (index !== divide) return [card];
							return [h("p", { className: "wg-cat-divide", key: "divide" }, SHORT_LABEL), card];
						}),
				  ),
		),
		shown.length === 0 ? h("p", { className: "wg-cat-none", key: "none" }, "Nothing here answers to that.") : null,
	]);
}
