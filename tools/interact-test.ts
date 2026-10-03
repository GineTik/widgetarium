// The render test proved the widgets DRAW. It fed them an empty, read-only slot, so it could
// never prove they WORK — the board it checked was blank. This one gives them the real notes
// and then presses the things a person presses.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { JSDOM } from "jsdom";
import { parse as parseYaml } from "yaml";
import type { App, Command, PluginManifest, TFile as ObsidianFile } from "obsidian";
import type { Board } from "../packages/core/src/model.ts";
import type { GivenProps } from "../packages/core/src/declared-widget.ts";
import type { EngineManifest } from "../packages/core/src/engine/catalogue-index.ts";
import type { ResolvedMounts } from "../packages/core/src/surface/mounts.ts";
import type { MountContext } from "../packages/core/src/surface/widget-host.ts";
import type { HostPlugin } from "../apps/obsidian/src/host.ts";
import type { BlockContext } from "../apps/obsidian/src/draw-block.ts";
import { byId } from "./dom-find.ts";
import { standIn } from "./stand-in.ts";

type NoteProps = Record<string, unknown>;
type NoteFile = ObsidianFile & { props: NoteProps };
type VaultListener = (file: NoteFile) => void;
interface Watching {
	readonly name: string;
	readonly run: VaultListener;
}
interface Created {
	readonly target: string;
	readonly body: string;
}
interface Updated {
	readonly path: string;
	readonly text?: string;
	readonly props?: NoteProps;
}
type PostProcessor = (element: HTMLElement, context: object) => unknown;
interface Fence {
	readonly language: string;
	readonly handler: unknown;
}
type HeldBoard = Board & { readonly properties?: readonly string[] | undefined; readonly context?: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function fieldOf(value: unknown, key: string): unknown {
	if (value === null || value === undefined) throw new TypeError(`cannot read ${key} of ${String(value)}`);
	return isRecord(value) ? value[key] : undefined;
}

function maybeFieldOf(value: unknown, key: string): unknown {
	if (value === null || value === undefined) return undefined;
	return fieldOf(value, key);
}

function listIn(value: unknown): unknown[] {
	if (!Array.isArray(value)) throw new TypeError(`${String(value)} is not a list`);
	return value;
}

function call(target: unknown, method: string, ...args: unknown[]): unknown {
	const run = fieldOf(target, method);
	if (typeof run !== "function") throw new TypeError(`${method} is not a function`);
	return Reflect.apply(run, target, args);
}

function recordIn(value: unknown, what: string): Record<string, unknown> {
	if (!isRecord(value)) throw new TypeError(`${what} is not an object`);
	return value;
}

function present<T>(value: T | null | undefined, what: string): T {
	if (value === null || value === undefined) throw new TypeError(`${what} is missing`);
	return value;
}

const EVERY_VERB = ["list", "get", "create", "update", "remove", "replace", "repairIds"];

const VAULT = process.env["WG_VAULT"] ?? "tools/fixture";
const FOLDER = "Orbitask/Tasks";
const KANBAN_VIEW = "Kanban";

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
	Object.assign(globalThis, { [key]: key === "window" ? dom.window : Reflect.get(dom.window, key) });
}
Object.assign(globalThis, {
	ResizeObserver: class {
		observe() {}
		disconnect() {}
	},
});
globalThis.window.setTimeout = globalThis.window.setTimeout ?? setTimeout;
globalThis.window.ResizeObserver = globalThis.ResizeObserver;
Object.defineProperty(dom.window.HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 1280 });

const { createElement: h } = await import("react");
const { render } = await import("../packages/core/src/engine/render.js");
const { WidgetSurface, resolveMounts } = await import("../packages/core/src/surface.js");
const { WidgetRegistry, declaredName } = await import("../packages/core/src/registry.js");
const { CATALOGUE_REQUESTS } = await import("../packages/core/src/engine/catalogue-requests.js");
const { normalizeBoard, serializeBoard } = await import("../packages/core/src/model.js");
const { leavesOf } = await import("../packages/core/src/tree.js");
const { findBlocks } = await import("../packages/core/src/block-writer.js");
const { createHost } = await import("../apps/obsidian/src/host.js");
const { TFile, TFolder } = await import("obsidian");

const adapter = {
	exists: async (p: string) => fs.existsSync(path.join(VAULT, p)),
	list: async (p: string) => {
		// statSync FOLLOWS symlinks; dirent.isDirectory() does not. A linked widget scope
		// reported as neither folder nor file, so the whole scope was silently skipped and
		// the board rendered "widget not found" placeholders the test then counted as tiles.
		const names = fs.readdirSync(path.join(VAULT, p));
		const kind = (name: string) => {
			try {
				return fs.statSync(path.join(VAULT, p, name));
			} catch {
				return null;
			}
		};
		return {
			folders: names.filter((name) => kind(name)?.isDirectory()).map((name) => `${p}/${name}`),
			files: names.filter((name) => kind(name)?.isFile()).map((name) => `${p}/${name}`),
		};
	},
	read: async (p: string) => fs.readFileSync(path.join(VAULT, p), "utf8"),
	stat: async () => ({ mtime: 1, size: 1 }),
};

// The slot comes from apps/obsidian/src/host.js — the adapter that ships. Building one here is how the
// board passed this test while being dead in the app.
const written: { created: Created[]; updated: Updated[] } = { created: [], updated: [] };
const notices: string[] = [];
// note text lives here, so a body write never reaches the user's own vault
const texts = new Map<string, string>();
const propsByPath = new Map<string, NoteProps>();
const vaultWatchers = new Map<string, Set<VaultListener>>();
const watch = (name: string, run: VaultListener): Watching => {
	let held = vaultWatchers.get(name);
	if (!held) {
		held = new Set();
		vaultWatchers.set(name, held);
	}
	held.add(run);
	return { name, run };
};
const unwatch = (held: Watching | undefined) => {
	if (!held) return;
	vaultWatchers.get(held.name)?.delete(held.run);
};
const announce = (name: string, file: NoteFile) => {
	for (const run of [...(vaultWatchers.get(name) ?? [])]) run(file);
};

function frontmatter(text: string): NoteProps {
	const body = /^---\n([\s\S]*?)\n---/.exec(text)?.[1];
	if (body === undefined) return {};
	const parsed: unknown = parseYaml(body);
	return isRecord(parsed) ? parsed : {};
}

function vaultFiles(folder: string): NoteFile[] {
	return fs
		.readdirSync(path.join(VAULT, folder))
		.filter((name) => name.endsWith(".md"))
		.map((name) => {
			const at = `${folder}/${name}`;
			let props = propsByPath.get(at);
			if (!props) {
				props = frontmatter(fs.readFileSync(path.join(VAULT, folder, name), "utf8"));
				propsByPath.set(at, props);
			}
			return Object.assign(new TFile(), {
				path: `${folder}/${name}`,
				basename: name.replace(/\.md$/, ""),
				extension: "md",
				stat: { ctime: 1, mtime: 2 },
				props,
			});
		});
}

const folders = new Map<string, InstanceType<typeof TFolder> | null>();
const app = {
	vault: {
		// A path is a FILE as often as a folder, and a stub that only answers for folders makes
		// every write silently do nothing — update() looks the file up first and gives up when
		// it is not there.
		getAbstractFileByPath: (target: string) => {
			if (target.endsWith(".md")) {
				const folder = target.slice(0, target.lastIndexOf("/"));
				return vaultFiles(folder).find((file) => file.path === target) ?? null;
			}
			if (!folders.has(target)) {
				try {
					folders.set(target, Object.assign(new TFolder(), { path: target, children: vaultFiles(target) }));
				} catch {
					folders.set(target, null);
				}
			}
			return folders.get(target);
		},
		create: async (target: string, body: string) => {
			written.created.push({ target, body });
			return vaultFiles("Orbitask/Tasks")[0];
		},
		cachedRead: async (file: NoteFile) => texts.get(file.path) ?? fs.readFileSync(path.join(VAULT, file.path), "utf8"),
		process: async (file: NoteFile, edit: (text: string) => string) => {
			const next = edit(texts.get(file.path) ?? fs.readFileSync(path.join(VAULT, file.path), "utf8"));
			texts.set(file.path, next);
			written.updated.push({ path: file.path, text: next });
			announce("modify", file);
			return next;
		},
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
			announce("changed", file);
		},
	},
	workspace: { getLeaf: () => ({ openFile: async () => {} }) },
};

// CONTEXT: renderMarkdown parents a MarkdownRenderChild on the plugin, and unparents it on cleanup
const children: unknown[] = [];
const realHost = createHost(
	standIn<App>(app, ["vault", "metadataCache", "fileManager", "workspace"], "app"),
	standIn<HostPlugin>(
		{
			registerEvent: () => {},
			addChild: (child: unknown) => children.push(child),
			removeChild: (child: unknown) => children.splice(children.indexOf(child), 1),
		},
		["addChild", "removeChild"],
		"plugin",
	),
);
// the widget speaks to the person through host.ui.notify; a test that cannot hear it cannot
// tell "refused and said why" from "silently did nothing"
const host = { ...realHost, ui: { ...realHost.ui, notify: (message: string) => notices.push(String(message)) } };

const registry = new WidgetRegistry({ vault: { adapter } });
await registry.load();

const readBoard = (shape: unknown): HeldBoard =>
	normalizeBoard(
		shape,
		(id) => id,
		(id) => {
			const name = declaredName(registry, id);
			return typeof name === "string" ? name : null;
		},
	);

// The board is built HERE, not read from a note. Pointing this at a live page tied the
// suite to whatever was last clicked in the app: a tile deleted there failed a test about
// search. The note proves the format; this proves the behaviour.
// CONTEXT: a refusal that says nothing reads exactly like a rule that never ran
const warnings: string[] = [];
console.warn = (...parts: unknown[]) => {
	warnings.push(parts.map((part) => String(part)).join(" "));
};
const reactComplaints: string[] = [];
console.error = (...parts: unknown[]) => {
	const said = parts.map((part) => String(part)).join(" ");
	const [firstLine = ""] = said.split("\n");
	if (/unique "key"|flushSync|unmount a root/.test(said)) reactComplaints.push(firstLine);
};

const KANBAN = "@default/kanban-board";
const ARCHIVED = "@default/archived-columns";

