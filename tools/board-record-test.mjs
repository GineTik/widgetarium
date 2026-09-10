// A BOARD IS A RECORD IN A FILE, and the only proof of that is a DRAWN board: a declared value
// says what the widget decided, never what the person sees. Every check below counts what is on
// screen, switches the board, and counts again — the defect this file exists for is that adding
// a column on one board added it to all of them.
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { parse as parseYaml } from "yaml";
import { buildMirror } from "./mirror.mjs";

const VAULT = "tools/fixture-boards";
const TASKS = "Orbitask/Tasks";
const BOARDS = "Orbitask/Boards";
const NOWHERE = "Orbitask/NotYetMoved";
const NOWHERE_STILL = "Orbitask/StillNotMoved";
const NEVER_MOVED = "Orbitask/NeverMoved";

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

function frontmatter(text) {
	const found = /^---\n([\s\S]*?)\n---/.exec(text);
	return found ? (parseYaml(found[1]) ?? {}) : {};
}

const written = { created: [], updated: [] };

function noteAt(target, props) {
	return Object.assign(new TFile(), {
		path: target,
		basename: target.slice(target.lastIndexOf("/") + 1).replace(/\.md$/, ""),
		extension: "md",
		stat: { ctime: 1, mtime: 2 },
		props,
	});
}

// CONTEXT: nothing here reaches the disk — the fixture is read once and every write stays in memory
const folders = new Map();
function folderAt(target) {
	if (!folders.has(target)) {
		try {
			const children = fs
				.readdirSync(path.join(VAULT, target))
				.filter((name) => name.endsWith(".md"))
				.map((name) => noteAt(`${target}/${name}`, frontmatter(fs.readFileSync(path.join(VAULT, target, name), "utf8"))));
			folders.set(target, Object.assign(new TFolder(), { path: target, children }));
		} catch {
			folders.set(target, null);
		}
	}
	return folders.get(target);
}

// CONTEXT: ONE file object per path, or a write to frontmatter is gone by the next listing
function fileAt(target) {
	return folderAt(target.slice(0, target.lastIndexOf("/")))?.children?.find((file) => file.path === target) ?? null;
}

const watchers = new Map();
const watch = (name, listener) => { watchers.set(name, [...(watchers.get(name) ?? []), listener]); return {}; };
const unwatch = (name, listener) => watchers.set(name, (watchers.get(name) ?? []).filter((held) => held !== listener));
const fire = (name, file) => { for (const listener of [...(watchers.get(name) ?? [])]) listener(file); };

const app = {
	vault: {
		getAbstractFileByPath: (target) => (target.endsWith(".md") ? fileAt(target) : folderAt(target)),
		create: async (target, body) => {
			written.created.push({ target, body });
			const file = noteAt(target, frontmatter(body));
			folderAt(target.slice(0, target.lastIndexOf("/")))?.children.push(file);
			fire("create", file);
			return file;
		},
		createFolder: async (target) => folders.set(target, Object.assign(new TFolder(), { path: target, children: [] })),
		cachedRead: async (file) => fs.readFileSync(path.join(VAULT, file.path), "utf8"),
		read: async (file) => fs.readFileSync(path.join(VAULT, file.path), "utf8"),
		process: async () => "",
		on: watch,
		off: unwatch,
	},
	metadataCache: {
		getFileCache: (file) => ({ frontmatter: file.props }),
		on: watch,
		off: unwatch,
	},
	fileManager: {
		processFrontMatter: async (file, edit) => {
			edit(file.props);
			written.updated.push({ path: file.path, props: { ...file.props } });
			fire("changed", file);
		},
	},
	workspace: { getLeaf: () => ({ openFile: async () => {} }) },
};

const host = createHost(app, { registerEvent: () => {}, addChild: () => {}, removeChild: () => {} });
const registry = new WidgetRegistry({ vault: { adapter } });
await registry.load();

const warnings = [];
console.warn = (...parts) => warnings.push(parts.map((part) => String(part)).join(" "));

const PLACES = [
	{ id: "boards", x: 0, y: 0, w: 20, h: 1 },
	{ id: "board", x: 0, y: 1, w: 20, h: 10 },
];

const named = (tabs) => tabs.map((name) => ({ name }));
const PICKED = "boards/selection";

function surfaceOverBoards(boardsPath) {
	return normalizeBoard({
		tiles: [
			{ id: "boards", widget: "@core/editable-tabs", props: { tabs: { path: boardsPath } } },
			{
				id: "board",
				widget: "@task/kanban-board",
				props: {
					tasks: { path: TASKS, where: [{ prop: "board", op: "is", value: { ref: PICKED } }] },
					boards: { path: boardsPath },
					selection: { from: "ref", ref: PICKED },
				},
			},
		],
		layouts: { 20: { places: PLACES } },
	});
}

