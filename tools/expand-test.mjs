// Two rules the eye caught and no suite did: an expanded board survives the block element
// being rebuilt under it, and a widget with no surface rounds nothing.
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
	"MouseEvent",
	"MutationObserver",
	"NodeFilter",
]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}
globalThis.ResizeObserver = class {
	observe() {}
	disconnect() {}
};
globalThis.window.ResizeObserver = globalThis.ResizeObserver;
Object.defineProperty(dom.window.HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 1280 });

buildMirror();
const { createElement: h } = await import("react");
const { render } = await import("./.mjs-cache/engine/render.mjs");
const { WidgetRoot } = await import("./.mjs-cache/widget-root.mjs");
const { drawWidget } = await import("./.mjs-cache/widget-api.mjs");
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
	console.log(
		`${ok ? "OK " : "!! "} ${label}${ok ? ` — ${JSON.stringify(got)}` : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`}`,
	);
};

const probe = dom.window.document.createElement("div");
render(h(WidgetRoot, { className: "legacy", defaultBackgroundType: "fill", defaultRounded: "full" }, "x"), probe);
check(
	"an installed widget that still wraps itself in WidgetRoot gets a bare element, no plate and no corner",
	[
		probe.firstChild.className,
		probe.firstChild.getAttribute("data-fill"),
		probe.firstChild.getAttribute("data-rounded"),
	],
	["legacy", null, null],
);

const { useWidgetRounded, useBackgroundType, AppearanceOverride, ROUNDED, BACKGROUND } =
	await import("./.mjs-cache/widget-root.mjs");
function OldWidget() {
	return h(
		AppearanceOverride,
		null,
		h("i", { "data-read": `${useWidgetRounded()} ${useBackgroundType()} ${ROUNDED.length} ${BACKGROUND.length}` }),
	);
}
render(h(OldWidget, null), probe);
check(
	"a widget still calling the old appearance hooks draws instead of crashing",
	probe.querySelector("i")?.getAttribute("data-read"),
	"base none 3 1",
);

const drawnInto = dom.window.document.createElement("div");
drawWidget(drawnInto, () => h("section", { className: "own-root" }, "x"), {});
await settle();
check(
	"the engine draws the widget root around what the widget returns",
	Boolean(drawnInto.querySelector(".wg-widget-root .own-root")),
	true,
);

// 2. expansion survives the element being rebuilt beneath it
const registry = new WidgetRegistry({
	vault: {
		adapter: {
			exists: async () => false,
			list: async () => ({ folders: [], files: [] }),
			read: async () => "",
			stat: async () => ({ mtime: 1, size: 1 }),
		},
	},
});
await registry.load();

let board = normalizeBoard({ tiles: [], layouts: {} });
const host = {
	platform: "test",
	can: {},
	slot: () => ({
		binding: {},
		canCreate: false,
		canUpdate: false,
		canRemove: false,
		canSubscribe: false,
		list: async () => ({ rows: [], total: 0 }),
		describe: async () => [],
		subscribe: () => () => {},
	}),
	ui: { notify() {} },
};

// expansion is written in the board, exactly as main.js persists it
const mount = { element: dom.window.document.getElementById("host") };
const isExpanded = () => board.mode === "expanded";
const draw = () =>
	render(
		h(WidgetSurface, {
			boardNode: mount.element,
			board: board,
			registry,
			host,
			editing: false,
			screen: false,
			initialWidth: 1280,
			onChange: (next) => {
				board = next;
				draw();
			},
			onToggleEditing: () => {},
			onWidth: () => {},
		}),
		mount.element,
	);

board = { ...board, mode: "expanded" };
draw();
await settle();
check(
	"the board carries no control of its own to expand or collapse it",
	dom.window.document.querySelectorAll(".wg-region-toggle, .wg-region-bar").length,
	0,
);
check("a board written expanded mounts its page", dom.window.document.querySelectorAll(".wg-page").length, 1);
check(
	"the page stands in the pane the board stands in, never over the whole app",
	dom.window.document.querySelector(".wg-page").parentElement.className,
	"view-content",
);
check(
	"and nothing of ours hangs off the body",
	[...dom.window.document.body.children].map((node) => node.className),
	["view-content"],
);

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

const pagesBefore = dom.window.document.querySelectorAll(".wg-page").length;
const standingInNoPane = dom.window.document.createElement("div");
render(
	h(WidgetSurface, {
		board: { ...board, mode: "expanded" },
		boardNode: standingInNoPane,
		registry,
		host,
		editing: false,
		screen: false,
		initialWidth: 1280,
		onChange: () => {},
		onToggleEditing: () => {},
		onWidth: () => {},
	}),
	standingInNoPane,
);
await settle();
check(
	"a board drawn before it stands in a pane opens no page over the app",
	dom.window.document.querySelectorAll(".wg-page").length,
	pagesBefore,
);
check("and draws in the block instead", standingInNoPane.querySelectorAll(".wg-board").length, 1);
render(null, standingInNoPane);

// 3. the expanded page carries its own shield, since it lives outside the code block
board = { ...board, mode: "expanded" };
draw();
await settle();
const page = dom.window.document.querySelector(".wg-page");
check("the expanded page is shielded from the editor", page?.getAttribute("contenteditable"), "false");

console.log(failed ? `\n${failed} failed` : "\nexpansion holds and appearance is the author's call");
process.exit(failed ? 1 : 0);
