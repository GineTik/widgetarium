import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { buildMirror } from "./mirror.mjs";

const VAULT = "tools/fixture-records";
const COUNTER = "@probe/counter";
const CRASHER = "@probe/crasher";

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
	"KeyboardEvent",
	"MouseEvent",
	"Event",
	"MutationObserver",
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
const { createElement: h, useEffect, useState } = await import("react");
const { render } = await import("./.mjs-cache/engine/render.mjs");
const { movesFrom, positionsWithin } = await import("./.mjs-cache/flip.mjs");
const { WidgetSurface } = await import("./.mjs-cache/surface.mjs");
const { WidgetRegistry } = await import("./.mjs-cache/registry.mjs");
const { normalizeBoard } = await import("./.mjs-cache/model.mjs");
const { createHost } = await import("./.mjs-cache/host.mjs");
const { TFile } = await import("./.mjs-cache/obsidian.mjs");
const { useData } = await import("./.mjs-cache/gateway/use-data.mjs");

const adapter = {
	exists: async (target) => fs.existsSync(path.join(VAULT, target)),
	list: async (target) => {
		const names = fs.readdirSync(path.join(VAULT, target));
		const kind = (name) => {
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
	read: async (target) => fs.readFileSync(path.join(VAULT, target), "utf8"),
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

const host = createHost(app, { registerEvent: () => {}, addChild: () => {}, removeChild: () => {} });
const registry = new WidgetRegistry({ vault: { adapter } });
await registry.load();

const lives = { released: 0 };

function Counter() {
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

function Crasher() {
	throw new Error("the tile fell over");
}

const OPENER = "@probe/opener";
const OPENER_MANIFEST = {
	id: OPENER,
	api: 1,
	title: "Opener",
	props: {
		items: { kind: "collection", verbs: { list: "required" } },
		opened: { kind: "value", of: "items", verbs: { get: "required", update: "required" } },
	},
};

function Opener({ opened }) {
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
const root = dom.window.document.getElementById("host");
const draw = () =>
	render(
		h(WidgetSurface, {
			boardNode: root,
			board,
			registry,
			host,
			editing,
			screen: true,
			initialWidth: 1280,
			onChange: (next) => {
				board = next;
				draw();
			},
			onToggleEditing: () => {},
			onWidth: () => {},
		}),
		root,
	);

const settle = async (times = 40) => {
	for (let index = 0; index < times; index += 1) await new Promise((resolve) => setTimeout(resolve, 1));
};

const start = async (shape, isEditing = false) => {
	board = normalizeBoard(shape);
	editing = isEditing;
	render(null, root);
	await settle();
	draw();
	await settle();
};

let failed = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK " : "!! "} ${label}${ok ? ` — ${JSON.stringify(got)}` : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`}`,
	);
};

const surface = () => dom.window.document.querySelector(".wg-page") ?? root;
const all = (selector) => [...surface().querySelectorAll(selector)];
const everywhere = (selector) => [...dom.window.document.querySelectorAll(selector)];
const click = async (node, times = 40) => {
	node.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
	await settle(times);
};
const countIn = (within) => everywhere(`${within} .probe-counter b`)[0]?.textContent ?? "gone";
const bumpIn = (within) => everywhere(`${within} .probe-counter button`)[0];
const shellIn = (within) => everywhere(`${within} .wg-drawn > .wg-drawn`)[0] ?? null;

const said = [];
console.error = (...parts) => said.push(parts.map((part) => String(part)).join(" "));

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
	const gear = () => everywhere('[data-cell="good"] .wg-tile-actions button[aria-label="Settings"]')[0];
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

	const done = everywhere(".wg-set-head button").find((node) => node.textContent.trim() === "Done");
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
	const openerBoard = () =>
		normalizeBoard({
			tiles: [{ id: "opener", widget: OPENER, props: { items: { value: [{ id: "a" }] } } }],
			layout: { left: [], main: [[{ id: "opener", height: 200 }]], right: [] },
		});
	const openedText = () => everywhere(".probe-opened")[0]?.textContent;
	const openButton = () => everywhere(".probe-opener button")[0];

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
	region.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 400 });
	const boxes = { first: { top: 0, height: 0 }, below: { top: 0, height: 0 } };
	for (const id of Object.keys(boxes)) {
		const node = dom.window.document.createElement("div");
		node.className = "wg-tree-cell";
		node.dataset.cell = id;
		node.getBoundingClientRect = () => ({ left: 0, top: boxes[id].top, height: boxes[id].height });
		region.appendChild(node);
	}
	const keyOf = (node) => node.dataset.cell;
	const beforeTheyLand = positionsWithin(region, ".wg-tree-cell", keyOf);
	check("a region drawn before its widgets records no places", Object.keys(beforeTheyLand), []);
	boxes.first = { top: 0, height: 200 };
	boxes.below = { top: 200, height: 120 };
	const afterTheyLand = positionsWithin(region, ".wg-tree-cell", keyOf);
	check("so the widgets landing in it slide nothing", Object.keys(movesFrom(beforeTheyLand, afterTheyLand)), []);
}

check(
	"and nothing was logged but the crash the board asked for",
	said.filter((line) => !/^\(node:\d+\)|the tile fell over|Crasher/.test(line)),
	[],
);

console.log(failed === 0 ? "\nthe tile boundary holds" : `\ntile: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
