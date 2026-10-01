import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { parse as parseYaml } from "yaml";
import type { App } from "obsidian";
import type { HostPlugin } from "../apps/obsidian/src/host.js";
import { byId, found, foundAs } from "./dom-find.ts";
import { fieldAt } from "./held-fields.ts";
import { isRecord, present } from "./page-dom.ts";
import { standIn } from "./stand-in.ts";

type Props = Record<string, unknown>;

interface FakeNote {
	readonly path: string;
	readonly basename: string;
	readonly extension: string;
	readonly stat: { readonly ctime: number; readonly mtime: number };
	props: Props;
}

interface FakeFolder {
	readonly path: string;
	readonly children: FakeNote[];
}

interface ColumnRow {
	readonly name?: unknown;
	readonly archivedAt?: unknown;
}

const EVERY_VERB = ["list", "get", "create", "update", "remove", "replace", "repairIds"];

const VAULT = "tools/fixture-boards";
const TASKS = "Orbitask/Tasks";
const BOARDS = "Orbitask/Boards";
const NOWHERE = "Orbitask/NotYetMoved";
const NOWHERE_STILL = "Orbitask/StillNotMoved";
const NEVER_MOVED = "Orbitask/NeverMoved";

const dom = new JSDOM(`<!doctype html><body><div class="view-content"><div id="host"></div></div></body>`, {
	pretendToBeVisual: true,
});
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
});
class InertResizeObserver {
	observe(): void {}
	disconnect(): void {}
}
Object.assign(globalThis, { ResizeObserver: InertResizeObserver });
Object.assign(dom.window, { ResizeObserver: InertResizeObserver });
Object.defineProperty(dom.window.HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 1280 });

const { createElement: h } = await import("react");
const { render } = await import("../packages/core/src/engine/render.js");
const { WidgetSurface } = await import("../packages/core/src/surface.js");
const { WidgetRegistry } = await import("../packages/core/src/registry.js");
const { normalizeBoard } = await import("../packages/core/src/model.js");
const { createHost } = await import("../apps/obsidian/src/host.js");
const { TFile, TFolder } = await import("./loader/obsidian-stub.mts");

const adapter = {
	exists: async (target: string) => fs.existsSync(path.join(VAULT, target)),
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
	read: async (target: string) => fs.readFileSync(path.join(VAULT, target), "utf8"),
	stat: async () => ({ mtime: 1, size: 1 }),
};

function frontmatter(text: string): Props {
	const block = /^---\n([\s\S]*?)\n---/.exec(text);
	const parsed: unknown = block ? (parseYaml(block[1] ?? "") ?? {}) : {};
	return isRecord(parsed) ? { ...parsed } : {};
}

const written: {
	readonly created: { readonly target: string; readonly body: string }[];
	readonly updated: { readonly path: string; readonly props: Props }[];
} = { created: [], updated: [] };

function noteAt(target: string, props: Props): FakeNote {
	return Object.assign(new TFile(), {
		path: target,
		basename: target.slice(target.lastIndexOf("/") + 1).replace(/\.md$/, ""),
		extension: "md",
		stat: { ctime: 1, mtime: 2 },
		props,
	});
}

const folders = new Map<string, FakeFolder | null>();
function folderAt(target: string): FakeFolder | null | undefined {
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
	return folders.get(target);
}

function fileAt(target: string): FakeNote | null {
	return folderAt(target.slice(0, target.lastIndexOf("/")))?.children?.find((file) => file.path === target) ?? null;
}

type Listener = (file: FakeNote) => void;

const watchers = new Map<string, Listener[]>();
const watch = (name: string, listener: Listener): object => {
	watchers.set(name, [...(watchers.get(name) ?? []), listener]);
	return {};
};
const unwatch = (name: string, listener: Listener): Map<string, Listener[]> =>
	watchers.set(
		name,
		(watchers.get(name) ?? []).filter((held) => held !== listener),
	);
const fire = (name: string, file: FakeNote): void => {
	for (const listener of [...(watchers.get(name) ?? [])]) listener(file);
};

