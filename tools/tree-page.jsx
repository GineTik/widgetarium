import { createElement as h } from "react";
import { render } from "../src/engine/render.js";
import { WidgetHost, WidgetSurface } from "../src/surface.js";
import { normalizeBoard } from "../src/model.js";
import { WidgetRegistry } from "../src/registry.js";
import { createGatewayRefs, createViewCells } from "../src/gateway/refs.js";
import { createFileTree, createProbeHost, createRowSlot } from "./vault-fixture.mjs";
import { classOf, scaleOf } from "../src/paths.js";
import { GAP_PX, layTree } from "../src/tree.js";

const FILES = JSON.parse(document.getElementById("wg-widgets").textContent);
const BOARD = JSON.parse(document.getElementById("wg-board").textContent);
const ROWS = JSON.parse(document.getElementById("wg-rows").textContent);
const TREE = JSON.parse(document.getElementById("wg-tree").textContent);
const WIDTHS = JSON.parse(document.getElementById("wg-widths").textContent);

const adapter = createFileTree(FILES);
const host = createProbeHost(createRowSlot(ROWS));

const failures = [];
console.error = ((was) => (...parts) => {
	failures.push(parts.map((part) => String(part?.stack ?? part)).join(" "));
	was(...parts);
})(console.error);

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
	configureBoard: ignore,
	isMounted: false,
	boardProperties: [],
	boardArchivedColumns: {},
};

const heightOf = (id) => TREE.flat().find((cell) => cell.id === id)?.height ?? null;

function widgetProps(cell, width, wiring) {
	const tile = tileOf(cell.id);
	const placement = { place: placeFor(cell.id, cell.width), scale: scaleOf(classOf(width)) };
	return { ...SILENT_BOARD, ...wiring, ...placement, definition: tile && registry.get(tile.widget), tile, host, registry };
}

function bodyNode(cell, width, wiring) {
	const props = widgetProps(cell, width, wiring);
	if (!props.definition) return h("i", { className: "wg-tree-missing" }, cell.id);
	return h(WidgetHost, props);
}

function cellNode(cell, width, wiring) {
	const tall = heightOf(cell.id);
	const style = { flex: `0 0 ${cell.width}px`, width: `${cell.width}px`, minHeight: tall ? `${tall}px` : undefined };
	const attrs = { key: cell.id, className: "wg-tile wg-tree-cell", style, "data-tile": cell.id, "data-min": cell.minPx };
	return h("div", attrs, h("div", { className: "wg-tile-body" }, bodyNode(cell, width, wiring)));
}

function rowNode(row, at, width, wiring) {
	return h("div", { className: "wg-tree-row", key: at }, row.cells.map((cell) => cellNode(cell, width, wiring)));
}

function boardNode(width) {
	const wiring = { refs: createGatewayRefs(), cellFor: createViewCells() };
	const attrs = { className: "wg-root wg-tree", key: width, style: { width: `${width}px` }, "data-width": width };
	return h("div", attrs, layTree(TREE, width, GAP_PX).map((row, at) => rowNode(row, at, width, wiring)));
}

function boxOf(node) {
	if (!node) return null;
	const rect = node.getBoundingClientRect();
	return { left: rect.left, right: rect.right, top: rect.top, width: rect.width, height: rect.height };
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
		rows: [...root.querySelectorAll(".wg-tree-row")].map((node) => [...node.querySelectorAll(".wg-tree-cell")].map((one) => one.dataset.tile)),
		board: boxOf(root),
		scrollWidth: root.scrollWidth,
		clientWidth: root.clientWidth,
		cells,
	};
}

const mount = document.querySelector(".wg-host");

const SURFACE_WIDTH = 1600;

const asRows = (rows) => rows.map((row) => row.map((cell) => ({ id: cell.id, ratio: cell.ratio, ...(cell.height ? { height: cell.height } : {}) })));
let surfaceBoard = { ...BOARD, layout: { main: { rows: asRows(TREE) } }, layouts: {} };
let surfaceWrites = 0;
let surfaceEditing = false;

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

let sidesBoard = {
	...BOARD,
	layout: {
		left: { rows: [[{ id: "boards" }]] },
		main: { rows: [[{ id: "board", height: 400 }]] },
		right: { rows: [[{ id: "wynttpz" }]] },
	},
	layouts: {},
};

function sidesNode() {
	return h(
		"div",
		{ className: "wg-sides-probe", key: "sides", style: { width: `${SIDES_WIDTH}px` } },
		h(WidgetSurface, {
			board: sidesBoard,
			registry,
			host,
			editing: false,
			screen: true,
			initialWidth: SIDES_WIDTH,
			onChange: (next) => {
				sidesBoard = next;
				draw();
			},
			onToggleEditing: () => {},
			onWidth: () => {},
		}),
	);
}