// CONTEXT: the kanban is MOUNTED in a view group now, so its settings live one level down
const READING_PLACES = [
	{ id: "panel", x: 0, y: 0, w: 4, h: 15 },
	{ id: "header", x: 4, y: 0, w: 16, h: 2 },
	{ id: "boards", x: 4, y: 2, w: 16, h: 1 },
	{ id: "views", x: 4, y: 3, w: 16, h: 1 },
	{ id: "filters", x: 4, y: 4, w: 16, h: 1 },
	{ id: "board", x: 4, y: 5, w: 16, h: 10 },
];

let board: HeldBoard = readBoard({
	tiles: [
		{
			id: "boards",
			widget: "@default/editable-tabs",
			props: {
				getTabs: {
					implementation: "@core/typed-rows",
					fields: { rows: [{ name: "Marketing Team" }, { name: "Ux Team" }] },
				},
			},
		},
		{
			id: "views",
			widget: "@default/view-tabs",
			props: {
				options: { implementation: "@core/from-tile-rows", fields: { ref: "board/holds" } },
				selection: { implementation: "@core/from-tile-value", fields: { ref: "board/selection" } },
			},
		},
		{
			id: "filters",
			widget: "@default/filter-panel",
			props: { tasks: { implementation: "@obsidian/folder", fields: { path: FOLDER }, allow: EVERY_VERB } },
		},
		{
			id: "board",
			widget: "@default/view-group",
			settings: {
				holds: [
					{ name: "Kanban", widget: KANBAN },
					{ name: "Archived columns", widget: ARCHIVED },
				],
			},
			mounted: {
				"Archived columns": {
					widget: ARCHIVED,
					props: {
						boards: { implementation: "@obsidian/folder", fields: { path: "Orbitask/Boards" }, allow: EVERY_VERB },
						selection: { implementation: "@core/from-tile-value", fields: { ref: "boards/selection" } },
					},
				},
				Kanban: {
					widget: KANBAN,
					props: {
						tasks: {
							implementation: "@obsidian/folder",
							fields: {
								path: FOLDER,
								where: [
									{ prop: "board", op: "is", value: { ref: "boards/selection" } },
									{ spread: { ref: "filters/chosen" } },
								],
							},
							allow: EVERY_VERB,
						},
						boards: { implementation: "@obsidian/folder", fields: { path: "Orbitask/Boards" }, allow: EVERY_VERB },
						selection: { implementation: "@core/from-tile-value", fields: { ref: "boards/selection" } },
					},
				},
			},
		},
	],
	// CONTEXT: the filter bar reads this list — a property the board names is one it can filter by
	properties: ["Status", "Priority", "Assignees"],
	layouts: { 20: { places: READING_PLACES } },
});

let editing = false;
const root = byId(dom.window.document, "host");
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
			onWidth: () => {},
		}),
		root,
	);

// A click writes the shared selection, the widget re-renders, its effect re-runs, the slot
// answers a promise and only then does the row count change. Counting after one turn of the
// loop measured the board BEFORE its own query came back.
const settle = async (times = 40) => {
	for (let i = 0; i < times; i += 1) await new Promise((resolve) => setTimeout(resolve, 1));
};

draw();
await settle();

let failed = 0;
const check = (label: string, got: unknown, want: unknown) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK " : "!! "} ${label}${ok ? ` — ${JSON.stringify(got)}` : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`}`,
	);
};

// An expanded board renders into a portal outside the mount element, so the page has to be
// looked for where it actually is — the same board either way, which is the point.
const surface = () => dom.window.document.querySelector(".wg-page") ?? root;
const all = (selector: string) => [...surface().querySelectorAll(selector)].filter((node) => !node.closest("[hidden]"));
const cards = () => all(".orbi-kanban .ok-card-slot").length;
const byText = (selector: string, text: string) =>
	all(selector).find((node) => node.textContent.trim().toLowerCase() === text.toLowerCase());
const asInput = (node: Element | undefined): HTMLInputElement | undefined => {
	if (node === undefined) return undefined;
	if (!(node instanceof dom.window.HTMLInputElement)) throw new TypeError("the field is not an input");
	return node;
};
const inside = (node: Element | null | undefined, selector: string) =>
	present(node, `the node holding ${selector}`).querySelector(selector);
const firstOf = (selector: string) => present(all(selector)[0], `the first ${selector}`);
const click = async (node: Element | null | undefined) => {
	present(node, "the node to press").dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
	await settle();
};

// CONTEXT: a dialog is portalled onto document.body, outside the surface all() searches
const dialog = () => dom.window.document.body.querySelector(".wg-dialog");
const dialogButton = (text: string) =>
	[...present(dialog(), "the dialog").querySelectorAll("button")].find(
		(node) => node.textContent.trim().toLowerCase() === text,
	);

const noteTitles = new Set(vaultFiles(FOLDER).map((file) => file.props["title"] ?? file.basename));

// 1. the board draws the real notes
check("the board shows cards from real notes", cards() > 0, true);

// The baseline is taken WITH a board selected, not before: unselected means unfiltered, and
// comparing a later filtered count against that would fail on the board filter working.
const marketingTab = byText(".wg-tabs:not(.wg-tree-swap-strip) button", "Marketing Team");
if (marketingTab) await click(marketingTab);
const marketing = cards();
check("selecting a board narrows to its own tasks", marketing > 0 && marketing <= 10, true);

// 2. a board tab steers it
const uxTab =
	byText(".wg-tabs:not(.wg-tree-swap-strip) button", "Ux Team") ??
	byText(".wg-tabs:not(.wg-tree-swap-strip) button", "UX Team");
check("the second board tab exists", Boolean(uxTab), true);
if (uxTab) {
	await click(uxTab);
	check("switching board changes what is shown", cards() !== marketing, true);
	check("and it is not empty", cards() > 0, true);
	const back = byText(".wg-tabs:not(.wg-tree-swap-strip) button", "Marketing Team");
	if (back) {
		await click(back);
		check("switching back restores the first board", cards(), marketing);
	}
}

// CONTEXT: the search that narrowed the board lived in page-header, which is gone — the widget
// searched by writing a context key, and that law is proved in engine-test without it

// 5. adding a task reaches the adapter — a task is NAMED when it is made, the way a list is,
// so the button opens a composer and nothing is written until the name is confirmed
const add = all(".orbi-kanban .ok-add-task").find((node) => /add/i.test(node.textContent));
check("there is an add control", Boolean(add), true);
if (add) {
	await click(add);
	check("pressing it writes nothing yet", written.created.length, 0);
	const naming = asInput(all(".orbi-kanban .ok-task-name")[0]);
	check("it asks for a name first", Boolean(naming), true);
	if (!naming) throw new TypeError("the task name field is missing");
	naming.value = "Sweep the yard";
	naming.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
	// CONTEXT: Enter reads the name off state, so the typing has to have landed before it
	await settle();
	naming.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
	await settle();
	check("confirming asks the adapter to create a note", written.created.length > 0, true);
	check("under the name that was typed", String(written.created.at(-1)?.body ?? "").includes("Sweep the yard"), true);
}

// 6. opening a card opens the task dialog, which is portalled onto <body>
const card = all(".orbi-kanban .ok-card-slot")[0];
if (card) {
	await click(card);
	const opened = dom.window.document.body.querySelector(".orbi-task-dialog");
	check("opening a card opens the task dialog", Boolean(opened?.querySelector(".otd-title")?.textContent.trim()), true);
	// CONTEXT: the dialog is a scrim over the board, and every check below reads the board
	await click(present(opened, "the task dialog").querySelector(".otd-corner button:last-child"));
	check(
		"and closing it hands the board back",
		Boolean(dom.window.document.body.querySelector(".orbi-task-dialog")),
		false,
	);
}

// REGRESSION: the card read only its own settings, so ten different notes rendered as ten
// copies of the design mock — "Design the onboarding flow", 60%, 12 Aug, on every one.
const titles = all(".orbi-task-card-title").map((node) => node.textContent.trim());
check("the board drew a card per note", titles.length > 1, true);
check("and they are not all the same text", new Set(titles).size > 1, true);
check(
	"every title really comes from a note",
	titles.every((title) => noteTitles.has(title)),
	true,
);

// a note that carries no comments count must not show one
const bare = written.created.length >= 0 && vaultFiles(FOLDER).find((file) => file.props["comments"] === undefined);
if (bare) {
	const card = all(".orbi-task-card").find(
		(node) =>
			node.querySelector(".orbi-task-card-title")?.textContent.trim() === (bare.props["title"] ?? bare.basename),
	);
	if (card) {
		const metaCount = card.querySelectorAll(".orbi-task-card-meta > *").length;
		check(`"${String(bare.props["title"] ?? bare.basename)}" hides what its note does not carry`, metaCount < 4, true);
	}
}

// TODO: restore the end-to-end fold test — the sidebar was the only widget that offered a fold
// control, and it has been removed from the product. The engine still exposes size.collapse()
// and size.expand() (packages/core/src/surface.js:238), so the capability is now WRITE-ONLY: nothing in the
// product calls it and nothing proves it works. Either a widget takes it up again, or the
// engine drops it, and nothing at the model level covers it either.

draw();
await settle();

// THE FILTER PANEL. A button that opens a panel of checkboxes built from the DATA, and an
// Apply that narrows the board — the draft is local until then, so ticking four boxes does not
// re-query the vault four times.
const openFilter = all(".orbi-filter .ofp-open")[0];
check("there is a filter control", Boolean(openFilter), true);
await click(openFilter);
check("it opens a panel", all(".orbi-filter .ofp-panel").length, 1);

// THE BAR FOLLOWS THE BOARD. The field list used to be a colon-separated string in a setting,
// so a board could name a property, the dialog could write it, and it was still not filterable.
const groupHeads = all(".orbi-filter .ofp-group-head").map((node) => node.textContent.trim());
check("the panel offers a group per property the notes carry", groupHeads, ["Approval", "Priority"]);
check("and drops Status, because the columns are the status", groupHeads.includes("Status"), false);
check("and it offers more than one", groupHeads.length > 1, true);

// THE BAR IS THE KIT'S NOW. Four hand-drawn icons, a hand-rolled search field and a tick rule
// of its own were each a second copy of something the kit already carried — and each drifted.
{
	check("the bar's search is the kit's", all(".orbi-filter .wg-kit-pop-search-field").length, 1);
	check("its buttons are the kit's", all(".orbi-filter .ofp-foot .wg-kit-btn").length, 2);
	check("and it draws no tick of its own", all(".orbi-filter .ofp-tick").length, 0);
}

