import { createElement as h } from "react";
import { render } from "../src/engine/render.js";
import { WidgetHost, WidgetSurface } from "../src/surface.js";
import { normalizeBoard, serializeBoard } from "../src/model.js";
import { WidgetRegistry } from "../src/registry.js";
import { createGatewayRefs, createViewCells } from "../src/gateway/refs.js";
import { createFileTree, createProbeHost, createRowSlot } from "./vault-fixture.mjs";
import { classOf, scaleOf } from "../src/paths.js";
import { GAP_PX, isBox, laid, leavesOf } from "../src/tree.js";

const FILES = JSON.parse(document.getElementById("wg-widgets").textContent);
const BOARD = JSON.parse(document.getElementById("wg-board").textContent);
const ROWS = JSON.parse(document.getElementById("wg-rows").textContent);
const TREE = JSON.parse(document.getElementById("wg-tree").textContent);
const WIDTHS = JSON.parse(document.getElementById("wg-widths").textContent);

const adapter = createFileTree(FILES);
const host = createProbeHost(createRowSlot(ROWS));

const failures = [];
console.error = (
	(was) =>
	(...parts) => {
		failures.push(parts.map((part) => String(part?.stack ?? part)).join(" "));
		was(...parts);
	}
)(console.error);

const registry = new WidgetRegistry({ vault: { adapter } });
const board = normalizeBoard(BOARD);
const tileOf = (id) => board.tiles.find((tile) => tile.id === id);

// TRADE-OFF: the box is spelled back as a cell span because `size.w` still counts cells; the tree knows only pixels
const CELL_PX = 88;
const placeFor = (id, width) => ({ id, x: 0, y: 0, w: Math.max(1, Math.round(width / CELL_PX)), h: 1 });

const ignore = () => undefined;

const SILENT_BOARD = {
	patchProp: ignore,
	onCollapse: ignore,
	onExpand: ignore,
	onPatch: ignore,
	patchMounted: ignore,
	foldIntoGroup: ignore,
	isMounted: false,
};

const heightOf = (id) => TREE.flat().find((cell) => cell.id === id)?.height ?? null;
const askOf = (id) => ({ minPx: TREE.flat().find((cell) => cell.id === id)?.minPx ?? 0 });
const asNode = (row) => (row.length === 1 ? row[0] : { dir: "row", of: row });
const PROBE_TREE = { dir: "column", of: TREE.map(asNode) };
const idsOfRow = (node) => (isBox(node) ? node.of.map((cell) => cell.id) : [node.id]);
const rowsOfRegion = (box) => box.of.map(idsOfRow);

function widgetProps(cell, width, wiring) {
	const tile = tileOf(cell.id);
	const placement = { place: placeFor(cell.id, cell.width), scale: scaleOf(classOf(width)) };
	return {
		...SILENT_BOARD,
		...wiring,
		...placement,
		definition: tile && registry.get(tile.widget),
		tile,
		host,
		registry,
	};
}

function bodyNode(cell, width, wiring) {
	const props = widgetProps(cell, width, wiring);
	if (!props.definition) return h("i", { className: "wg-tree-missing" }, cell.id);
	return h(WidgetHost, props);
}

function cellNode(cell, width, wiring) {
	const tall = heightOf(cell.id);
	const style = { flex: `0 0 ${cell.width}px`, width: `${cell.width}px`, minHeight: tall ? `${tall}px` : undefined };
	const attrs = {
		key: cell.id,
		className: "wg-tile wg-tree-cell",
		style,
		"data-tile": cell.id,
		"data-min": cell.minPx,
	};
	return h("div", attrs, h("div", { className: "wg-tile-body" }, bodyNode(cell, width, wiring)));
}

function laidNode(node, width, wiring) {
	if (node.kind === "leaf") return cellNode(node, width, wiring);
	return h(
		"div",
		{ className: node.dir === "column" ? "wg-tree" : "wg-tree-row", key: node.path.join("/") },
		node.of.map((child) => laidNode(child, width, wiring)),
	);
}

function boardNode(width) {
	const wiring = { refs: createGatewayRefs(), cellFor: createViewCells() };
	const attrs = { className: "wg-root wg-tree", key: width, style: { width: `${width}px` }, "data-width": width };
	return h(
		"div",
		attrs,
		laid(PROBE_TREE, width, { ask: askOf, gap: GAP_PX }).of.map((child) => laidNode(child, width, wiring)),
	);
}

function boxOf(node) {
	if (!node) return null;
	const rect = node.getBoundingClientRect();
	return {
		left: rect.left,
		right: rect.right,
		top: rect.top,
		bottom: rect.bottom,
		width: rect.width,
		height: rect.height,
	};
}

function rowsUnder(node) {
	return [...node.children].flatMap((child) => {
		if (child.classList.contains("wg-tree-cell")) return [[child.dataset.tile ?? child.dataset.cell]];
		if (child.classList.contains("wg-tree-row"))
			return [[...child.querySelectorAll(".wg-tree-cell")].map((one) => one.dataset.tile ?? one.dataset.cell)];
		if (child.classList.contains("wg-tree") || child.classList.contains("wg-tree-band")) return rowsUnder(child);
		return [];
	});
}