function readToggles() {
	const page = document.querySelector(".wg-sides-probe .wg-tree-page");
	const bar = page?.querySelector(":scope > .wg-region-bar");
	if (!page || !bar) return { drawn: false };
	const box = page.getBoundingClientRect();
	const seen = (name) => {
		const node = bar.querySelector(`:scope > .wg-region-toggle.is-${name}`);
		if (!node) return null;
		const at = node.getBoundingClientRect();
		return {
			shown: Number(getComputedStyle(node).opacity),
			pressed: node.getAttribute("aria-pressed"),
			label: node.getAttribute("aria-label"),
			nearestCorner: Math.round(Math.min(Math.abs(at.left - box.left), Math.abs(box.right - at.right))),
			fromTop: Math.round(at.top - box.top),
			painted: node.querySelector("svg.wg-kit-icon-glyph") ? Math.round(node.querySelector("svg.wg-kit-icon-glyph").getBoundingClientRect().width) : 0,
			face: getComputedStyle(node, "::before").backgroundColor,
			rim: getComputedStyle(node, "::before").boxShadow,
			fromKit: node.classList.contains("wg-kit-icon"),
		};
	};
	const firstRow = document.querySelector(".wg-sides-probe .wg-tree-row");
	return {
		drawn: true,
		left: seen("left"),
		right: seen("right"),
		barBottom: Math.round(bar.getBoundingClientRect().bottom),
		firstRowTop: Math.round(firstRow ? firstRow.getBoundingClientRect().top : 0),
		regions: [...page.querySelectorAll(".wg-tree-region")].map((node) => node.className.replace(/.*is-/, "")),
	};
}

function readMounted() {
	const probe = document.querySelector(".wg-sides-probe");
	const cells = [...probe.querySelectorAll(".wg-tree-region.is-left .wg-tree-cell")];
	return {
		tiles: cells.map((node) => node.dataset.cell),
		painted: cells.filter((node) => node.querySelector(".wg-tile-body")?.childElementCount > 0).length,
	};
}

function pressToggle(name) {
	const node = document.querySelector(`.wg-sides-probe .wg-region-bar > .wg-region-toggle.is-${name}`);
	if (!node) return { failed: `no ${name} toggle to press` };
	node.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
	return readSides();
}

