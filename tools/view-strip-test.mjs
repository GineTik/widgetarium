// CONTEXT: every check counts what is drawn or what landed in the note, never a setter
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { buildMirror } from "./mirror.mjs";

const VAULT = "tools/fixture-records";
const TASKS = "Orbitask/Tasks";
const BOARDS = "Orbitask/Boards";
const KANBAN = "@default/kanban-board";
const ARCHIVED = "@default/archived-columns";
const SWITCHER = "@default/view-tabs";

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
const { createElement: h } = await import("react");
const { render } = await import("./.mjs-cache/engine/render.mjs");
const { WidgetSurface } = await import("./.mjs-cache/surface.mjs");
const { WidgetRegistry } = await import("./.mjs-cache/registry.mjs");
const { normalizeBoard } = await import("./.mjs-cache/model.mjs");
const { swapBoxes } = await import("./.mjs-cache/tree.mjs");
const { createHost } = await import("./.mjs-cache/host.mjs");
const { TFile, TFolder } = await import("./.mjs-cache/obsidian.mjs");

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

// CONTEXT: the group is proved on its own list, so nothing here needs a vault that writes
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

const host = createHost(app, { registerEvent: () => {}, addChild: () => {}, removeChild: () => {} });
const registry = new WidgetRegistry({ vault: { adapter } });
await registry.load();

const said = [];
console.warn = (...parts) => said.push(parts.map((part) => String(part)).join(" "));

const HOLDS = [
	{ name: "Kanban", widget: KANBAN },
	{ name: "Archived columns", widget: ARCHIVED },
];

const COLUMNS = { columns: { from: "typed", value: [{ name: "To Do" }, { name: "Doing" }] } };
const tileIdOf = (name) => `v:${name}`;

function viewNode(held) {
	const slot = { name: held.name, ...(held.hidden ? { hidden: true } : {}) };
	if (!held.widget) return { dir: "column", of: [], ...slot };
	return { id: tileIdOf(held.name), ...slot };
}

