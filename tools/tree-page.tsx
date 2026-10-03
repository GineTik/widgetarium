import "./packs-registered.ts";
import { createElement as h } from "react";
import type { ReactElement } from "react";
import { render } from "../packages/core/src/engine/render.js";
import { WidgetHost, WidgetSurface } from "../packages/core/src/surface.js";
import { normalizeBoard, serializeBoard } from "../packages/core/src/model.js";
import type { Board } from "../packages/core/src/model.js";
import { WidgetRegistry } from "../packages/core/src/registry.js";
import { CATALOGUE_REQUESTS } from "../packages/core/src/engine/catalogue-requests.js";
import { createGatewayRefs, createViewCells } from "../packages/core/src/gateway/refs.js";
import type { GatewayRefs, ViewCell } from "../packages/core/src/gateway/refs.js";
import { classOf, scaleOf } from "../packages/core/src/paths.js";
import { isBox, layNode, leavesOf } from "../packages/core/src/tree.js";
import type { BoardNode, BoxNode, LaidLeaf, LaidNode } from "../packages/core/src/tree.js";
import { isDrawable } from "../packages/core/src/surface/is-drawable.js";
import type { BoxAction } from "../packages/core/src/surface/box-actions.js";
import { createFileTree, createProbeHost, createRowSlot } from "./vault-fixture.ts";
import {
	elementAt,
	elementsAt,
	isFileMap,
	isRecord,
	jsonIn,
	present,
	recordErrors,
	rowsIn,
	stackOf,
} from "./page-dom.ts";

interface TreeCell {
	readonly id: string;
	readonly ratio?: number;
	readonly minPx?: number;
	readonly height?: number;
}

function treeCellOf(value: unknown): TreeCell[] {
	if (!isRecord(value) || typeof value["id"] !== "string") return [];
	const { ratio, minPx, height } = value;
	return [
		{
			id: value["id"],
			...(typeof ratio === "number" ? { ratio } : {}),
			...(typeof minPx === "number" ? { minPx } : {}),
			...(typeof height === "number" ? { height } : {}),
		},
	];
}

function treeIn(value: unknown): TreeCell[][] {
	if (!Array.isArray(value)) return [];
	return value.map((row: unknown) => (Array.isArray(row) ? row.flatMap(treeCellOf) : []));
}

interface BoardJson {
	readonly tiles: readonly unknown[];
	readonly [field: string]: unknown;
}

function boardJsonOf(value: unknown): BoardJson {
	if (!isRecord(value)) throw new TypeError("#wg-board holds no board");
	const { tiles } = value;
	if (!Array.isArray(tiles)) throw new TypeError("#wg-board holds no tiles");
	return { ...value, tiles };
}

const widthsIn = (value: unknown): number[] =>
	Array.isArray(value) ? value.filter((held): held is number => typeof held === "number") : [];

const FILES = jsonIn("wg-widgets");
const BOARD = boardJsonOf(jsonIn("wg-board"));
const ROWS = rowsIn(jsonIn("wg-rows"));
const TREE = treeIn(jsonIn("wg-tree"));
const WIDTHS = widthsIn(jsonIn("wg-widths"));

const adapter = createFileTree(isFileMap(FILES) ? FILES : {});
const host = createProbeHost(createRowSlot(ROWS));

const failures: string[] = [];
recordErrors(failures);

const registry = new WidgetRegistry({ vault: { adapter } });
const board = normalizeBoard(BOARD);
const tileOf = (id: string): Board["tiles"][number] | undefined => board.tiles.find((tile) => tile.id === id);

// TRADE-OFF: the box is spelled back as a cell span because `size.w` still counts cells; the tree knows only pixels
const CELL_PX = 88;
const placeFor = (id: string, width: number): { id: string; x: number; y: number; w: number; h: number } => ({
	id,
	x: 0,
	y: 0,
	w: Math.max(1, Math.round(width / CELL_PX)),
	h: 1,
});

const ignore = (): undefined => undefined;

