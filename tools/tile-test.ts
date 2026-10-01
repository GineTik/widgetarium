import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import type { App } from "obsidian";
import type { ReactElement } from "react";
import { standIn } from "./stand-in.ts";
import { byId } from "./dom-find.ts";
import { isObject } from "../packages/core/src/engine/is-object.js";
import type { HostPlugin } from "../apps/obsidian/src/host.js";
import type { Board } from "../packages/core/src/model.js";
import type { GivenProps } from "../packages/core/src/declared-widget.js";
import type { ValueGateway } from "../packages/core/src/gateway/contract.js";
import type { EveryValueVerb } from "../packages/core/src/gateway/needs.js";

const VAULT = "tools/fixture-records";
const COUNTER = "@probe/counter";
const CRASHER = "@probe/crasher";

const dom = new JSDOM(`<!doctype html><body><div class="view-content"><div id="host"></div></div></body>`, {
	pretendToBeVisual: true,
});
class SilentResizeObserver {
	observe(): void {}
	disconnect(): void {}
}
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
	KeyboardEvent: dom.window.KeyboardEvent,
	MouseEvent: dom.window.MouseEvent,
	Event: dom.window.Event,
	MutationObserver: dom.window.MutationObserver,
	ResizeObserver: SilentResizeObserver,
});
Object.assign(dom.window, { ResizeObserver: SilentResizeObserver });
Object.defineProperty(dom.window.HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 1280 });

const { createElement: h, useEffect, useState } = await import("react");
const { render } = await import("../packages/core/src/engine/render.js");
const { movesFrom, positionsWithin } = await import("../packages/core/src/flip.js");
const { WidgetSurface } = await import("../packages/core/src/surface.js");
const { WidgetRegistry } = await import("../packages/core/src/registry.js");
const { normalizeBoard } = await import("../packages/core/src/model.js");
const { createHost } = await import("../apps/obsidian/src/host.js");
const { TFile } = await import("obsidian");
const { useData } = await import("../packages/core/src/gateway/use-data.ts");

const isValueGateway = (value: unknown): value is ValueGateway<unknown, EveryValueVerb> =>
	isObject(value) && value["kind"] === "value" && typeof value["get"] === "function";

const adapter = {
	exists: async (target: string): Promise<boolean> => fs.existsSync(path.join(VAULT, target)),
	list: async (target: string) => {
		const names = fs.readdirSync(path.join(VAULT, target));
		const kind = (name: string): fs.Stats | null => {
			try {
				return fs.statSync(path.join(VAULT, target, name));
			} catch {
				return null;
			}
		};
		return {
			folders: names.filter((name) => kind(name)?.isDirectory()).map((name) => `${target}/${name}`),
			files: names.filter((name) => kind(name)?.isFile()).map((name) => `${target}/${name}`),
		};
	},
	read: async (target: string): Promise<string> => fs.readFileSync(path.join(VAULT, target), "utf8"),
	stat: async () => ({ mtime: 1, size: 1 }),
};

const app = {
	vault: {
		getAbstractFileByPath: () => null,
		create: async () =>
			Object.assign(new TFile(), { path: "made.md", basename: "made", extension: "md", stat: { ctime: 1, mtime: 1 } }),
		createFolder: async () => {},
		cachedRead: async () => "",
		read: async () => "",
		process: async () => "",
		on: () => ({}),
		off: () => {},
	},
	metadataCache: { getFileCache: () => ({ frontmatter: {} }), on: () => ({}), off: () => {} },
	fileManager: { processFrontMatter: async () => {} },
	workspace: { getLeaf: () => ({ openFile: async () => {} }) },
};

const host = createHost(
	standIn<App>(app, ["vault", "metadataCache", "fileManager", "workspace"], "app"),
	standIn<HostPlugin>(
		{ registerEvent: () => {}, addChild: () => {}, removeChild: () => {} },
		["addChild", "removeChild"],
		"plugin",
	),
);
const registry = new WidgetRegistry({ vault: { adapter } });
await registry.load();

const lives = { released: 0 };

function Counter(): ReactElement {
	const [count, setCount] = useState(0);
	useEffect(() => {
		return () => {
			lives.released += 1;
		};
	}, []);
	return h("div", { className: "probe-counter" }, [
		h("b", { key: "count" }, String(count)),
		h("button", { key: "bump", onClick: () => setCount((held) => held + 1) }, "Bump"),
	]);
}

function Crasher(): ReactElement {
	throw new Error("the tile fell over");
}

const OPENER = "@probe/opener";
const OPENER_MANIFEST = {
	id: OPENER,
	api: 1,
	title: "Opener",
	props: {
		items: { kind: "collection", verbs: { list: "required" } },
		opened: {
			kind: "value",
			source: { implementation: "@core/selection", fields: { rows: "items" } },
			verbs: { get: "required", update: "required" },
		},
	},
};