// open the priority group and tick a value that really exists in the vault
const priorityHead = all(".orbi-filter .ofp-group-head").find((node) => /priority/i.test(node.textContent));
await click(priorityHead);
const options = all(".orbi-filter .ofp-option");
check("its choices come from the notes", options.length > 0, true);
check(
	"and every one of them is the kit's own item",
	options.every((node) => node.classList.contains("wg-kit-pop-item")),
	true,
);
check(
	"with the kit's tick inside it, not one of ours",
	options.every((node) => Boolean(node.querySelector(".wg-kit-pop-tick"))),
	true,
);

const beforeApply = cards();
await click(options[0]);
check("ticking is a draft — the board has not moved", cards(), beforeApply);

await click(all(".orbi-filter .ofp-apply")[0]);
check("applying narrows the board", cards() < beforeApply, true);
// CONTEXT: the panel outlives `open` so it can fold back into the trigger — is-open is the
// truth about whether it is still a live surface, not whether the node exists
// CONTEXT: the panel outlives `open` to fold back into the trigger, and jsdom fires no
// transitionend — so the proof that Apply dismissed it is that the fold STARTED
check("and the panel starts folding away", all(".orbi-filter .wg-kit-pop.is-exiting").length, 1);
check("the control says how many are on", all(".orbi-filter .ofp-count").length, 1);

await click(all(".orbi-filter .ofp-open")[0]);
await click(all(".orbi-filter .ofp-reset")[0]);
check("Reset All puts every task back", cards(), beforeApply);

// COLUMNS AND BOARDS ARE SETTINGS, and until now the widgets had no way to change one. "Add
// List" called addTask with the list's name as a status, so a column appeared only as a side
// effect of the data gaining a value nobody asked for — with a stray task in it. "Add Board"
// had no handler at all.
const tabRowsOf = (id: string) =>
	listIn(fieldOf(board.tiles.find((tile) => tile.id === id)?.props["getTabs"]?.fields, "rows") ?? []).map(
		(row) => fieldOf(row, "value") ?? row,
	);
const tabFieldOf = (row: unknown, field: string) =>
	maybeFieldOf(maybeFieldOf(row, "props"), field) ?? maybeFieldOf(row, field);
// CONTEXT: a mounted widget persists under the NAME the board gave it, not under its widget id
const tileNamed = (id: string) => board.tiles.find((tile) => tile.id === id);
const boardNote = (name: string) => vaultFiles("Orbitask/Boards").find((file) => file.props["board"] === name);
const boardColumns = (name: string) =>
	listIn(boardNote(name)?.props["columns"] ?? []).map((row) => maybeFieldOf(row, "name") ?? row);
const boardArchived = (name: string) =>
	listIn(boardNote(name)?.props["columns"] ?? [])
		.filter((row) => maybeFieldOf(row, "archivedAt"))
		.map((row) => fieldOf(row, "name"));

{
	const columnsBefore = all(".orbi-kanban .ok-list").length;
	const tasksBefore = cards();

	await click(all(".orbi-kanban .ok-add-list-rest")[0]);
	const nameField = asInput(all(".orbi-kanban .ok-list-name")[0]);
	check("Add List opens a field", Boolean(nameField), true);
	if (!nameField) throw new TypeError("the list name field is missing");

	nameField.value = "Blocked";
	nameField.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
	// the field's own state has to reach the confirm button before it is pressed, or the button
	// is still holding the empty name it was rendered with
	await settle();
	await click(all(".orbi-kanban .ok-confirm")[0]);

	check("a column was added", all(".orbi-kanban .ok-list").length, columnsBefore + 1);
	check("and it is written in the note the board keeps", boardColumns("Marketing Team").includes("Blocked"), true);
	// THE LAZY MIGRATION, MEASURED ON A REAL EDIT. The board arrived with the record under the
	// widget id; the first write moves it onto the name and takes the old key with it.
	check("the view the group held is a tile of the board's own", Boolean(tileNamed(`board:${KANBAN_VIEW}`)), true);
	check(
		"the holder it arrived in is gone",
		board.tiles.some((tile) => tile.widget === "@default/view-group"),
		false,
	);
	check(
		"and the props it held came across",
		fieldOf(tileNamed(`board:${KANBAN_VIEW}`)?.props["tasks"]?.fields, "path"),
		FOLDER,
	);
	check("no task was invented to make it appear", cards(), tasksBefore);

	// ARCHIVING ASKS FIRST. The control no longer deletes, so pressing it changes nothing until
	// the dialog is confirmed — and the board is re-rendered after each click, so re-find the node.
	const listNamed = (name: string) =>
		all(".orbi-kanban .ok-list").find((node) => new RegExp(name).test(node.textContent));

	await click(inside(listNamed("Blocked"), ".ok-list-remove"));
	check("the archive control asks first", Boolean(dialog()), true);
	check("and nothing has left the board yet", all(".orbi-kanban .ok-list").length, columnsBefore + 1);
	await click(dialogButton("cancel"));
	check("Cancel keeps the column", all(".orbi-kanban .ok-list").length, columnsBefore + 1);

	await click(inside(listNamed("Blocked"), ".ok-list-remove"));
	await click(dialogButton("archive"));
	check("confirming archives it", all(".orbi-kanban .ok-list").length, columnsBefore);
	// THE NAME STAYS AUTHORED. Archiving used to strike it out of `columns`, so a restore had to
	// guess where the column went and appended it; keeping it is what makes the way back exact.
	check("the name stays authored on the board", boardColumns("Marketing Team").includes("Blocked"), true);
	check("and it is the column itself that carries the archiving", boardArchived("Marketing Team"), ["Blocked"]);
	check(
		"the board block keeps no map of archived columns",
		fieldOf(serializeBoard(board), "archivedColumns"),
		undefined,
	);
	check("nor a second list on the tile", tileNamed(`board:${KANBAN_VIEW}`)?.props["archivedColumns"], undefined);

	// A COLUMN WITH TASKS IS ARCHIVED TOO. Refusing was right while removal was permanent;
	// archiving is reversible, so the count in the dialog is the warning instead.
	const writesBefore = written.updated.filter((entry) => entry.path.startsWith(FOLDER)).length;
	const cardsBefore = cards();
	const held = Number(present(inside(listNamed("To Do"), ".wg-kit-count"), "the count").textContent.trim());
	check("the column under test holds tasks", held > 0, true);
	await click(inside(listNamed("To Do"), ".ok-list-remove"));
	check(
		"the dialog says how many disappear",
		new RegExp(`${held} task`).test(present(dialog(), "the dialog").textContent),
		true,
	);
	await click(dialogButton("archive"));
	check("a busy column is archived, not refused", all(".orbi-kanban .ok-list").length, columnsBefore - 1);
	check("its tasks leave the view", cards(), cardsBefore - held);
	check(
		"and no task was rewritten",
		written.updated.filter((entry) => entry.path.startsWith(FOLDER)).length,
		writesBefore,
	);
}

// THE VIEW IS THE PROOF, NOT THE SETTING. The archived list lived in the kanban's own mount, and
// the archived view is the kanban's SIBLING — the two never draw together, so it read nothing.
{
	const viewsTile = () => all('[data-cell="views"]')[0];
	const showView = async (name: string) => {
		await click(inside(viewsTile(), ".ovt-pick"));
		await click(
			[...present(viewsTile(), "the views tile").querySelectorAll(".wg-kit-pop-item")].find((node) =>
				node.textContent.trim().startsWith(name),
			),
		);
	};
	const archivedRows = () => all(".orbi-archived-columns .wg-kit-row");
	const archivedNames = () =>
		archivedRows().map((node) => present(node.querySelector(".wg-kit-row-label"), "the row label").textContent.trim());
	const cardsWithoutIt = cards();

	await showView("Archived columns");
	check(
		"the archived view draws while the kanban does not",
		`${all(".orbi-archived-columns").length}|${all(".orbi-kanban").length}`,
		"1|0",
	);
	check("and it LISTS what was archived, in the order the board authored them", archivedNames(), ["To Do", "Blocked"]);

	const rowNamed = (name: string) =>
		archivedRows().find(
			(node) => present(node.querySelector(".wg-kit-row-label"), "the row label").textContent.trim() === name,
		);
	await click(inside(rowNamed("To Do"), "button"));
	check("Restore takes the column off the list", archivedNames(), ["Blocked"]);

	await showView("Kanban");
	check("and puts it back on the board", all(".orbi-kanban .ok-list").length, 3);
	// the position is the point: appending it would pass a count and still move the column
	check(
		"in the place it was archived from",
		all(".orbi-kanban .ok-list-title").map((node) => node.textContent.trim()),
		["To Do", "Doing", "Done"],
	);
	check("and its tasks came back with it", cards() > cardsWithoutIt, true);

	// CONTEXT: on the note, every board read one list — archived on one, shown on all
	const firstBoard = () => byText(".wg-tabs:not(.wg-tree-swap-strip) button", "Marketing Team");
	const otherBoard = () =>
		byText(".wg-tabs:not(.wg-tree-swap-strip) button", "Ux Team") ??
		byText(".wg-tabs:not(.wg-tree-swap-strip) button", "UX Team");
	const columnNamed = (name: string) => all(".orbi-kanban .ok-list").find((node) => node.textContent.includes(name));

	await showView("Archived columns");
	check("the board it was archived on lists it", archivedNames(), ["Blocked"]);

	await click(otherBoard());
	check("the next board over lists nothing", archivedNames(), []);

	await click(firstBoard());
	check("and switching back brings the list with it", archivedNames(), ["Blocked"]);

	await click(otherBoard());
	await showView("Kanban");
	await click(inside(columnNamed("Done"), ".ok-list-remove"));
	await click(dialogButton("archive"));
	await showView("Archived columns");
	check("a second board lists what was archived on it", archivedNames(), ["Done"]);

	await click(firstBoard());
	check("and the first board still lists only its own", archivedNames(), ["Blocked"]);
	check(
		"each board note keeps its own",
		[boardArchived("Marketing Team"), boardArchived("Ux Team")],
		[["Blocked"], ["Done"]],
	);

	await click(otherBoard());
	await click(inside(archivedRows()[0], "button"));
	check("Restore empties the second board's list", archivedNames(), []);

	await click(firstBoard());
	check("and leaves the first board's alone", archivedNames(), ["Blocked"]);
	await showView("Kanban");
}