function readOne(width) {
	const root = document.querySelector(`.wg-tree[data-width="${width}"]`);
	if (!root) return { width, drawn: false, host: mount.innerHTML.slice(0, 600) };
	const cells = [...root.querySelectorAll(".wg-tree-cell")].map((node) => ({
		id: node.dataset.tile,
		minPx: Number(node.dataset.min),
		box: boxOf(node),
		painted: node.querySelector(".wg-tile-body")?.childElementCount ?? 0,
		missing: Boolean(node.querySelector(".wg-tree-missing")),
		scrollWidth: node.scrollWidth,
		clientWidth: node.clientWidth,
	}));
	return {
		width,
		rows: rowsUnder(root),
		board: boxOf(root),
		scrollWidth: root.scrollWidth,
		clientWidth: root.clientWidth,
		cells,
	};
}

const mount = document.querySelector(".wg-host");

const SURFACE_WIDTH = 1600;

const asRows = (rows) =>
	rows.map((row) =>
		row.map((cell) => ({ id: cell.id, ratio: cell.ratio, ...(cell.height ? { height: cell.height } : {}) })),
	);
const UNPLACED_TILE = { id: "loose", widget: "@default/task-card" };
let surfaceBoard = normalizeBoard({
	...BOARD,
	tiles: [...BOARD.tiles, UNPLACED_TILE],
	layout: { dir: "row", of: [{ dir: "column", keep: true, of: asRows(TREE).map(asNode) }] },
});
let surfaceWrites = 0;
let surfaceEditing = false;

function readScreenFill() {
	const root = document.querySelector(".wg-root.is-screen");
	if (!root) return { failed: "no screen board stands on the page" };
	const page = root.querySelector(":scope > .wg-tree-page");
	const floorOf = (element) => Math.round(Number.parseFloat(getComputedStyle(element).minHeight) || 0);
	return {
		failed: null,
		root: floorOf(root),
		page: page ? floorOf(page) : null,
		viewport: window.innerHeight,
	};
}

function surfaceNode() {
	return h(
		"div",
		{ className: "wg-surface-probe", key: "surface", style: { width: `${SURFACE_WIDTH}px` } },
		h(WidgetSurface, {
			board: surfaceBoard,
			registry,
			host,
			editing: surfaceEditing,
			screen: true,
			initialWidth: SURFACE_WIDTH,
			onChange: (next) => {
				surfaceWrites += 1;
				surfaceBoard = next;
				draw();
			},
			onToggleEditing: () => {},
			onWidth: () => {},
		}),
	);
}

const SIDES_WIDTH = 1400;

let sidesBoard = normalizeBoard({
	...BOARD,
	layout: {
		left: { rows: [[{ id: "boards" }]] },
		main: { rows: [[{ id: "board", height: 400 }]] },
		right: { rows: [[{ id: "wynttpz" }]] },
	},
	layouts: {},
});

let sidesEditing = false;
let sidesActions = [];

function sidesNode() {
	return h(
		"div",
		{ className: "wg-sides-probe", key: "sides", style: { width: `${SIDES_WIDTH}px` } },
		h(WidgetSurface, {
			board: sidesBoard,
			registry,
			host,
			editing: sidesEditing,
			screen: true,
			initialWidth: SIDES_WIDTH,
			onChange: (next) => {
				sidesBoard = next;
				draw();
			},
			onActions: (list) => {
				sidesActions = list;
			},
			onWidth: () => {},
		}),
	);
}

const NESTED_WIDTH = 1200;

const NESTED_LAYOUT = {
	dir: "row",
	of: [
		{
			dir: "column",
			keep: true,
			of: [
				{ id: "boards", height: 56 },
				{
					dir: "row",
					of: [
						{ id: "board", ratio: 2, height: 420 },
						{
							dir: "column",
							of: [
								{ id: "views", height: 180 },
								{ id: "wynttpz", height: 220 },
							],
						},
					],
				},
			],
		},
	],
};

let nestedBoard = normalizeBoard({ tiles: BOARD.tiles, layout: NESTED_LAYOUT });
let nestedWrites = 0;

function nestedNode() {
	return h(
		"div",
		{ className: "wg-nested-probe", key: "nested", style: { width: `${NESTED_WIDTH}px` } },
		h(WidgetSurface, {
			board: nestedBoard,
			registry,
			host,
			editing: true,
			screen: true,
			initialWidth: NESTED_WIDTH,
			onChange: (next) => {
				nestedWrites += 1;
				nestedBoard = next;
				draw();
			},
			onToggleEditing: () => {},
			onWidth: () => {},
		}),
	);
}

const STACKED_WIDTH = 360;

const stackedBoard = normalizeBoard({
	tiles: BOARD.tiles,
	layout: {
		dir: "row",
		of: [
			{
				dir: "column",
				keep: true,
				of: [
					{ dir: "row", height: 86, of: [{ id: "views" }, { id: "wynttpz", surface: "apart" }] },
					{ id: "board", height: 300 },
				],
			},
		],
	},
});

function stackedNode() {
	return h(
		"div",
		{ className: "wg-stacked-probe", key: "stacked", style: { width: `${STACKED_WIDTH}px` } },
		h(WidgetSurface, {
			board: stackedBoard,
			registry,
			host,
			editing: false,
			screen: true,
			initialWidth: STACKED_WIDTH,
			onChange: ignore,
			onToggleEditing: ignore,
			onWidth: ignore,
		}),
	);
}

