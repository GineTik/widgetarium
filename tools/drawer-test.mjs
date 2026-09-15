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

buildMirror();
const { createElement: h } = await import("react");
const { render } = await import("./.mjs-cache/engine/render.mjs");
const { WidgetSurface } = await import("./.mjs-cache/surface.mjs");
const { normalizeBoard } = await import("./.mjs-cache/model.mjs");

const registry = {
	get: () => ({ manifest: { id: "w", minSize: { w: 2, h: 2 }, maxSize: { w: 14, h: 10 } }, component: () => null }),
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
			onToggleEditing() {},
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
const leftToggle = () => target.querySelector(".wg-region-toggle.is-left");
const click = (node) =>
	node.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, clientX: 40, clientY: 60 }));

draw();
await settled();

console.log("— a board with room stands its sidebar in the row —");
check("the left region stands beside the main one", inColumns("left"), true);
check("and no drawer was mounted over the app", Boolean(drawerOver()), false);
check(
	"standing, each side carries a handle to drag its width by",
	target.querySelectorAll(".wg-tree-handle.is-edge").length,
	2,
);

console.log("\n— a board too narrow for it hands the region to a drawer over the whole app —");
await resizeTo(NARROW_PX);
check("the region left the row", inColumns("left"), false);
check(
	"nothing was drawn as a second row under the main one",
	target.querySelectorAll(".wg-tree-page > .wg-tree-region").length,
	0,
);
check("a drawer stands on the body, outside the note", Boolean(drawerOver()), true);
check("and nothing is left to drag it wider by — the width is the screen's business", target.querySelectorAll(".wg-tree-handle.is-edge").length, 0);
check(
	"and it is the region itself inside it, still mounted",
	Boolean(drawerOver().querySelector(".wg-tree-region.is-left")),
	true,
);
check("shut until it is pressed", isOpen(), false);

click(leftToggle());
await settled();
check("the press opens it", isOpen(), true);
check("and the toggle says so", leftToggle().getAttribute("aria-pressed"), "true");
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

click(drawerOver().querySelector(".wg-drawer-scrim"));
await settled();
check("a press on the scrim shuts it", isOpen(), false);
check(
	"and the widgets inside it are still mounted, so their refs live",
	Boolean(drawerOver().querySelector(".wg-tree-region.is-left")),
	true,
);

console.log("\n— what the screen decided is not written into the note —");
click(leftToggle());
await settled();
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

console.log(
	failed
		? `\n${failed} the drawer got wrong`
		: "\nthe drawer covers the app, and only when the row cannot hold the region",
);
process.exit(failed ? 1 : 0);