{
	const tabsBefore = all(".wg-tabs:not(.wg-tree-swap-strip) .wg-tabs-tab").length;
	await click(all(".wg-tabs:not(.wg-tree-swap-strip) .wg-tabs-more")[0]);
	await click(byText(".wg-tabs:not(.wg-tree-swap-strip) .wg-kit-pop-item", "Add"));
	check("Add Board adds a tab", all(".wg-tabs:not(.wg-tree-swap-strip) .wg-tabs-tab").length, tabsBefore + 1);
	check(
		"named Untitled 1",
		tabRowsOf("boards").some((row) => tabFieldOf(row, "name") === "Untitled 1"),
		true,
	);
	// the board's own selection is not reachable from here — the visible truth is which tab
	// the kit's thumb sits on, which is the tab marked selected, and what a person sees anyway
	const active = all('.wg-tabs:not(.wg-tree-swap-strip) .wg-tabs-tab[aria-selected="true"]').map((node) =>
		node.textContent.trim(),
	);
	check("and it becomes the selected board", active, ["Untitled 1"]);

	// the new tab opens ready to be renamed, in place
	const editable = all('.wg-tabs:not(.wg-tree-swap-strip) .wg-tabs-tab[contenteditable="true"]');
	check("the new board is editable where it stands", editable.length, 1);
}

// EDITING A NAME WHERE IT IS READ. A field that appears and then waits to be clicked, and a
// heading that can only be changed somewhere else, are both a step the person did not ask for.
{
	await click(all(".orbi-kanban .ok-add-list-rest")[0]);
	const field = all(".orbi-kanban .ok-list-name")[0];
	// CONTEXT: React hangs a fiber off the node, so a DOM node cannot be compared by JSON
	check("the new-list field takes focus by itself", dom.window.document.activeElement === field, true);
	present(field, "the new-list field").dispatchEvent(
		new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
	);
	await settle();

	// back to a board that has tasks: the previous block selected a new empty one, and a rename
	// that touches nothing proves nothing
	const marketing = all(".wg-tabs:not(.wg-tree-swap-strip) .wg-tabs-tab").find((node) =>
		/Marketing/.test(node.textContent),
	);
	await click(marketing);

	// RENAMING A COLUMN MUST REACH THE TASKS. The heading is a setting; what files a task under
	// it is the property in its note — changing only the heading empties the column.
	const heading = all(".orbi-kanban .ok-list-title").find((node) => node.textContent.trim() === "Doing");
	if (!heading) throw new TypeError("the Doing heading is missing");
	check("a column heading is editable in place", heading.getAttribute("contenteditable"), "true");

	const inDoing = vaultFiles(FOLDER).filter((file) => file.props["status"] === "Doing").length;
	check("there are tasks to carry over", inDoing > 0, true);

	heading.textContent = "In progress";
	heading.dispatchEvent(new dom.window.FocusEvent("blur"));
	heading.dispatchEvent(new dom.window.FocusEvent("focusout", { bubbles: true }));
	await settle();
	await settle();

	// each write waits on the vault to confirm the change, and that confirmation is a real
	// round trip — a 30ms settle is not a measurement of it
	await new Promise((resolve) => setTimeout(resolve, 900));

	check("the board note carries the new name", boardColumns("Marketing Team").includes("In progress"), true);
	check("and the old one is gone from it", boardColumns("Marketing Team").includes("Doing"), false);
	check(
		"every task that was in it was rewritten",
		written.updated.filter((entry) => present(entry.props, "the written props")["status"] === "In progress").length > 0,
		true,
	);
}

{
	// ONE MENU, NOT A PAIR OF BUTTONS. The pencil and the tick are gone; renaming is a menu
	// item, and Enter or blur commits. The menu stands beside the capsule, never inside a tab.
	const more = all(".wg-tabs:not(.wg-tree-swap-strip) .wg-tabs-more")[0];
	check("the board row offers a menu", Boolean(more), true);
	check(
		"and it stands outside the tab capsule",
		Boolean(present(more, "the board menu").closest(".wg-kit-seg")),
		false,
	);

	await click(more);
	// CONTEXT: the panel stays in the DOM when shut, so only is-open proves it opened
	check("the menu opens", all(".wg-tabs:not(.wg-tree-swap-strip) .wg-kit-pop.is-open").length, 1);

	await click(byText(".wg-tabs:not(.wg-tree-swap-strip) .wg-kit-pop-item", "Rename"));
	check(
		"and Rename edits the selected tab in place",
		all('.wg-tabs:not(.wg-tree-swap-strip) .wg-tabs-tab[contenteditable="true"]').length,
		1,
	);
}

{
	// THE LAW THE STRIP IS BUILT ON: it is never empty. Archive every board, including the last
	// one, and a fresh Untitled must be standing there — a board bar with nothing on it offers
	// the person no way back in.
	const archive = async () => {
		await click(all(".wg-tabs:not(.wg-tree-swap-strip) .wg-tabs-more")[0]);
		await click(byText(".wg-tabs:not(.wg-tree-swap-strip) .wg-kit-pop-item", "Archive"));
	};

	let guard = 0;
	while (all(".wg-tabs:not(.wg-tree-swap-strip) .wg-tabs-tab").length > 1 && guard < 12) {
		await archive();
		guard += 1;
	}
	check("archiving hands the strip down to one board", all(".wg-tabs:not(.wg-tree-swap-strip) .wg-tabs-tab").length, 1);

	const last = firstOf(".wg-tabs:not(.wg-tree-swap-strip) .wg-tabs-tab").textContent.trim();
	await archive();
	check("archiving the LAST board still leaves one", all(".wg-tabs:not(.wg-tree-swap-strip) .wg-tabs-tab").length, 1);
	check(
		"and the one left is a fresh Untitled",
		/^Untitled \d+$/.test(firstOf(".wg-tabs:not(.wg-tree-swap-strip) .wg-tabs-tab").textContent.trim()),
		true,
	);
	check(
		"which is not the board just archived",
		firstOf(".wg-tabs:not(.wg-tree-swap-strip) .wg-tabs-tab").textContent.trim() === last,
		false,
	);
	check(
		"the archived board was remembered, not lost",
		Boolean(
			tabFieldOf(
				tabRowsOf("boards").find((row) => tabFieldOf(row, "name") === last),
				"archivedAt",
			),
		),
		true,
	);
}

// THE BOARD IS NEVER EMPTY EITHER. Archiving is the one way a column leaves, and the last one
// out is replaced rather than removed — a board with no columns is not a board.
{
	for (let guard = 0; all(".orbi-kanban .ok-list").length > 0 && guard < 12; guard += 1) {
		await click(firstOf(".orbi-kanban .ok-list").querySelector(".ok-list-remove"));
		await click(dialogButton("archive"));
	}
	check("one column survives archiving them all", all(".orbi-kanban .ok-list").length, 1);
	// the NUMBER is not the law — the free one is picked around every name already taken,
	// archived ones included, so asserting "Untitled 1" would only pin the order of this file
	check(
		"and it is a fresh untitled one",
		/^Untitled \d+$/.test(firstOf(".orbi-kanban .ok-list-title").textContent.trim()),
		true,
	);
}

// CONTEXT: one tile, several whole widgets, one of them on screen
const groupBoard = (views: string, archived: unknown = null) =>
	readBoard({
		tiles: [
			{
				id: "boards",
				widget: "@default/editable-tabs",
				props: { getTabs: { implementation: "@core/typed-rows", fields: { rows: [{ name: "Marketing Team" }] } } },
			},
			{
				id: "views",
				widget: "@default/view-tabs",
				props: {
					options: { implementation: "@core/from-tile-rows", fields: { ref: "board/holds" } },
					selection: { implementation: "@core/from-tile-value", fields: { ref: "board/selection" } },
				},
			},
			{
				id: "board",
				widget: "@default/view-group",
				settings: { views },
				mounted: {
					"Archived columns": {
						widget: ARCHIVED,
						props: {
							boards: { implementation: "@obsidian/folder", fields: { path: "Orbitask/Boards" }, allow: EVERY_VERB },
							selection: { implementation: "@core/from-tile-value", fields: { ref: "boards/selection" } },
						},
					},
					Kanban: {
						widget: KANBAN,
						props: {
							boards: { implementation: "@obsidian/folder", fields: { path: "Orbitask/Boards" }, allow: EVERY_VERB },
						},
					},
				},
			},
		],
		...(archived ? { archivedColumns: archived } : {}),
		layouts: {
			20: {
				places: [
					{ id: "boards", x: 0, y: 0, w: 20, h: 1 },
					{ id: "views", x: 0, y: 1, w: 20, h: 1 },
					{ id: "board", x: 0, y: 2, w: 20, h: 10 },
				],
			},
		},
	});

const mountOf = (tile: object) => standIn<MountContext>({ tile }, ["tile"], "mount context");
const holdsOf = (mounts: ResolvedMounts) => present(mounts["holds"], "the holds mount");
const tileNode = (id: string) => all(`[data-cell="${id}"]`)[0];
const strip = () => all(".wg-tree-swap-strip .wg-tabs-tab").map((node) => node.textContent.trim());
const tabLabel = (id = "views") => tileNode(id)?.querySelector(".ovt-pick")?.textContent.trim() ?? "";
const tabItems = () =>
	[...present(tileNode("views"), "the views tile").querySelectorAll(".wg-kit-pop-item")].map((node) =>
		node.textContent.trim(),
	);
const openTabs = async (id = "views") => click(inside(tileNode(id), ".ovt-pick"));
const pickView = async (name: string, id = "views") => {
	await openTabs(id);
	await click(
		[...present(tileNode(id), `the ${id} tile`).querySelectorAll(".wg-kit-pop-item")].find((node) =>
			node.textContent.trim().startsWith(name),
		),
	);
};

{
	board = groupBoard(`${KANBAN}, ${ARCHIVED}`);
	draw();
	await settle();

	check("the group draws the view the selection names", all(".orbi-kanban").length, 1);
	check("and only that one", all(".orbi-archived-columns").length, 0);

	await pickView("Archived columns");
	check("switching the view swaps what the tile holds", all(".orbi-archived-columns").length, 1);
	check("and the other one is gone", all(".orbi-kanban").length, 0);
}