function readStacked() {
	const row = document.querySelector('.wg-stacked-probe [data-path="0/0"]');
	if (!row) return { drawn: false };
	const cellAt = (id) => boxOf(document.querySelector(`.wg-stacked-probe .wg-tree-cell[data-cell="${id}"]`));
	return {
		drawn: true,
		dir: row.dataset.dir,
		heights: ["views", "wynttpz"].map((id) => Math.round(cellAt(id).height)),
		rowBottom: Math.round(boxOf(row).bottom),
		lastBottom: Math.round(cellAt("wynttpz").bottom),
		boardTop: Math.round(cellAt("board").top),
		rowGrips: row.parentElement.querySelectorAll(":scope > .wg-tree-handle").length,
		standsAcross: ["views", "wynttpz"].map(
			(id) => document.querySelector(`.wg-stacked-probe .wg-tree-cell[data-cell="${id}"]`).dataset.standsAcross ?? null,
		),
		lastGrip:
			[
				...document.querySelectorAll(
					'.wg-stacked-probe [data-path="0/0"] > .wg-tree-band:last-of-type > .wg-tree-handle.is-along',
				),
			].map((grip) => [1, Math.round(boxOf(grip).height)])[0] ?? null,
	};
}

function readNested() {
	const region = document.querySelector(".wg-nested-probe .wg-tree-region.is-main .wg-tree");
	if (!region) return { drawn: false };
	const boxAt = (path) => boxOf(document.querySelector(`.wg-nested-probe [data-path="${path}"]`));
	const cellAt = (id) => boxOf(document.querySelector(`.wg-nested-probe .wg-tree-cell[data-cell="${id}"]`));
	const column = boxAt("0/1/1");
	const row = boxAt("0/1");
	const painted = (id) =>
		document.querySelector(`.wg-nested-probe .wg-tree-cell[data-cell="${id}"] .wg-tile-body`)?.childElementCount ?? 0;
	return {
		drawn: true,
		rows: rowsUnder(region),
		dirs: [...document.querySelectorAll(".wg-nested-probe [data-dir]")].map(
			(node) => `${node.dataset.path}:${node.dataset.dir}`,
		),
		painted: ["boards", "board", "views", "wynttpz"].map(painted),
		stacked: [
			Math.round(cellAt("views").left - cellAt("wynttpz").left),
			Math.round(cellAt("views").bottom <= cellAt("wynttpz").top ? 1 : 0),
		],
		beside: Math.round(cellAt("board").right) <= Math.round(column.left) ? 1 : 0,
		shares: [Math.round(cellAt("board").width), Math.round(column.width)],
		withinRow: column.top >= row.top - 0.5 && column.bottom <= row.bottom + 0.5,
		spare: Math.round(row.width - cellAt("board").width - column.width),
		written: JSON.stringify(serializeBoard(nestedBoard).layout),
	};
}

function dragNestedGrips() {
	const row = document.querySelector('.wg-nested-probe [data-path="0/1"]');
	const across = row?.querySelector(":scope > .wg-tree-handle.is-across");
	const nest = document.querySelector('.wg-nested-probe [data-path="0/1/1"]');
	const along = nest?.querySelector(":scope > .wg-tree-band > .wg-tree-handle.is-along");
	if (!across || !along) return { failed: "the nested box carries no grips" };
	const widthOf = (id) =>
		Math.round(document.querySelector(`.wg-nested-probe [data-cell="${id}"]`).getBoundingClientRect().width);
	const heightOf = (id) =>
		Math.round(document.querySelector(`.wg-nested-probe [data-cell="${id}"]`).getBoundingClientRect().height);
	const before = { board: widthOf("board"), views: heightOf("views"), writes: nestedWrites };

	const acrossBox = across.getBoundingClientRect();
	firePointer("pointerdown", { x: acrossBox.left + acrossBox.width / 2, y: acrossBox.top + 40 }, across);
	firePointer("pointermove", { x: acrossBox.left + acrossBox.width / 2 - 200, y: acrossBox.top + 40 }, window);
	const heldWidth = widthOf("board");
	firePointer("pointerup", { x: acrossBox.left + acrossBox.width / 2 - 200, y: acrossBox.top + 40 }, window);

	const alongBox = along.getBoundingClientRect();
	firePointer("pointerdown", { x: alongBox.left + alongBox.width / 2, y: alongBox.top + alongBox.height / 2 }, along);
	firePointer(
		"pointermove",
		{ x: alongBox.left + alongBox.width / 2, y: alongBox.top + alongBox.height / 2 + 120 },
		window,
	);
	const heldHeight = heightOf("views");
	firePointer(
		"pointerup",
		{ x: alongBox.left + alongBox.width / 2, y: alongBox.top + alongBox.height / 2 + 120 },
		window,
	);

	return {
		before,
		heldWidth,
		heldHeight,
		after: { board: widthOf("board"), views: heightOf("views"), writes: nestedWrites },
		ratios: nestedBoard.layout.of[0].of[1].of.map((child) => Math.round(child.ratio * 100) / 100),
		nestedHeight: nestedBoard.layout.of[0].of[1].of[1].of[0].height,
	};
}

async function carryIntoNest() {
	const held = document.querySelector('.wg-nested-probe .wg-tree-cell[data-cell="boards"]');
	const onto = document.querySelector('.wg-nested-probe .wg-tree-cell[data-cell="wynttpz"]');
	if (!held || !onto) return { failed: "the nested column was not drawn" };
	const box = held.getBoundingClientRect();
	const seat = onto.getBoundingClientRect();
	const aim = { x: seat.left + seat.width / 2, y: seat.top + 6 };
	firePointer("pointerdown", { x: box.left + 20, y: box.top + 20 }, held);
	firePointer("pointermove", aim, window);
	await settled();
	const nest = () => [...document.querySelectorAll('.wg-nested-probe [data-dir="column"]')].at(-1);
	const aimed = nest().querySelectorAll(".wg-tree-cell.is-stand-in").length;
	firePointer("pointerup", aim, window);
	await settled();
	return {
		aimed,
		leaves: leavesOf(nestedBoard.layout).map((leaf) => `${leaf.id}@${leaf.path.join("/")}`),
		inNest: [...nest().querySelectorAll(".wg-tree-cell")].map((node) => node.dataset.cell),
	};
}