function Opener(given: GivenProps): ReactElement {
	const opened = given["opened"];
	if (!isValueGateway(opened)) throw new Error("the opener was handed no value gateway");
	const openedRef = useData(opened.get).data;
	return h("div", { className: "probe-opener" }, [
		h("span", { className: "probe-opened", key: "val" }, String(openedRef ?? "none")),
		h("button", { key: "open", onClick: () => opened.update("a") }, "Open"),
	]);
}

registry.widgets.set(COUNTER, { manifest: { id: COUNTER, api: 1, title: "Counter" }, component: Counter });
registry.widgets.set(CRASHER, { manifest: { id: CRASHER, api: 1, title: "Crasher" }, component: Crasher });
registry.widgets.set(OPENER, { manifest: OPENER_MANIFEST, component: Opener });

const TILES = [
	{ id: "good", widget: COUNTER },
	{ id: "boom", widget: CRASHER },
];
const TREE = {
	tiles: TILES,
	layout: { left: [], main: [[{ id: "good", height: 200 }], [{ id: "boom", height: 200 }]], right: [] },
};
const TREE_WITHOUT_THE_COUNTER = {
	tiles: [{ id: "boom", widget: CRASHER }],
	layout: { left: [], main: [[{ id: "boom", height: 200 }]], right: [] },
};

let board = normalizeBoard(TREE);
let editing = false;
const root = byId(dom.window.document, "host");
const draw = (): void => {
	const surfaceProps = {
		boardNode: root,
		board,
		registry,
		host,
		editing,
		screen: true,
		initialWidth: 1280,
		onChange: (next: Board) => {
			board = next;
			draw();
		},
		onToggleEditing: () => {},
		onWidth: () => {},
	};
	render(h(WidgetSurface, surfaceProps), root);
};

const settle = async (times = 40): Promise<void> => {
	for (let index = 0; index < times; index += 1) await new Promise((resolve) => setTimeout(resolve, 1));
};

const start = async (shape: unknown, isEditing = false): Promise<void> => {
	board = normalizeBoard(shape);
	editing = isEditing;
	render(null, root);
	await settle();
	draw();
	await settle();
};

let failed = 0;
const check = (label: string, got: unknown, want: unknown): void => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK " : "!! "} ${label}${ok ? ` — ${JSON.stringify(got)}` : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`}`,
	);
};

const surface = (): Element => dom.window.document.querySelector(".wg-page") ?? root;
const all = (selector: string): Element[] => [...surface().querySelectorAll(selector)];
const everywhere = (selector: string): Element[] => [...dom.window.document.querySelectorAll(selector)];
const click = async (node: Element | undefined, times = 40): Promise<void> => {
	if (!node) throw new Error("nothing to press");
	node.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
	await settle(times);
};
const countIn = (within: string): string | null => everywhere(`${within} .probe-counter b`)[0]?.textContent ?? "gone";
const bumpIn = (within: string): Element | undefined => everywhere(`${within} .probe-counter button`)[0];
const shellIn = (within: string): Element | null => everywhere(`${within} .wg-drawn > .wg-drawn`)[0] ?? null;

const said: string[] = [];
console.error = (...parts: unknown[]): void => {
	said.push(parts.map((part) => String(part)).join(" "));
};

console.log("— a tile that throws is contained where it stands —");

await start(TREE);
check("the crash is named in the cell the tile stood in", all('[data-cell="boom"] .wg-error').length, 1);
check("and the tile beside it is drawn", countIn('[data-cell="good"]'), "0");
check("with the board still holding both cells", all(".wg-tree-cell").length, 2);

console.log("\n— a board redraw is a redraw, not a remount —");

await start(TREE);
await click(bumpIn('[data-cell="good"]'));
check("the tile counts a press of its own", countIn('[data-cell="good"]'), "1");
{
	const held = shellIn('[data-cell="good"]');
	board = normalizeBoard(JSON.parse(JSON.stringify(board)));
	draw();
	await settle();
	check("an ordinary board redraw keeps the tile's state", countIn('[data-cell="good"]'), "1");
	check(
		"because it was drawn into the element it already had",
		Boolean(held) && shellIn('[data-cell="good"]') === held,
		true,
	);
	check(
		"and drew it there once, not beside the copy it had",
		everywhere('[data-cell="good"] .probe-counter').length,
		1,
	);
}

console.log("\n— the settings window borrows the widget, it does not make a second one —");

