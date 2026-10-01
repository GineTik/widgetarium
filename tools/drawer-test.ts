import { JSDOM } from "jsdom";
import type { BoxAction } from "../packages/core/src/surface/box-actions.js";
import type { WidgetSurfaceProps } from "../packages/core/src/surface/widget-surface.js";
import type { BoardNode } from "../packages/core/src/tree-nodes.js";
import { byId, found, foundAs } from "./dom-find.ts";
import { fieldIn } from "./held-fields.ts";
import { present } from "./page-dom.ts";
import { standIn } from "./stand-in.ts";

const dom = new JSDOM(`<!doctype html><body><div class="view-content"><div id="host"></div></div></body>`, {
	pretendToBeVisual: true,
});
Object.assign(globalThis, {
	window: dom.window,
	document: dom.window.document,
	Node: dom.window.Node,
	Element: dom.window.Element,
	HTMLElement: dom.window.HTMLElement,
	SVGElement: dom.window.SVGElement,
	getComputedStyle: dom.window.getComputedStyle,
	requestAnimationFrame: dom.window.requestAnimationFrame,
	cancelAnimationFrame: dom.window.cancelAnimationFrame,
	MutationObserver: dom.window.MutationObserver,
	NodeFilter: dom.window.NodeFilter,
});

type SizeAnswer = (entries: readonly { readonly contentRect: { readonly width: number } }[]) => void;

class WatchedSize {
	constructor(readonly answer: SizeAnswer) {
		watchers.add(this);
	}
	observe(): void {}
	disconnect(): void {
		watchers.delete(this);
	}
}