async function carryOutOfNest() {
	const held = document.querySelector('.wg-nested-probe .wg-tree-cell[data-cell="views"]');
	const onto = document.querySelector('.wg-nested-probe .wg-tree-cell[data-cell="boards"]');
	if (!held || !onto) return { failed: "the nested column was not drawn" };
	const box = held.getBoundingClientRect();
	const seat = onto.getBoundingClientRect();
	const aim = { x: seat.left + 8, y: seat.top + seat.height / 2 };
	firePointer("pointerdown", { x: box.left + 20, y: box.top + 20 }, held);
	firePointer("pointermove", aim, window);
	await settled();
	const aimed = document.querySelectorAll(".wg-nested-probe .wg-tree-cell.is-stand-in").length;
	firePointer("pointerup", aim, window);
	await settled();
	return {
		aimed,
		rows: rowsUnder(document.querySelector(".wg-nested-probe .wg-tree-region.is-main .wg-tree")),
		leaves: leavesOf(nestedBoard.layout).map((leaf) => `${leaf.id}@${leaf.path.join("/")}`),
		writes: nestedWrites,
	};
}

const EMPTY_WIDTH = 1400;

let emptyBoard = normalizeBoard({
	tiles: BOARD.tiles,
	layout: { left: [], main: [[{ id: "boards", ratio: 0.5 }], [{ id: "board", height: 400 }]], right: [] },
});
let emptyEditing = true;

function emptyNode() {
	return h(
		"div",
		{ className: "wg-empty-probe", key: "empty", style: { width: `${EMPTY_WIDTH}px` } },
		h(WidgetSurface, {
			board: emptyBoard,
			registry,
			host,
			editing: emptyEditing,
			screen: true,
			initialWidth: EMPTY_WIDTH,
			onChange: (next) => {
				emptyBoard = next;
				draw();
			},
			onToggleEditing: () => {},
			onWidth: () => {},
		}),
	);
}

function readEmpty() {
	const page = document.querySelector(".wg-empty-probe .wg-tree-page");
	if (!page) return { drawn: false };
	const zoneOf = (name) => {
		const zone = document.querySelector(`.wg-empty-probe .wg-tree-region.is-${name} .wg-tree-add`);
		if (!zone) return null;
		const at = zone.getBoundingClientRect();
		const painted = getComputedStyle(zone);
		return {
			width: Math.round(at.width),
			height: Math.round(at.height),
			text: zone.textContent,
			tag: zone.tagName.toLowerCase(),
			line: painted.borderTopStyle,
			fill: painted.backgroundColor,
			ring: painted.boxShadow,
		};
	};
	return {
		drawn: true,
		regions: [...page.querySelectorAll(".wg-tree-region")].map((node) => node.className.replace(/.*is-/, "")),
		named: [...document.querySelectorAll(".wg-empty-probe [data-region]")].map((node) => node.dataset.region),
		left: zoneOf("left"),
		right: zoneOf("right"),
		halfShare: (() => {
			const column = document.querySelector(".wg-empty-probe .wg-tree-region.is-main .wg-tree");
			const cell = column?.querySelector(".wg-tree-cell[data-path]");
			if (!cell) return null;
			return Math.round(cell.getBoundingClientRect().width - column.getBoundingClientRect().width);
		})(),
		palette: document.querySelectorAll(".wg-empty-probe .wg-palette-open").length,
		adds: [...page.querySelectorAll(".wg-tree-region")]
			.filter((node) => node.querySelector(".wg-tree-add"))
			.map((node) => node.className.replace(/.*is-/, "")),
		bare: [...page.querySelectorAll(".wg-tree-region")]
			.filter((node) => node.querySelector(".wg-tree") && !node.querySelector(".wg-tree-band"))
			.map((node) => node.className.replace(/.*is-/, "")),
		lastInRegion:
			[...page.querySelectorAll(".wg-tree-region.is-main .wg-tree > *")].pop()?.className.split(" ")[0] ?? null,
		chrome: page.querySelectorAll(".wg-region-bar, .wg-region-toggle").length,
	};
}

const REGION_NAMES = ["left", "main", "right"];
const rowsPerRegion = () =>
	Object.fromEntries(REGION_NAMES.map((name, at) => [name, rowsOfRegion(emptyBoard.layout.of[at])]));

async function addIntoRegion(name) {
	const zone = document.querySelector(`.wg-empty-probe .wg-tree-region.is-${name} .wg-tree-add`);
	if (!zone) return { failed: `no add zone in ${name}` };
	// TODO: drop the muting once a widget preview stops keying its rows by a path it has not got
	const quiet = failures.length;
	const before = rowsPerRegion();
	const held = emptyBoard.tiles.length;
	fireClick(zone);
	await settled();
	const opened = document.querySelectorAll(".wg-cat-dialog").length;
	const card = document.querySelector(".wg-cat-dialog .wg-cat-tile");
	if (!card) return { failed: "the catalogue never opened" };
	fireClick(card);
	await faded();
	const after = rowsPerRegion();
	failures.length = quiet;
	return {
		opened,
		before,
		after,
		untouched: ["left", "main", "right"].filter(
			(one) => one !== name && JSON.stringify(before[one]) === JSON.stringify(after[one]),
		),
		grew: after[name].length - before[name].length,
		born: emptyBoard.tiles.length - held,
		dialogs: document.querySelectorAll(".wg-cat-dialog").length,
	};
}

