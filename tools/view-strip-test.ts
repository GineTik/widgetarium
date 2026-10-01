import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import type { App } from "obsidian";
import { standIn } from "./stand-in.ts";
import { byId } from "./dom-find.ts";
import { isObject } from "../packages/core/src/engine/is-object.js";
import type { HostPlugin } from "../apps/obsidian/src/host.js";
import type { Board } from "../packages/core/src/model.js";
import type { BoardNode, BoxNode } from "../packages/core/src/tree-nodes.js";

const VAULT = "tools/fixture-records";
const KANBAN = "@default/kanban-board";
const ARCHIVED = "@default/archived-columns";
const SWITCHER = "@default/view-tabs";

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

const { createElement: h } = await import("react");
const { render } = await import("../packages/core/src/engine/render.js");
const { WidgetSurface } = await import("../packages/core/src/surface.js");
const { WidgetRegistry } = await import("../packages/core/src/registry.js");
const { normalizeBoard } = await import("../packages/core/src/model.js");
const { swapBoxes } = await import("../packages/core/src/tree.js");
const { createHost } = await import("../apps/obsidian/src/host.js");
const { TFile, TFolder } = await import("obsidian");

const pathIn = (value: unknown, ...keys: readonly string[]): unknown =>
	keys.reduce<unknown>((held, key) => (isObject(held) ? held[key] : undefined), value);

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
void TFolder;

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

const said: string[] = [];
console.warn = (...parts: unknown[]): void => {
	said.push(parts.map((part) => String(part)).join(" "));
};

interface HeldView {
	readonly name: string;
	readonly widget?: string;
	readonly hidden?: boolean;
}

interface SwapAsk {
	readonly holds?: readonly HeldView[];
	readonly strip?: boolean;
	readonly switcher?: boolean;
}

const HOLDS: readonly HeldView[] = [
	{ name: "Kanban", widget: KANBAN },
	{ name: "Archived columns", widget: ARCHIVED },
];

const COLUMNS = { columns: { from: "typed", value: [{ name: "To Do" }, { name: "Doing" }] } };
const tileIdOf = (name: string): string => `v:${name}`;

function viewNode(held: HeldView): BoardNode {
	const slot = { name: held.name, ...(held.hidden ? { hidden: true } : {}) };
	if (!held.widget) return { dir: "column", of: [], ...slot };
	return { id: tileIdOf(held.name), ...slot };
}

function swapped({ holds = HOLDS, strip, switcher = false }: SwapAsk = {}): Board {
	const tiles: Readonly<Record<string, unknown>>[] = holds
		.filter((held) => held.widget)
		.map((held) => ({
			id: tileIdOf(held.name),
			widget: held.widget,
			...(held.widget === KANBAN ? { props: COLUMNS } : {}),
		}));
	const box: BoxNode = { dir: "swap", id: "group", ...(strip === undefined ? {} : { strip }), of: holds.map(viewNode) };
	const rows: unknown[] = [box];
	if (switcher) {
		tiles.unshift({
			id: "switch",
			widget: SWITCHER,
			props: { options: { from: "ref", ref: "group/holds" }, selection: { from: "ref", ref: "group/selection" } },
		});
		rows.unshift({ id: "switch", height: 56 });
	}
	return normalizeBoard({ v: 2, tiles, layout: { dir: "row", of: [{ dir: "column", keep: true, of: rows }] } });
}

let board = swapped();
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