const SILENT_BOARD = {
	patchProp: ignore,
	onCollapse: ignore,
	onExpand: ignore,
	onPatch: ignore,
	patchMounted: ignore,
	foldIntoGroup: (): boolean => false,
	enterMount: null,
	isMounted: false,
};

interface Wiring {
	readonly refs: GatewayRefs;
	readonly cellFor: (key: string) => ViewCell;
}

const cellIn = (id: string): TreeCell | undefined => TREE.flat().find((cell) => cell.id === id);
const heightOf = (id: string): number | null => cellIn(id)?.height ?? null;
const askOf = (id: string): { minPx: number } => ({ minPx: cellIn(id)?.minPx ?? 0 });
const asNode = (row: readonly BoardNode[]): BoardNode =>
	row.length === 1 && row[0] ? row[0] : { dir: "row", of: row };
const PROBE_TREE: BoxNode = { dir: "column", of: TREE.map(asNode) };
const idsOfRow = (node: BoardNode): (string | undefined)[] =>
	isBox(node) ? node.of.map((cell) => cell.id) : [node.id];

function rowsOfRegion(node: BoardNode | undefined): (string | undefined)[][] {
	if (!node || !isBox(node)) throw new TypeError("the region is not a box");
	return node.of.map(idsOfRow);
}

function bodyNode(cell: LaidLeaf, width: number, wiring: Wiring): ReactElement {
	const tile = tileOf(cell.id);
	const definition = tile ? registry.get(tile.widget) : null;
	if (!tile || !isDrawable(definition)) return h("i", { className: "wg-tree-missing" }, cell.id);
	return h(WidgetHost, {
		...SILENT_BOARD,
		...wiring,
		place: placeFor(cell.id, cell.width),
		scale: scaleOf(classOf(width)),
		definition,
		tile,
		host,
		registry,
	});
}