{
	board = groupBoard(`${KANBAN}, ${ARCHIVED}`);
	render(null, root);
	await settle();
	draw();
	await settle();
	await pickView("Archived columns");
	check(
		"the view the tabs name is the view the group draws",
		`${tabLabel()} | ${all(".orbi-archived-columns").length} | ${all(".orbi-kanban").length}`,
		"Archived columns | 1 | 0",
	);
}

{
	propsByPath.set("Orbitask/Boards/Marketing Team.md", {
		board: "Marketing Team",
		columns: "To Do, Blocked, On hold",
		archivedColumns: "Blocked, On hold",
	});
	folders.delete("Orbitask/Boards");
	board = groupBoard(`${KANBAN}, ${ARCHIVED}`);
	render(null, root);
	await settle();
	draw();
	await settle();
	await pickView("Archived columns");

	const rows = () => all(".orbi-archived-columns .wg-kit-row .wg-kit-row-label").map((node) => node.textContent.trim());
	check("a board note written in yesterday's shape still lists its archived columns", rows(), ["Blocked", "On hold"]);

	await click(all(".orbi-archived-columns .wg-kit-row button")[0]);
	check("Restore reads it too", rows(), ["On hold"]);
	check(
		"and the write leaves the old key empty behind it",
		present(boardNote("Marketing Team"), "the board note").props["archivedColumns"],
		[],
	);
	check("with the archiving carried on the column itself", boardArchived("Marketing Team"), ["On hold"]);
}

{
	// CONTEXT: the shape before the board held a list at all — the kanban's own tile carried it
	board = readBoard({
		tiles: [
			{
				id: "fallback",
				widget: "@default/view-group",
				settings: { views: `${KANBAN}, ${ARCHIVED}` },
				mounted: {
					[KANBAN]: {
						settings: { columns: "To Do, Blocked", archivedColumns: "Blocked" },
						props: {
							boards: { implementation: "@obsidian/folder", fields: { path: "Orbitask/Nowhere" }, allow: EVERY_VERB },
						},
					},
				},
			},
		],
		layouts: { 20: { places: [{ id: "fallback", x: 0, y: 0, w: 20, h: 10 }] } },
	});
	render(null, root);
	await settle();
	draw();
	await settle();
	// CONTEXT: the other titles are statuses the tasks carry, which the kanban draws as columns
	check(
		"a list on the tile still answers where no board has claimed one",
		all('[data-cell="fallback"] .ok-list-title')
			.map((node) => node.textContent.trim())
			.includes("Blocked"),
		false,
	);
}

{
	// CONTEXT: one key in the vnode AND one persistence slot made two entries of one id collide
	const twice = resolveMounts(
		standIn<EngineManifest>({ mounts: { holds: {} } }, ["mounts"], "manifest"),
		registry,
		mountOf({ mounts: { holds: `${KANBAN}, ${KANBAN}` } }),
	);
	check(
		"the same widget mounted twice is two names, not one repeated",
		holdsOf(twice).map((entry) => entry.name),
		["Kanban", "Kanban 2"],
	);
	check(
		"and the engine hands back what the registry knew, not a field of its own",
		Object.keys(present(holdsOf(twice)[0], "the first mount")).sort(),
		["drawInto", "failure", "hidden", "id", "manifest", "name", "problem", "title"],
	);
	check(
		"a widget's own declaration comes through untouched",
		present(present(holdsOf(twice)[0], "the first mount").manifest, "its manifest")["view"],
		"Kanban",
	);

	// THE BOARD OWNS THE NAME: the same widget id, named twice, answers to what the board typed
	const named = resolveMounts(
		standIn<EngineManifest>({ mounts: { holds: {} } }, ["mounts"], "manifest"),
		registry,
		mountOf({
			mounts: {
				holds: [
					{ name: "Mine", widget: KANBAN },
					{ name: "Theirs", widget: KANBAN },
				],
			},
		}),
	);
	check(
		"a stored row answers to its own name",
		holdsOf(named).map((entry) => entry.name),
		["Mine", "Theirs"],
	);
	check(
		"and both still name the same widget",
		holdsOf(named).map((entry) => entry.id),
		[KANBAN, KANBAN],
	);

	// AN INVARIANT THAT ONLY RAN ON ADD IS THE APPSMITH BUG: two rows may never share a name,
	// however the file came to say they do
	const clashed = resolveMounts(
		standIn<EngineManifest>({ mounts: { holds: {} } }, ["mounts"], "manifest"),
		registry,
		mountOf({
			mounts: {
				holds: [
					{ name: "Same", widget: KANBAN },
					{ name: "Same", widget: ARCHIVED },
				],
			},
		}),
	);
	check(
		"a duplicate name in the file is disambiguated on read",
		holdsOf(clashed).map((entry) => entry.name),
		["Same", "Same 2"],
	);

	// THE SETTING'S OWN OLD KEY. A note written before the rename still fills the mount.
	const older = resolveMounts(
		standIn<EngineManifest>({ mounts: { holds: { was: "views" } } }, ["mounts"], "manifest"),
		registry,
		mountOf({ settings: { views: `${KANBAN}, ${ARCHIVED}` } }),
	);
	check(
		"the setting's former key still fills the mount",
		holdsOf(older).map((entry) => entry.name),
		["Kanban", "Archived columns"],
	);
	check(
		"and each row carries the widget-id key its record still sits under",
		holdsOf(older).map((entry) => entry.id),
		[KANBAN, ARCHIVED],
	);

	const gone = resolveMounts(
		standIn<EngineManifest>({ mounts: { holds: {} } }, ["mounts"], "manifest"),
		registry,
		mountOf({ mounts: { holds: "@task/nowhere" } }),
	);
	check(
		"an id that is not a widget is still an entry",
		holdsOf(gone).map((entry) => entry.problem),
		["not-found"],
	);
	check("with nothing to draw", present(holdsOf(gone)[0], "the first mount").drawInto, null);
	check(
		"and it is named off the id, because nothing else knows it",
		holdsOf(gone).map((entry) => entry.name),
		["@task/nowhere"],
	);
}

{
	board = groupBoard(KANBAN);
	draw();
	await settle();
	await openTabs();
	check("the switcher offers exactly what the group holds", tabItems(), ["Kanban"]);
}

{
	// CONTEXT: an unresolvable id used to be dropped, so the group lied about what it holds
	board = groupBoard("@task/no-such-view");
	draw();
	await settle();
	const shown = surface().textContent;
	check("a view that is not a widget is named, not swallowed", /no-such-view/.test(shown), true);
	check("and the box still offers it as a view", strip().includes("@task/no-such-view"), true);
}

{
	// CONTEXT: ownership was keyed by widget id, so a second instance read as the first updating itself
	board = readBoard({
		tiles: [
			{
				id: "left",
				widget: "@default/view-tabs",
				props: {
					options: { implementation: "@core/from-tile-rows", fields: { ref: "board/holds" } },
					selection: { implementation: "@core/from-tile-value", fields: { ref: "board/selection" } },
				},
			},
			{
				id: "right",
				widget: "@default/view-tabs",
				props: {
					options: { implementation: "@core/from-tile-rows", fields: { ref: "board/holds" } },
					selection: { implementation: "@core/from-tile-value", fields: { ref: "board/selection" } },
				},
			},
			{ id: "board", widget: "@default/view-group", settings: { views: `${KANBAN}, ${ARCHIVED}` } },
		],
		layouts: {
			20: {
				places: [
					{ id: "left", x: 0, y: 0, w: 10, h: 1 },
					{ id: "right", x: 10, y: 0, w: 10, h: 1 },
					{ id: "board", x: 0, y: 1, w: 20, h: 10 },
				],
			},
		},
	});
	draw();
	await settle();

	warnings.length = 0;
	await pickView("Archived columns", "left");
	check(
		"one switcher writes the box both read",
		[tabLabel("left"), tabLabel("right")],
		["Archived columns", "Archived columns"],
	);

	await pickView("Kanban", "right");
	check("and the other moves it back for both", [tabLabel("left"), tabLabel("right")], ["Kanban", "Kanban"]);
	check(
		"with nothing refused along the way",
		warnings.filter((line) => /may not/.test(line)),
		[],
	);
}

{
	// CONTEXT: a claim outliving its widget makes the key unwritable forever
	const switcherBoard = (id: string) =>
		readBoard({
			tiles: [
				{ id, widget: "@default/view-tabs" },
				{ id: "board", widget: "@default/view-group", settings: { views: `${KANBAN}, ${ARCHIVED}` } },
			],
			layouts: {
				20: {
					places: [
						{ id, x: 0, y: 0, w: 20, h: 1 },
						{ id: "board", x: 0, y: 1, w: 20, h: 10 },
					],
				},
			},
		});

	board = switcherBoard("gone");
	draw();
	await settle();
	await pickView("Archived columns", "gone");
	check("the widget claims the key while it is on the board", tabLabel("gone"), "Archived columns");

	board = switcherBoard("fresh");
	draw();
	await settle();

	warnings.length = 0;
	await pickView("Kanban", "fresh");
	check("removing it lets the next widget write the same key", tabLabel("fresh"), "Kanban");
	check("and nobody was refused", warnings.filter((line) => /may not also write/.test(line)).length, 0);
}

{
	// CONTEXT: a hand-edited file can carry a null where a record belongs
	let broken: HeldBoard | null = null;
	let failure: string | null = null;
	try {
		broken = readBoard({
			tiles: [
				{ id: "a", widget: KANBAN, props: { tasks: null } },
				{ id: "b", widget: "@default/view-group", mounted: { "@foo": null } },
			],
		});
	} catch (thrown) {
		failure = String(maybeFieldOf(thrown, "message") ?? thrown);
	}
	check("a null entry does not take the whole board down", failure, null);
	check("the tile that carried it survives", broken?.tiles.length, 2);
	check(
		"its null binding is carried as it stands",
		broken === null ? undefined : present(broken.tiles[0], "the first tile").props["tasks"],
		null,
	);
	check(
		"and its null mount to an unconfigured one, named off its key",
		broken === null ? undefined : present(broken.tiles[1], "the second tile").mounted["@foo"],
		{
			widget: "@foo",
			settings: {},
			mounts: {},
			props: {},
			slots: {},
			mounted: {},
		},
	);
}

