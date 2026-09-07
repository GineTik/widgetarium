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
	return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
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
const UNPLACED_TILE = { id: "loose", widget: "@task/task-card" };
let surfaceBoard = { ...BOARD, tiles: [...BOARD.tiles, UNPLACED_TILE], layout: { main: { rows: asRows(TREE) } }, layouts: {} };
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

let sidesBoard = normalizeBoard({
	...BOARD,
	layout: {
		left: { rows: [[{ id: "boards" }]] },
		main: { rows: [[{ id: "board", height: 400 }]] },
		right: { rows: [[{ id: "wynttpz" }]] },
	},
	layouts: {},
});

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

const EMPTY_WIDTH = 1400;

let emptyBoard = normalizeBoard({ tiles: BOARD.tiles, layout: { left: [], main: [[{ id: "boards", ratio: 0.5 }], [{ id: "board", height: 400 }]], right: [] } });
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
		const zone = document.querySelector(`.wg-empty-probe .wg-tree-region.is-${name} .wg-tree-empty`);
		if (!zone) return null;
		const at = zone.getBoundingClientRect();
		return { width: Math.round(at.width), height: Math.round(at.height), text: zone.textContent };
	};
	return {
		drawn: true,
		regions: [...page.querySelectorAll(".wg-tree-region")].map((node) => node.className.replace(/.*is-/, "")),
		named: [...document.querySelectorAll(".wg-empty-probe [data-region]")].map((node) => node.dataset.region),
		left: zoneOf("left"),
		right: zoneOf("right"),
		halfShare: (() => {
			const row = document.querySelector(".wg-empty-probe .wg-tree-region.is-main .wg-tree-row");
			if (!row) return null;
			const cell = row.querySelector(".wg-tree-cell");
			return Math.round(cell.getBoundingClientRect().width - row.getBoundingClientRect().width);
		})(),
		palette: document.querySelectorAll(".wg-empty-probe .wg-palette-open").length,
	};
}

async function carryIntoLeft() {
	const cellOf = () => document.querySelector('.wg-empty-probe .wg-tree-cell[data-cell="boards"]');
	const held = cellOf();
	const zone = document.querySelector('.wg-empty-probe .wg-tree-region.is-left [data-region="left"]');
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
	const ids = (rows) => rows.map((row) => row.map((cell) => cell.id));
	return {
		aimed: standIn ? 1 : 0,
		lie: { left: off("left"), top: off("top"), width: off("width"), height: off("height") },
		left: ids(emptyBoard.layout.left.rows),
		main: ids(emptyBoard.layout.main.rows),
	};
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
	fireClick(node);
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
const faded = () => new Promise((done) => setTimeout(done, 320));

async function carryTile() {
	const before = rowsOfSurface();
	const gripShown = Number(getComputedStyle(document.querySelector(".wg-surface-probe .wg-tree-grip")).opacity);
	const cellOf = () => document.querySelector('.wg-surface-probe .wg-tree-cell[data-cell="board"]');
	const held = cellOf();
	if (!held) return { before, failed: "the kanban cell was not found" };
	const box = held.getBoundingClientRect();
	const treeBox = boxOf(document.querySelector(".wg-surface-probe .wg-tree"));
	const first = document.querySelector(".wg-surface-probe .wg-tree-row").getBoundingClientRect();
	const onto = { x: first.left + 20, y: first.top + first.height / 2 };
	firePointer("pointerdown", { x: box.left + 40, y: box.top + 40 }, held);
	firePointer("pointermove", onto, window);
	await settled();
	const standIn = boxOf(document.querySelector(".wg-surface-probe .wg-tree-cell.is-stand-in"));
	const ghosts = document.querySelectorAll(".wg-surface-probe .wg-tree-ghost").length;
	const plate = boxOf(document.querySelector(".wg-surface-probe .wg-tree-ghost-plate"));
	const underPointer = plate ? onto.x >= plate.left && onto.x <= plate.right && onto.y >= plate.top && onto.y <= plate.bottom : false;
	const plateSize = plate ? [Math.round(plate.width), Math.round(plate.height)] : null;
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
	const ids = (rows) => rows.map((row) => row.map((cell) => cell.id));
	return { slack, aimed, left: ids(emptyBoard.layout.left.rows), main: ids(emptyBoard.layout.main.rows) };
}

const fireClick = (node) => Boolean(node) && node.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));

