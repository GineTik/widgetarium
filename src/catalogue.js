import { h, Component } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { Field, Icon, Segmented } from "./kit.js";
import { previewProps, previewSize } from "./preview.js";
import { GRID } from "./paths.js";

const SCOPES = [
	{ value: "all", label: "All" },
	{ value: "installed", label: "Installed" },
];

// CONTEXT: the entry point's own verb is the only thing a mode changes
// CONTEXT: docs/widget-catalogue.md calls the third mode "slot"; it is named for the verb here
const VERBS = { browse: "Open", place: "Add", fill: "Use" };

// CONTEXT: the divider a ranked list draws, once, above the first candidate that falls short
const SHORT_LABEL = "These want more than this slot hands down";
const UNINSTALLED_VERB = "Install";

// TRADE-OFF: NOT the settings window's 0.7. That floor is for a widget being read and edited;
// here a widget is being RECOGNISED, and a shape reads long after its type has become texture.
// Below this even the shape goes, and the widget draws a stand-in instead.
const READABLE_SCALE = 0.3;

// EVERY TILE IS THE SAME SQUARE. Sized from each widget's own proportion, the grid carried
// real information — and read as clutter: nine different shapes, no two rows alike, and a
// widget's importance seemingly set by how wide it happened to be. A catalogue is scanned,
// and scanning wants one shape. The proportion moves into the picture inside the square.
const TILE_TARGET_PX = 220;
const MIN_COLUMNS = 2;
const MAX_COLUMNS = 6;
const GAP_PX = 12;
const FRAME_PAD_PX = 8;
const FOOT_PX = 30;

function clamp(value, low, high) {
	return Math.max(low, Math.min(value, high));
}

export function bentoTile(manifest, bento) {
	const size = previewSize(manifest, GRID.cellPx, GRID.gapPx);
	const stageWidth = bento.columnPx - 2 * FRAME_PAD_PX;
	const stageHeight = bento.columnPx - 2 * FRAME_PAD_PX - FOOT_PX;
	// CONTEXT: a widget wider than the square shrinks until it fits; one smaller is left alone
	const scale = Math.min(1, stageWidth / size.width, stageHeight / size.height);
	return { size, columns: 1, rows: 1, stageWidth, stageHeight, scale };
}

export function measureBento(width) {
	const columns = clamp(Math.round((width + GAP_PX) / (TILE_TARGET_PX + GAP_PX)), MIN_COLUMNS, MAX_COLUMNS);
	return { columns, columnPx: (width - (columns - 1) * GAP_PX) / columns };
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
	componentDidCatch(failure) {
		this.setState({ failure });
	}

	render(props, state) {
		return state.failure ? props.instead(state.failure) : props.children;
	}
}

function Standin({ manifest, tile, line, tone }) {
	return h("div", { class: tone === "broken" ? "wg-cat-stand is-broken" : "wg-cat-stand" }, [
		h("span", { class: "wg-cat-mark", key: "mark" }, initialOf(manifest)),
		h("span", { class: "wg-cat-line", key: "line" }, line),
		h("span", { class: "wg-cat-span", key: "span" }, `${tile.size.w} × ${tile.size.h}`),
	]);
}

function Preview({ definition, registry, host, tile }) {
	const manifest = definition.manifest ?? {};

	if (definition.error) {
		return h(Standin, { manifest, tile, tone: "broken", line: "This widget does not load" });
	}
	// CONTEXT: a widget whose face is a dialog would portal onto <body> and cover the catalogue
	if (manifest.preview?.instead) {
		return h(Standin, { manifest, tile, line: manifest.preview.instead });
	}
	if (!definition.component) {
		return h(Standin, { manifest, tile, line: "Not installed yet" });
	}
	if (tile.scale < READABLE_SCALE) {
		return h(Standin, { manifest, tile, line: "Too small to draw here" });
	}

	return h(
		Contained,
		{ instead: () => h(Standin, { manifest, tile, tone: "broken", line: "This widget failed while drawing" }) },
		// CONTEXT: a transform leaves the layout box full size, and a centred overflowing box is clamped to its start edge
		h(
			"div",
			{
				class: "wg-cat-fit",
				style: {
					width: `${Math.round(tile.size.width * tile.scale)}px`,
					height: `${Math.round(tile.size.height * tile.scale)}px`,
				},
			},
			h(
				"div",
				{
					class: "wg-cat-frame",
					style: {
						width: `${tile.size.width}px`,
						height: `${tile.size.height}px`,
						transform: `scale(${tile.scale})`,
					},
				},
				h(definition.component, previewProps(definition, { registry, host })),
			),
		),
	);
}