{
	// THE PROPERTY LIST IS THE BOARD'S, NOT A TILE'S. Two widgets have to read ONE list, so a
	// widget keeping its own copy in `settings` was right for exactly one widget. The probe is
	// registered here rather than added to registry/, because what is under test is what the
	// ENGINE hands over, not what any product widget does with it.
	const seen: GivenProps[] = [];
	const PROBE_PROPS = {
		notes: { kind: "collection", label: "Notes", verbs: { list: "required" }, default: { path: FOLDER } },
		boards: {
			kind: "collection",
			label: "Boards",
			verbs: { list: "required", update: "optional" },
			default: {
				rows: [
					{ name: "A", columns: [{ name: "To Do" }] },
					{ name: "B", columns: [{ name: "Backlog" }] },
				],
			},
		},
		chosen: {
			kind: "value",
			label: "Shown board",
			source: {
				implementation: "@core/selection",
				fields: { rows: "boards", field: "name", whenNothingPicked: "first" },
			},
			verbs: { get: "required", update: "required" },
		},
		board: {
			kind: "value",
			label: "Board",
			source: {
				implementation: "@core/selected-row",
				fields: { rows: "boards", picked: "chosen", field: "name", whenNothingPicked: "first" },
			},
			verbs: { get: "required", update: "optional" },
		},
	};
	registry.widgets.set("@probe/board", {
		manifest: { id: "@probe/board", title: "Probe", props: PROBE_PROPS },
		folder: "probe",
		component: (given) => {
			seen.push(given);
			return h("button", { className: "probe-add" }, "add");
		},
	});
	const last = () => seen[seen.length - 1];
	const lastGiven = () => present(last(), "the probe's props");
	const columnsNow = async () => {
		const columns = maybeFieldOf(await call(lastGiven()["board"], "get"), "columns");
		if (columns === null || columns === undefined) return undefined;
		return listIn(columns).map((column) => fieldOf(column, "name"));
	};

	board = readBoard({
		tiles: [
			{
				id: "probe",
				widget: "@probe/board",
				props: { notes: { implementation: "@obsidian/folder", fields: { path: FOLDER } } },
			},
		],
		layouts: { 20: { places: [{ id: "probe", x: 0, y: 0, w: 6, h: 3 }] } },
	});
	draw();
	await settle();

	check("a widget asking for the row its selection names is handed that row", await columnsNow(), ["To Do"]);
	check(
		"the board is a gateway now, not a bag the host hands down",
		typeof maybeFieldOf(maybeFieldOf(last(), "board"), "get"),
		"function",
	);
	check(
		"and the bus it replaced is gone from the props",
		[lastGiven()["configureBoard"], fieldOf(lastGiven()["board"], "properties")],
		[undefined, undefined],
	);
	check(
		"what a widget may still ask the board for is folding its views",
		typeof lastGiven()["foldIntoGroup"],
		"function",
	);

	await call(lastGiven()["board"], "update", { columns: [{ name: "To Do" }, { name: "Added" }] });
	await settle();
	check("a write through it lands on the row that was picked", await columnsNow(), ["To Do", "Added"]);

	await call(lastGiven()["chosen"], "update", "i1");
	await settle();
	check("and the board next door never heard of it", await columnsNow(), ["Backlog"]);

	// A RECORD CARRIES NO BODY, so a widget could draw a note's properties and never its text.
	// The rows a widget is handed stay bodyless — twenty cards, no file reads — and one note's
	// text is FETCHED, which is the only call that costs anything.
	const notes = () => lastGiven()["notes"];
	const listed = await call(notes(), "list");
	const first = fieldOf(fieldOf(listed, "rows"), "0");
	check("the widget is handed rows to draw", Boolean(first), true);
	check(
		"and not one of them carries a body",
		listIn(fieldOf(listed, "rows")).some((row) => fieldOf(row, "body") !== undefined),
		false,
	);

	const opened = await call(notes(), "get", fieldOf(first, "ref"));
	check("a widget can fetch one record's body", typeof fieldOf(opened, "body"), "string");
	check("and its properties come with it", fieldOf(opened, "props"), fieldOf(first, "props"));

	await call(notes(), "update", { ref: fieldOf(first, "ref"), data: { body: "Written from a widget.\n" } });
	check(
		"and save an edited one",
		fieldOf(await call(notes(), "get", fieldOf(first, "ref")), "body"),
		"Written from a widget.\n",
	);
	check(
		"the note's properties survived the body write",
		fieldOf(await call(notes(), "get", fieldOf(first, "ref")), "props"),
		fieldOf(first, "props"),
	);

	check(
		"the verbs a widget is handed on a folder",
		Object.keys(recordIn(notes(), "the notes gateway"))
			.filter((key) => typeof fieldOf(notes(), key) === "function")
			.sort(),
		["create", "describe", "get", "list", "remove", "repairIds", "subscribe", "update"],
	);

	// A MOUNTED widget must not be handed less than a tile: the list belongs to the board, and
	// where a widget happens to be standing is not a fact about the board.
	seen.length = 0;
	board = readBoard({
		tiles: [{ id: "group", widget: "@default/view-group", settings: { views: "@probe/board" } }],
		layouts: { 20: { places: [{ id: "group", x: 0, y: 0, w: 12, h: 8 }] } },
	});
	draw();
	await settle();
	check("a mounted widget resolves its own board the same way a tile does", await columnsNow(), ["To Do"]);
	await call(lastGiven()["board"], "update", { columns: [{ name: "To Do" }, { name: "From inside" }] });
	await settle();
	check("and can write it back from inside its holder", await columnsNow(), ["To Do", "From inside"]);
}

// A BOARD THAT NAMES NOTHING STILL FILTERS. Most boards were authored before property lists
// existed, and an empty bar on all of them is worse than a bar that reads the data.
{
	const spare = dom.window.document.createElement("div");
	present(dom.window.document.querySelector(".view-content"), "the view content").appendChild(spare);
	let plain = readBoard({
		tiles: [
			{
				id: "filters",
				widget: "@default/filter-panel",
				props: { tasks: { implementation: "@obsidian/folder", fields: { path: FOLDER }, allow: EVERY_VERB } },
			},
		],
		layouts: { 20: { places: [{ id: "filters", x: 0, y: 0, w: 3, h: 1 }] } },
	});
	const drawPlain = () =>
		render(
			h(WidgetSurface, {
				boardNode: spare,
				board: plain,
				registry,
				host,
				editing: false,
				screen: true,
				initialWidth: 1280,
				onChange: (next) => {
					plain = next;
					drawPlain();
				},
				onWidth: () => {},
			}),
			spare,
		);
	drawPlain();
	await settle();

	const heads = () => [...spare.querySelectorAll(".ofp-group-head")].map((node) => node.textContent.trim());
	present(spare.querySelector(".ofp-open"), "the filter open button").dispatchEvent(
		new dom.window.MouseEvent("click", { bubbles: true }),
	);
	await settle();
	check("with no list on the board the bar reads the data instead", heads().length > 1, true);
	check("and it offers the properties the notes carry", heads().includes("Priority"), true);
	check("but not the title, which every note spells differently", heads().includes("Title"), false);
	check("nor the board, which every row on this board shares", heads().includes("Board"), false);
	// a number is not a category: the bar ticks values, and a count wants a range instead
	check(
		"nor a counter, which wants a range and not a tick",
		heads().some((name) => /checklist|comments|files|progress|order/i.test(name)),
		false,
	);
	// the columns ARE the status, so filtering by it hides the board inside itself
	check("nor status, which the board already draws as its columns", heads().includes("Status"), false);

	render(null, spare);
	spare.remove();
}