async function carryIntoLeft() {
	const cellOf = () => document.querySelector('.wg-empty-probe .wg-tree-cell[data-cell="boards"]');
	const held = cellOf();
	const zone = document.querySelector('.wg-empty-probe .wg-tree-region[data-region="0"]');
	if (!held || !zone) return { failed: "nothing to carry, or nowhere to carry it to" };
	const box = held.getBoundingClientRect();
	const onto = zone.getBoundingClientRect();
	const aim = { x: onto.left + onto.width / 2, y: onto.top + onto.height / 2 };
	firePointer("pointerdown", { x: box.left + 40, y: box.top + 20 }, held);
	firePointer("pointermove", aim, window);
	await settled();
	const standIn = boxOf(document.querySelector(".wg-empty-probe .wg-tree-region.is-left .wg-tree-cell.is-stand-in"));
	firePointer("pointerup", aim, window);
	await settled();
	const landed = boxOf(cellOf());
	const off = (key) => (standIn && landed ? Math.round(landed[key] - standIn[key]) : null);
	return {
		aimed: standIn ? 1 : 0,
		lie: { left: off("left"), top: off("top"), width: off("width"), height: off("height") },
		left: rowsOfRegion(emptyBoard.layout.of[0]),
		main: rowsOfRegion(emptyBoard.layout.of[1]),
	};
}

function readChromeless() {
	const probe = document.querySelector(".wg-sides-probe");
	const page = probe?.querySelector(".wg-tree-page");
	if (!page) return { drawn: false };
	const firstRegion = page.querySelector(".wg-tree-region");
	return {
		drawn: true,
		chrome: probe.querySelectorAll(".wg-region-bar, .wg-region-toggle").length,
		regionFromTop: Math.round(firstRegion.getBoundingClientRect().top - page.getBoundingClientRect().top),
		actions: seenActions(),
	};
}

function seenActions() {
	return sidesActions.map((one) => ({ key: one.key, isOn: one.isOn, title: one.title }));
}

function readMounted() {
	const probe = document.querySelector(".wg-sides-probe");
	const cells = [...probe.querySelectorAll(".wg-tree-region.is-left .wg-tree-cell")];
	return {
		tiles: cells.map((node) => node.dataset.cell),
		painted: cells.filter((node) => node.querySelector(".wg-tile-body")?.childElementCount > 0).length,
	};
}

async function pressLeftAction() {
	const left = sidesActions.find((one) => one.key === "box:collapse:0/open");
	if (!left) return { failed: "no action for the left region was offered" };
	left.press({ x: 0, y: 0 });
	await settled();
	return { ...readSides(), actions: seenActions(), folded: Boolean(sidesBoard.layout.of[0].folded) };
}

function readSurfaceChrome() {
	return document.querySelectorAll(".wg-surface-probe .wg-region-bar, .wg-surface-probe .wg-region-toggle").length;
}

function readSides() {
	const page = document.querySelector(".wg-sides-probe .wg-tree-page");
	if (!page) return { drawn: false };
	const columns = document.querySelector(".wg-sides-probe .wg-tree-columns");
	const boxes = [...columns.querySelectorAll(":scope > .wg-tree-region")].map((node) => {
		const at = node.getBoundingClientRect();
		return {
			name: node.className.replace(/.*is-/, ""),
			left: Math.round(at.left),
			right: Math.round(at.right),
			top: Math.round(at.top),
			height: Math.round(at.height),
		};
	});
	const row = columns.getBoundingClientRect();
	return {
		drawn: true,
		regions: boxes,
		edges: columns.querySelectorAll(":scope > .wg-tree-handle.is-edge").length,
		edgeFill: getComputedStyle(columns.querySelector(".wg-tree-handle.is-edge")).backgroundColor,
		edgeReach: Math.round(columns.querySelector(".wg-tree-handle.is-edge").getBoundingClientRect().height),
		spans: Math.round(boxes.at(-1).right - boxes[0].left),
		rowWidth: Math.round(row.width),
		scrollWidth: page.scrollWidth,
		clientWidth: page.clientWidth,
	};
}

function widenSidebar(byX) {
	const edge = document.querySelector(".wg-sides-probe .wg-tree-handle.is-edge");
	if (!edge) return { failed: "no edge to drag" };
	const box = edge.getBoundingClientRect();
	const from = { x: box.left + box.width / 2, y: box.top + 40 };
	firePointer("pointerdown", from, edge);
	firePointer("pointermove", { x: from.x + byX, y: from.y }, window);
	const held = readSides();
	firePointer("pointerup", { x: from.x + byX, y: from.y }, window);
	return held;
}

async function squashRow(byY) {
	const along = document.querySelector(".wg-surface-probe .wg-tree-handle.is-along");
	if (!along) return { failed: "no strip to drag" };
	const rowOf = () => Math.round(along.parentElement.firstElementChild.getBoundingClientRect().height);
	const box = along.getBoundingClientRect();
	const from = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
	firePointer("pointerdown", from, along);
	firePointer("pointermove", { x: from.x, y: from.y + byY }, window);
	await settled();
	const held = rowOf();
	firePointer("pointerup", { x: from.x, y: from.y + byY }, window);
	return { held, settled: rowOf() };
}

function pinchSidebar(byX) {
	const edge = document.querySelector(".wg-sides-probe .wg-tree-handle.is-edge");
	if (!edge) return { failed: "no edge to drag" };
	const leftOf = () =>
		Math.round(document.querySelector(".wg-sides-probe .wg-tree-region.is-left").getBoundingClientRect().width);
	const box = edge.getBoundingClientRect();
	const from = { x: box.left + box.width / 2, y: box.top + 40 };
	firePointer("pointerdown", from, edge);
	firePointer("pointermove", { x: from.x + byX, y: from.y }, window);
	const held = leftOf();
	firePointer("pointerup", { x: from.x + byX, y: from.y }, window);
	return { held, settled: leftOf() };
}