const start = async (next: Board): Promise<void> => {
	board = next;
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
const textOf = (node: Element): string => node.textContent?.trim() ?? "";
const byText = (selector: string, text: string): Element | undefined =>
	all(selector).find((node) => textOf(node).toLowerCase() === text.toLowerCase());
const click = async (node: Element | null | undefined): Promise<void> => {
	if (!node) throw new Error("nothing to press");
	node.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
	await settle();
};
const strip = (): string[] => all(".wg-tree-swap-strip .wg-tabs-tab").map(textOf);
const tab = (name: string): Element | undefined => byText(".wg-tree-swap-strip .wg-tabs-tab", name);
const menu = async (item: string): Promise<void> => {
	await click(all(".wg-tree-swap-strip .wg-tabs-more")[0]);
	await click(byText(".wg-tree-swap-strip .wg-kit-pop-item", item));
};
const onScreen = (selector: string): Element[] => all(selector).filter((node) => !node.closest("[hidden]"));
const drawn = (): string =>
	onScreen(".orbi-kanban").length > 0
		? "Kanban"
		: onScreen(".orbi-archived-columns").length > 0
			? "Archived columns"
			: "nothing";
const dialogOn = (selector: string): Element[] => [...dom.window.document.body.querySelectorAll(selector)];
const viewBox = (): BoxNode | null => swapBoxes(board.layout)[0]?.box ?? null;
const viewsIn = () => viewBox()?.of.map((child) => ({ name: child.name, ...(child.hidden ? { hidden: true } : {}) }));
const tileNamed = (name: string) => board.tiles.find((tile) => tile.id === tileIdOf(name));

await start(swapped());

check("the box draws a tab for every view it holds", strip(), ["Kanban", "Archived columns"]);
check("and draws the first of them", drawn(), "Kanban");
await click(tab("Archived columns"));
check("pressing a tab draws that view", drawn(), "Archived columns");
await click(tab("Kanban"));
check("and pressing back draws the first again", drawn(), "Kanban");

{
	const named = tab("Kanban");
	if (!named) throw new Error("no tab named Kanban was drawn");
	await menu("Rename");
	named.textContent = "Planner";
	named.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
	await settle();
	await start(board);
	check("renaming a tab renames the view", strip(), ["Planner", "Archived columns"]);
	check("the note carries the new name", viewsIn(), [{ name: "Planner" }, { name: "Archived columns" }]);
	check("the tile under it never moved", pathIn(viewBox()?.of[0], "id"), tileIdOf("Kanban"));
	check("so the columns it was set to are untouched", pathIn(tileNamed("Kanban")?.props, "columns", "value"), [
		{ name: "To Do" },
		{ name: "Doing" },
	]);
	check("and the view is still the one drawn", drawn(), "Kanban");
}

{
	await menu("Add");
	check("adding a tab adds a view", strip().length, 3);
	check("which is a box holding nothing yet", viewBox()?.of[2], { dir: "column", of: [], name: "Untitled 1" });
	check("and offers the press that fills it", onScreen(".wg-tree-swap-held .wg-tree-add").length, 1);
	check("with nothing else drawn in its place", drawn(), "nothing");

	await click(onScreen(".wg-tree-swap-held .wg-tree-add")[0]);
	check("the press opens the catalogue", dialogOn(".wg-cat-dialog").length, 1);

	const pick = dialogOn(".wg-cat-tile [aria-label]").find((node) =>
		node.getAttribute("aria-label")?.includes("Archived columns"),
	);
	await click(pick?.querySelector(".wg-cat-go") ?? pick);
	check("picking a widget fills the view with a tile of its own", board.tiles.at(-1)?.widget, ARCHIVED);
	check("standing inside the view that was added", pathIn(viewBox()?.of[2], "of", "0", "id"), board.tiles.at(-1)?.id);
	check("the catalogue closes behind it", dialogOn(".wg-cat-dialog").length, 0);
	check("the name the tab was given is kept", viewBox()?.of[2]?.name, "Untitled 1");
	check("and the widget is drawn in it", drawn(), "Archived columns");
}

{
	await click(tab("Planner"));
	await menu("Archive");
	check("archiving takes the tab off the strip", strip().includes("Planner"), false);
	check("the view is still in the note, hidden", viewsIn()?.[0], { name: "Planner", hidden: true });
	check("and so is everything the view was set to", pathIn(tileNamed("Kanban")?.props, "columns", "value"), [
		{ name: "To Do" },
		{ name: "Doing" },
	]);

	await menu("Archived list");
	await click([...dom.window.document.body.querySelectorAll(".wg-tabs-restore")].at(-1));
	check("restoring puts the tab back", strip().includes("Planner"), true);
	check("with nothing hidden in the note", viewsIn()?.[0], { name: "Planner" });
	check("and its columns untouched", pathIn(tileNamed("Kanban")?.props, "columns", "value"), [
		{ name: "To Do" },
		{ name: "Doing" },
	]);
}

{
	await start(
		swapped({
			holds: [
				{ name: "Kanban", widget: KANBAN, hidden: true },
				{ name: "Archived columns", widget: ARCHIVED },
			],
		}),
	);
	check("an archived view is not drawn, though the selection names it", drawn(), "Archived columns");
	check("and the strip does not offer it", strip(), ["Archived columns"]);
}

{
	await start(swapped({ strip: false }));
	check("the switch hides the strip", all(".wg-tree-swap-strip").length, 0);
	check("and the box still draws its view", drawn(), "Kanban");
}

{
	said.length = 0;
	await start(swapped({ switcher: true, strip: false }));
	check("the box hands its strip to the switcher outside", all(".wg-tree-swap-strip").length, 0);
	check("and it opens on the view the shared box names", drawn(), "Kanban");
	await click(all(".orbi-view-tabs .ovt-pick")[0]);
	const offered = [...dom.window.document.querySelectorAll(".orbi-view-tabs .wg-kit-pop-item")];
	check("the switcher offers what the box holds", offered.map(textOf), ["Kanban", "Archived columns"]);
	await click(offered.find((node) => textOf(node) === "Archived columns"));
	check("picking outside draws the view inside", drawn(), "Archived columns");
}

console.log(failed === 0 ? "\nview strip: all checks passed" : `\nview strip: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