// THE CATALOGUE HAS TO STAND UP WITHOUT A BOARD UNDER IT. Every other surface in this plugin is
// drawn inside a note's own element; this one is opened from the command palette, where there is
// no note, no block and no tree to hang it on.
{
	const { default: WidgetariumPlugin } = await import("../apps/obsidian/src/main.js");
	const commands: Command[] = [];
	const ribbon: string[] = [];
	const posts: PostProcessor[] = [];
	const fences: Fence[] = [];
	const pluginApp = {
		vault: { adapter: { ...adapter, mkdir: async () => {} }, getAbstractFileByPath: () => null },
		metadataCache: { getFileCache: () => null, getFirstLinkpathDest: () => null },
		workspace: { getLeavesOfType: () => [], getRightLeaf: () => null, on: () => ({}), onLayoutReady: () => {} },
	};
	const pluginManifest = () => standIn<PluginManifest>({ id: "widgetarium" }, ["id"], "manifest");
	const plugin = Object.assign(
		new WidgetariumPlugin(standIn<App>(pluginApp, ["vault", "metadataCache", "workspace"], "app"), pluginManifest()),
		{
			app: pluginApp,
			manifest: { id: "widgetarium" },
			_data: {
				substitutions: [{ id: "sub-1", name: "Reminder", mode: "line", open: "!", widget: "@default/reminder" }],
			},
			addCommand: (command: Command) => commands.push(command),
			addRibbonIcon: (_icon: string, title: string) => ribbon.push(title),
			registerMarkdownCodeBlockProcessor: (language: string, handler: unknown) => fences.push({ language, handler }),
			registerMarkdownPostProcessor: (handler: PostProcessor) => posts.push(handler),
			registerView: () => {},
			registerEvent: () => {},
			addSettingTab: () => {},
			registerInterval: () => {},
		},
	);
	await plugin.onload();
	await plugin.started;

	check("the plugin hands Obsidian a post processor", posts.length, 1);
	check("and a processor for its own fence", fences[0]?.language, "widgetarium");

	const noteContext = { sourcePath: "Orbitask/Board.md", addChild: () => {}, getSectionInfo: () => null };
	const note = dom.window.document.createElement("div");
	note.innerHTML = "<p>! call Olena before Friday</p>";
	dom.window.document.body.appendChild(note);
	present(posts[0], "the post processor")(note, noteContext);
	check("running it replaces the triggered line with the widget", note.querySelectorAll(".wgi-reminder").length, 1);
	check("and the paragraph it stood in is gone", note.querySelectorAll("p").length, 0);
	check(
		"and the host carries the kit's scope, or nothing in it is painted",
		note.querySelectorAll(".wg-inline-host.wg-root").length,
		1,
	);
	note.remove();

	const boardBlock = dom.window.document.createElement("div");
	dom.window.document.body.appendChild(boardBlock);
	const sided = readBoard({
		tiles: [{ id: "a", widget: "@default/reminder" }],
		layout: {
			left: { rows: [[{ id: "a" }]] },
			main: { rows: [[{ id: "a" }]] },
		},
		layouts: {},
	});
	plugin.mount(
		boardBlock,
		sided,
		() => {},
		false,
		standIn<BlockContext>(noteContext, ["sourcePath", "addChild", "getSectionInfo"], "block context"),
		"Orbitask/Board.md#0",
	);
	const boardMount = plugin.firstMountIn("Orbitask/Board.md");
	check("the plugin can find the board a note carries", Boolean(boardMount), true);
	boardBlock.remove();

	// CONTEXT: Obsidian never reprocesses a note rendered before registration
	const brokenPosts: PostProcessor[] = [];
	const brokenApp = {
		...pluginApp,
		vault: {
			adapter: {
				...adapter,
				exists: async () => {
					throw new Error("vault unreachable");
				},
			},
		},
	};
	const broken = Object.assign(
		new WidgetariumPlugin(standIn<App>(brokenApp, ["vault", "metadataCache", "workspace"], "app"), pluginManifest()),
		{
			app: brokenApp,
			manifest: { id: "widgetarium" },
			addCommand: () => {},
			addRibbonIcon: () => {},
			registerMarkdownCodeBlockProcessor: () => {},
			registerMarkdownPostProcessor: (handler: PostProcessor) => brokenPosts.push(handler),
			registerView: () => {},
			registerEvent: () => {},
			addSettingTab: () => {},
			registerInterval: () => {},
		},
	);
	const said: string[] = [];
	const quiet = console.error;
	console.error = (...parts: unknown[]) =>
		said.push(parts.map((part) => maybeFieldOf(part, "message") ?? String(part)).join(" "));
	await broken.onload();
	await broken.started;
	console.error = quiet;
	check(
		"a disk that rejects never fails onload, and says why",
		said.some((line) => line.includes("vault unreachable")),
		true,
	);
	check("but the post processor was registered before it", brokenPosts.length, 1);
	check(
		"and it substitutes nothing rather than throwing",
		present(brokenPosts[0], "the post processor")(dom.window.document.createElement("div"), noteContext),
		0,
	);

	// CONTEXT: Obsidian draws the open note while onload still awaits, and never draws it twice
	const asked: unknown[] = [];
	const openLeaf = { view: { previewMode: { rerender: (full: unknown) => asked.push(full) } } };
	const startingPosts: PostProcessor[] = [];
	const startingApp = {
		...pluginApp,
		workspace: {
			getLeavesOfType: (kind: string) => (kind === "markdown" ? [openLeaf] : []),
			getRightLeaf: () => null,
			on: () => ({}),
			onLayoutReady: () => {},
		},
	};
	const starting = Object.assign(
		new WidgetariumPlugin(standIn<App>(startingApp, ["vault", "metadataCache", "workspace"], "app"), pluginManifest()),
		{
			app: startingApp,
			manifest: { id: "widgetarium" },
			_data: {
				substitutions: [{ id: "sub-1", name: "Reminder", mode: "line", open: "!", widget: "@default/reminder" }],
			},
			addCommand: () => {},
			addRibbonIcon: () => {},
			registerMarkdownCodeBlockProcessor: () => {},
			registerMarkdownPostProcessor: (handler: PostProcessor) => startingPosts.push(handler),
			registerView: () => {},
			registerEvent: () => {},
			addSettingTab: () => {},
			registerInterval: () => {},
		},
	);
	const loading = starting.onload();
	const early = dom.window.document.createElement("div");
	early.innerHTML = "<p>! call Olena before Friday</p>";
	dom.window.document.body.appendChild(early);
	check("the processor is live before the load's awaits have landed", startingPosts.length, 1);
	check(
		"and a note drawn in that gap gets nothing, because there are no rules yet",
		present(startingPosts[0], "the post processor")(early, noteContext),
		0,
	);
	check("which leaves the note plain", early.querySelectorAll(".wg-inline-host").length, 0);
	await loading;
	await starting.started;
	check("so the load ends by asking every open note to draw again", asked.length, 1);
	check("in full, because a substitution is only made while a note renders", asked[0], true);
	check("and the rules it will draw with are the ones on disk", starting.rules.length, 1);
	const redrawn = dom.window.document.createElement("div");
	redrawn.innerHTML = early.innerHTML;
	dom.window.document.body.appendChild(redrawn);
	check(
		"the very same paragraph, drawn after them, becomes the widget",
		present(startingPosts[0], "the post processor")(redrawn, noteContext),
		1,
	);
	check(
		"so the empty gap was the timing, not the guard or the selector",
		redrawn.querySelectorAll(".wg-inline-host").length,
		1,
	);
	redrawn.remove();
	early.remove();

	check("the ribbon offers substitutions beside edit mode", ribbon, [
		"Widgetarium: edit mode",
		"Widgetarium: substitutions",
		"Widgetarium: ask the assistant",
		"Widgetarium: widget catalogue",
	]);
	check(
		"and a command opens the same surface",
		commands.some((entry) => entry.id === "edit-substitutions"),
		true,
	);
	call(
		present(
			commands.find((entry) => entry.id === "edit-substitutions"),
			"the substitutions command",
		),
		"callback",
	);
	await settle();
	check(
		"running it opens the substitutions dialog",
		Boolean(dom.window.document.body.querySelector(".wg-sub-dialog")),
		true,
	);
	if (!plugin.closeSubstitutions) throw new TypeError("closeSubstitutions is not a function");
	plugin.closeSubstitutions();
	await settle();
	check(
		"and closing it takes the dialog off the page",
		Boolean(dom.window.document.body.querySelector(".wg-sub-dialog")),
		false,
	);

	const command = commands.find((entry) => entry.id === "open-catalogue");
	check("the plugin registers a command for the catalogue", command?.name, "Open widget catalogue");
	check(
		"the catalogue is a sidebar, never a dialog over the note",
		Boolean(dom.window.document.body.querySelector(".wg-cat-dialog")),
		false,
	);

	plugin.onunload();
}

{
	board = readBoard({
		tiles: [
			{
				id: "boards",
				widget: "@default/editable-tabs",
				props: { getTabs: { implementation: "@core/typed-rows", fields: { rows: [{ name: "Marketing Team" }] } } },
			},
			{
				id: "filters",
				widget: "@default/filter-panel",
				props: { tasks: { implementation: "@obsidian/folder", fields: { path: FOLDER }, allow: EVERY_VERB } },
			},
		],
		layouts: {
			20: {
				places: [
					{ id: "boards", x: 0, y: 0, w: 12, h: 1 },
					{ id: "filters", x: 12, y: 0, w: 4, h: 1 },
				],
			},
		},
	});
	editing = true;
	render(null, root);
	await settle();
	draw();
	await settle();

	await click(all(".wg-tree-region.is-main .wg-tree-add")[0]);
	CATALOGUE_REQUESTS.answer(KANBAN);
	await settle();

	const added = board.tiles.find((tile) => tile.widget === KANBAN);
	check("the added kanban points its board at the strip already standing", added?.props["getSelection"], {
		implementation: "@core/from-tile-value",
		fields: { ref: "boards/getSelection" },
	});
	check("and its tasks are narrowed by the filter beside it", added?.props["getChosen"], {
		implementation: "@core/from-tile-value",
		fields: { ref: "filters/getChosen" },
	});
	check(
		"nothing was refused on the way",
		warnings.filter((line) => /may not/.test(line)),
		[],
	);
}

// THE PALETTE IS THE CATALOGUE NOW. A row of titles said nothing about what a widget looks like,
// which is the only question a person adding one is actually asking.
{
	board = readBoard({
		tiles: [{ id: "header", widget: "@default/editable-tabs" }],
		layouts: { 20: { places: [{ id: "header", x: 0, y: 0, w: 12, h: 2 }] } },
	});
	editing = true;
	draw();
	await settle();

	check("every box ends in one press, not a chip per widget", all(".wg-tree-add").length, 3);
	check("and it says what the press does", all(".wg-tree-region.is-main .wg-tree-add")[0]?.textContent, "Add a widget");

	await click(all(".wg-tree-region.is-main .wg-tree-add")[0]);
	check("pressing it asks the sidebar catalogue to place a widget", CATALOGUE_REQUESTS.current()?.mode, "place");
	const before = board.tiles.length;
	board = { ...board, mode: "expanded", properties: ["Status", "Priority", "Assignees"] };
	draw();
	await settle();
	const carried: Pick<HeldBoard, "mode" | "properties" | "context"> = {
		mode: board.mode,
		properties: board.properties,
	};
	CATALOGUE_REQUESTS.answer("@default/task-card");
	await settle();
	check("picking it adds a tile", board.tiles.length, before + 1);
	check("of the widget that was drawn", present(board.tiles.at(-1), "the last tile").widget, "@default/task-card");
	const placed = leavesOf(board.layout).find((leaf) => leaf.id === present(board.tiles.at(-1), "the last tile").id);
	check("on a row of its own in the box that was pressed", placed?.path.join("/"), "1/1");
	check("and nothing is asked any more", CATALOGUE_REQUESTS.current(), null);

	// Adding one used to rebuild the board as { tiles, layouts } and throw the rest away — an
	// expanded board collapsed, and the property list went with it, which is the list the filter
	// bar offers and the task dialog draws its rows from.
	check("the board keeps the mode it was in", board.mode, carried.mode);
	check("and the property list the rest of the app reads", board.properties, carried.properties);
	check("and the context it was carrying", board.context, carried.context);
	check(
		"and what it kept was not nothing",
		present(carried.properties, "the carried properties").length > 0 && carried.mode === "expanded",
		true,
	);
}