function easeOf(className) {
	const root = document.createElement("div");
	root.className = "wg-root";
	const probe = root.appendChild(document.createElement("div"));
	probe.className = className;
	document.body.appendChild(root);
	const loose = getComputedStyle(probe);
	const eased = { property: loose.transitionProperty, loose: loose.transitionDuration };
	document.body.classList.add("wg-tree-dragging");
	eased.held = getComputedStyle(probe).transitionDuration;
	document.body.classList.remove("wg-tree-dragging");
	root.remove();
	return eased;
}

function dragGrip(grip, byX, byY) {
	const box = grip.getBoundingClientRect();
	return dragFrom(grip, { x: box.left + box.width / 2, y: box.top + box.height / 2 }, byX, byY);
}

function firePointer(type, at, target) {
	target.dispatchEvent(
		new window.PointerEvent(type, {
			bubbles: true,
			cancelable: true,
			clientX: at.x,
			clientY: at.y,
			shiftKey: true,
			button: 0,
			pointerId: 1,
		}),
	);
}

function dragFrom(node, from, byX, byY) {
	const fire = (type, at, target) =>
		target.dispatchEvent(
			new window.PointerEvent(type, {
				bubbles: true,
				cancelable: true,
				clientX: at.x,
				clientY: at.y,
				shiftKey: true,
				button: 0,
				pointerId: 1,
			}),
		);
	fire("pointerdown", from, node);
	fire("pointermove", { x: from.x + byX, y: from.y + byY }, window);
	const whileHeld = surfaceWrites;
	fire("pointerup", { x: from.x + byX, y: from.y + byY }, window);
	return whileHeld;
}

function rowsOfSurface() {
	return rowsUnder(document.querySelector(".wg-surface-probe .wg-tree"));
}

const settled = () => new Promise((done) => setTimeout(done, 30));
const faded = () => new Promise((done) => setTimeout(done, 320));

async function carryTile() {
	const before = rowsOfSurface();
	const gripShown = Number(getComputedStyle(document.querySelector(".wg-surface-probe .wg-tree-grip")).opacity);
	const cellOf = () => document.querySelector('.wg-surface-probe .wg-tree-cell[data-cell="board"]');
	const held = cellOf();
	if (!held) return { before, failed: "the kanban cell was not found" };
	const box = held.getBoundingClientRect();
	const first = document.querySelector(".wg-surface-probe .wg-tree-cell[data-path]").getBoundingClientRect();
	const onto = { x: first.left + 8, y: first.top + first.height / 2 };
	firePointer("pointerdown", { x: box.left + 40, y: box.top + 40 }, held);
	firePointer("pointermove", onto, window);
	await settled();
	const standIn = boxOf(document.querySelector(".wg-surface-probe .wg-tree-cell.is-stand-in"));
	const ghosts = document.querySelectorAll(".wg-surface-probe .wg-tree-ghost").length;
	const plate = boxOf(document.querySelector(".wg-surface-probe .wg-tree-ghost-plate"));
	const underPointer = plate
		? onto.x >= plate.left && onto.x <= plate.right && onto.y >= plate.top && onto.y <= plate.bottom
		: false;
	const plateSize = plate ? [Math.round(plate.width), Math.round(plate.height)] : null;
	const treeBox = boxOf(document.querySelector(".wg-surface-probe .wg-tree"));
	const spilled = [...document.querySelectorAll(".wg-surface-probe .wg-tree-cell")]
		.map((node) => ({ id: node.dataset.cell, at: boxOf(node) }))
		.filter((one) => one.at.width > 0 && (one.at.right > treeBox.right + 1 || one.at.bottom > treeBox.bottom + 1))
		.map((one) => one.id);
	firePointer("pointerup", onto, window);
	await settled();
	const landed = boxOf(cellOf());
	const off = (key) => (standIn && landed ? Math.round(landed[key] - standIn[key]) : null);
	return {
		before,
		gripShown,
		ghosts,
		spilled,
		standIns: standIn ? 1 : 0,
		underPointer,
		plateSize,
		lie: { left: off("left"), top: off("top"), width: off("width"), height: off("height") },
		after: rowsOfSurface(),
		writes: surfaceWrites,
	};
}

async function carryIntoSlack() {
	const held = document.querySelector('.wg-empty-probe .wg-tree-region.is-main .wg-tree-cell[data-cell="board"]');
	const column = document.querySelector(".wg-empty-probe .wg-tree-region.is-left");
	if (!held || !column) return { failed: "no sidebar with room under its widgets" };
	const box = held.getBoundingClientRect();
	const side = column.getBoundingClientRect();
	const drawn = column.querySelector(".wg-tree").getBoundingClientRect();
	const slack = Math.round(side.bottom - drawn.bottom);
	const aim = { x: side.left + side.width / 2, y: drawn.bottom + Math.min(slack / 2, 200) };
	firePointer("pointerdown", { x: box.left + 40, y: box.top + 20 }, held);
	firePointer("pointermove", aim, window);
	await settled();
	await settled();
	const aimed = document.querySelectorAll(".wg-empty-probe .wg-tree-region.is-left .wg-tree-cell.is-stand-in").length;
	firePointer("pointerup", aim, window);
	await settled();
	return { slack, aimed, left: rowsOfRegion(emptyBoard.layout.of[0]), main: rowsOfRegion(emptyBoard.layout.of[1]) };
}

