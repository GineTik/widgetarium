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
import type { MountedProps } from "../packages/core/src/mounted.js";
import type { ValueGateway } from "../packages/core/src/gateway/contract.js";
import type { EveryValueVerb } from "../packages/core/src/gateway/needs.js";

const VAULT = "tools/fixture-records";
const HOLDER = "@probe/holder";
const COUNTER = "@probe/counter";
const CRASHER = "@probe/crasher";
const VALUE = "@probe/value";
const TITLES = "@probe/titles";

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
const { leaseFor, render } = await import("../packages/core/src/engine/render.js");
const { Mounted } = await import("../packages/core/src/mounted.js");
const { WidgetSurface } = await import("../packages/core/src/surface.js");
const { WidgetRegistry } = await import("../packages/core/src/registry.js");
const { normalizeBoard } = await import("../packages/core/src/model.js");
const { createHost } = await import("../apps/obsidian/src/host.js");
const { useData } = await import("../packages/core/src/gateway/use-data.ts");
const { TFile } = await import("obsidian");

type HeldEntry = MountedProps["entry"] & { readonly name: string; readonly problem?: unknown };

const pathIn = (value: unknown, ...keys: readonly string[]): unknown =>
	keys.reduce<unknown>((held, key) => (isObject(held) ? held[key] : undefined), value);
const isHeldEntry = (value: unknown): value is HeldEntry => isObject(value) && typeof value["name"] === "string";
const heldEntriesOf = (given: GivenProps): HeldEntry[] => {
	const holds = pathIn(given["mounts"], "holds");
	return Array.isArray(holds) ? holds.filter(isHeldEntry) : [];
};
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
	throw new Error("the child fell over");
}

function Value(given: GivenProps): ReactElement {
	const value = given["value"];
	if (!isValueGateway(value)) throw new Error("the value probe was handed no value gateway");
	return h("div", { className: "probe-value" }, String(useData(value.get).data ?? "nothing"));
}

function Titles(given: GivenProps): ReactElement {
	return h(
		"div",
		{ className: "probe-titles" },
		heldEntriesOf(given).map((entry) =>
			h("i", { key: entry.name, "data-problem": String(entry.problem) }, String(entry.title ?? "")),
		),
	);
}

registry.widgets.set(COUNTER, { manifest: { id: COUNTER, api: 1, title: "Counter" }, component: Counter });
registry.widgets.set(CRASHER, { manifest: { id: CRASHER, api: 1, title: "Crasher" }, component: Crasher });
registry.widgets.set(VALUE, {
	manifest: {
		id: VALUE,
		api: 1,
		title: "Value",
		props: { value: { kind: "value", type: "number", verbs: { get: "required" } } },
	},
	component: Value,
});

function Holder(given: GivenProps): ReactElement {
	const held = heldEntriesOf(given);
	const [shown, setShown] = useState("");
	const active = held.find((entry) => entry.name === shown) ?? held[0];
	return h("div", { className: "probe-holder" }, [
		h(
			"div",
			{ key: "strip", className: "probe-strip" },
			held.map((entry) =>
				h("button", { key: entry.name, className: "probe-tab", onClick: () => setShown(entry.name) }, entry.name),
			),
		),
		active ? h(Mounted, { key: active.name, entry: active }) : null,
	]);
}

registry.widgets.set(HOLDER, {
	manifest: { id: HOLDER, api: 1, title: "Holder", mounts: { holds: { label: "Holds" } } },
	component: Holder,
});

registry.widgets.set(TITLES, {
	manifest: { id: TITLES, api: 1, title: "Titles", mounts: { holds: { label: "Holds" } } },
	component: Titles,
});

const UNFILLED = {
	tiles: [{ id: "titles", widget: TITLES, mounts: { holds: [{ name: "Unfilled" }] } }],
	layout: { left: [], main: [[{ id: "titles", height: 120 }]], right: [] },
};

const VIEWS = {
	tiles: [
		{
			id: "group",
			widget: HOLDER,
			mounts: {
				holds: [
					{ name: "One", widget: COUNTER },
					{ name: "Two", widget: COUNTER },
					{ name: "Boom", widget: CRASHER },
				],
			},
		},
	],
	layout: { left: [], main: [[{ id: "group", height: 420 }]], right: [] },
};

const BOUND = {
	tiles: [
		{
			id: "group",
			widget: HOLDER,
			mounts: { holds: [{ name: "Source", widget: VALUE }] },
			mounted: {
				Source: { widget: VALUE, props: { value: { implementation: "@core/typed-value", fields: { value: 42 } } } },
			},
		},
		{
			id: "reader",
			widget: VALUE,
			props: { value: { implementation: "@core/from-tile-value", fields: { ref: "group/Source/value" } } },
		},
	],
	layout: { left: [], main: [[{ id: "group", height: 300 }], [{ id: "reader", height: 80 }]], right: [] },
};