function readSides() {
	const page = document.querySelector(".wg-sides-probe .wg-tree-page");
	if (!page) return { drawn: false };
	const columns = document.querySelector(".wg-sides-probe .wg-tree-columns");
	const boxes = [...columns.querySelectorAll(":scope > .wg-tree-region")].map((node) => {
		const at = node.getBoundingClientRect();
		return { name: node.className.replace(/.*is-/, ""), left: Math.round(at.left), right: Math.round(at.right), top: Math.round(at.top), height: Math.round(at.height) };
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
	const rowOf = () => Math.round(document.querySelector(".wg-surface-probe .wg-tree-row").getBoundingClientRect().height);
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
	const leftOf = () => Math.round(document.querySelector(".wg-sides-probe .wg-tree-region.is-left").getBoundingClientRect().width);
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
	target.dispatchEvent(new window.PointerEvent(type, { bubbles: true, cancelable: true, clientX: at.x, clientY: at.y, shiftKey: true, button: 0, pointerId: 1 }));
}

function dragFrom(node, from, byX, byY) {
	const fire = (type, at, target) =>
		target.dispatchEvent(new window.PointerEvent(type, { bubbles: true, cancelable: true, clientX: at.x, clientY: at.y, shiftKey: true, button: 0, pointerId: 1 }));
	fire("pointerdown", from, node);
	fire("pointermove", { x: from.x + byX, y: from.y + byY }, window);
	const whileHeld = surfaceWrites;
	fire("pointerup", { x: from.x + byX, y: from.y + byY }, window);
	return whileHeld;
}

function rowsOfSurface() {
	const root = document.querySelector(".wg-surface-probe .wg-tree");
	return [...root.querySelectorAll(".wg-tree-row")].map((row) => [...row.querySelectorAll(".wg-tree-cell")].map((cell) => cell.dataset.cell));
}

const settled = () => new Promise((done) => setTimeout(done, 30));

async function carryTile() {
	const before = rowsOfSurface();
	const gripShown = Number(getComputedStyle(document.querySelector(".wg-surface-probe .wg-tree-grip")).opacity);
	const held = document.querySelector('.wg-surface-probe .wg-tree-cell[data-cell="board"]');
	if (!held) return { before, failed: "the kanban cell was not found" };
	const box = held.getBoundingClientRect();
	const first = document.querySelector(".wg-surface-probe .wg-tree-row").getBoundingClientRect();
	const onto = { x: first.left + 20, y: first.top + first.height / 2 };
	firePointer("pointerdown", { x: box.left + 40, y: box.top + 40 }, held);
	firePointer("pointermove", onto, window);
	await settled();
	const aimed = document.querySelectorAll(".wg-surface-probe .wg-tree-slot").length;
	const dimmed = document.querySelectorAll(".wg-surface-probe .wg-tree-cell.is-carried").length;
	const lifted = getComputedStyle(held).transform;
	const shifted = (nodes) => [...nodes].map((node) => getComputedStyle(node).transform).filter((one) => one !== "none").length;
	const parted = shifted(document.querySelectorAll(".wg-surface-probe .wg-tree-band"));
	const partedCells = shifted(document.querySelectorAll('.wg-surface-probe .wg-tree-cell:not([data-cell="board"])'));
	firePointer("pointerup", onto, window);
	return { before, gripShown, aimed, dimmed, lifted, parted, partedCells, after: rowsOfSurface(), writes: surfaceWrites };
}

function draw() {
	render([...WIDTHS.map((width) => boardNode(width)), surfaceNode(), sidesNode()], mount);
}

function readSurface() {
	const root = document.querySelector(".wg-surface-probe .wg-tree");
	if (!root) return { drawn: false, host: document.querySelector(".wg-surface-probe")?.innerHTML.slice(0, 600) ?? "" };
	const cellsOf = (row) => (row ? [...row.querySelectorAll(".wg-tree-cell")].map((node) => Math.round(node.getBoundingClientRect().width)) : []);
	return {
		drawn: true,
		boardWidth: Math.round(root.getBoundingClientRect().width),
		rows: [...root.querySelectorAll(".wg-tree-row")].map((node) => node.querySelectorAll(".wg-tree-cell").length),
		painted: [...root.querySelectorAll(".wg-tree-cell .wg-tile-body")].filter((node) => node.childElementCount > 0).length,
		overlays: root.querySelectorAll(".wg-tree-overlay").length,
		widest: Math.max(...[...root.querySelectorAll(".wg-tree-row")].map((node) => node.getBoundingClientRect().width)),
		regions: document.querySelectorAll(".wg-surface-probe .wg-tree-region").length,
		across: root.querySelectorAll(".wg-tree-handle.is-across").length,
		gripShown: Number(getComputedStyle(root.querySelector(".wg-tree-grip")).opacity),
		along: root.querySelectorAll(".wg-tree-handle.is-along").length,
		capped: root.querySelectorAll(".wg-tree-handle.is-along.is-capped").length,
		alongWidth: Math.round(root.querySelector(".wg-tree-handle.is-along")?.getBoundingClientRect().width ?? 0),
		firstRowHeight: Math.round(document.querySelector(".wg-surface-probe .wg-tree-row")?.getBoundingClientRect().height ?? 0),
		firstCellHeight: Math.round(document.querySelector(".wg-surface-probe .wg-tree-row .wg-tree-cell")?.getBoundingClientRect().height ?? 0),
		sharedRow: cellsOf([...root.querySelectorAll(".wg-tree-row")].find((node) => node.querySelectorAll(".wg-tree-cell").length > 1)),
		writes: surfaceWrites,
		ratios: (surfaceBoard.layout.main.rows.find((row) => row.length > 1) ?? []).map((cell) => cell.ratio),
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
		const eases = { row: easeOf("wg-tree-row"), cell: easeOf("wg-tree-cell"), region: easeOf("wg-tree-region") };
		const sides = readSides();
		const widened = widenSidebar(100);
		const pinched = pinchSidebar(-400);
		const togglesOpen = readToggles();
		const openSides = readSides();
		const mountedOpen = readMounted();
		const foldedLeft = pressToggle("left");
		const mountedFolded = readMounted();
		const togglesFolded = readToggles();
		const unfoldedLeft = pressToggle("left");
		sink.textContent = JSON.stringify({ widths: WIDTHS.map(readOne), surface: before, sides, widened, pinched, togglesOpen, openSides, mountedOpen, mountedFolded, foldedLeft, togglesFolded, unfoldedLeft, squashed, eases, dragged, stretched, whileReading, carried, whileHeld: { across: writesWhileAcross, along: writesWhileAlong }, failures });
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