const fireClick = (node) =>
	Boolean(node) && node.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));

function readChrome(scope) {
	return {
		cells: document.querySelectorAll(`${scope} .wg-tree-cell[data-path]`).length,
		settings: document.querySelectorAll(`${scope} .wg-tile-actions button[aria-label="Settings"]`).length,
		removes: document.querySelectorAll(`${scope} .wg-tile-actions button[aria-label="Remove"]`).length,
		pill: pillFit(document.querySelector(`${scope} .wg-tree-cell[data-path]`)),
	};
}

function pillFit(cell) {
	const pill = cell?.querySelector(".wg-tile-actions");
	if (!pill) return null;
	const at = pill.getBoundingClientRect();
	const box = cell.getBoundingClientRect();
	return {
		held: at.width > 0 && at.height > 0,
		within: at.left >= box.left - 0.5 && at.right <= box.right + 0.5 && at.top >= box.top - 0.5,
		seat: getComputedStyle(pill).position,
		shown: Number(getComputedStyle(pill).opacity),
	};
}

const tileIds = () => surfaceBoard.tiles.map((tile) => tile.id);
const writtenTileIds = () => leavesOf(surfaceBoard.layout).map((leaf) => leaf.id);

async function askRemoval(id) {
	const control = document.querySelector(
		`.wg-surface-probe .wg-tree-cell[data-cell="${id}"] .wg-tile-actions button[aria-label="Remove"]`,
	);
	if (!control) return { failed: "the tile carries no remove control" };
	fireClick(control);
	await settled();
	const asked = {
		dialogs: document.querySelectorAll(".wg-dialog-overlay .wg-dialog").length,
		title: document.querySelector(".wg-dialog-title")?.textContent ?? "",
		confirmLabel: document.querySelector(".wg-dialog-confirm")?.textContent ?? "",
		rows: rowsOfSurface(),
		written: writtenTileIds(),
		tiles: tileIds(),
		writes: surfaceWrites,
	};
	fireClick(document.querySelector(".wg-dialog-cancel"));
	await faded();
	const cancelled = {
		dialogs: document.querySelectorAll(".wg-dialog-overlay .wg-dialog").length,
		rows: rowsOfSurface(),
		written: writtenTileIds(),
		tiles: tileIds(),
		writes: surfaceWrites,
	};
	fireClick(
		document.querySelector(
			`.wg-surface-probe .wg-tree-cell[data-cell="${id}"] .wg-tile-actions button[aria-label="Remove"]`,
		),
	);
	await settled();
	fireClick(document.querySelector(".wg-dialog-confirm"));
	await faded();
	return {
		asked,
		cancelled,
		gone: {
			dialogs: document.querySelectorAll(".wg-dialog-overlay .wg-dialog").length,
			rows: rowsOfSurface(),
			written: writtenTileIds(),
			tiles: tileIds(),
			writes: surfaceWrites,
		},
	};
}

async function openTileSettings(id) {
	const control = document.querySelector(
		`.wg-surface-probe .wg-tree-cell[data-cell="${id}"] .wg-tile-actions button[aria-label="Settings"]`,
	);
	if (!control) return { failed: "the tile carries no settings control" };
	const box = document.querySelector(`.wg-surface-probe .wg-tree-cell[data-cell="${id}"]`).getBoundingClientRect();
	fireClick(control);
	await settled();
	const windows = document.querySelectorAll(".wg-set-window").length;
	const body = document.querySelector(".wg-set-body");
	const canvas = body ? [body.offsetWidth, body.offsetHeight] : null;
	const heldBox = document.querySelector(`.wg-surface-probe .wg-tree-cell[data-cell="${id}"]`).getBoundingClientRect();
	const tabs = [...document.querySelectorAll(".wg-set-panel .wg-kit-seg button")].map((node) =>
		node.textContent.trim(),
	);
	const design = tabs.indexOf("Design");
	if (design >= 0) fireClick([...document.querySelectorAll(".wg-set-panel .wg-kit-seg button")][design]);
	await settled();
	const rows = [...document.querySelectorAll(".wg-set-panel .wg-kit-row")].map((node) => node.textContent);
	const held = {
		windows,
		tabs,
		rows,
		canvas,
		cells: rows.filter((text) => text.includes(" cells")).length,
		drawnInCell: document.querySelectorAll(`.wg-surface-probe .wg-tree-cell[data-cell="${id}"] .wg-widget-root`).length,
		box: [Math.round(box.width), Math.round(box.height)],
		heldBox: [Math.round(heldBox.width), Math.round(heldBox.height)],
	};
	fireClick(document.querySelector(".wg-set-chrome .wg-dialog-close"));
	await faded();
	return {
		...held,
		closed: document.querySelectorAll(".wg-set-window").length,
		backInCell: document.querySelectorAll(`.wg-surface-probe .wg-tree-cell[data-cell="${id}"] .wg-widget-root`).length,
	};
}

function draw() {
	render(
		[...WIDTHS.map((width) => boardNode(width)), surfaceNode(), sidesNode(), emptyNode(), nestedNode(), stackedNode()],
		mount,
	);
}

