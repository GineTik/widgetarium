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

function surfaceBoard(boardsPath, tabs = "Marketing Team, Ux Team") {
	return normalizeBoard({
		tiles: [
			{ id: "boards", widget: "@core/editable-tabs", settings: { tabs, activeTab: "Marketing Team" }, sources: { tasks: { path: TASKS } } },
			{ id: "board", widget: "@task/kanban-board", sources: { tasks: { path: TASKS }, boards: { path: boardsPath } } },
		],
		context: { board: "Marketing Team" },
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
check("and it was written to that board's own record", String(fileProps("Marketing Team").columns), "To Do, Doing, Done, Blocked");

await click(pickBoard("Ux Team"));
check("the other board does not show it", titles(), ["Backlog", "Shipping"]);
check("and its record was never touched", String(fileProps("Ux Team").columns), "Backlog, Shipping");
check("the note itself holds no shared column list", board.tiles.find((tile) => tile.id === "board").settings.columns, undefined);

await click(pickBoard("Marketing Team"));
check("switching back finds the added column still there", titles(), ["To Do", "Doing", "Done", "Blocked"]);

// 4. ARCHIVING IS PER BOARD TOO.
await archiveColumn("Doing");
check("the archived column leaves the board it was archived on", titles(), ["To Do", "Done", "Blocked"]);
check("the record keeps its name, so a restore is exact", String(fileProps("Marketing Team").columns), "To Do, Doing, Done, Blocked");
check("and lists it as archived", String(fileProps("Marketing Team").archivedColumns), "Doing");

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

// 6. THE MOVE IS A PRESS. Nothing is written until it is pressed, and never onto a board on file.
{
	const madeBefore = written.created.length;
	await start(surfaceBoard(NOWHERE));
	check("drawing a board with no records writes nothing", written.created.length, madeBefore);
	const move = all(".orbi-kanban .ok-move-boards")[0];
	check("the move is offered", Boolean(move), true);
	await click(move);
	check("and it asks first", Boolean(dialog()), true);
	check("with nothing written yet", written.created.length, madeBefore);
	await click(dialogButton("cancel"));
	check("dismissing the question creates nothing", written.created.length, madeBefore);
	check("and leaves the move there to press again", all(".orbi-kanban .ok-move-boards").length, 1);
	await click(all(".orbi-kanban .ok-move-boards")[0]);
	await click(dialogButton("move"));
	check("confirming writes one file per board", written.created.length - madeBefore, 2);
	check(
		"named for the boards the strip holds",
		written.created.slice(madeBefore).map((made) => made.target).sort(),
		[`${NOWHERE}/Marketing Team.md`, `${NOWHERE}/Ux Team.md`],
	);
	check("each carrying the columns that were on screen", written.created.slice(madeBefore).every((made) => made.body.includes("To Do, Doing, Done")), true);

	// AFTER THE MOVE THE RECORD IS THE SOURCE. The file is edited behind the board's back and
	// what it names — the columns, their order, which of them is archived — is what is drawn.
	const moved = fileAt(`${NOWHERE}/Marketing Team.md`);
	check("the board that was moved now has a file", Boolean(moved), true);
	moved.props.columns = "Done, Doing, To Do, Shipped";
	moved.props.archivedColumns = "Doing";
	fire("changed", moved);
	await settle();
	check("the columns drawn are the record's, in the record's order", titles(), ["Done", "To Do", "Shipped"]);
	check("and the column the record archived is not among them", titles().includes("Doing"), false);
}

// 6b. THE MAP KEYED BY BOARD NAME still reads where no record exists, and the move files each
// board's own half of it — the previous round's storage must survive the crossing intact.
{
	const madeBefore = written.created.length;
	await start(
		normalizeBoard({
			tiles: [
				{ id: "boards", widget: "@core/editable-tabs", settings: { tabs: "Marketing Team, Ux Team", activeTab: "Marketing Team" }, sources: { tasks: { path: TASKS } } },
				{ id: "board", widget: "@task/kanban-board", sources: { tasks: { path: TASKS }, boards: { path: NOWHERE_STILL } } },
			],
			archivedColumns: { "Marketing Team": ["Doing"], "Ux Team": ["Done"] },
			context: { board: "Marketing Team" },
			layouts: { 20: { places: PLACES } },
		}),
	);
	check("the map on the note still hides the column it archived", titles(), ["To Do", "Done"]);
	await click(pickBoard("Ux Team"));
	check("and the next board over reads its own half", titles(), ["To Do", "Doing", "Backlog", "Shipping"]);

	await click(pickBoard("Marketing Team"));
	await click(all(".orbi-kanban .ok-move-boards")[0]);
	await click(dialogButton("move"));
	const made = Object.fromEntries(written.created.slice(madeBefore).map((entry) => [entry.target, entry.body]));
	check("the move writes both boards", Object.keys(made).sort(), [`${NOWHERE_STILL}/Marketing Team.md`, `${NOWHERE_STILL}/Ux Team.md`]);
	// CONTEXT: the whole value, not a substring — "Doing, Done" contains neither name on its own
	const archivedIn = (body) => (/archivedColumns: "(.*)"/.exec(body ?? "") ?? ["", ""])[1];
	check("the first board's archived column lands on the first board, and only it", archivedIn(made[`${NOWHERE_STILL}/Marketing Team.md`]), "Doing");
	check("the second board's lands on the second, and only it", archivedIn(made[`${NOWHERE_STILL}/Ux Team.md`]), "Done");
}

// 7. AN EXISTING FILE IS NEVER OVERWRITTEN.
{
	const madeBefore = written.created.length;
	await start(surfaceBoard(BOARDS, "Marketing Team, Ux Team, Growth"));
	const move = all(".orbi-kanban .ok-move-boards")[0];
	check("a board with no file yet is still offered the move", Boolean(move), true);
	await click(move);
	await click(dialogButton("move"));
	check("only the board that had no file is written", written.created.length - madeBefore, 1);
	check("and it is the new one, with nothing written for the boards already on file", written.created.slice(madeBefore).map((made) => made.target), [`${BOARDS}/Growth.md`]);
	check("and the move is not offered again", all(".orbi-kanban .ok-move-boards").length, 0);
}

// 8. THE STRIP CARRIES NAMES AND NOTHING ELSE — archive and restore touch no column data.
{
	await start(surfaceBoard(BOARDS));
	const columnsBefore = String(fileProps("Marketing Team").columns);
	const wroteBefore = boardWrites();
	await click(all(".wg-tabs .wg-tabs-more")[0]);
	await click(byText(".wg-tabs .wg-kit-pop-item", "Archive"));
	check("archiving a tab takes it off the strip", all(".wg-tabs .wg-tabs-tab").map((node) => node.textContent.trim()), ["Ux Team"]);
	check("and it is remembered as archived", String(board.tiles.find((tile) => tile.id === "boards").settings.archived), "Marketing Team");
	check("no board record was written by it", boardWrites(), wroteBefore);
	check("the board's columns were not touched", String(fileProps("Marketing Team").columns), columnsBefore);

	await click(all(".wg-tabs .wg-tabs-more")[0]);
	await click(byText(".wg-tabs .wg-kit-pop-item", "Archived list"));
	await click([...dialog().querySelectorAll("button")].find((node) => node.textContent.trim() === "Restore"));
	check("restoring puts the tab back", all(".wg-tabs .wg-tabs-tab").map((node) => node.textContent.trim()).sort(), ["Marketing Team", "Ux Team"]);
	check("and it wrote no board record either", boardWrites(), wroteBefore);
}

check("nothing was refused along the way", warnings.filter((line) => line.includes("may not")), []);

console.log(failed === 0 ? "\nboard record: all checks passed" : `\nboard record: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