let board = normalizeBoard(VIEWS);
const root = byId(dom.window.document, "host");
const draw = (): void => {
	const surfaceProps = {
		boardNode: root,
		board,
		registry,
		host,
		editing: false,
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

const start = async (shape: unknown): Promise<void> => {
	board = normalizeBoard(shape);
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
const click = async (node: Element | undefined): Promise<void> => {
	if (!node) throw new Error("nothing to press");
	node.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
	await settle();
};
const tabs = (): (string | undefined)[] => all(".probe-strip .probe-tab").map((node) => node.textContent?.trim());
const tab = (name: string): Element | undefined =>
	all(".probe-strip .probe-tab").find((node) => node.textContent?.trim() === name);
const counter = (): string | null => all(".probe-counter b")[0]?.textContent ?? "gone";
const seam = (): Element | null => all(".wg-mounted")[0] ?? null;

const said: string[] = [];
console.error = (...parts: unknown[]): void => {
	said.push(parts.map((part) => String(part)).join(" "));
};

console.log("— a holder redraw is a redraw, not a remount —");

await start(VIEWS);
check("the holder draws a tab for every view it holds", tabs(), ["One", "Two", "Boom"]);
check("and draws the first of them", counter(), "0");

await click(all(".probe-counter button")[0]);
check("the child counts a press of its own", counter(), "1");
{
	const held = seam();
	board = normalizeBoard(JSON.parse(JSON.stringify(board)));
	draw();
	await settle();
	check("an ordinary holder redraw keeps the child's state", counter(), "1");
	check("because it was drawn into the element it already had", Boolean(held) && seam() === held, true);
}

console.log("\n— and a tab change is a release —");

{
	const before = lives.released;
	const held = seam();
	await click(tab("Two"));
	check("changing tab releases the child that was drawn", lives.released - before, 1);
	check("and takes the element it was drawn into off the page", held?.isConnected ?? "never leased one", false);
	check("so the view that comes up is a fresh one, not the last one renamed", counter(), "0");
}

console.log("\n— a view that throws does not take its holder down —");

await start(VIEWS);
await click(tab("Boom"));
check("a view that throws leaves the tab strip standing", tabs(), ["One", "Two", "Boom"]);
check("the crash is named inside the seam the child was drawn into", all(".wg-mounted .wg-error").length, 1);
check("and the holder is still what the cell draws", all(".wg-tree-cell .probe-holder").length, 1);
await click(tab("One"));
check("so the holder still answers a press afterwards", counter(), "0");

await click(tab("Boom"));
const refilled: unknown = JSON.parse(JSON.stringify(board));
const fellOver = pathIn(refilled, "tiles", "0", "mounts", "holds", "2");
if (isObject(fellOver)) Object.assign(fellOver, { widget: COUNTER });
board = normalizeBoard(refilled);
draw();
await settle();
check("and filling the view that fell over draws the widget that replaced it", counter(), "0");

console.log("\n— a mounted child registers in the board's refs —");

await start(BOUND);
check("the mounted child draws the value its own tile holds", all(".probe-value")[0]?.textContent, "42");
check(
	"and a tile bound to that child's prop reads the same one",
	all('[data-cell="reader"] .probe-value')[0]?.textContent,
	"42",
);

console.log("\n— an unfilled view still has something to draw —");

await start(UNFILLED);
const unfilled = () => all(".probe-titles i");
check(
	"a mount row with no widget is the empty branch a holder is told to check",
	unfilled().map((node) => node.getAttribute("data-problem")),
	["empty"],
);
check(
	"and it still hands the holder a title to draw",
	unfilled().map((node) => node.textContent),
	["Unfilled"],
);

console.log("\n— a holder that drives the seam itself —");

{
	const spare = dom.window.document.createElement("div");
	dom.window.document.body.appendChild(spare);
	const drawInto = (element: HTMLElement): (() => void) => {
		const { draw, release } = leaseFor(element);
		draw(h(Counter));
		return release;
	};
	const before = lives.released;
	const looseEntry = { name: "Loose", problem: null, drawInto };
	render(h(Mounted, { entry: looseEntry }), spare);
	await settle();
	check("an entry drawn straight into Mounted draws its widget", spare.querySelectorAll(".probe-counter").length, 1);

	const lostEntry = { name: "Loose", problem: "not-found", drawInto: null };
	render(h(Mounted, { entry: lostEntry }), spare);
	await settle();
	check("an entry that stops being drawable releases the root it was given", lives.released - before, 1);
	check("and says so where the widget stood", spare.querySelectorAll(".wg-missing").length, 1);
	check(
		"naming the entry and what the holder should have branched on",
		said.some((line) => line.includes('"Loose"') && line.includes("entry.problem")),
		true,
	);
	render(null, spare);
	spare.remove();
}

check(
	"and nothing was logged but the crash the board asked for",
	said.filter((line) => !/the child fell over|Crasher|nothing to draw/.test(line)),
	[],
);

console.log(failed === 0 ? "\nthe seam holds" : `\nmount: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
