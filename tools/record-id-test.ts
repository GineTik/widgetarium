import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { parse as parseYaml } from "yaml";
import type { App, TFile as ObsidianFile, TFolder as ObsidianFolder } from "obsidian";
import { standIn } from "./stand-in.ts";
import { byId } from "./dom-find.ts";
import { isObject } from "../packages/core/src/engine/is-object.js";
import type { HostPlugin } from "../apps/obsidian/src/host.js";
import type { Board } from "../packages/core/src/model.js";
const EVERY_VERB = ["list", "get", "create", "update", "remove", "replace", "repairIds"];

const VAULT = "tools/fixture-records";
const TASKS = "Orbitask/Tasks";
const BOARDS = "Orbitask/Boards";
const COPIES = "Orbitask/Copies";

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
const { createHost } = await import("../apps/obsidian/src/host.js");
const { readId } = await import("../packages/core/src/record-id.js");
const { TFile, TFolder } = await import("obsidian");

type NoteProps = Record<string, unknown>;
type NoteFile = ObsidianFile & { props: NoteProps };
type NoteFolder = Omit<ObsidianFolder, "children"> & { children: NoteFile[] };
type FileListener = (file: NoteFile) => void;

interface Written {
	readonly created: { readonly target: string; readonly body: string }[];
	readonly updated: { readonly path: string; readonly props: NoteProps }[];
	readonly renamed: { readonly from: string; readonly to: string }[];
}

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

function frontmatter(text: string): NoteProps {
	const found = /^---\n([\s\S]*?)\n---/.exec(text);
	const parsed: unknown = found ? parseYaml(found[1] ?? "") : null;
	return isObject(parsed) ? Object.fromEntries(Object.entries(parsed)) : {};
}

const written: Written = { created: [], updated: [], renamed: [] };

function noteAt(target: string, props: NoteProps): NoteFile {
	return Object.assign(new TFile(), {
		path: target,
		basename: target.slice(target.lastIndexOf("/") + 1).replace(/\.md$/, ""),
		extension: "md",
		stat: { ctime: 1, mtime: 2 },
		props,
	});
}

const folders = new Map<string, NoteFolder | null>();
function folderAt(target: string): NoteFolder | null {
	if (!folders.has(target)) {
		try {
			const children = fs
				.readdirSync(path.join(VAULT, target))
				.filter((name) => name.endsWith(".md"))
				.map((name) =>
					noteAt(`${target}/${name}`, frontmatter(fs.readFileSync(path.join(VAULT, target, name), "utf8"))),
				);
			folders.set(target, Object.assign(new TFolder(), { path: target, children }));
		} catch {
			folders.set(target, null);
		}
	}
	return folders.get(target) ?? null;
}

function fileAt(target: string): NoteFile | null {
	return folderAt(target.slice(0, target.lastIndexOf("/")))?.children?.find((file) => file.path === target) ?? null;
}

const watchers = new Map<string, FileListener[]>();
const watch = (name: string, listener: FileListener): object => {
	watchers.set(name, [...(watchers.get(name) ?? []), listener]);
	return {};
};
const unwatch = (name: string, listener: FileListener): Map<string, FileListener[]> =>
	watchers.set(
		name,
		(watchers.get(name) ?? []).filter((held) => held !== listener),
	);
const fire = (name: string, file: NoteFile): void => {
	for (const listener of [...(watchers.get(name) ?? [])]) listener(file);
};