await start(TREE, true);
await click(bumpIn('[data-cell="good"]'));
check("the tile counts a press on the board", countIn('[data-cell="good"]'), "1");
{
	const held = shellIn('[data-cell="good"]');
	const gear = (): Element | undefined =>
		everywhere('[data-cell="good"] .wg-tile-actions button[aria-label="Settings"]')[0];
	check("an editing tile offers its settings", Boolean(gear()), true);
	await click(gear());
	check("the window draws the widget on its own canvas", everywhere(".wg-set-body .probe-counter").length, 1);
	check("carrying the count it had on the board", countIn(".wg-set-body"), "1");
	check("it is the very element the tile was drawing", shellIn(".wg-set-body") === held, true);
	check(
		"and the tile body it came from stands empty",
		everywhere('[data-cell="good"] .wg-tile-body .probe-counter').length,
		0,
	);

	const done = everywhere(".wg-set-head button").find((node) => node.textContent?.trim() === "Done");
	check("the window offers to be closed", Boolean(done), true);
	await click(done, 300);
	check("closing hands the same widget back to the tile", countIn('[data-cell="good"]'), "1");
	check("as the same element again", shellIn('[data-cell="good"]') === held, true);
	check("and the canvas is gone with the window", everywhere(".wg-set-body").length, 0);
}

console.log("\n— a tile that leaves the board takes its root with it —");

await start(TREE);
{
	const before = lives.released;
	board = normalizeBoard(TREE_WITHOUT_THE_COUNTER);
	draw();
	await settle();
	check("removing a tile releases the root it was drawn in", lives.released - before, 1);
	check("while the tile that stayed is still drawn", all(".wg-tree-cell").length, 1);
}

console.log("\n— a tile's own box is heard on a board that remounted before the old one left —");

{
	const openerBoard = (): Board =>
		normalizeBoard({
			tiles: [{ id: "opener", widget: OPENER, props: { items: { value: [{ id: "a" }] } } }],
			layout: { left: [], main: [[{ id: "opener", height: 200 }]], right: [] },
		});
	const openedText = (): string | null | undefined => everywhere(".probe-opened")[0]?.textContent;
	const openButton = (): Element | undefined => everywhere(".probe-opener button")[0];

	board = openerBoard();
	editing = false;
	render(null, root);
	await settle();
	draw();
	await settle();

	await click(openButton());
	check("the box opens on the first board", openedText(), "a");

	render(null, root);
	board = openerBoard();
	draw();
	await settle();

	check("the remounted board starts closed", openedText(), "none");
	await click(openButton());
	check("and a press on the remounted board's own box is heard", openedText(), "a");
}

console.log("\n— a cell the widget has not landed in yet is not a resting place —");

{
	const region = dom.window.document.createElement("div");
	Object.assign(region, { getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 400 }) });
	const boxes: Record<string, { readonly top: number; readonly height: number }> = {
		first: { top: 0, height: 0 },
		below: { top: 0, height: 0 },
	};
	for (const id of Object.keys(boxes)) {
		const node = dom.window.document.createElement("div");
		node.className = "wg-tree-cell";
		node.dataset["cell"] = id;
		Object.assign(node, {
			getBoundingClientRect: () => ({ left: 0, top: boxes[id]?.top, height: boxes[id]?.height }),
		});
		region.appendChild(node);
	}
	const keyOf = (node: HTMLElement): string => String(node.dataset["cell"]);
	const beforeTheyLand = positionsWithin(region, ".wg-tree-cell", keyOf);
	check("a region drawn before its widgets records no places", Object.keys(beforeTheyLand), []);
	boxes["first"] = { top: 0, height: 200 };
	boxes["below"] = { top: 200, height: 120 };
	const afterTheyLand = positionsWithin(region, ".wg-tree-cell", keyOf);
	check("so the widgets landing in it slide nothing", Object.keys(movesFrom(beforeTheyLand, afterTheyLand)), []);
}

const FAILED = "@probe/failed";
registry.widgets.set(FAILED, {
	manifest: { id: FAILED, title: "Failed" },
	error: new Error('this widget calls "defineProp" from "widgetarium"'),
});
await start({
	tiles: [{ id: "old", widget: FAILED }],
	layout: { left: [], main: [[{ id: "old", height: 200 }]], right: [] },
});
const failedTile = root.querySelector(".wg-missing");
check(
	"a widget that failed to load says so on its tile, with why, instead of crashing it",
	[failedTile?.querySelector("b")?.textContent, failedTile?.textContent?.includes("defineProp")],
	["This widget could not be loaded", true],
);

check(
	"and nothing was logged but the crash the board asked for",
	said.filter((line) => !/^\(node:\d+\)|the tile fell over|Crasher/.test(line)),
	[],
);

console.log(failed === 0 ? "\nthe tile boundary holds" : `\ntile: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
