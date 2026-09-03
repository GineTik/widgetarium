// CONTEXT: every check counts what is drawn or what landed in the note, never a setter
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { buildMirror } from "./mirror.mjs";

const VAULT = "tools/fixture-records";
const TASKS = "Orbitask/Tasks";
const BOARDS = "Orbitask/Boards";
const KANBAN = "@task/kanban-board";
const ARCHIVED = "@task/archived-columns";
const GROUP = "@core/view-group";
const SWITCHER = "@task/view-tabs";

const dom = new JSDOM(`<!doctype html><body><div class="view-content"><div id="host"></div></div></body>`, { pretendToBeVisual: true });
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "KeyboardEvent", "MouseEvent", "Event", "MutationObserver"]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
globalThis.window.ResizeObserver = globalThis.ResizeObserver;
Object.defineProperty(dom.window.HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 1280 });

buildMirror();
const { createElement: h } = await import("react");
const { render } = await import("./.mjs-cache/engine/render.mjs");
const { WidgetSurface } = await import("./.mjs-cache/surface.mjs");
const { WidgetRegistry } = await import("./.mjs-cache/registry.mjs");
const { normalizeBoard } = await import("./.mjs-cache/model.mjs");
const { createHost } = await import("./.mjs-cache/host.mjs");
const { TFile, TFolder } = await import("./.mjs-cache/obsidian.mjs");