const app = {
	vault: {
		getAbstractFileByPath: (target: string) => (target.endsWith(".md") ? fileAt(target) : folderAt(target)),
		create: async (target: string, body: string) => {
			written.created.push({ target, body });
			const file = noteAt(target, frontmatter(body));
			folderAt(target.slice(0, target.lastIndexOf("/")))?.children.push(file);
			fire("create", file);
			return file;
		},
		createFolder: async (target: string) =>
			folders.set(target, Object.assign(new TFolder(), { path: target, children: [] })),
		cachedRead: async (file: NoteFile) => fs.readFileSync(path.join(VAULT, file.path), "utf8"),
		read: async (file: NoteFile) => fs.readFileSync(path.join(VAULT, file.path), "utf8"),
		process: async () => "",
		on: watch,
		off: unwatch,
	},
	metadataCache: {
		getFileCache: (file: NoteFile) => ({ frontmatter: file.props }),
		on: watch,
		off: unwatch,
	},
	fileManager: {
		processFrontMatter: async (file: NoteFile, edit: (props: NoteProps) => void) => {
			edit(file.props);
			written.updated.push({ path: file.path, props: { ...file.props } });
			fire("changed", file);
		},
		renameFile: async (file: NoteFile, target: string) => {
			written.renamed.push({ from: file.path, to: target });
			file.path = target;
			file.basename = target.slice(target.lastIndexOf("/") + 1).replace(/\.md$/, "");
			fire("rename", file);
			fire("changed", file);
		},
	},
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

const said: string[] = [];
console.warn = (...parts: unknown[]): void => {
	said.push(parts.map((part) => String(part)).join(" "));
};

const PLACES = [
	{ id: "boards", x: 0, y: 0, w: 20, h: 1 },
	{ id: "board", x: 0, y: 1, w: 20, h: 10 },
];

const PICKED = "boards/selection";

function surfaceOver(folder: string): Board {
	return normalizeBoard({
		tiles: [
			{
				id: "boards",
				widget: "@default/editable-tabs",
				props: { tabs: { implementation: "@obsidian/folder", fields: { path: folder }, allow: EVERY_VERB } },
			},
			{
				id: "board",
				widget: "@default/kanban-board",
				props: {
					tasks: {
						implementation: "@obsidian/folder",
						fields: { path: TASKS, where: [{ prop: "board", op: "is", value: { ref: PICKED } }] },
						allow: EVERY_VERB,
					},
					boards: { implementation: "@obsidian/folder", fields: { path: folder }, allow: EVERY_VERB },
					selection: { implementation: "@core/from-tile-value", fields: { ref: PICKED } },
				},
			},
		],
		layouts: { 20: { places: PLACES } },
	});
}

let board = surfaceOver(BOARDS);
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
const titles = (): string[] => all(".orbi-kanban .ok-list-title").map(textOf);
const byText = (selector: string, text: string): Element | undefined =>
	all(selector).find((node) => textOf(node).toLowerCase() === text.toLowerCase());
const click = async (node: Element | undefined): Promise<void> => {
	if (!node) throw new Error("nothing to press");
	node.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
	await settle();
};
const dialog = (): Element | null => dom.window.document.body.querySelector(".wg-dialog");
const dialogButton = (text: string): Element | undefined =>
	[...(dialog()?.querySelectorAll("button") ?? [])].find((node) => textOf(node).toLowerCase() === text);
const tab = (name: string): Element | undefined => byText(".wg-tabs .wg-tabs-tab", name);
const tabNames = (): string[] => all(".wg-tabs .wg-tabs-tab").map(textOf);
const menu = async (item: string): Promise<void> => {
	await click(all(".wg-tabs .wg-tabs-more")[0]);
	await click(byText(".wg-tabs .wg-kit-pop-item", item));
};
const holds = (named: string): number =>
	all(".orbi-kanban .ok-card-slot").filter((node) => node.textContent.includes(named)).length;
const wrote = (folder: string): Written["updated"] => written.updated.filter((made) => made.path.startsWith(folder));

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
	if (!named) throw new Error("no tab named Alpha was drawn");
	await menu("Rename");
	named.textContent = "Alpha One";
	named.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
	await settle();
	check("the note itself is renamed, and only it", written.renamed, [
		{ from: `${BOARDS}/Alpha.md`, to: `${BOARDS}/Alpha One.md` },
	]);
	check("with no property written to carry the name", wrote(BOARDS), []);
	check("the strip shows the new name", tabNames(), ["Alpha One", "Beta"]);
	check(
		"no task note was rewritten to follow the name",
		wrote(TASKS).map((made) => made.path),
		[],
	);
	check(
		"the task filed by the id was never opened",
		written.updated.some((made) => made.path === `${TASKS}/filed-by-id.md`),
		false,
	);
	check("the task filed by the id is still on the board", holds("Filed by id"), 1);
	check("and the one that stored the old name is not, because a name was never its filing", holds("Filed by name"), 0);
}

{
	written.created.length = 0;
	await menu("Add");
	check("one record was written", written.created.length, 1);
	check("under the namespaced key", written.created[0]?.body.includes("widgetarium:\n  wgId:"), true);
	check("and the id reads back as one", Boolean(readId(frontmatter(written.created[0]?.body ?? ""))), true);
	check("the strip shows the new tab", tabNames().length, 3);
}

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
	check("and it is the one whose path sorts second", written.updated[0]?.path, `${COPIES}/Copy of Alpha.md`);
	check(
		"the record that sorts first kept the id it had",
		readId(fileAt(`${COPIES}/Alpha.md`)?.props),
		"copied-2222-2222-2222",
	);
	check(
		"the other was given a different one",
		readId(fileAt(`${COPIES}/Copy of Alpha.md`)?.props) === "copied-2222-2222-2222",
		false,
	);
	check("which is still an id", Boolean(readId(fileAt(`${COPIES}/Copy of Alpha.md`)?.props)), true);
	check("and the repair is not offered again", all(".orbi-kanban .ok-repair-ids").length, 0);
}

console.log(failed === 0 ? "\nrecord id: all checks passed" : `\nrecord id: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