const appFake = {
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
		cachedRead: async (file: FakeNote) => fs.readFileSync(path.join(VAULT, file.path), "utf8"),
		read: async (file: FakeNote) => fs.readFileSync(path.join(VAULT, file.path), "utf8"),
		process: async () => "",
		on: watch,
		off: unwatch,
	},
	metadataCache: {
		getFileCache: (file: FakeNote) => ({ frontmatter: file.props }),
		on: watch,
		off: unwatch,
	},
	fileManager: {
		processFrontMatter: async (file: FakeNote, edit: (props: Props) => void) => {
			edit(file.props);
			written.updated.push({ path: file.path, props: { ...file.props } });
			fire("changed", file);
		},
	},
	workspace: { getLeaf: () => ({ openFile: async () => {} }) },
};

const app = standIn<App>(appFake, ["vault", "metadataCache", "fileManager", "workspace"], "app");
const host = createHost(
	app,
	standIn<HostPlugin>(
		{ registerEvent: () => {}, addChild: () => {}, removeChild: () => {} },
		["addChild", "removeChild"],
		"plugin",
	),
);
const registry = new WidgetRegistry({ vault: { adapter } });
await registry.load();

const warnings: string[] = [];
console.warn = (...parts: unknown[]) => warnings.push(parts.map((part) => String(part)).join(" "));

const ONE_REGION = {
	dir: "row",
	of: [
		{
			dir: "column",
			keep: true,
			of: [
				{ id: "boards", height: 56 },
				{ id: "board", height: 640 },
			],
		},
	],
};

const named = (tabs: readonly string[]): { name: string }[] => tabs.map((name) => ({ name }));
const PICKED = "boards/selection";

function surfaceOverBoards(boardsPath: string): ReturnType<typeof normalizeBoard> {
	return normalizeBoard({
		tiles: [
			{ id: "boards", widget: "@default/editable-tabs", props: { tabs: { allow: EVERY_VERB, path: boardsPath } } },
			{
				id: "board",
				widget: "@default/kanban-board",
				props: {
					tasks: { allow: EVERY_VERB, path: TASKS, where: [{ prop: "board", op: "is", value: { ref: PICKED } }] },
					boards: { allow: EVERY_VERB, path: boardsPath },
					selection: { from: "ref", ref: PICKED },
				},
			},
		],
		layout: ONE_REGION,
	});
}

function surfaceBoard(
	boardsPath: string,
	tabs: readonly string[] = ["Marketing Team", "Ux Team"],
): ReturnType<typeof normalizeBoard> {
	return normalizeBoard({
		tiles: [
			{ id: "boards", widget: "@default/editable-tabs", props: { tabs: { rows: named(tabs) } } },
			{
				id: "board",
				widget: "@default/kanban-board",
				props: {
					tasks: { allow: EVERY_VERB, path: TASKS, where: [{ prop: "board", op: "is", value: { ref: PICKED } }] },
					boards: { allow: EVERY_VERB, path: boardsPath },
					selection: { from: "ref", ref: PICKED },
				},
			},
		],
		layout: ONE_REGION,
	});
}

let board = surfaceBoard(BOARDS);
const root = byId(dom.window.document, "host");
const draw = (): void =>
	render(
		h(WidgetSurface, {
			boardNode: root,
			board,
			registry,
			host,
			editing: false,
			screen: true,
			initialWidth: 1280,
			onChange: (next: typeof board) => {
				board = next;
				draw();
			},
			onWidth: () => {},
		}),
		root,
	);

const settle = async (times = 40): Promise<void> => {
	for (let index = 0; index < times; index += 1) await new Promise((resolve) => setTimeout(resolve, 1));
};