function Tile({ definition, tile, registry, host, mode, lacks, onPick, onDetail }) {
	const manifest = definition.manifest ?? {};
	const installed = definition.installed !== false;
	const verb = installed ? VERBS[mode] ?? VERBS.browse : UNINSTALLED_VERB;

	return h(
		"article",
		{
			class: "wg-cat-tile",
			role: "button",
			tabIndex: 0,
			"aria-label": `${verb} ${shortName(manifest)}`,
			onClick: () => onPick?.(manifest.id, mode),
			onKeyDown: (event) => (event.key === "Enter" || event.key === " ") && onPick?.(manifest.id, mode),
		},
		[
			h("div", { class: "wg-cat-stage", key: "stage" }, [
				h(Preview, { definition, registry, host, tile, key: "preview" }),
				// TRADE-OFF: over the picture, not under the name — a strip here costs the tile no height,
				// and the footer's arithmetic is what decides how many grid rows the tile spans
				lacks ? h("span", { class: "wg-cat-lack", key: "lack" }, lacks) : null,
			]),
			h("footer", { class: "wg-cat-foot", key: "foot" }, [
				// TRADE-OFF: a mark beside the name, not a pill over the picture — the picture is the point
				installed
					? h("span", { class: "wg-cat-held", key: "held" }, [
							h(Icon, { name: "tick", size: 12, key: "tick" }),
							// CONTEXT: a bare tick read as decoration — the word is what says what it means
							h("span", { class: "wg-cat-held-word", key: "word" }, "Installed"),
					  ])
					: null,
				h("span", { class: "wg-cat-name", key: "name", title: manifest.title ?? manifest.id }, shortName(manifest)),
				h("span", { class: "wg-cat-verb", key: "verb" }, verb),
				// TRADE-OFF: a separate target, so browsing cannot fetch and run code by the add gesture
				h(
					"button",
					{
						key: "more",
						type: "button",
						class: "wg-cat-more",
						"aria-label": `About ${shortName(manifest)}`,
						onClick: (event) => {
							event.stopPropagation();
							onDetail?.(manifest.id);
						},
					},
					h(Icon, { name: "dots", size: 14 }),
				),
			]),
		],
	);
}

// CONTEXT: the divider is drawn from the DATA, not from a mode — whatever ranks a candidate short
// is what says where the line goes, so nothing here knows what a slot is
function rankedTiles(shown, common) {
	const drawn = [];
	let divided = false;
	for (const { definition, tile, fit } of shown) {
		if (fit?.lacks && !divided) {
			divided = true;
			drawn.push(h("p", { class: "wg-cat-divide", key: "divide" }, SHORT_LABEL));
		}
		drawn.push(h(Tile, { key: definition.manifest?.id, definition, tile, lacks: fit?.lacks ?? null, ...common }));
	}
	return drawn;
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

export function Catalogue({ registry, host, mode = "browse", available = [], rank, onPick, onDetail }) {
	const [keyword, setKeyword] = useState("");
	const [scope, setScope] = useState("all");
	const gridRef = useRef(null);
	const width = useWidth(gridRef);
	const bento = measureBento(Math.max(width, TILE_TARGET_PX));
	const needle = keyword.trim().toLowerCase();

	// CONTEXT: local wins over a repository entry of the same id, so an own widget is never replaced
	const merged = useMemo(() => {
		const held = registry.list();
		const known = new Set(held.map((entry) => entry.manifest?.id));
		return [...held, ...available.filter((entry) => !known.has(entry.manifest?.id))];
	}, [registry, available]);

	const shown = merged
		.filter((definition) => {
			const manifest = definition.manifest ?? {};
			const name = `${manifest.title ?? ""} ${manifest.id ?? ""}`.toLowerCase();
			if (needle !== "" && !name.includes(needle)) return false;
			return scope === "all" || definition.installed !== false;
		})
		.map((definition) => ({
			definition,
			tile: bentoTile(definition.manifest ?? {}, bento),
			fit: rank?.(definition.manifest ?? {}) ?? null,
		}))
		// CONTEXT: every tile is one square, so only fit orders them — size cannot
		.sort((one, other) => (one.fit?.order ?? 0) - (other.fit?.order ?? 0));

	return h("div", { class: "wg-cat" }, [
		h("header", { class: "wg-cat-head", key: "head" }, [
			h(Field, {
				key: "search",
				block: true,
				class: "wg-cat-search",
				icon: h(Icon, { name: "search" }),
				placeholder: "Search widgets",
				value: keyword,
				onInput: (event) => setKeyword(event.target.value),
			}),
			h(Segmented, { key: "scope", size: "s", items: SCOPES, value: scope, onChange: setScope }),
		]),
		h(
			"div",
			{
				key: "grid",
				ref: gridRef,
				class: "wg-cat-grid",
				style: { "--wg-cat-columns": bento.columns, "--wg-cat-gap": `${GAP_PX}px` },
			},
			width === 0 ? null : rankedTiles(shown, { registry, host, mode, onPick, onDetail }),
		),
		shown.length === 0 ? h("p", { class: "wg-cat-none", key: "none" }, "Nothing here answers to that.") : null,
	]);
}
