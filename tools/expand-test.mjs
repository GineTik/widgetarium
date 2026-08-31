// Two rules the eye caught and no suite did: an expanded board survives the block element
// being rebuilt under it, and a widget with no surface rounds nothing.
import { JSDOM } from "jsdom";
import { buildMirror } from "./mirror.mjs";

const dom = new JSDOM(`<!doctype html><body><div class="view-content"><div id="host"></div></div></body>`, { pretendToBeVisual: true });
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "MouseEvent"]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
globalThis.window.ResizeObserver = globalThis.ResizeObserver;
Object.defineProperty(dom.window.HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 1280 });

buildMirror();
const { createElement: h } = await import("react");
const { render } = await import("./.mjs-cache/engine/render.mjs");
const { WidgetRoot, useWidgetRounded, useBackgroundType } = await import("./.mjs-cache/widget-root.mjs");
const { WidgetSurface } = await import("./.mjs-cache/surface.mjs");
const { WidgetRegistry } = await import("./.mjs-cache/registry.mjs");
const { normalizeBoard } = await import("./.mjs-cache/model.mjs");

const settle = async (times = 20) => {
	for (let i = 0; i < times; i += 1) await new Promise((resolve) => setTimeout(resolve, 1));
};

let failed = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${label}${ok ? ` — ${JSON.stringify(got)}` : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`}`);
};

// 1. rounding is the author's call, not a consequence of the background
const probe = dom.window.document.createElement("div");
render(h(WidgetRoot, { defaultBackgroundType: "none", defaultRounded: "base" }, "x"), probe);
check("a surface-less widget keeps the rounding it asked for", probe.firstChild.getAttribute("data-rounded"), "base");
render(h(WidgetRoot, { defaultBackgroundType: "none", defaultRounded: "none" }, "x"), probe);
check("and drops it only when it says so", probe.firstChild.getAttribute("data-rounded"), "none");
render(h(WidgetRoot, { defaultBackgroundType: "fill", defaultRounded: "none" }, "x"), probe);
check("square corners are allowed WITH a surface too", [probe.firstChild.getAttribute("data-rounded"), probe.firstChild.getAttribute("data-fill")], ["none", "fill"]);
render(h(WidgetRoot, {}, "x"), probe);
check("the defaults are base and fill", [probe.firstChild.getAttribute("data-rounded"), probe.firstChild.getAttribute("data-fill")], ["base", "fill"]);

// a widget reads what it ACTUALLY got, which is how it adapts its own padding
function Reader() {
	return h("i", { "data-rounded": useWidgetRounded(), "data-background": useBackgroundType() });
}
render(h(WidgetRoot, { defaultRounded: "none", defaultBackgroundType: "shadow" }, h(Reader, null)), probe);
const reader = probe.querySelector("i");
check("the hooks report the effective appearance", [reader.getAttribute("data-rounded"), reader.getAttribute("data-background")], ["none", "shadow"]);

// REGRESSION: a widget nested in another one — a card in the board's slot — used to inherit
// the OUTER widget's appearance. The kanban is drawn with no surface, so every card inside it
// came out transparent and square: the white cards went grey and the corners went flat.
render(
	h(
		WidgetRoot,
		{ className: "outer", defaultBackgroundType: "none", defaultRounded: "none" },
		h(WidgetRoot, { className: "inner", defaultBackgroundType: "fill", defaultRounded: "base" }, "x"),
	),
	probe,
);
const inner = probe.querySelector(".inner");
check("a nested widget keeps its OWN surface", inner.getAttribute("data-fill"), "fill");
check("and its own rounding", inner.getAttribute("data-rounded"), "base");
check("while the outer one keeps its", probe.querySelector(".outer").getAttribute("data-fill"), "none");

// and the hooks inside the nested widget report the nested widget's answer, not the outer's
function Deep() {
	return h("i", { "data-background": useBackgroundType(), "data-rounded": useWidgetRounded() });
}
render(
	h(
		WidgetRoot,
		{ className: "outer", defaultBackgroundType: "none", defaultRounded: "none" },
		h(WidgetRoot, { className: "inner", defaultBackgroundType: "shadow", defaultRounded: "full" }, h(Deep, null)),
	),
	probe,
);
const deep = probe.querySelector("i");
check("inside a card, the card's answer is the true one", [deep.getAttribute("data-background"), deep.getAttribute("data-rounded")], ["shadow", "full"]);

// 2. expansion survives the element being rebuilt beneath it
const registry = new WidgetRegistry({ vault: { adapter: { exists: async () => false, list: async () => ({ folders: [], files: [] }), read: async () => "", stat: async () => ({ mtime: 1, size: 1 }) } } });
await registry.load();

let board = normalizeBoard({ tiles: [], layouts: {} });
const host = { platform: "test", can: {}, slot: () => ({ binding: {}, canCreate: false, canUpdate: false, canRemove: false, canSubscribe: false, list: async () => ({ rows: [], total: 0 }), describe: async () => [], subscribe: () => () => {} }), ui: { notify() {} } };

// expansion is written in the board, exactly as main.js persists it
const mount = { element: dom.window.document.getElementById("host") };
const isExpanded = () => board.mode === "expanded";
const draw = () =>
	render(
		h(WidgetSurface, {
			board: board, registry, host, editing: false, screen: false, initialWidth: 1280,
			onChange: (next) => { board = next; draw(); },
			onToggleEditing: () => {}, onWidth: () => {},
		}),
		mount.element,
	);

draw();
await settle();
const expandButton = [...dom.window.document.querySelectorAll(".wg-tool")].find((node) => node.textContent === "Expand");
check("there is an expand control", Boolean(expandButton), true);
expandButton.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
await settle();
check("pressing it expands", isExpanded(), true);
check("and the page is mounted", dom.window.document.querySelectorAll(".wg-page").length, 1);

// REGRESSION: CodeMirror rebuilds the block element, preact remounts, and expansion used to
// be a hook — so it reset to false and the board collapsed on any click in the note.
render(null, mount.element);
mount.element.remove();
const rebuilt = dom.window.document.createElement("div");
dom.window.document.querySelector(".view-content").appendChild(rebuilt);
mount.element = rebuilt;
draw();
await settle();
check("a rebuilt block element stays expanded", isExpanded(), true);
check("and the page is still there", dom.window.document.querySelectorAll(".wg-page").length, 1);

const collapse = [...dom.window.document.querySelectorAll(".wg-tool")].find((node) => node.textContent === "Collapse");
check("the control now offers collapse", Boolean(collapse), true);
collapse.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
await settle();
check("and pressing it collapses", isExpanded(), false);

// 3. the expanded page carries its own shield, since it lives outside the code block
board = { ...board, mode: "expanded" };
draw();
await settle();
const page = dom.window.document.querySelector(".wg-page");
check("the expanded page is shielded from the editor", page?.getAttribute("contenteditable"), "false");

console.log(failed ? `\n${failed} failed` : "\nexpansion holds and appearance is the author's call");
process.exit(failed ? 1 : 0);