function cellNode(cell: LaidLeaf, width: number, wiring: Wiring): ReactElement {
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

function laidNode(node: LaidNode, width: number, wiring: Wiring): ReactElement {
	if (node.kind === "leaf") return cellNode(node, width, wiring);
	if (node.kind === "collapsed") throw new TypeError("the probe tree collapsed a box");
	return h(
		"div",
		{ className: node.dir === "column" ? "wg-tree" : "wg-tree-row", key: node.path.join("/") },
		node.of.map((child) => laidNode(child, width, wiring)),
	);
}

function childrenLaid(width: number): readonly LaidNode[] {
	const laid = layNode(PROBE_TREE, width, { ask: askOf });
	if (laid.kind !== "box") throw new TypeError("the probe tree was not laid as a box");
	return laid.of;
}

function boardNode(width: number): ReactElement {
	const wiring: Wiring = { refs: createGatewayRefs(), cellFor: createViewCells() };
	const attrs = { className: "wg-root wg-tree", key: width, style: { width: `${width}px` }, "data-width": width };
	return h(
		"div",
		attrs,
		childrenLaid(width).map((child) => laidNode(child, width, wiring)),
	);
}

interface Box {
	readonly left: number;
	readonly right: number;
	readonly top: number;
	readonly bottom: number;
	readonly width: number;
	readonly height: number;
}

function rectBox(node: Element): Box {
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

function boxOf(node: Element | null | undefined): Box | null {
	return node ? rectBox(node) : null;
}

const boxAt = (selector: string): Box => rectBox(present(document.querySelector(selector), selector));

const cellIdOf = (node: HTMLElement): string | undefined => node.dataset["tile"] ?? node.dataset["cell"];

function rowsUnder(node: Element): (string | undefined)[][] {
	return [...node.children].flatMap((child): (string | undefined)[][] => {
		if (!(child instanceof HTMLElement)) return [];
		if (child.classList.contains("wg-tree-cell")) return [[cellIdOf(child)]];
		if (child.classList.contains("wg-tree-row")) return [elementsAt(".wg-tree-cell", child).map(cellIdOf)];
		if (child.classList.contains("wg-tree") || child.classList.contains("wg-tree-band")) return rowsUnder(child);
		return [];
	});
}

function readOne(width: number): Readonly<Record<string, unknown>> {
	const root = document.querySelector(`.wg-tree[data-width="${width}"]`);
	if (!root) return { width, drawn: false, host: mount.innerHTML.slice(0, 600) };
	const cells = elementsAt(".wg-tree-cell", root).map((node) => ({
		id: node.dataset["tile"],
		minPx: Number(node.dataset["min"]),
		box: rectBox(node),
		painted: node.querySelector(".wg-tile-body")?.childElementCount ?? 0,
		missing: Boolean(node.querySelector(".wg-tree-missing")),
		scrollWidth: node.scrollWidth,
		clientWidth: node.clientWidth,
	}));
	return {
		width,
		rows: rowsUnder(root),
		board: rectBox(root),
		scrollWidth: root.scrollWidth,
		clientWidth: root.clientWidth,
		cells,
	};
}

const mount = present(elementAt(".wg-host"), ".wg-host");

const SURFACE_WIDTH = 1600;

const asRows = (rows: readonly TreeCell[][]): BoardNode[][] =>
	rows.map((row) =>
		row.map((cell) => ({
			id: cell.id,
			...(cell.ratio === undefined ? {} : { ratio: cell.ratio }),
			...(cell.height ? { height: cell.height } : {}),
		})),
	);
const UNPLACED_TILE = { id: "loose", widget: "@default/task-card" };
let surfaceBoard = normalizeBoard({
	...BOARD,
	tiles: [...BOARD.tiles, UNPLACED_TILE],
	layout: { dir: "row", of: [{ dir: "column", keep: true, of: asRows(TREE).map(asNode) }] },
});
let surfaceWrites = 0;
let surfaceEditing = false;

function readScreenFill(): Readonly<Record<string, unknown>> {
	const root = document.querySelector(".wg-root.is-screen");
	if (!root) return { failed: "no screen board stands on the page" };
	const page = root.querySelector(":scope > .wg-tree-page");
	const floorOf = (element: Element): number => Math.round(Number.parseFloat(getComputedStyle(element).minHeight) || 0);
	return {
		failed: null,
		root: floorOf(root),
		page: page ? floorOf(page) : null,
		viewport: window.innerHeight,
	};
}

function surfaceNode(): ReactElement {
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
let sidesActions: readonly BoxAction[] = [];

function sidesNode(): ReactElement {
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

function nestedNode(): ReactElement {
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

function stackedNode(): ReactElement {
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
			onWidth: ignore,
		}),
	);
}

function readStacked(): Readonly<Record<string, unknown>> {
	const row = elementAt('.wg-stacked-probe [data-path="0/0"]');
	if (!row) return { drawn: false };
	const cellSelector = (id: string): string => `.wg-stacked-probe .wg-tree-cell[data-cell="${id}"]`;
	const cellAt = (id: string): Box => boxAt(cellSelector(id));
	return {
		drawn: true,
		dir: row.dataset["dir"],
		heights: ["views", "wynttpz"].map((id) => Math.round(cellAt(id).height)),
		rowBottom: Math.round(rectBox(row).bottom),
		lastBottom: Math.round(cellAt("wynttpz").bottom),
		boardTop: Math.round(cellAt("board").top),
		standsAcross: ["views", "wynttpz"].map(
			(id) => present(elementAt(cellSelector(id)), cellSelector(id)).dataset["standsAcross"] ?? null,
		),
	};
}

function readNested(): Readonly<Record<string, unknown>> {
	const region = document.querySelector(".wg-nested-probe .wg-tree-region.is-main .wg-tree");
	if (!region) return { drawn: false };
	const pathAt = (path: string): Box => boxAt(`.wg-nested-probe [data-path="${path}"]`);
	const cellAt = (id: string): Box => boxAt(`.wg-nested-probe .wg-tree-cell[data-cell="${id}"]`);
	const column = pathAt("0/1/1");
	const row = pathAt("0/1");
	const painted = (id: string): number =>
		document.querySelector(`.wg-nested-probe .wg-tree-cell[data-cell="${id}"] .wg-tile-body`)?.childElementCount ?? 0;
	return {
		drawn: true,
		rows: rowsUnder(region),
		dirs: elementsAt(".wg-nested-probe [data-dir]").map((node) => `${node.dataset["path"]}:${node.dataset["dir"]}`),
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

const leavesWritten = (written: Board): string[] =>
	leavesOf(written.layout).map((leaf) => `${leaf.id}@${leaf.path.join("/")}`);

interface Point {
	readonly x: number;
	readonly y: number;
}

async function carryIntoNest(): Promise<Readonly<Record<string, unknown>>> {
	const held = document.querySelector('.wg-nested-probe .wg-tree-cell[data-cell="boards"]');
	const onto = document.querySelector('.wg-nested-probe .wg-tree-cell[data-cell="wynttpz"]');
	if (!held || !onto) return { failed: "the nested column was not drawn" };
	const box = held.getBoundingClientRect();
	const seat = onto.getBoundingClientRect();
	const aim = { x: seat.left + seat.width / 2, y: seat.top + 6 };
	firePointer("pointerdown", { x: box.left + 20, y: box.top + 20 }, held);
	firePointer("pointermove", aim, window);
	await settled();
	const nest = (): Element =>
		present([...document.querySelectorAll('.wg-nested-probe [data-dir="column"]')].at(-1), "the nested column");
	const aimed = nest().querySelectorAll(".wg-tree-cell.is-stand-in").length;
	firePointer("pointerup", aim, window);
	await settled();
	return {
		aimed,
		leaves: leavesWritten(nestedBoard),
		inNest: elementsAt(".wg-tree-cell", nest()).map((node) => node.dataset["cell"]),
	};
}

async function carryOutOfNest(): Promise<Readonly<Record<string, unknown>>> {
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
	const selector = ".wg-nested-probe .wg-tree-region.is-main .wg-tree";
	return {
		aimed,
		rows: rowsUnder(present(document.querySelector(selector), selector)),
		leaves: leavesWritten(nestedBoard),
		writes: nestedWrites,
	};
}

const EMPTY_WIDTH = 1400;

let emptyBoard = normalizeBoard({
	tiles: BOARD.tiles,
	layout: { left: [], main: [[{ id: "boards", ratio: 0.5 }], [{ id: "board", height: 400 }]], right: [] },
});
let emptyEditing = true;

function emptyNode(): ReactElement {
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
			onWidth: () => {},
		}),
	);
}

const regionNameOf = (node: Element): string => node.className.replace(/.*is-/, "");

function addZoneRead(name: string): Readonly<Record<string, unknown>> | null {
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
}

function halfShare(): number | null {
	const column = document.querySelector(".wg-empty-probe .wg-tree-region.is-main .wg-tree");
	const cell = column?.querySelector(".wg-tree-cell[data-path]");
	if (!column || !cell) return null;
	return Math.round(cell.getBoundingClientRect().width - column.getBoundingClientRect().width);
}

function readEmpty(): Readonly<Record<string, unknown>> {
	const page = document.querySelector(".wg-empty-probe .wg-tree-page");
	if (!page) return { drawn: false };
	const regions = [...page.querySelectorAll(".wg-tree-region")];
	return {
		drawn: true,
		regions: regions.map(regionNameOf),
		named: elementsAt(".wg-empty-probe [data-region]").map((node) => node.dataset["region"]),
		left: addZoneRead("left"),
		right: addZoneRead("right"),
		halfShare: halfShare(),
		palette: document.querySelectorAll(".wg-empty-probe .wg-palette-open").length,
		adds: regions.filter((node) => node.querySelector(".wg-tree-add")).map(regionNameOf),
		bare: regions
			.filter((node) => node.querySelector(".wg-tree") && !node.querySelector(".wg-tree-band"))
			.map(regionNameOf),
		lastInRegion:
			[...page.querySelectorAll(".wg-tree-region.is-main .wg-tree > *")].pop()?.className.split(" ")[0] ?? null,
		chrome: page.querySelectorAll(".wg-region-bar, .wg-region-toggle").length,
	};
}

const REGION_NAMES = ["left", "main", "right"];
const rowsPerRegion = (): Record<string, (string | undefined)[][]> =>
	Object.fromEntries(REGION_NAMES.map((name, at) => [name, rowsOfRegion(emptyBoard.layout.of[at])]));

async function addIntoRegion(name: string): Promise<Readonly<Record<string, unknown>>> {
	const zone = document.querySelector(`.wg-empty-probe .wg-tree-region.is-${name} .wg-tree-add`);
	if (!zone) return { failed: `no add zone in ${name}` };
	// TODO: drop the muting once a widget preview stops keying its rows by a path it has not got
	const quiet = failures.length;
	const before = rowsPerRegion();
	const held = emptyBoard.tiles.length;
	fireClick(zone);
	await settled();
	const asked = CATALOGUE_REQUESTS.current();
	const picked = registry.list().find((definition) => !definition.manifest?.["inline"])?.manifest?.["id"];
	if (asked?.mode !== "place" || typeof picked !== "string") return { failed: "the catalogue was never asked" };
	CATALOGUE_REQUESTS.answer(picked);
	await faded();
	const after = rowsPerRegion();
	failures.length = quiet;
	return {
		opened: asked.mode === "place" ? 1 : 0,
		before,
		after,
		untouched: ["left", "main", "right"].filter(
			(one) => one !== name && JSON.stringify(before[one]) === JSON.stringify(after[one]),
		),
		grew: present(after[name], name).length - present(before[name], name).length,
		born: emptyBoard.tiles.length - held,
		dialogs: CATALOGUE_REQUESTS.current() === null ? 0 : 1,
	};
}

const offBy =
	(standIn: Box | null, landed: Box | null) =>
	(key: keyof Box): number | null =>
		standIn && landed ? Math.round(landed[key] - standIn[key]) : null;

function lieOf(standIn: Box | null, landed: Box | null): Readonly<Record<string, number | null>> {
	const off = offBy(standIn, landed);
	return { left: off("left"), top: off("top"), width: off("width"), height: off("height") };
}

async function carryIntoLeft(): Promise<Readonly<Record<string, unknown>>> {
	const cellOf = (): Element | null => document.querySelector('.wg-empty-probe .wg-tree-cell[data-cell="boards"]');
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
	return {
		aimed: standIn ? 1 : 0,
		lie: lieOf(standIn, boxOf(cellOf())),
		left: rowsOfRegion(emptyBoard.layout.of[0]),
		main: rowsOfRegion(emptyBoard.layout.of[1]),
	};
}

function readChromeless(): Readonly<Record<string, unknown>> {
	const probe = document.querySelector(".wg-sides-probe");
	const page = probe?.querySelector(".wg-tree-page");
	if (!probe || !page) return { drawn: false };
	const firstRegion = present(page.querySelector(".wg-tree-region"), "the first region");
	return {
		drawn: true,
		chrome: probe.querySelectorAll(".wg-region-bar, .wg-region-toggle").length,
		regionFromTop: Math.round(firstRegion.getBoundingClientRect().top - page.getBoundingClientRect().top),
		actions: seenActions(),
	};
}

function seenActions(): Readonly<Record<string, unknown>>[] {
	return sidesActions.map((one) => ({ key: one.key, isOn: one.isOn, title: one.title }));
}

function readMounted(): Readonly<Record<string, unknown>> {
	const probe = present(document.querySelector(".wg-sides-probe"), ".wg-sides-probe");
	const cells = elementsAt(".wg-tree-region.is-left .wg-tree-cell", probe);
	return {
		tiles: cells.map((node) => node.dataset["cell"]),
		painted: cells.filter((node) => (node.querySelector(".wg-tile-body")?.childElementCount ?? 0) > 0).length,
	};
}

async function pressLeftAction(): Promise<Readonly<Record<string, unknown>>> {
	const left = sidesActions.find((one) => one.key === "box:collapse:0/open");
	if (!left) return { failed: "no action for the left region was offered" };
	left.press({ x: 0, y: 0 });
	await settled();
	const leftBox = present(sidesBoard.layout.of[0], "the left region");
	return { ...readSides(), actions: seenActions(), folded: Boolean(isBox(leftBox) && leftBox.folded) };
}

function readSurfaceChrome(): number {
	return document.querySelectorAll(".wg-surface-probe .wg-region-bar, .wg-surface-probe .wg-region-toggle").length;
}

function readSides(): Readonly<Record<string, unknown>> {
	const page = document.querySelector(".wg-sides-probe .wg-tree-page");
	if (!page) return { drawn: false };
	const columns = present(document.querySelector(".wg-sides-probe .wg-tree-columns"), ".wg-tree-columns");
	const boxes = [...columns.querySelectorAll(":scope > .wg-tree-region")].map((node) => {
		const at = node.getBoundingClientRect();
		return {
			name: regionNameOf(node),
			left: Math.round(at.left),
			right: Math.round(at.right),
			top: Math.round(at.top),
			height: Math.round(at.height),
		};
	});
	const row = columns.getBoundingClientRect();
	const edge = present(columns.querySelector(".wg-tree-handle.is-edge"), "the region edge");
	return {
		drawn: true,
		regions: boxes,
		edges: columns.querySelectorAll(":scope > .wg-tree-handle.is-edge").length,
		edgeFill: getComputedStyle(edge).backgroundColor,
		edgeReach: Math.round(edge.getBoundingClientRect().height),
		spans: Math.round(present(boxes.at(-1), "the last region").right - present(boxes[0], "the first region").left),
		rowWidth: Math.round(row.width),
		scrollWidth: page.scrollWidth,
		clientWidth: page.clientWidth,
	};
}

function widenSidebar(byX: number): Readonly<Record<string, unknown>> {
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

function pinchSidebar(byX: number): Readonly<Record<string, unknown>> {
	const edge = document.querySelector(".wg-sides-probe .wg-tree-handle.is-edge");
	if (!edge) return { failed: "no edge to drag" };
	const leftOf = (): number => Math.round(boxAt(".wg-sides-probe .wg-tree-region.is-left").width);
	const box = edge.getBoundingClientRect();
	const from = { x: box.left + box.width / 2, y: box.top + 40 };
	firePointer("pointerdown", from, edge);
	firePointer("pointermove", { x: from.x + byX, y: from.y }, window);
	const held = leftOf();
	firePointer("pointerup", { x: from.x + byX, y: from.y }, window);
	return { held, settled: leftOf() };
}

function easeOf(className: string): Readonly<Record<string, string>> {
	const root = document.createElement("div");
	root.className = "wg-root";
	const probe = root.appendChild(document.createElement("div"));
	probe.className = className;
	document.body.appendChild(root);
	const loose = getComputedStyle(probe);
	const property = loose.transitionProperty;
	const looseDuration = loose.transitionDuration;
	document.body.classList.add("wg-tree-dragging");
	const heldDuration = getComputedStyle(probe).transitionDuration;
	document.body.classList.remove("wg-tree-dragging");
	root.remove();
	return { property, loose: looseDuration, held: heldDuration };
}

function firePointer(type: string, at: Point, target: EventTarget): void {
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

function rowsOfSurface(): (string | undefined)[][] {
	return rowsUnder(present(document.querySelector(".wg-surface-probe .wg-tree"), ".wg-surface-probe .wg-tree"));
}

const settled = (): Promise<void> => new Promise((done) => setTimeout(done, 30));
const faded = (): Promise<void> => new Promise((done) => setTimeout(done, 320));

function spilledPast(treeBox: Box | null): (string | undefined)[] {
	return elementsAt(".wg-surface-probe .wg-tree-cell")
		.map((node) => ({ id: node.dataset["cell"], at: rectBox(node) }))
		.filter((one) => {
			if (!(one.at.width > 0)) return false;
			const tree = present(treeBox, ".wg-surface-probe .wg-tree");
			return one.at.right > tree.right + 1 || one.at.bottom > tree.bottom + 1;
		})
		.map((one) => one.id);
}

async function carryTile(): Promise<Readonly<Record<string, unknown>>> {
	const before = rowsOfSurface();
	const cellOf = (): Element | null => document.querySelector('.wg-surface-probe .wg-tree-cell[data-cell="board"]');
	const held = cellOf();
	if (!held) return { before, failed: "the kanban cell was not found" };
	const box = held.getBoundingClientRect();
	const first = boxAt(".wg-surface-probe .wg-tree-cell[data-path]");
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
	const spilled = spilledPast(boxOf(document.querySelector(".wg-surface-probe .wg-tree")));
	firePointer("pointerup", onto, window);
	await settled();
	return {
		before,
		ghosts,
		spilled,
		standIns: standIn ? 1 : 0,
		underPointer,
		plateSize,
		lie: lieOf(standIn, boxOf(cellOf())),
		after: rowsOfSurface(),
		writes: surfaceWrites,
	};
}

async function carryIntoSlack(): Promise<Readonly<Record<string, unknown>>> {
	const held = document.querySelector('.wg-empty-probe .wg-tree-region.is-main .wg-tree-cell[data-cell="board"]');
	const column = document.querySelector(".wg-empty-probe .wg-tree-region.is-left");
	if (!held || !column) return { failed: "no sidebar with room under its widgets" };
	const box = held.getBoundingClientRect();
	const side = column.getBoundingClientRect();
	const drawn = present(column.querySelector(".wg-tree"), "the left tree").getBoundingClientRect();
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

const fireClick = (node: Element | null | undefined): boolean =>
	node ? node.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true })) : false;

function readChrome(scope: string): Readonly<Record<string, unknown>> {
	return {
		cells: document.querySelectorAll(`${scope} .wg-tree-cell[data-path]`).length,
		settings: document.querySelectorAll(`${scope} .wg-tile-actions button[aria-label="Settings"]`).length,
		removes: document.querySelectorAll(`${scope} .wg-tile-actions button[aria-label="Remove"]`).length,
		pill: pillFit(document.querySelector(`${scope} .wg-tree-cell[data-path]`)),
	};
}

function pillFit(cell: Element | null): Readonly<Record<string, unknown>> | null {
	const pill = cell?.querySelector(".wg-tile-actions");
	if (!cell || !pill) return null;
	const at = pill.getBoundingClientRect();
	const box = cell.getBoundingClientRect();
	return {
		held: at.width > 0 && at.height > 0,
		within: at.left >= box.left - 0.5 && at.right <= box.right + 0.5 && at.top >= box.top - 0.5,
		seat: getComputedStyle(pill).position,
		shown: Number(getComputedStyle(pill).opacity),
	};
}

const tileIds = (): string[] => surfaceBoard.tiles.map((tile) => tile.id);
const writtenTileIds = (): string[] => leavesOf(surfaceBoard.layout).map((leaf) => leaf.id);

function removalState(): Readonly<Record<string, unknown>> {
	return {
		dialogs: document.querySelectorAll(".wg-dialog-overlay .wg-dialog").length,
		rows: rowsOfSurface(),
		written: writtenTileIds(),
		tiles: tileIds(),
		writes: surfaceWrites,
	};
}

async function askRemoval(id: string): Promise<Readonly<Record<string, unknown>>> {
	const removeSelector = `.wg-surface-probe .wg-tree-cell[data-cell="${id}"] .wg-tile-actions button[aria-label="Remove"]`;
	const control = document.querySelector(removeSelector);
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
	const cancelled = removalState();
	fireClick(document.querySelector(removeSelector));
	await settled();
	fireClick(document.querySelector(".wg-dialog-confirm"));
	await faded();
	return { asked, cancelled, gone: removalState() };
}

async function openTileSettings(id: string): Promise<Readonly<Record<string, unknown>>> {
	const cellSelector = `.wg-surface-probe .wg-tree-cell[data-cell="${id}"]`;
	const control = document.querySelector(`${cellSelector} .wg-tile-actions button[aria-label="Settings"]`);
	if (!control) return { failed: "the tile carries no settings control" };
	const box = boxAt(cellSelector);
	fireClick(control);
	await settled();
	const windows = document.querySelectorAll(".wg-set-window").length;
	const body = elementAt(".wg-set-body");
	const canvas = body ? [body.offsetWidth, body.offsetHeight] : null;
	const heldBox = boxAt(cellSelector);
	const segments = elementsAt(".wg-set-panel .wg-kit-seg button");
	const tabs = segments.map((node) => node.textContent?.trim());
	const design = tabs.indexOf("Design");
	if (design >= 0) fireClick(elementsAt(".wg-set-panel .wg-kit-seg button")[design]);
	await settled();
	const rows = [...document.querySelectorAll(".wg-set-panel .wg-kit-row")].map((node) => node.textContent);
	const held = {
		windows,
		tabs,
		rows,
		canvas,
		cells: rows.filter((text) => text?.includes(" cells")).length,
		drawnInCell: document.querySelectorAll(`${cellSelector} .wg-widget-root`).length,
		box: [Math.round(box.width), Math.round(box.height)],
		heldBox: [Math.round(heldBox.width), Math.round(heldBox.height)],
	};
	fireClick(document.querySelector(".wg-set-chrome .wg-dialog-close"));
	await faded();
	return {
		...held,
		closed: document.querySelectorAll(".wg-set-window").length,
		backInCell: document.querySelectorAll(`${cellSelector} .wg-widget-root`).length,
	};
}

function draw(): void {
	render(
		[...WIDTHS.map((width) => boardNode(width)), surfaceNode(), sidesNode(), emptyNode(), nestedNode(), stackedNode()],
		mount,
	);
}

function readSurface(): Readonly<Record<string, unknown>> {
	const root = document.querySelector(".wg-surface-probe .wg-tree");
	if (!root) return { drawn: false, host: document.querySelector(".wg-surface-probe")?.innerHTML.slice(0, 600) ?? "" };
	const cellsOf = (row: Element | undefined): number[] =>
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
		handles: root.querySelectorAll(".wg-tree-handle").length,
		sharedRow: cellsOf(
			[...root.querySelectorAll(".wg-tree-row")].find((node) => node.querySelectorAll(".wg-tree-cell").length > 1),
		),
		loneRows: [...root.querySelectorAll(".wg-tree-band")]
			.filter((node) => node.querySelectorAll(".wg-tree-cell").length === 1)
			.map((node) =>
				Math.round(
					present(node.querySelector(".wg-tree-cell"), "the lone cell").getBoundingClientRect().width -
						root.getBoundingClientRect().width,
				),
			),
		writes: surfaceWrites,
	};
}

async function report(): Promise<void> {
	const sink = present(document.getElementById("wg-measure"), "#wg-measure");
	try {
		const before = readSurface();
		const whileReading = await carryTile();
		surfaceEditing = true;
		draw();
		const carried = await carryTile();
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
		const screenFill = readScreenFill();
		const intoNest = await carryIntoNest();
		const unnested = await carryOutOfNest();
		sink.textContent = JSON.stringify({
			nested,
			stacked,
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
			eases,
			whileReading,
			carried,
			emptyOpen,
			carriedAcross,
			emptyResting,
			chromeEditing,
			chromeReading,
			configured,
			removal,
			failures,
		});
	} catch (failure) {
		sink.textContent = JSON.stringify({ failure: stackOf(failure) });
	}
}

registry.load().then(() => {
	draw();
	setTimeout(() => {
		report();
	}, 600);
});

window.addEventListener("error", (event) => failures.push(String(event.message)));