const adapter = {
	exists: async (target) => fs.existsSync(path.join(VAULT, target)),
	list: async (target) => {
		const names = fs.readdirSync(path.join(VAULT, target));
		const kind = (name) => { try { return fs.statSync(path.join(VAULT, target, name)); } catch { return null; } };
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
		create: async () => Object.assign(new TFile(), { path: "made.md", basename: "made", extension: "md", stat: { ctime: 1, mtime: 1 } }),
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

function grouped({ holds = HOLDS, isTabsShown, switcher = false, view } = {}) {
	const tiles = [
		{
			id: "group",
			widget: GROUP,
			settings: isTabsShown === undefined ? { holds } : { holds, isTabsShown },
			sources: {},
			mounted: { Kanban: { widget: KANBAN, settings: { columns: "To Do, Doing" }, sources: { tasks: { path: TASKS }, boards: { path: BOARDS } } } },
		},
	];
	const places = [{ id: "group", x: 0, y: 0, w: 20, h: 10 }];
	if (switcher) {
		tiles.unshift({
			id: "switch",
			widget: SWITCHER,
			settings: {},
			props: { options: { from: "ref", ref: "group/holds" }, selection: { from: "ref", ref: "group/selection" } },
		});
		places.unshift({ id: "switch", x: 0, y: 0, w: 20, h: 1 });
		places[1] = { id: "group", x: 0, y: 1, w: 20, h: 9 };
	}
	return normalizeBoard({ tiles, layouts: { 20: { places } } });
}

let board = grouped();
const root = dom.window.document.getElementById("host");
const draw = () =>
	render(
		h(WidgetSurface, {
			board, registry, host, editing: false, screen: true, initialWidth: 1280,
			onChange: (next) => { board = next; draw(); },
			onToggleEditing: () => {}, onWidth: () => {},
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
	console.log(`${ok ? "OK " : "!! "} ${label}${ok ? ` — ${JSON.stringify(got)}` : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`}`);
};

const surface = () => dom.window.document.querySelector(".wg-page") ?? root;
const all = (selector) => [...surface().querySelectorAll(selector)];
const byText = (selector, text) => all(selector).find((node) => node.textContent.trim().toLowerCase() === text.toLowerCase());
const click = async (node) => { node.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); await settle(); };
const strip = () => all(".ovg-strip .wg-tabs-tab").map((node) => node.textContent.trim());
const tab = (name) => byText(".ovg-strip .wg-tabs-tab", name);
const menu = async (item) => {
	await click(all(".ovg-strip .wg-tabs-more")[0]);
	await click(byText(".ovg-strip .wg-kit-pop-item", item));
};
const drawn = () => (all(".orbi-kanban").length > 0 ? "Kanban" : all(".orbi-archived-columns").length > 0 ? "Archived columns" : "nothing");
const dialogOn = (selector) => [...dom.window.document.body.querySelectorAll(selector)];
const groupTile = () => board.tiles.find((tile) => tile.id === "group");

await start(grouped());

check("the group draws a tab for every view it holds", strip(), ["Kanban", "Archived columns"]);
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
	check("the note carries the new name", groupTile()?.settings?.holds?.[0], { name: "Planner", widget: KANBAN });
	check("the view's own record moved with it", Object.keys(groupTile()?.mounted ?? {}), ["Planner"]);
	check("with the settings it had", groupTile()?.mounted?.Planner?.settings, { columns: "To Do, Doing" });
	check("and the view is still the one drawn", drawn(), "Kanban");
}

// CONTEXT: an added tab is a view with no widget yet, and the press is how it gets one
{
	await menu("Add");
	check("adding a tab adds a view", strip().length, 3);
	check("which holds no widget yet", groupTile()?.settings?.holds?.[2]?.widget, "");
	check("and says so where the view is drawn", all(".ovg-empty .ovg-fill").length, 1);
	check("with nothing else drawn in its place", drawn(), "nothing");

	await click(all(".ovg-empty .ovg-fill")[0]);
	check("the press opens the catalogue", dialogOn(".wg-cat-dialog").length, 1);
	check("which says what the press means", dialogOn(".wg-cat-dialog .wg-dialog-title")[0]?.textContent.trim(), "Add a view");

	const pick = dialogOn(".wg-cat-tile [aria-label]").find((node) => node.getAttribute("aria-label").includes("Archived columns"));
	await click(pick.querySelector(".wg-cat-go") ?? pick);
	check("picking a widget fills the tab", groupTile()?.settings?.holds?.[2]?.widget, ARCHIVED);
	check("the catalogue closes behind it", dialogOn(".wg-cat-dialog").length, 0);
	check("the name the tab was given is kept", groupTile()?.settings?.holds?.[2]?.name, "Untitled 1");
	check("and the widget is drawn in it", drawn(), "Archived columns");
}

// CONTEXT: archiving hides a view; the widget and everything set on it stay where they were
{
	await click(tab("Planner"));
	await menu("Archive");
	check("archiving takes the tab off the strip", strip().includes("Planner"), false);
	check("the row is still in the note", groupTile()?.settings?.holds?.[0], { name: "Planner", widget: KANBAN, hidden: true });
	check("and so is everything the view was set to", groupTile()?.mounted?.Planner?.settings, { columns: "To Do, Doing" });

	await menu("Archived list");
	await click([...dom.window.document.body.querySelectorAll(".wg-tabs-restore")].at(-1));
	check("restoring puts the tab back", strip().includes("Planner"), true);
	check("with nothing hidden in the note", groupTile()?.settings?.holds?.[0], { name: "Planner", widget: KANBAN });
	check("and its settings untouched", groupTile()?.mounted?.Planner?.settings, { columns: "To Do, Doing" });
}

// CONTEXT: an archived view stays hidden even when the selection still names it
{
	await start(grouped({ holds: [{ name: "Planner", widget: KANBAN, hidden: true }, { name: "Archived columns", widget: ARCHIVED }], view: "Planner" }));
	check("an archived view is not drawn, though the selection names it", drawn(), "Archived columns");
	check("and the strip does not offer it", strip(), ["Archived columns"]);
}

// CONTEXT: hide, not disable — the group must still be drivable from outside
{
	await start(grouped({ isTabsShown: false }));
	check("the switch hides the strip", all(".ovg-strip").length, 0);
	check("and the group still draws its view", drawn(), "Kanban");
}

{
	said.length = 0;
	await start(grouped({ switcher: true, isTabsShown: false }));
	check("the group hands its strip to the switcher outside", all(".ovg-strip").length, 0);
	check("and it opens on the view the shared box names", drawn(), "Kanban");
	await click(all(".orbi-view-tabs .ovt-pick")[0]);
	const offered = [...dom.window.document.querySelectorAll(".orbi-view-tabs .wg-kit-pop-item")];
	check("the switcher offers what the group holds", offered.map((node) => node.textContent.trim()), ["Kanban", "Archived columns"]);
	await click(offered.find((node) => node.textContent.trim() === "Archived columns"));
	check("picking outside draws the view inside", drawn(), "Archived columns");
}

console.log(failed === 0 ? "\nview strip: all checks passed" : `\nview strip: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