const watchers = new Set<WatchedSize>();
Object.assign(globalThis, { ResizeObserver: WatchedSize });
Object.assign(dom.window, { ResizeObserver: WatchedSize });
Object.assign(globalThis, { CSS: { escape: (value: unknown) => String(value).replace(/["\\]/g, "\\$&") } });

const { createElement: h } = await import("react");
const { render } = await import("../packages/core/src/engine/render.js");
const { WidgetSurface } = await import("../packages/core/src/surface.js");
const { normalizeBoard } = await import("../packages/core/src/model.js");

const plainWidget = {
	manifest: { id: "w", minSize: { w: 2, h: 2 }, maxSize: { w: 14, h: 10 } },
	component: () => null,
};
const openerWidget = {
	manifest: { id: "opener", props: { open: { kind: "value", type: "boolean", default: { from: "memory" } } } },
	component: ({ open }: { readonly open: { update(next: boolean): unknown } }) =>
		h("button", { className: "probe-opener", onClick: () => open.update(true) }),
};
const flooredWidget = { manifest: { id: "floored", stackBelowPx: 200 }, component: () => null };
const widgets: Readonly<Record<string, object>> = { w: plainWidget, opener: openerWidget, floored: flooredWidget };
const registry = standIn<WidgetSurfaceProps["registry"]>(
	{ get: (id: string) => widgets[id] ?? plainWidget, list: () => [] },
	["get", "list"],
	"registry",
);
const host = standIn<WidgetSurfaceProps["host"]>(
	{ ui: { notify() {}, openNote() {} }, vault: { adapter: {} }, can: { fullscreen: false } },
	["ui", "can"],
	"host",
);

const rowsOf = (id: string): { id: string; ratio: number }[][] => [[{ id, ratio: 1 }]];
let board = normalizeBoard({
	tiles: [
		{ id: "nav", widget: "w" },
		{ id: "hero", widget: "w" },
	],
	layout: { left: { rows: rowsOf("nav") }, main: { rows: rowsOf("hero") } },
});

const WIDE_PX = 1400;
const NARROW_PX = 360;
let boardWidth = WIDE_PX;
let viewportWidth = WIDE_PX + 60;
Object.defineProperty(dom.window, "innerWidth", { configurable: true, get: () => viewportWidth });
Object.defineProperty(dom.window.HTMLElement.prototype, "clientWidth", { configurable: true, get: () => boardWidth });
Object.assign(dom.window.Element.prototype, {
	getBoundingClientRect: () => ({
		left: 0,
		top: 0,
		right: 300,
		bottom: 800,
		width: 300,
		height: 800,
		x: 0,
		y: 0,
	}),
});

function nodeAt(node: BoardNode | undefined, ...path: readonly number[]): BoardNode | undefined {
	const [at, ...rest] = path;
	if (at === undefined || !node || !("of" in node)) return node;
	return nodeAt(node.of[at], ...rest);
}

let failed = 0;
const check = (name: string, got: unknown, want: unknown): void => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
};
const settled = (ms = 40): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, ms));
const target = byId(dom.window.document, "host");

let actions: readonly BoxAction[] = [];
const draw = (): void =>
	render(
		h(WidgetSurface, {
			boardNode: target,
			board,
			registry,
			host,
			editing: false,
			screen: true,
			initialWidth: WIDE_PX,
			onChange: (next: typeof board) => {
				board = next;
				draw();
			},
			onActions: (list: readonly BoxAction[]) => {
				actions = list;
			},
		}),
		target,
	);

const resizeTo = async (width: number): Promise<void> => {
	boardWidth = width;
	viewportWidth = width + 60;
	for (const watcher of watchers) watcher.answer([{ contentRect: { width } }]);
	await settled(620);
};

const drawerOver = (): Element | null => dom.window.document.body.querySelector(".wg-drawer-over");
const isOpen = (): boolean => Boolean(drawerOver()?.className.includes("is-open"));
const inColumns = (name: string): boolean =>
	Boolean(target.querySelector(`.wg-tree-columns .wg-tree-region.is-${name}`));
const LEFT_KEY = "box:collapse:0/open";
const leftAction = (): BoxAction | undefined => actions.find((one) => one.key === LEFT_KEY);
const pressLeft = async (): Promise<void> => {
	await present(leftAction(), "the left action").press({ x: 40, y: 60 });
	await settled();
};
const actionSeen = (action: BoxAction | undefined): { isOn: boolean; title: string | undefined } | null =>
	action ? { isOn: action.isOn, title: action.title } : null;
const click = (node: Element | null | undefined): boolean =>
	present(node, "the clicked node").dispatchEvent(
		new dom.window.MouseEvent("click", { bubbles: true, clientX: 40, clientY: 60 }),
	);

draw();
await settled();

console.log("— a board with room stands its sidebar in the row —");
check("the left region stands beside the main one", inColumns("left"), true);
check("and no drawer was mounted over the app", Boolean(drawerOver()), false);
check(
	"each box is offered to the header once",
	actions.map((one) => one.key),
	["box:collapse:0/open", "box:collapse:2/open"],
);
check("a region toggled always that stands is offered to the header as on", actionSeen(leftAction()), {
	isOn: true,
	title: "Hide the left panel",
});
check(
	"standing, each side carries a handle to drag its width by",
	target.querySelectorAll(".wg-tree-handle.is-edge").length,
	2,
);

console.log("\n— on a wide screen the header folds a region toggled always in the note —");
await pressLeft();
check("the press writes the region folded", Boolean(fieldIn(nodeAt(board.layout, 0), "folded")), true);
check("and takes it out of the row", inColumns("left"), false);
check("the action keeps its key and now reads off", actionSeen(leftAction()), {
	isOn: false,
	title: "Show the left panel",
});
await pressLeft();
check("pressed again, the region is written unfolded", Boolean(fieldIn(nodeAt(board.layout, 0), "folded")), false);
check("and stands in the row again", inColumns("left"), true);
check("and the action reads on again", leftAction()?.isOn, true);

console.log("\n— a board too narrow for it hands the region to a drawer over the whole app —");
await resizeTo(NARROW_PX);
check("the region left the row", inColumns("left"), false);
check(
	"nothing was drawn as a second row under the main one",
	target.querySelectorAll(".wg-tree-page > .wg-tree-region").length,
	0,
);
check("a drawer stands on the body, outside the note", Boolean(drawerOver()), true);
check(
	"and nothing is left to drag it wider by — the width is the screen's business",
	target.querySelectorAll(".wg-tree-handle.is-edge").length,
	0,
);
check(
	"and it is the region itself inside it, still mounted",
	Boolean(drawerOver()?.querySelector(".wg-tree-region.is-left")),
	true,
);
check("shut until it is pressed", isOpen(), false);
check("the header action reads off while it is shut", actionSeen(leftAction()), {
	isOn: false,
	title: "Show the left panel",
});

await pressLeft();
check("the press opens it", isOpen(), true);
check("and the action reads on", actionSeen(leftAction()), { isOn: true, title: "Hide the left panel" });
check("opening a drawer writes nothing into the note", Boolean(fieldIn(nodeAt(board.layout, 0), "folded")), false);
check(
	"the panel grew from the press, not from a corner",
	foundAs(present(drawerOver(), "the drawer"), ".wg-drawer", dom.window.HTMLElement).style.transformOrigin,
	"40px 60px",
);
check(
	"and it is as wide as a share of the screen, not as wide as the region was dragged to",
	foundAs(present(drawerOver(), "the drawer"), ".wg-drawer", dom.window.HTMLElement).style.getPropertyValue(
		"--wg-drawer-width",
	),
	"344px",
);

await pressLeft();
check("pressing the action again shuts it", isOpen(), false);
check("and the action reads off again", leftAction()?.isOn, false);

await pressLeft();
click(drawerOver()?.querySelector(".wg-drawer-scrim"));
await settled();
check("a press on the scrim shuts it", isOpen(), false);
check(
	"and the widgets inside it are still mounted, so their refs live",
	Boolean(drawerOver()?.querySelector(".wg-tree-region.is-left")),
	true,
);

console.log("\n— what the screen decided is not written into the note —");
await pressLeft();
check("the drawer is open", isOpen(), true);
check(
	"and the note still holds the region unfolded, because nothing about the screen was saved",
	Boolean(fieldIn(nodeAt(board.layout, 0), "folded")),
	false,
);

await resizeTo(WIDE_PX);
check("widened back, the region stands in the row again", inColumns("left"), true);
check("and the drawer is gone from the body", Boolean(drawerOver()), false);

await resizeTo(NARROW_PX);
check("narrowed again, the drawer does not open by itself", isOpen(), false);

interface Apart {
	board: ReturnType<typeof normalizeBoard>;
	actions: readonly BoxAction[];
	dispose: () => void;
}

const drawApart = async (given: unknown): Promise<Apart> => {
	const node = dom.window.document.createElement("div");
	found(dom.window.document, ".view-content").appendChild(node);
	const seen: Apart = { board: normalizeBoard(given), actions: [], dispose: () => {} };
	const redraw = (): void =>
		render(
			h(WidgetSurface, {
				boardNode: node,
				board: seen.board,
				registry,
				host,
				editing: false,
				screen: true,
				initialWidth: NARROW_PX,
				onChange: (next: Apart["board"]) => {
					seen.board = next;
					redraw();
				},
				onActions: (list: readonly BoxAction[]) => {
					seen.actions = list;
				},
			}),
			node,
		);
	redraw();
	await settled();
	seen.dispose = () => {
		render(null, node);
		node.remove();
	};
	return seen;
};

console.log("\n— a region that names its trigger is opened by that widget, not by the header —");
const triggered = await drawApart({
	tiles: [
		{ id: "aside", widget: "w" },
		{ id: "t1", widget: "opener" },
	],
	layout: {
		dir: "row",
		of: [
			{
				dir: "column",
				collapse: { into: "drawer", toggle: "always" },
				trigger: "t1/open",
				width: 280,
				of: [{ id: "aside" }],
			},
			{ dir: "column", keep: true, of: [{ id: "t1" }] },
		],
	},
});
const triggerActions = (): number => triggered.actions.filter((one) => one.key === "box:t1/open").length;
check("narrow, the header is offered no action for the triggered region", triggerActions(), 0);
await resizeTo(WIDE_PX);
check("and wide it is offered none either", triggerActions(), 0);
await resizeTo(NARROW_PX);
const triggeredOver = (): Element | undefined =>
	[...dom.window.document.body.querySelectorAll(".wg-drawer-over")].find((over) =>
		over.querySelector('.wg-drawer.is-left [data-cell="aside"]'),
	);
check("narrow, the triggered region still hands itself to a drawer", Boolean(triggeredOver()), true);
click(dom.window.document.querySelector(".probe-opener"));
await settled();
check(
	"the trigger writing its open cell opens the drawer",
	Boolean(triggeredOver()?.className.includes("is-open")),
	true,
);
triggered.dispose();
await settled();

console.log("\n— a region that only collapses is offered to the header only while it is collapsed —");
const adaptive = await drawApart({
	tiles: [
		{ id: "shelf", widget: "w" },
		{ id: "desk", widget: "w" },
	],
	layout: {
		dir: "row",
		of: [
			{ dir: "column", collapse: "drawer", width: 280, of: [{ id: "shelf" }] },
			{ dir: "column", keep: true, of: [{ id: "desk" }] },
		],
	},
});
const adaptiveAction = (): BoxAction | undefined => adaptive.actions.find((one) => one.key === "box:collapse:0/open");
check("narrow, it is offered as off", actionSeen(adaptiveAction()), { isOn: false, title: "Show the left panel" });
await resizeTo(WIDE_PX);
check("wide, where it stands, the header is offered nothing for it", Boolean(adaptiveAction()), false);
await resizeTo(NARROW_PX);
check("narrowed again, the action comes back", Boolean(adaptiveAction()), true);
adaptive.dispose();
await settled();

console.log("\n— a nested box toggled always folds out of its row and back —");
await resizeTo(WIDE_PX);
const nestedFold = await drawApart({
	tiles: [
		{ id: "tools", widget: "w" },
		{ id: "canvas", widget: "w" },
	],
	layout: {
		dir: "row",
		of: [
			{
				dir: "column",
				keep: true,
				of: [
					{
						dir: "row",
						of: [
							{ dir: "column", id: "toolbox", collapse: { into: "drawer", toggle: "always" }, of: [{ id: "tools" }] },
							{ dir: "column", of: [{ id: "canvas" }] },
						],
					},
				],
			},
		],
	},
});
const toolboxAction = (): BoxAction | undefined =>
	nestedFold.actions.find((one) => one.key === "box:collapse:toolbox/open");
const toolsCell = (): Element | null => dom.window.document.querySelector('[data-cell="tools"]');
const toolsFolded = (): boolean => Boolean(toolsCell()?.closest(".wg-tree-fold"));
check("a nested box toggled always is offered to the header as on", toolboxAction()?.isOn, true);
check("and its widget stands in the row", toolsFolded(), false);
await present(toolboxAction(), "the toolbox action").press({ x: 0, y: 0 });
await settled();
check(
	"the press writes the nested box folded",
	Boolean(fieldIn(nodeAt(nestedFold.board.layout, 0, 0, 0), "folded")),
	true,
);
check("its widget leaves the row", toolsFolded(), true);
check("but stays mounted", Boolean(toolsCell()), true);
check("and the action reads off", toolboxAction()?.isOn, false);
await present(toolboxAction(), "the toolbox action").press({ x: 0, y: 0 });
await settled();
check(
	"pressed again, it is written unfolded",
	Boolean(fieldIn(nodeAt(nestedFold.board.layout, 0, 0, 0), "folded")),
	false,
);
check("and its widget stands in the row again", toolsFolded(), false);
nestedFold.dispose();
await resizeTo(NARROW_PX);

console.log("\n— a nested box that cannot stand in its row leaves it for the overlay it names —");
const nested = await drawApart({
	tiles: [
		{ id: "facets", widget: "floored" },
		{ id: "results", widget: "floored" },
	],
	layout: {
		dir: "row",
		of: [
			{
				dir: "column",
				keep: true,
				of: [
					{
						dir: "row",
						of: [
							{ dir: "column", id: "filters", width: 280, collapse: "sheet", of: [{ id: "facets" }] },
							{ dir: "column", of: [{ id: "results" }] },
						],
					},
				],
			},
		],
	},
});
const sheetOver = (): Element | undefined =>
	[...dom.window.document.body.querySelectorAll(".wg-drawer-over")].find((over) =>
		over.querySelector(".wg-drawer.is-sheet"),
	);
check("the collapsed box is drawn as a sheet on the body", Boolean(sheetOver()), true);
check("and it carries the box that left the row", Boolean(sheetOver()?.querySelector('[data-cell="facets"]')), true);
const sheetAction = nested.actions.find((one) => one.icon === "panel-bottom");
check("the header is offered an action that shows it", sheetAction?.title, "Show the bottom panel");
check("shut until it is pressed", Boolean(sheetOver()?.className.includes("is-open")), false);
await sheetAction?.press({ x: 10, y: 10 });
await settled();
check("pressing that action opens the sheet", Boolean(sheetOver()?.className.includes("is-open")), true);
nested.dispose();

console.log(
	failed
		? `\n${failed} the drawer got wrong`
		: "\nthe drawer covers the app, and only when the row cannot hold the region",
);
process.exit(failed ? 1 : 0);