function swapped({ holds = HOLDS, strip, switcher = false } = {}) {
	const tiles = holds
		.filter((held) => held.widget)
		.map((held) => ({
			id: tileIdOf(held.name),
			widget: held.widget,
			...(held.widget === KANBAN ? { props: COLUMNS } : {}),
		}));
	const box = { dir: "swap", id: "group", ...(strip === undefined ? {} : { strip }), of: holds.map(viewNode) };
	const rows = [box];
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
const root = dom.window.document.getElementById("host");
const draw = () =>
	render(
		h(WidgetSurface, {
			boardNode: root,
			board,
			registry,
			host,
			editing: false,
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

const start = async (next) => {
	board = next;
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
const byText = (selector, text) =>
	all(selector).find((node) => node.textContent.trim().toLowerCase() === text.toLowerCase());
const click = async (node) => {
	node.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
	await settle();
};
const strip = () => all(".wg-tree-swap-strip .wg-tabs-tab").map((node) => node.textContent.trim());
const tab = (name) => byText(".wg-tree-swap-strip .wg-tabs-tab", name);
const menu = async (item) => {
	await click(all(".wg-tree-swap-strip .wg-tabs-more")[0]);
	await click(byText(".wg-tree-swap-strip .wg-kit-pop-item", item));
};
const onScreen = (selector) => all(selector).filter((node) => !node.closest("[hidden]"));
const drawn = () =>
	onScreen(".orbi-kanban").length > 0
		? "Kanban"
		: onScreen(".orbi-archived-columns").length > 0
			? "Archived columns"
			: "nothing";
const dialogOn = (selector) => [...dom.window.document.body.querySelectorAll(selector)];
const viewBox = () => swapBoxes(board.layout)[0]?.box ?? null;
const viewsIn = () => viewBox()?.of.map((child) => ({ name: child.name, ...(child.hidden ? { hidden: true } : {}) }));
const tileNamed = (name) => board.tiles.find((tile) => tile.id === tileIdOf(name));

await start(swapped());

check("the box draws a tab for every view it holds", strip(), ["Kanban", "Archived columns"]);
check("and draws the first of them", drawn(), "Kanban");
await click(tab("Archived columns"));
check("pressing a tab draws that view", drawn(), "Archived columns");
await click(tab("Kanban"));
check("and pressing back draws the first again", drawn(), "Kanban");

// CONTEXT: the tab IS the view — a rename must carry the widget and its settings with it
{
	const named = tab("Kanban");
	await menu("Rename");
	named.textContent = "Planner";
	named.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
	await settle();
	// CONTEXT: drawn again from the note, or the strip would read back what the test typed into it
	await start(board);
	check("renaming a tab renames the view", strip(), ["Planner", "Archived columns"]);
	check("the note carries the new name", viewsIn(), [{ name: "Planner" }, { name: "Archived columns" }]);
	check("the tile under it never moved", viewBox()?.of[0]?.id, tileIdOf("Kanban"));
	check("so the columns it was set to are untouched", tileNamed("Kanban")?.props?.columns?.value, [
		{ name: "To Do" },
		{ name: "Doing" },
	]);
	check("and the view is still the one drawn", drawn(), "Kanban");
}

// CONTEXT: an added tab is a view with no widget yet, and the press is how it gets one
{
	await menu("Add");
	check("adding a tab adds a view", strip().length, 3);
	check("which is a box holding nothing yet", viewBox()?.of[2], { dir: "column", of: [], name: "Untitled 1" });
	check("and offers the press that fills it", onScreen(".wg-tree-swap-held .wg-tree-add").length, 1);
	check("with nothing else drawn in its place", drawn(), "nothing");

	await click(onScreen(".wg-tree-swap-held .wg-tree-add")[0]);
	check("the press opens the catalogue", dialogOn(".wg-cat-dialog").length, 1);

	const pick = dialogOn(".wg-cat-tile [aria-label]").find((node) =>
		node.getAttribute("aria-label").includes("Archived columns"),
	);
	await click(pick.querySelector(".wg-cat-go") ?? pick);
	check("picking a widget fills the view with a tile of its own", board.tiles.at(-1)?.widget, ARCHIVED);
	check("standing inside the view that was added", viewBox()?.of[2]?.of[0]?.id, board.tiles.at(-1)?.id);
	check("the catalogue closes behind it", dialogOn(".wg-cat-dialog").length, 0);
	check("the name the tab was given is kept", viewBox()?.of[2]?.name, "Untitled 1");
	check("and the widget is drawn in it", drawn(), "Archived columns");
}

// CONTEXT: archiving hides a view; the widget and everything set on it stay where they were
{
	await click(tab("Planner"));
	await menu("Archive");
	check("archiving takes the tab off the strip", strip().includes("Planner"), false);
	check("the view is still in the note, hidden", viewsIn()?.[0], { name: "Planner", hidden: true });
	check("and so is everything the view was set to", tileNamed("Kanban")?.props?.columns?.value, [
		{ name: "To Do" },
		{ name: "Doing" },
	]);

	await menu("Archived list");
	await click([...dom.window.document.body.querySelectorAll(".wg-tabs-restore")].at(-1));
	check("restoring puts the tab back", strip().includes("Planner"), true);
	check("with nothing hidden in the note", viewsIn()?.[0], { name: "Planner" });
	check("and its columns untouched", tileNamed("Kanban")?.props?.columns?.value, [
		{ name: "To Do" },
		{ name: "Doing" },
	]);
}

// CONTEXT: an archived view stays hidden even when the selection still names it
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

// CONTEXT: hide, not disable — the group must still be drivable from outside
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
	check(
		"the switcher offers what the box holds",
		offered.map((node) => node.textContent.trim()),
		["Kanban", "Archived columns"],
	);
	await click(offered.find((node) => node.textContent.trim() === "Archived columns"));
	check("picking outside draws the view inside", drawn(), "Archived columns");
}

console.log(failed === 0 ? "\nview strip: all checks passed" : `\nview strip: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