function surfaceBoard(boardsPath, tabs = ["Marketing Team", "Ux Team"]) {
	return normalizeBoard({
		tiles: [
			{ id: "boards", widget: "@core/editable-tabs", props: { tabs: { value: named(tabs) } } },
			{
				id: "board",
				widget: "@task/kanban-board",
				props: {
					tasks: { path: TASKS, where: [{ prop: "board", op: "is", value: { ref: PICKED } }] },
					boards: { path: boardsPath },
					selection: { from: "ref", ref: PICKED },
				},
			},
		],
		layouts: { 20: { places: PLACES } },
	});
}

let board = surfaceBoard(BOARDS);
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
const titles = () => all(".orbi-kanban .ok-list-title").map((node) => node.textContent.trim());
const byText = (selector, text) => all(selector).find((node) => node.textContent.trim().toLowerCase() === text.toLowerCase());
const click = async (node) => { node.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); await settle(); };
const dialog = () => dom.window.document.body.querySelector(".wg-dialog");
const dialogButton = (text) => [...dialog().querySelectorAll("button")].find((node) => node.textContent.trim().toLowerCase() === text);
const pickBoard = (name) => byText(".wg-tabs .wg-tabs-tab", name);
const fileProps = (name) => fileAt(`${BOARDS}/${name}.md`)?.props ?? null;
const columnRows = (name) => {
	const held = fileProps(name)?.columns;
	if (typeof held === "string") return held.split(",").map((entry) => ({ name: entry.trim() }));
	return Array.isArray(held) ? held.map((row) => (typeof row === "string" ? { name: row } : row)) : [];
};
const columnNames = (name) => columnRows(name).map((row) => row.name);
const archivedNames = (name) => columnRows(name).filter((row) => row.archivedAt).map((row) => row.name);
const boardWrites = () => written.updated.filter((made) => made.path.startsWith(BOARDS)).length;

const addColumn = async (name) => {
	await click(all(".orbi-kanban .ok-add-list-rest")[0]);
	const field = all(".orbi-kanban .ok-list-name")[0];
	field.value = name;
	field.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
	await settle();
	await click(all(".orbi-kanban .ok-confirm")[0]);
};

const archiveColumn = async (name) => {
	const column = all(".orbi-kanban .ok-list").find((node) => node.textContent.includes(name));
	await click(column.querySelector(".ok-list-remove"));
	await click(dialogButton("archive"));
};

await start(surfaceBoard(BOARDS));

// 1. EACH BOARD LISTS ONLY ITS OWN. The two records name different columns in a different order.
check("the first board draws the columns its own record names", titles(), ["To Do", "Doing", "Done"]);
await click(pickBoard("Ux Team"));
check("the second board draws its own, and only its own", titles(), ["Backlog", "Shipping"]);
check("no column of the first board leaked over", titles().includes("Doing"), false);

// 2. ORDER IS PER BOARD AND SURVIVES A SWITCH.
await click(pickBoard("Marketing Team"));
check("switching back restores the first board's order", titles(), ["To Do", "Doing", "Done"]);
await click(pickBoard("Ux Team"));
check("and the second board's order is still its own", titles(), ["Backlog", "Shipping"]);

// 3. THE REPORTED DEFECT. A column added on one board must not appear on the other.
await click(pickBoard("Marketing Team"));
await addColumn("Blocked");
check("the column is drawn on the board it was added to", titles(), ["To Do", "Doing", "Done", "Blocked"]);
check("and it was written to that board's own record", columnNames("Marketing Team"), ["To Do", "Doing", "Done", "Blocked"]);

await click(pickBoard("Ux Team"));
check("the other board does not show it", titles(), ["Backlog", "Shipping"]);
check("and its record was never touched", String(fileProps("Ux Team").columns), "Backlog, Shipping");
check("the note itself holds no shared column list", board.tiles.find((tile) => tile.id === "board").settings.columns, undefined);

await click(pickBoard("Marketing Team"));
check("switching back finds the added column still there", titles(), ["To Do", "Doing", "Done", "Blocked"]);

// 4. ARCHIVING IS PER BOARD TOO.
await archiveColumn("Doing");
check("the archived column leaves the board it was archived on", titles(), ["To Do", "Done", "Blocked"]);
check("the record keeps its name, so a restore is exact", columnNames("Marketing Team"), ["To Do", "Doing", "Done", "Blocked"]);
check("and the column itself carries the day it left", archivedNames("Marketing Team"), ["Doing"]);

await click(pickBoard("Ux Team"));
check("the other board is untouched by the archiving", titles(), ["Backlog", "Shipping"]);
check("and keeps the archived list it arrived with", String(fileProps("Ux Team").archivedColumns), "Paused");