const start = async (next: typeof board): Promise<void> => {
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
const textOf = (node: Element): string => (node.textContent ?? "").trim();
const titles = (): string[] => all(".orbi-kanban .ok-list-title").map(textOf);
const byText = (selector: string, text: string): Element | undefined =>
	all(selector).find((node) => textOf(node).toLowerCase() === text.toLowerCase());
const click = async (node: Element | null | undefined): Promise<void> => {
	present(node, "the clicked node").dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
	await settle();
};
const dialog = (): Element => found(dom.window.document.body, ".wg-dialog");
const dialogButton = (text: string): Element | undefined =>
	[...dialog().querySelectorAll("button")].find((node) => textOf(node).toLowerCase() === text);
const pickBoard = (name: string): Element | undefined => byText(".wg-tabs .wg-tabs-tab", name);
const fileProps = (name: string): Props | null => fileAt(`${BOARDS}/${name}.md`)?.props ?? null;
const columnRows = (name: string): ColumnRow[] => {
	const held = fileProps(name)?.["columns"];
	if (typeof held === "string") return held.split(",").map((entry) => ({ name: entry.trim() }));
	return Array.isArray(held)
		? held.map((row: unknown): ColumnRow => (typeof row === "string" ? { name: row } : isRecord(row) ? row : {}))
		: [];
};
const columnNames = (name: string): unknown[] => columnRows(name).map((row) => row.name);
const archivedNames = (name: string): unknown[] =>
	columnRows(name)
		.filter((row) => row.archivedAt)
		.map((row) => row.name);

const addColumn = async (name: string): Promise<void> => {
	await click(all(".orbi-kanban .ok-add-list-rest")[0]);
	const field = foundAs(surface(), ".orbi-kanban .ok-list-name", dom.window.HTMLInputElement);
	field.value = name;
	field.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
	await settle();
	await click(all(".orbi-kanban .ok-confirm")[0]);
};

const archiveColumn = async (name: string): Promise<void> => {
	const column = all(".orbi-kanban .ok-list").find((node) => (node.textContent ?? "").includes(name));
	await click(column?.querySelector(".ok-list-remove"));
	await click(dialogButton("archive"));
};

await start(surfaceBoard(BOARDS));

check("the first board draws the columns its own record names", titles(), ["To Do", "Doing", "Done"]);
await click(pickBoard("Ux Team"));
check("the second board draws its own, and only its own", titles(), ["Backlog", "Shipping"]);
check("no column of the first board leaked over", titles().includes("Doing"), false);

await click(pickBoard("Marketing Team"));
check("switching back restores the first board's order", titles(), ["To Do", "Doing", "Done"]);
await click(pickBoard("Ux Team"));
check("and the second board's order is still its own", titles(), ["Backlog", "Shipping"]);

await click(pickBoard("Marketing Team"));
await addColumn("Blocked");
check("the column is drawn on the board it was added to", titles(), ["To Do", "Doing", "Done", "Blocked"]);
check("and it was written to that board's own record", columnNames("Marketing Team"), [
	"To Do",
	"Doing",
	"Done",
	"Blocked",
]);

await click(pickBoard("Ux Team"));
check("the other board does not show it", titles(), ["Backlog", "Shipping"]);
check("and its record was never touched", String(fileProps("Ux Team")?.["columns"]), "Backlog, Shipping");
check(
	"the note itself holds no shared column list",
	fieldAt(board.tiles.find((tile) => tile.id === "board")?.settings, "columns"),
	undefined,
);

await click(pickBoard("Marketing Team"));
check("switching back finds the added column still there", titles(), ["To Do", "Doing", "Done", "Blocked"]);

await archiveColumn("Doing");
check("the archived column leaves the board it was archived on", titles(), ["To Do", "Done", "Blocked"]);
check("the record keeps its name, so a restore is exact", columnNames("Marketing Team"), [
	"To Do",
	"Doing",
	"Done",
	"Blocked",
]);
check("and the column itself carries the day it left", archivedNames("Marketing Team"), ["Doing"]);

await click(pickBoard("Ux Team"));
check("the other board is untouched by the archiving", titles(), ["Backlog", "Shipping"]);
check("and keeps the archived list it arrived with", String(fileProps("Ux Team")?.["archivedColumns"]), "Paused");

await click(pickBoard("Marketing Team"));
await addColumn("Doing");
check("naming an archived column restores it, in its own slot", titles(), ["To Do", "Doing", "Done", "Blocked"]);
check(
	"and the record's archived list is empty again",
	String(fileProps("Marketing Team")?.["archivedColumns"] ?? ""),
	"",
);

await start(surfaceBoard(NOWHERE));
check("with no record on file the board still draws", all(".orbi-kanban").length, 1);
check("from the columns the tile carries", titles(), ["To Do", "Doing", "Done"]);
check("and the strip still lists its tabs", all(".wg-tabs .wg-tabs-tab").map(textOf), ["Marketing Team", "Ux Team"]);
await click(pickBoard("Ux Team"));
check("switching board still works from the old string", all(".orbi-kanban").length, 1);

{
	await start(
		normalizeBoard({
			tiles: [
				{
					id: "boards",
					widget: "@default/editable-tabs",
					props: { tabs: { rows: named(["Marketing Team", "Ux Team"]) } },
				},
				{
					id: "board",
					widget: "@default/kanban-board",
					props: {
						tasks: { allow: EVERY_VERB, path: TASKS, where: [{ prop: "board", op: "is", value: { ref: PICKED } }] },
						boards: { allow: EVERY_VERB, path: NOWHERE_STILL },
						selection: { from: "ref", ref: PICKED },
					},
				},
			],
			layout: ONE_REGION,
		}),
	);
	check("a board with no record of its own draws what the tile carries", titles(), ["To Do", "Doing", "Done"]);
	await click(pickBoard("Ux Team"));
	check("and the board next door draws the same list, plus whatever its tasks carry", titles(), [
		"To Do",
		"Doing",
		"Done",
		"Backlog",
		"Shipping",
	]);
}

{
	await start(
		normalizeBoard({
			tiles: [
				{
					id: "boards",
					widget: "@default/editable-tabs",
					props: { tabs: { rows: named(["Marketing Team", "Ux Team"]) } },
				},
				{
					id: "board",
					widget: "@default/kanban-board",
					props: {
						tasks: { allow: EVERY_VERB, path: TASKS, where: [{ prop: "board", op: "is", value: { ref: PICKED } }] },
						boards: { allow: EVERY_VERB, path: NEVER_MOVED },
						selection: { from: "ref", ref: PICKED },
					},
				},
			],
			layout: ONE_REGION,
		}),
	);
	check("a board with nothing on file draws the columns the manifest names", titles(), ["To Do", "Doing", "Done"]);
	await addColumn("Paused");
	check("and naming a column adds it to the list the tile holds", titles(), ["To Do", "Doing", "Done", "Paused"]);
}

{
	await start(surfaceOverBoards(BOARDS));
	await click(pickBoard("Marketing Team"));
	const columnsBefore = columnNames("Marketing Team");
	written.updated.length = 0;
	await click(all(".wg-tabs .wg-tabs-more")[0]);
	await click(byText(".wg-tabs .wg-kit-pop-item", "Archive"));
	check("archiving a tab takes it off the strip", all(".wg-tabs .wg-tabs-tab").map(textOf), ["Ux Team"]);
	check(
		"the record it archived is the only one written",
		written.updated.map((made) => made.path),
		[`${BOARDS}/Marketing Team.md`],
	);
	check("and it carries the day it was archived", typeof fileProps("Marketing Team")?.["archivedAt"], "string");
	check("the board's columns were not touched", columnNames("Marketing Team"), columnsBefore);

	await click(all(".wg-tabs .wg-tabs-more")[0]);
	await click(byText(".wg-tabs .wg-kit-pop-item", "Archived list"));
	await click([...dialog().querySelectorAll("button")].find((node) => textOf(node) === "Restore"));
	check("restoring puts the tab back", all(".wg-tabs .wg-tabs-tab").map(textOf).sort(), ["Marketing Team", "Ux Team"]);
	check("and the date it carried is gone", fileProps("Marketing Team")?.["archivedAt"], null);
	check("with the columns still untouched", columnNames("Marketing Team"), columnsBefore);
}

check(
	"nothing was refused along the way",
	warnings.filter((line) => line.includes("may not")),
	[],
);

console.log(failed === 0 ? "\nboard record: all checks passed" : `\nboard record: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