function readSurface() {
	const root = document.querySelector(".wg-surface-probe .wg-tree");
	if (!root) return { drawn: false, host: document.querySelector(".wg-surface-probe")?.innerHTML.slice(0, 600) ?? "" };
	const cellsOf = (row) =>
		row ? [...row.querySelectorAll(".wg-tree-cell")].map((node) => Math.round(node.getBoundingClientRect().width)) : [];
	return {
		drawn: true,
		boardWidth: Math.round(root.getBoundingClientRect().width),
		rows: rowsUnder(root).map((row) => row.length),
		painted: [...document.querySelectorAll(".wg-surface-probe .wg-tree-cell .wg-tile-body")].filter(
			(node) => node.childElementCount > 0,
		).length,
		overlays: document.querySelectorAll(".wg-surface-probe .wg-tree-overlay").length,
		widest: Math.max(...[...root.children].map((node) => node.getBoundingClientRect().width)),
		regions: document.querySelectorAll(".wg-surface-probe .wg-tree-region").length,
		across: root.querySelectorAll(".wg-tree-handle.is-across").length,
		gripShown: Number(getComputedStyle(root.querySelector(".wg-tree-grip")).opacity),
		along: root.querySelectorAll(".wg-tree-handle.is-along").length,
		capped: root.querySelectorAll(".wg-tree-handle.is-along.is-capped").length,
		alongWidth: Math.round(root.querySelector(".wg-tree-handle.is-along")?.getBoundingClientRect().width ?? 0),
		firstRowHeight: Math.round(
			root.querySelector(".wg-tree-band")?.firstElementChild?.getBoundingClientRect().height ?? 0,
		),
		firstCellHeight: Math.round(root.querySelector(".wg-tree-cell[data-path]")?.getBoundingClientRect().height ?? 0),
		sharedRow: cellsOf(
			[...root.querySelectorAll(".wg-tree-row")].find((node) => node.querySelectorAll(".wg-tree-cell").length > 1),
		),
		loneRows: [...root.querySelectorAll(".wg-tree-band")]
			.filter((node) => node.querySelectorAll(".wg-tree-cell").length === 1)
			.map((node) =>
				Math.round(
					node.querySelector(".wg-tree-cell").getBoundingClientRect().width - root.getBoundingClientRect().width,
				),
			),
		writes: surfaceWrites,
		declaredHeights: TREE.flat()
			.filter((cell) => cell.height)
			.map((cell) => ({
				id: cell.id,
				wanted: cell.height,
				drawn: Math.round(
					document.querySelector(`.wg-surface-probe .wg-tree-cell[data-cell="${cell.id}"]`)?.getBoundingClientRect()
						.height ?? 0,
				),
			})),
		ratios: (surfaceBoard.layout.of[0].of.find(isBox)?.of ?? []).map((cell) => cell.ratio),
	};
}

async function report() {
	const sink = document.getElementById("wg-measure");
	try {
		const before = readSurface();
		const across = document.querySelector(".wg-surface-probe .wg-tree-handle.is-across");
		const writesWhileAcross = across ? dragGrip(across, 120, 0) : null;
		const dragged = readSurface();
		const along = document.querySelector(".wg-surface-probe .wg-tree-handle.is-along");
		const writesWhileAlong = along ? dragGrip(along, 0, 200) : null;
		const stretched = readSurface();
		const whileReading = await carryTile();
		surfaceEditing = true;
		draw();
		const carried = await carryTile();
		const squashed = { first: await squashRow(-800), again: await squashRow(-800) };
		const eases = { cell: easeOf("wg-tree-cell"), region: easeOf("wg-tree-region") };
		const sides = readSides();
		const widened = widenSidebar(100);
		const pinched = pinchSidebar(-400);
		const chromeless = readChromeless();
		const openSides = readSides();
		const mountedOpen = readMounted();
		const foldedLeft = await pressLeftAction();
		const mountedFolded = readMounted();
		const unfoldedLeft = await pressLeftAction();
		const soloChrome = readSurfaceChrome();
		const emptyOpen = readEmpty();
		const carriedAcross = await carryIntoLeft();
		const intoSlack = await carryIntoSlack();
		const chromeEditing = readChrome(".wg-surface-probe");
		surfaceEditing = false;
		draw();
		await settled();
		const chromeReading = readChrome(".wg-surface-probe");
		surfaceEditing = true;
		draw();
		await settled();
		const configured = await openTileSettings("views");
		const removal = await askRemoval("views");
		emptyEditing = false;
		draw();
		await settled();
		const emptyResting = readEmpty();
		emptyEditing = true;
		draw();
		await settled();
		const addedIntoRight = await addIntoRegion("right");
		const nested = readNested();
		const stacked = readStacked();
		const nestedGrips = dragNestedGrips();
		const screenFill = readScreenFill();
		const intoNest = await carryIntoNest();
		const unnested = await carryOutOfNest();
		sink.textContent = JSON.stringify({
			nested,
			stacked,
			nestedGrips,
			screenFill,
			intoNest,
			unnested,
			intoSlack,
			addedIntoRight,
			widths: WIDTHS.map(readOne),
			surface: before,
			sides,
			widened,
			pinched,
			chromeless,
			openSides,
			mountedOpen,
			mountedFolded,
			foldedLeft,
			unfoldedLeft,
			soloChrome,
			squashed,
			eases,
			dragged,
			stretched,
			whileReading,
			carried,
			emptyOpen,
			carriedAcross,
			emptyResting,
			chromeEditing,
			chromeReading,
			configured,
			removal,
			whileHeld: { across: writesWhileAcross, along: writesWhileAlong },
			failures,
		});
	} catch (failure) {
		sink.textContent = JSON.stringify({ failure: String(failure && failure.stack) });
	}
}

registry.load().then(() => {
	draw();
	setTimeout(() => {
		report();
	}, 600);
});

window.addEventListener("error", (event) => failures.push(String(event.message)));