await click(pickBoard("Marketing Team"));
await addColumn("Doing");
check("naming an archived column restores it, in its own slot", titles(), ["To Do", "Doing", "Done", "Blocked"]);
check("and the record's archived list is empty again", String(fileProps("Marketing Team").archivedColumns ?? ""), "");

// 5. NO BOARD FILES AT ALL. Nothing may break before the boards are moved.
await start(surfaceBoard(NOWHERE));
check("with no record on file the board still draws", all(".orbi-kanban").length, 1);
check("from the columns the tile carries", titles(), ["To Do", "Doing", "Done"]);
check("and the strip still lists its tabs", all(".wg-tabs .wg-tabs-tab").map((node) => node.textContent.trim()), ["Marketing Team", "Ux Team"]);
await click(pickBoard("Ux Team"));
check("switching board still works from the old string", all(".orbi-kanban").length, 1);

// 6b. THE MAP KEYED BY BOARD NAME still reads where no record exists, and the move files each
// board's own half of it — the previous round's storage must survive the crossing intact.
{
	await start(
		normalizeBoard({
			tiles: [
				{ id: "boards", widget: "@core/editable-tabs", props: { tabs: { value: named(["Marketing Team", "Ux Team"]) } } },
				{
				id: "board",
				widget: "@task/kanban-board",
				props: {
					tasks: { path: TASKS, where: [{ prop: "board", op: "is", value: { ref: PICKED } }] },
					boards: { path: NOWHERE_STILL },
					selection: { from: "ref", ref: PICKED },
				},
			}
			],
			layouts: { 20: { places: PLACES } },
		}),
	);
	check("a board with no record of its own draws what the tile carries", titles(), ["To Do", "Doing", "Done"]);
	await click(pickBoard("Ux Team"));
	check("and the board next door draws the same list, plus whatever its tasks carry", titles(), ["To Do", "Doing", "Done", "Backlog", "Shipping"]);
}

// 6c. A COLUMN ARCHIVED BEFORE ANY RECORD EXISTED is named in the map and nowhere else, so
// nothing authors it — and restoring it has to bring the column back all the same.
{
	await start(
		normalizeBoard({
			tiles: [
				{ id: "boards", widget: "@core/editable-tabs", props: { tabs: { value: named(["Marketing Team", "Ux Team"]) } } },
				{
				id: "board",
				widget: "@task/kanban-board",
				props: {
					tasks: { path: TASKS, where: [{ prop: "board", op: "is", value: { ref: PICKED } }] },
					boards: { path: NEVER_MOVED },
					selection: { from: "ref", ref: PICKED },
				},
			}
			],
			layouts: { 20: { places: PLACES } },
		}),
	);
	check("a board with nothing on file draws the columns the manifest names", titles(), ["To Do", "Doing", "Done"]);
	await addColumn("Paused");
	check("and naming a column adds it to the list the tile holds", titles(), ["To Do", "Doing", "Done", "Paused"]);
}

// 8. ARCHIVING IS A DATE ON THE RECORD — it touches that record and no column data.
{
	await start(surfaceOverBoards(BOARDS));
	await click(pickBoard("Marketing Team"));
	const columnsBefore = columnNames("Marketing Team");
	written.updated.length = 0;
	await click(all(".wg-tabs .wg-tabs-more")[0]);
	await click(byText(".wg-tabs .wg-kit-pop-item", "Archive"));
	check("archiving a tab takes it off the strip", all(".wg-tabs .wg-tabs-tab").map((node) => node.textContent.trim()), ["Ux Team"]);
	check("the record it archived is the only one written", written.updated.map((made) => made.path), [`${BOARDS}/Marketing Team.md`]);
	check("and it carries the day it was archived", typeof fileProps("Marketing Team").archivedAt, "string");
	check("the board's columns were not touched", columnNames("Marketing Team"), columnsBefore);

	await click(all(".wg-tabs .wg-tabs-more")[0]);
	await click(byText(".wg-tabs .wg-kit-pop-item", "Archived list"));
	await click([...dialog().querySelectorAll("button")].find((node) => node.textContent.trim() === "Restore"));
	check("restoring puts the tab back", all(".wg-tabs .wg-tabs-tab").map((node) => node.textContent.trim()).sort(), ["Marketing Team", "Ux Team"]);
	check("and the date it carried is gone", fileProps("Marketing Team").archivedAt, null);
	check("with the columns still untouched", columnNames("Marketing Team"), columnsBefore);
}

check("nothing was refused along the way", warnings.filter((line) => line.includes("may not")), []);

console.log(failed === 0 ? "\nboard record: all checks passed" : `\nboard record: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
