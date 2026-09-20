import { JSDOM } from "jsdom";
import { buildMirror } from "./mirror.mjs";

const dom = new JSDOM(`<!doctype html><body><div class="view-content"><div id="host"></div></div></body>`, {
	pretendToBeVisual: true,
});
for (const key of [
	"window",
	"document",
	"Node",
	"Element",
	"HTMLElement",
	"SVGElement",
	"getComputedStyle",
	"requestAnimationFrame",
	"cancelAnimationFrame",
	"MutationObserver",
	"NodeFilter",
	"Node",
]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}

const watchers = new Set();
globalThis.ResizeObserver = class {
	constructor(answer) {
		this.answer = answer;
		watchers.add(this);
	}
	observe() {}
	disconnect() {
		watchers.delete(this);
	}
};
globalThis.window.ResizeObserver = globalThis.ResizeObserver;
globalThis.CSS = { escape: (value) => String(value).replace(/["\\]/g, "\\$&") };

buildMirror();
const { createElement: h } = await import("react");
const { render } = await import("./.mjs-cache/engine/render.mjs");
const { WidgetSurface } = await import("./.mjs-cache/surface.mjs");
const { normalizeBoard } = await import("./.mjs-cache/model.mjs");

const plainWidget = {
	manifest: { id: "w", minSize: { w: 2, h: 2 }, maxSize: { w: 14, h: 10 } },
	component: () => null,
};
const openerWidget = {
	manifest: { id: "opener", props: { open: { kind: "value", type: "boolean", default: { from: "memory" } } } },
	component: ({ open }) => h("button", { className: "probe-opener", onClick: () => open.update(true) }),
};
const flooredWidget = { manifest: { id: "floored", stackBelowPx: 200 }, component: () => null };
const widgets = { w: plainWidget, opener: openerWidget, floored: flooredWidget };
const registry = {
	get: (id) => widgets[id] ?? plainWidget,
	list: () => [],
};
const host = { ui: { notify() {}, openNote() {} }, vault: { adapter: {} }, can: { fullscreen: false } };

const rowsOf = (id) => [[{ id, ratio: 1 }]];
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
dom.window.Element.prototype.getBoundingClientRect = () => ({
	left: 0,
	top: 0,
	right: 300,
	bottom: 800,
	width: 300,
	height: 800,
	x: 0,
	y: 0,
});

let failed = 0;
const check = (name, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
};
const settled = (ms = 40) => new Promise((resolve) => setTimeout(resolve, ms));
const target = dom.window.document.getElementById("host");

let actions = [];
const draw = () =>
	render(
		h(WidgetSurface, {
			boardNode: target,
			board,
			registry,
			host,
			editing: false,
			screen: true,
			initialWidth: WIDE_PX,
			onChange: (next) => {
				board = next;
				draw();
			},
			onActions: (list) => {
				actions = list;
			},
		}),
		target,
	);

const resizeTo = async (width) => {
	boardWidth = width;
	viewportWidth = width + 60;
	for (const watcher of watchers) watcher.answer([{ contentRect: { width } }]);
	await settled(620);
};

const drawerOver = () => dom.window.document.body.querySelector(".wg-drawer-over");
const isOpen = () => Boolean(drawerOver()?.className.includes("is-open"));
const inColumns = (name) => Boolean(target.querySelector(`.wg-tree-columns .wg-tree-region.is-${name}`));
const LEFT_KEY = "box:collapse:0/open";
const leftAction = () => actions.find((one) => one.key === LEFT_KEY);
const pressLeft = async () => {
	await leftAction().press({ x: 40, y: 60 });
	await settled();
};
const actionSeen = (action) => (action ? { isOn: action.isOn, title: action.title } : null);
const click = (node) =>
	node.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, clientX: 40, clientY: 60 }));

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
check("the press writes the region folded", Boolean(board.layout.of[0].folded), true);
check("and takes it out of the row", inColumns("left"), false);
check("the action keeps its key and now reads off", actionSeen(leftAction()), {
	isOn: false,
	title: "Show the left panel",
});
await pressLeft();
check("pressed again, the region is written unfolded", Boolean(board.layout.of[0].folded), false);
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
	Boolean(drawerOver().querySelector(".wg-tree-region.is-left")),
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
check("opening a drawer writes nothing into the note", Boolean(board.layout.of[0].folded), false);
check(
	"the panel grew from the press, not from a corner",
	drawerOver().querySelector(".wg-drawer").style.transformOrigin,
	"40px 60px",
);
check(
	"and it is as wide as a share of the screen, not as wide as the region was dragged to",
	drawerOver().querySelector(".wg-drawer").style.getPropertyValue("--wg-drawer-width"),
	"344px",
);

await pressLeft();
check("pressing the action again shuts it", isOpen(), false);
check("and the action reads off again", leftAction()?.isOn, false);

await pressLeft();
click(drawerOver().querySelector(".wg-drawer-scrim"));
await settled();
check("a press on the scrim shuts it", isOpen(), false);
check(
	"and the widgets inside it are still mounted, so their refs live",
	Boolean(drawerOver().querySelector(".wg-tree-region.is-left")),
	true,
);

console.log("\n— what the screen decided is not written into the note —");
await pressLeft();
check("the drawer is open", isOpen(), true);
check(
	"and the note still holds the region unfolded, because nothing about the screen was saved",
	Boolean(board.layout.of[0].folded),
	false,
);

await resizeTo(WIDE_PX);
check("widened back, the region stands in the row again", inColumns("left"), true);
check("and the drawer is gone from the body", Boolean(drawerOver()), false);

await resizeTo(NARROW_PX);
check("narrowed again, the drawer does not open by itself", isOpen(), false);

const drawApart = async (given) => {
	const node = dom.window.document.createElement("div");
	dom.window.document.querySelector(".view-content").appendChild(node);
	const seen = { board: normalizeBoard(given), actions: [] };
	const redraw = () =>
		render(
			h(WidgetSurface, {
				boardNode: node,
				board: seen.board,
				registry,
				host,
				editing: false,
				screen: true,
				initialWidth: NARROW_PX,
				onChange: (next) => {
					seen.board = next;
					redraw();
				},
				onActions: (list) => {
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
const triggerActions = () => triggered.actions.filter((one) => one.key === "box:t1/open").length;
check("narrow, the header is offered no action for the triggered region", triggerActions(), 0);
await resizeTo(WIDE_PX);
check("and wide it is offered none either", triggerActions(), 0);
await resizeTo(NARROW_PX);
const triggeredOver = () =>
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
const adaptiveAction = () => adaptive.actions.find((one) => one.key === "box:collapse:0/open");
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
const toolboxAction = () => nestedFold.actions.find((one) => one.key === "box:collapse:toolbox/open");
const toolsCell = () => dom.window.document.querySelector('[data-cell="tools"]');
const toolsFolded = () => Boolean(toolsCell()?.closest(".wg-tree-fold"));
check("a nested box toggled always is offered to the header as on", toolboxAction()?.isOn, true);
check("and its widget stands in the row", toolsFolded(), false);
await toolboxAction().press({ x: 0, y: 0 });
await settled();
check("the press writes the nested box folded", Boolean(nestedFold.board.layout.of[0].of[0].of[0].folded), true);
check("its widget leaves the row", toolsFolded(), true);
check("but stays mounted", Boolean(toolsCell()), true);
check("and the action reads off", toolboxAction()?.isOn, false);
await toolboxAction().press({ x: 0, y: 0 });
await settled();
check("pressed again, it is written unfolded", Boolean(nestedFold.board.layout.of[0].of[0].of[0].folded), false);
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
const sheetOver = () =>
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