// A PICK IS A BOARD WRITE, AND THE BOARD IS A DRAFT WHILE THE SETTINGS WINDOW IS OPEN. Nobody
// reaches the palette through the window — it covers the board — so this presses the write PATH,
// not a journey: the catalogue must go through onChange like the chips did, or a pick made while
// something is staged would land in the file and survive a cancel.
{
	const saved = JSON.stringify(board);
	const drawn = () => all("[data-cell]").length;
	const before = drawn();

	await click(surface().querySelector('.wg-tile-actions button[aria-label="Settings"]'));
	check(
		"the settings window is open, so the board is staged",
		Boolean(dom.window.document.body.querySelector(".wg-set-window")),
		true,
	);

	await click(all(".wg-tree-region.is-main .wg-tree-add")[0]);
	CATALOGUE_REQUESTS.answer("@default/editable-tabs");
	await settle();
	check("the page draws the tile that was added", drawn(), before + 1);
	check("and the file has not moved", JSON.stringify(board), saved);

	await click(dom.window.document.body.querySelector(".wg-set-head .wg-kit-icon"));
	await settle();
	check("closing without Done takes it back with the rest of the draft", drawn(), before);
	check("and the file still has not moved", JSON.stringify(board), saved);
}

// CONTEXT: the shipped board note still stores its slot as a bare widget id, and reading it must not rewrite it
{
	const NOTE = path.join(VAULT, "Orbitask/Board.md");
	const text = fs.readFileSync(NOTE, "utf8");
	const beforeBytes = createHash("md5").update(text).digest("hex");
	const lines = text.split("\n");
	const fence = present(findBlocks(lines)[0], "the board fence");
	const authored: unknown = parseYaml(lines.slice(fence.start + 1, fence.end).join("\n"));
	const authoredTiles = () => listIn(fieldOf(authored, "tiles"));

	check(
		"the shipped board is stored in the pre-record shape",
		maybeFieldOf(
			authoredTiles().find((tile) => fieldOf(tile, "slots")),
			"slots",
		),
		{
			card: "@default/task-card",
		},
	);
	check(
		"and it holds the four widgets the owner placed",
		authoredTiles().map((tile) => fieldOf(tile, "widget")),
		["@default/editable-tabs", "@default/view-tabs", "@default/kanban-board", "@default/filter-panel"],
	);

	const drawBoard = async (source: unknown) => {
		const spare = dom.window.document.createElement("div");
		present(dom.window.document.querySelector(".view-content"), "the view content").appendChild(spare);
		const standing = new Set(dom.window.document.querySelectorAll(".wg-page"));
		const writes: Board[] = [];
		const drawn = readBoard(source);
		const surfaceWhile = (editing: boolean) =>
			h(WidgetSurface, {
				boardNode: spare,
				board: drawn,
				registry,
				host,
				editing,
				screen: true,
				initialWidth: 1280,
				// CONTEXT: a probe counts writes and does not answer them — repainting turns one write into a loop
				onChange: (next) => writes.push(next),
				onWidth: () => {},
			});
		render(surfaceWhile(false), spare);
		await settle();
		// CONTEXT: an expanded board draws through a portal on the body, not into its own element
		const page = [...dom.window.document.querySelectorAll(".wg-page")].find((node) => !standing.has(node)) ?? spare;
		const seen = {
			// CONTEXT: React's useId counts per root, so two mounts of one tree differ by that id alone
			html: page.innerHTML.replace(/_r_[0-9a-z]+_/g, "_id_"),
			tiles: [...page.querySelectorAll("[data-cell]")].map((node) => node.getAttribute("data-cell")).sort(),
			cards: page.querySelectorAll(".orbi-kanban .ok-card-slot").length,
			// CONTEXT: the slot's gives clause promises the card a task's title, so a fed slot draws one
			titles: [...page.querySelectorAll(".orbi-kanban .ok-card-slot")]
				.map((node) => node.textContent.trim())
				.filter(Boolean).length,
			writes: writes.length,
		};
		// CONTEXT: a counter that cannot go up proves nothing, so one real edit has to move it
		render(surfaceWhile(true), spare);
		await settle();
		await click(page.querySelector('.wg-tile-actions button[aria-label="Remove"]'));
		await click(dom.window.document.body.querySelector(".wg-dialog-confirm"));
		const writesAfterAnEdit = writes.length;
		render(null, spare);
		spare.remove();
		return { ...seen, writesAfterAnEdit };
	};

	const old = await drawBoard(authored);
	const fresh = await drawBoard(serializeBoard(readBoard(authored)));

	// CONTEXT: the owner's pick IS the manifest default, so only a different pick can tell a read from a fallback
	const repointed = (pick: unknown) => ({
		...recordIn(authored, "the authored board"),
		tiles: authoredTiles().map((tile) =>
			fieldOf(tile, "slots") ? { ...recordIn(tile, "the tile"), slots: { card: pick } } : tile,
		),
	});
	const oldElsewhere = await drawBoard(repointed("@nope/missing"));
	const freshElsewhere = await drawBoard(repointed({ widget: "@nope/missing" }));

	check("the old-shape board draws every tile the owner placed", old.tiles, ["board", "boards", "views", "wynttpz"]);
	check(
		"a pick the registry cannot resolve draws a different page, so the pick is READ",
		oldElsewhere.html === old.html,
		false,
	);
	check("and the bare string is read exactly as the record is", freshElsewhere.html, oldElsewhere.html);
	check("its fed slot draws real cards, so the slot is not merely declared", old.cards > 0, true);
	check("and every one of them was fed what the gives clause promised", old.titles, old.cards);
	check("the record-shape board draws the same tiles", fresh.tiles, old.tiles);
	check("and the same number of cards through the same slot", fresh.cards, old.cards);
	check("the two boards render the SAME page, byte for byte", fresh.html === old.html, true);
	check("drawing the old-shape board writes nothing back", old.writes, 0);
	check("drawing the record-shape board writes nothing back", fresh.writes, 0);
	check("and the counter that says so does move when a person edits", old.writesAfterAnEdit > 0, true);
	check(
		"and the note on disk is byte-identical after both",
		createHash("md5").update(fs.readFileSync(NOTE, "utf8")).digest("hex"),
		beforeBytes,
	);
}

// AN ARCHIVED TAB HAD NO WAY OUT. Archive moved a name aside and Restore brought it back, so a
// name typed by mistake stayed on the note for good. Delete is the way out, and it asks first.
{
	const stage = dom.window.document.createElement("div");
	present(dom.window.document.querySelector(".view-content"), "the view content").appendChild(stage);
	const standing = new Set(dom.window.document.querySelectorAll(".wg-page"));

	let strip = readBoard({
		tiles: [
			{
				id: "boards",
				widget: "@default/editable-tabs",
				props: {
					getTabs: {
						implementation: "@core/typed-rows",
						fields: { rows: [{ name: "Marketing Team" }, { name: "Ux Team" }] },
					},
				},
			},
		],
		layouts: { 20: { places: [{ id: "boards", x: 0, y: 0, w: 16, h: 1 }] } },
	});
	const paint = () =>
		render(
			h(WidgetSurface, {
				boardNode: stage,
				board: strip,
				registry,
				host,
				editing: false,
				screen: true,
				initialWidth: 1280,
				onChange: (next) => {
					strip = next;
					paint();
				},
				onWidth: () => {},
			}),
			stage,
		);
	paint();
	await settle();

	// CONTEXT: an expanded board draws through a portal on the body, not into its own element
	const page = [...dom.window.document.querySelectorAll(".wg-page")].find((node) => !standing.has(node)) ?? stage;
	const tile = () => page.querySelector('[data-cell="boards"]');
	const shown = () =>
		[...present(tile(), "the strip").querySelectorAll(".wg-tabs-tab")].map((node) => node.textContent.trim());
	const menu = async (item: string) => {
		await click(inside(tile(), ".wg-tabs-more"));
		await click(
			[...present(tile(), "the strip").querySelectorAll(".wg-kit-pop-item")].find((node) =>
				node.textContent.includes(item),
			),
		);
	};
	const listed = () => [...dom.window.document.body.querySelectorAll(".wg-tabs-archive .wg-kit-row")];
	const listedNames = () =>
		listed().map((row) => present(row.querySelector(".wg-kit-row-label"), "the row label").textContent.trim());
	const asking = () => dom.window.document.body.querySelector(".wg-tabs-confirm");
	const kept = () =>
		listIn(
			fieldOf(serializeBoard(strip).tiles.find((held) => held.id === "boards")?.props?.["getTabs"]?.fields, "rows") ??
				[],
		).map((row) => fieldOf(row, "value") ?? row);
	const keptNamed = (name: string) => kept().find((row) => tabFieldOf(row, "name") === name) ?? null;

	check("the strip draws the tabs the note names", shown(), ["Marketing Team", "Ux Team"]);

	await menu("Archive");
	check("archiving takes the tab off the strip", shown(), ["Ux Team"]);
	check(
		"and the row it archived carries the day",
		typeof tabFieldOf(keptNamed("Marketing Team"), "archivedAt"),
		"string",
	);

	await menu("Archived list");
	check("the archived list draws it as a row", listedNames(), ["Marketing Team"]);
	check(
		"with a Delete beside the Restore",
		[...present(listed()[0], "the archived row").querySelectorAll("button")].map((node) => node.textContent.trim()),
		["Restore", "Delete"],
	);

	await click(inside(listed()[0], ".wg-tabs-delete"));
	check("Delete asks before it takes anything", Boolean(asking()), true);
	check("and the note still holds the row", Boolean(keptNamed("Marketing Team")), true);
	await click(inside(asking(), ".wg-dialog-cancel"));
	check("dismissing leaves the entry on the list", listedNames(), ["Marketing Team"]);
	check("and the note exactly as it was", typeof tabFieldOf(keptNamed("Marketing Team"), "archivedAt"), "string");

	await click(inside(listed()[0], ".wg-tabs-delete"));
	await click(inside(asking(), ".wg-dialog-confirm"));
	check("confirming takes the entry off the list", listedNames(), []);
	check("and off the note", keptNamed("Marketing Team"), null);
	check(
		"the tabs still on the strip are untouched",
		kept().map((row) => tabFieldOf(row, "name")),
		["Ux Team"],
	);
	check(
		"and no widget was left behind under the deleted name",
		present(strip.tiles[0], "the strip tile").mounted?.["Marketing Team"],
		undefined,
	);

	render(null, stage);
	stage.remove();
}

check("react complained about nothing on the way", [...new Set(reactComplaints)], []);

console.log(failed ? `\n${failed} failed` : "\nthe page answers to a person");
process.exit(failed ? 1 : 0);
