// CONTEXT: every check counts what is drawn or what landed in a file, never a setter
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { parse as parseYaml } from "yaml";
import { buildMirror } from "./mirror.mjs";

const VAULT = "tools/fixture-records";
const TASKS = "Orbitask/Tasks";
const BOARDS = "Orbitask/Boards";
const COPIES = "Orbitask/Copies";

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
const { readId } = await import("./.mjs-cache/record-id.mjs");
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

const written = { created: [], updated: [], renamed: [] };

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
		renameFile: async (file, target) => {
			written.renamed.push({ from: file.path, to: target });
			file.path = target;
			file.basename = target.slice(target.lastIndexOf("/") + 1).replace(/\.md$/, "");
			fire("rename", file);
			fire("changed", file);
		},
	},
	workspace: { getLeaf: () => ({ openFile: async () => {} }) },
};

const host = createHost(app, { registerEvent: () => {}, addChild: () => {}, removeChild: () => {} });
const registry = new WidgetRegistry({ vault: { adapter } });
await registry.load();

const said = [];
console.warn = (...parts) => said.push(parts.map((part) => String(part)).join(" "));

const PLACES = [
	{ id: "boards", x: 0, y: 0, w: 20, h: 1 },
	{ id: "board", x: 0, y: 1, w: 20, h: 10 },
];

const PICKED = "boards/selection";

function surfaceOver(folder) {
	return normalizeBoard({
		tiles: [
			{ id: "boards", widget: "@core/editable-tabs", props: { tabs: { path: folder } } },
			{
				id: "board",
				widget: "@task/kanban-board",
				props: {
					tasks: { path: TASKS, where: [{ prop: "board", op: "is", value: { ref: PICKED } }] },
					boards: { path: folder },
					selection: { from: "ref", ref: PICKED },
				},
			},
		],
		layouts: { 20: { places: PLACES } },
	});
}

let board = surfaceOver(BOARDS, "Alpha, Beta", "Alpha");
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
const tab = (name) => byText(".wg-tabs .wg-tabs-tab", name);
const tabNames = () => all(".wg-tabs .wg-tabs-tab").map((node) => node.textContent.trim());
const menu = async (item) => {
	await click(all(".wg-tabs .wg-tabs-more")[0]);
	await click(byText(".wg-tabs .wg-kit-pop-item", item));
};
const holds = (named) => all(".orbi-kanban .ok-card-slot").filter((node) => node.textContent.includes(named)).length;
const wrote = (folder) => written.updated.filter((made) => made.path.startsWith(folder));

await start(surfaceOver(BOARDS));

check("drawing the boards writes nothing", [written.created.length, written.updated.length], [0, 0]);
check("the strip lists the folder", tabNames(), ["Alpha", "Beta"]);

check("the board with an id draws its own columns", titles(), ["To Do", "Doing"]);
check("a task filed by the board's id is on it", holds("Filed by id"), 1);
check("and a task that still stores the name is on it too", holds("Filed by name"), 1);
await click(tab("Beta"));
check("the board that never gained an id draws from its name", titles(), ["Backlog", "Shipping"]);
check("and holds the task filed under that name", holds("On the board with no id"), 1);

{
	await click(tab("Alpha"));
	written.updated.length = 0;
	written.renamed.length = 0;
	const named = tab("Alpha");
	await menu("Rename");
	named.textContent = "Alpha One";
	named.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
	await settle();
	check("the note itself is renamed, and only it", written.renamed, [{ from: `${BOARDS}/Alpha.md`, to: `${BOARDS}/Alpha One.md` }]);
	check("with no property written to carry the name", wrote(BOARDS), []);
	check("the strip shows the new name", tabNames(), ["Alpha One", "Beta"]);
	check("no task note was rewritten to follow the name", wrote(TASKS).map((made) => made.path), []);
	check("the task filed by the id was never opened", written.updated.some((made) => made.path === `${TASKS}/filed-by-id.md`), false);
	check("the task filed by the id is still on the board", holds("Filed by id"), 1);
	check("and the one that stored the old name is not, because a name was never its filing", holds("Filed by name"), 0);
}

// CONTEXT: adding is an explicit action, so the record it writes is born with an id
{
	written.created.length = 0;
	await menu("Add");
	check("one record was written", written.created.length, 1);
	check("under the namespaced key", written.created[0].body.includes("widgetarium:\n  wgId:"), true);
	check("and the id reads back as one", Boolean(readId(frontmatter(written.created[0].body))), true);
	check("the strip shows the new tab", tabNames().length, 3);
}

// CONTEXT: duplicates come from copies — detection is a read, the re-mint is a press
{
	written.updated.length = 0;
	said.length = 0;
	await start(surfaceOver(COPIES));
	check("the copy is drawn beside the original", tabNames(), ["Alpha", "Copy of Alpha"]);
	check("the collision is reported", said.filter((line) => line.includes("claim the id")).length > 0, true);
	check("and nothing was written to repair it", written.updated.length, 0);
	check("the repair is offered", all(".orbi-kanban .ok-repair-ids").length, 1);

	await click(all(".orbi-kanban .ok-repair-ids")[0]);
	check("and it asks first", Boolean(dialog()), true);
	check("with nothing written yet", written.updated.length, 0);
	await click(dialogButton("cancel"));
	check("dismissing the question writes nothing", written.updated.length, 0);

	await click(all(".orbi-kanban .ok-repair-ids")[0]);
	await click(dialogButton("repair"));
	check("exactly one record was re-minted", written.updated.length, 1);
	check("and it is the one whose path sorts second", written.updated[0].path, `${COPIES}/Copy of Alpha.md`);
	check("the record that sorts first kept the id it had", readId(fileAt(`${COPIES}/Alpha.md`).props), "copied-2222-2222-2222");
	check("the other was given a different one", readId(fileAt(`${COPIES}/Copy of Alpha.md`).props) === "copied-2222-2222-2222", false);
	check("which is still an id", Boolean(readId(fileAt(`${COPIES}/Copy of Alpha.md`).props)), true);
	check("and the repair is not offered again", all(".orbi-kanban .ok-repair-ids").length, 0);
}

console.log(failed === 0 ? "\nrecord id: all checks passed" : `\nrecord id: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
