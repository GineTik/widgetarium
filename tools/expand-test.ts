import { JSDOM } from "jsdom";
import type { SurfaceHost } from "../packages/core/src/surface/use-surface-shared.js";
import type { VaultSlot } from "../packages/core/src/gateway/obsidian.js";
import { refusingConsole } from "../packages/core/src/engine/host-console.js";
import { byId, found } from "./dom-find.ts";

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
	MouseEvent: dom.window.MouseEvent,
	MutationObserver: dom.window.MutationObserver,
	NodeFilter: dom.window.NodeFilter,
});
class InertResizeObserver {
	observe(): void {}
	disconnect(): void {}
}
Object.assign(globalThis, { ResizeObserver: InertResizeObserver });
Object.assign(dom.window, { ResizeObserver: InertResizeObserver });
Object.defineProperty(dom.window.HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 1280 });

const { createElement: h } = await import("react");
const { render } = await import("../packages/core/src/engine/render.js");
const { WidgetRoot } = await import("../packages/core/src/widget-root.js");
const { drawWidget } = await import("../packages/core/src/widget-api.js");
const { WidgetSurface } = await import("../packages/core/src/surface.js");
const { WidgetRegistry } = await import("../packages/core/src/registry.js");
const { normalizeBoard } = await import("../packages/core/src/model.js");

const settle = async (times = 20): Promise<void> => {
	for (let i = 0; i < times; i += 1) await new Promise((resolve) => setTimeout(resolve, 1));
};

let failed = 0;
const check = (label: string, got: unknown, want: unknown): void => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK " : "!! "} ${label}${ok ? ` — ${JSON.stringify(got)}` : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`}`,
	);
};

const probe = dom.window.document.createElement("div");
render(h(WidgetRoot, { className: "legacy", defaultBackgroundType: "fill", defaultRounded: "full" }, "x"), probe);
const legacy = probe.firstElementChild;
check(
	"an installed widget that still wraps itself in WidgetRoot gets a bare element, no plate and no corner",
	[legacy?.className, legacy?.getAttribute("data-fill"), legacy?.getAttribute("data-rounded")],
	["legacy", null, null],
);

const { useWidgetRounded, useBackgroundType, AppearanceOverride, ROUNDED, BACKGROUND } =
	await import("../packages/core/src/widget-root.js");
function OldWidget(): ReturnType<typeof h> {
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

const registry = new WidgetRegistry({
	vault: {
		adapter: {
			exists: async () => false,
			list: async () => ({ folders: [], files: [] }),
			read: async () => "",
		},
	},
});
await registry.load();

let board = normalizeBoard({ tiles: [], layouts: {} });
const emptySlot: VaultSlot = {
	canCreate: false,
	canUpdate: false,
	canRemove: false,
	canSubscribe: false,
	list: async () => ({ rows: [], total: 0 }),
	get: async () => null,
	describe: async () => [],
	create: async () => null,
	update: async () => null,
	remove: async () => null,
	subscribe: () => () => {},
};
const host: SurfaceHost = {
	platform: "test",
	type: "test",
	console: refusingConsole("the expand test has no console"),
	can: { catalogue: false, fullscreen: false, subscribe: false, network: false, renderMarkdown: false },
	slot: () => emptySlot,
	ui: { notify() {}, renderMarkdown: () => () => {} },
};

const mount = { element: byId(dom.window.document, "host") };
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
	found(dom.window.document, ".wg-page").parentElement?.className,
	"view-content",
);
check(
	"and nothing of ours hangs off the body",
	[...dom.window.document.body.children].map((node) => node.className),
	["view-content"],
);

render(null, mount.element);
mount.element.remove();
const rebuilt = dom.window.document.createElement("div");
found(dom.window.document, ".view-content").appendChild(rebuilt);
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

board = { ...board, mode: "expanded" };
draw();
await settle();
const page = dom.window.document.querySelector(".wg-page");
check("the expanded page is shielded from the editor", page?.getAttribute("contenteditable"), "false");

console.log(failed ? `\n${failed} failed` : "\nexpansion holds and appearance is the author's call");
process.exit(failed ? 1 : 0);