function readChrome(scope) {
	return {
		cells: document.querySelectorAll(`${scope} .wg-tree-row .wg-tree-cell`).length,
		settings: document.querySelectorAll(`${scope} .wg-tile-actions button[aria-label="Settings"]`).length,
		removes: document.querySelectorAll(`${scope} .wg-tile-actions button[aria-label="Remove"]`).length,
		pill: pillFit(document.querySelector(`${scope} .wg-tree-row .wg-tree-cell`)),
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
const writtenTileIds = () => Object.values(surfaceBoard.layout).flatMap((region) => region.rows).flatMap((row) => row.map((cell) => cell.id));

async function askRemoval(id) {
	const control = document.querySelector(`.wg-surface-probe .wg-tree-cell[data-cell="${id}"] .wg-tile-actions button[aria-label="Remove"]`);
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
	const cancelled = { dialogs: document.querySelectorAll(".wg-dialog-overlay .wg-dialog").length, rows: rowsOfSurface(), written: writtenTileIds(), tiles: tileIds(), writes: surfaceWrites };
	fireClick(document.querySelector(`.wg-surface-probe .wg-tree-cell[data-cell="${id}"] .wg-tile-actions button[aria-label="Remove"]`));
	await settled();
	fireClick(document.querySelector(".wg-dialog-confirm"));
	await faded();
	return { asked, cancelled, gone: { dialogs: document.querySelectorAll(".wg-dialog-overlay .wg-dialog").length, rows: rowsOfSurface(), written: writtenTileIds(), tiles: tileIds(), writes: surfaceWrites } };
}

async function openTileSettings(id) {
	const control = document.querySelector(`.wg-surface-probe .wg-tree-cell[data-cell="${id}"] .wg-tile-actions button[aria-label="Settings"]`);
	if (!control) return { failed: "the tile carries no settings control" };
	const box = document.querySelector(`.wg-surface-probe .wg-tree-cell[data-cell="${id}"]`).getBoundingClientRect();
	fireClick(control);
	await settled();
	const windows = document.querySelectorAll(".wg-set-window").length;
	const body = document.querySelector(".wg-set-body");
	const canvas = body ? [body.offsetWidth, body.offsetHeight] : null;
	const heldBox = document.querySelector(`.wg-surface-probe .wg-tree-cell[data-cell="${id}"]`).getBoundingClientRect();
	const tabs = [...document.querySelectorAll(".wg-set-panel .wg-kit-seg button")].map((node) => node.textContent.trim());
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
	return { ...held, closed: document.querySelectorAll(".wg-set-window").length, backInCell: document.querySelectorAll(`.wg-surface-probe .wg-tree-cell[data-cell="${id}"] .wg-widget-root`).length };
}

function draw() {
	render([...WIDTHS.map((width) => boardNode(width)), surfaceNode(), sidesNode(), emptyNode()], mount);
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
		loneRows: [...root.querySelectorAll(".wg-tree-row")]
			.filter((node) => node.querySelectorAll(".wg-tree-cell").length === 1)
			.map((node) => Math.round(node.querySelector(".wg-tree-cell").getBoundingClientRect().width - node.getBoundingClientRect().width)),
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
		sink.textContent = JSON.stringify({ intoSlack, widths: WIDTHS.map(readOne), surface: before, sides, widened, pinched, togglesOpen, openSides, mountedOpen, mountedFolded, foldedLeft, togglesFolded, unfoldedLeft, squashed, eases, dragged, stretched, whileReading, carried, emptyOpen, carriedAcross, emptyResting, chromeEditing, chromeReading, configured, removal, whileHeld: { across: writesWhileAcross, along: writesWhileAlong }, failures });
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
