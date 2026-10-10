import type { Menu, Stat } from "obsidian";
import type { AppProjectsAdapter } from "../apps/obsidian/src/app-projects.ts";
import { parse } from "yaml";
import type WidgetariumPlugin from "../apps/obsidian/src/main.ts";
import type { ShownNote, StudioPlace } from "../apps/obsidian/src/studio-drawing.ts";
import { standIn } from "./stand-in.ts";
import { TFile, TFolder } from "obsidian";
import type { App, ViewState, WorkspaceLeaf } from "obsidian";
import {
	appNotePathOf,
	appNoteText,
	chromeInsetsOf,
	foldersAlong,
	newAppFilesOf,
	numberedName,
	projectFoldersOf,
	renamedFolderOf,
	studioNoteOf,
} from "../apps/obsidian/src/studio-note.ts";
import type { WindowChrome } from "../apps/obsidian/src/studio-note.ts";

let failed = 0;
function check(what: string, held: unknown, wanted: unknown): void {
	const isOk = JSON.stringify(held) === JSON.stringify(wanted);
	if (!isOk) failed += 1;
	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(held)}`);
}

const FULL_WIDTH: WindowChrome["rect"] = { left: 0, top: 0, right: 1200 };
const chrome = (over: Partial<WindowChrome>): WindowChrome => ({
	rect: FULL_WIDTH,
	innerWidth: 1200,
	system: "mac",
	isHiddenFrameless: true,
	...over,
});

check("a note naming a folder opens it at the root route", studioNoteOf({ "widgetarium-app": "Apps/Farm/" }), {
	folder: "Apps/Farm",
	route: "/",
});
check(
	"and at the route it names, slash or not",
	studioNoteOf({ "widgetarium-app": "Apps/Farm", "widgetarium-route": "tasks/2" }),
	{ folder: "Apps/Farm", route: "/tasks/2" },
);
check("a note naming no app is no app note", studioNoteOf({ tags: ["farm"] }), null);
check("nor is one naming an empty folder", studioNoteOf({ "widgetarium-app": "  " }), null);
check("nor one naming something other than a folder", studioNoteOf({ "widgetarium-app": 4 }), null);
check("nor a note with no front matter", studioNoteOf(undefined), null);
check(
	"the note an app gets names its folder, read back the same",
	studioNoteOf(parse(appNoteText("Apps/Farm: north").replaceAll("---", ""))),
	{ folder: "Apps/Farm: north", route: "/" },
);

check(
	"a project is every folder holding widgetarium.json",
	projectFoldersOf([
		"Apps/Farm/widgetarium.json",
		"Apps/Farm/src/app/routes/board.json",
		"Zoo/widgetarium.json",
		"Notes/widgetarium.json.bak",
		"Apps/Barn/widgetarium.json",
	]),
	["Apps/Barn", "Apps/Farm", "Zoo"],
);

check(
	"the first name is kept as it is, the next ones numbered",
	[numberedName("Untitled app", 1), numberedName("Untitled app", 3)],
	["Untitled app", "Untitled app 3"],
);
check("a name never carries a slash, a backslash or a colon", numberedName("a/b\\c:d", 1), "a-b-c-d");
check("an app's note stands beside its folder, never inside it", appNotePathOf("Apps/Farm"), "Apps/Farm.md");
check(
	"a renamed folder renames what names it or a folder under it, and nothing else",
	[
		renamedFolderOf("Apps/Farm", "Apps/Farm", "Apps/Ranch"),
		renamedFolderOf("Apps/Farm", "Apps", "Projects"),
		renamedFolderOf("Apps/Farmhouse", "Apps/Farm", "Apps/Ranch"),
	],
	["Apps/Ranch", "Projects/Farm", null],
);

check(
	"a new app lays its config and an empty root route",
	newAppFilesOf("Untitled app 2").map(({ path, text }) => [path, JSON.parse(text)]),
	[
		["Untitled app 2/widgetarium.json", { app: { name: "Untitled app 2" } }],
		["Untitled app 2/src/app/routes/board.json", { v: 2, layout: { dir: "column", of: [] } }],
	],
);
check("every folder above a file is made first", foldersAlong("A/src/app/board.json"), ["A", "A/src", "A/src/app"]);

check("a frameless mac window's corner leaves the traffic lights room", chromeInsetsOf(chrome({})), {
	left: 76,
	right: 0,
});
check("a mac window with its frame keeps no inset", chromeInsetsOf(chrome({ isHiddenFrameless: false })), {
	left: 0,
	right: 0,
});
check(
	"a view away from the corner keeps no inset",
	chromeInsetsOf(chrome({ rect: { left: 300, top: 0, right: 1200 } })),
	{ left: 0, right: 0 },
);
check(
	"a view below the title bar keeps no inset",
	chromeInsetsOf(chrome({ rect: { left: 0, top: 44, right: 1200 } })),
	{
		left: 0,
		right: 0,
	},
);
check("a hidden view of no width keeps no inset", chromeInsetsOf(chrome({ rect: { left: 0, top: 0, right: 0 } })), {
	left: 0,
	right: 0,
});
check(
	"a view starting at the tab bar's bottom edge keeps no inset",
	chromeInsetsOf(chrome({ rect: { left: 44, top: 39.98, right: 2804 } })),
	{ left: 0, right: 0 },
);
check("a windows view under the caption buttons leaves them room", chromeInsetsOf(chrome({ system: "windows" })), {
	left: 0,
	right: 138,
});
check(
	"a windows view short of the right edge keeps no inset",
	chromeInsetsOf(chrome({ system: "windows", rect: { left: 0, top: 0, right: 900 } })),
	{ left: 0, right: 0 },
);
check("another system keeps no inset", chromeInsetsOf(chrome({ system: "other" })), { left: 0, right: 0 });

const { JSDOM } = await import("jsdom");
const dom = new JSDOM("<!doctype html><body></body>", { pretendToBeVisual: true });
const LAID_WIDTH_PX = 1200;
class SilentResizeObserver {
	constructor(private readonly measured: (entries: readonly object[]) => void) {}
	observe(target: Element): void {
		queueMicrotask(() => this.measured([{ target, contentRect: { width: LAID_WIDTH_PX, height: 800 } }]));
	}
	unobserve(): void {}
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
	MutationObserver: dom.window.MutationObserver,
	MouseEvent: dom.window.MouseEvent,
	KeyboardEvent: dom.window.KeyboardEvent,
	Event: dom.window.Event,
	CSS: { escape: (said: string) => said.replace(/["\\]/g, "\\$&") },
	ResizeObserver: SilentResizeObserver,
});
Object.assign(dom.window, { ResizeObserver: SilentResizeObserver });

const { registerPacks } = await import("../packages/core/src/engine/packs.js");
const { pageParamCell } = await import("../packages/core/src/engine/page-params.js");
const { corePack } = await import("../packages/packs/core/src/index.js");
const { createMemoryRouter } = await import("../packages/core/src/app/memory-router.js");
const { createAppProjects } = await import("../apps/obsidian/src/app-projects.js");
const { drawStudio } = await import("../apps/obsidian/src/studio-drawing.js");
const { obsidianStudioHost } = await import("../apps/obsidian/src/studio-host-obsidian.js");
const { registerStudioView } = await import("../apps/obsidian/src/studio-leaves.js");
const { followAppFolderRename } = await import("../apps/obsidian/src/studio-renames.js");
const { createStudioRouting } = await import("../apps/obsidian/src/studio-routing.js");
const { STUDIO_VIEW_TYPE, StudioView } = await import("../apps/obsidian/src/studio-view.js");
const { checkedAssistantPort } = await import("./obsidian-assistant-port-checks.ts");
const { NO_ASSISTANT } = await import("../packages/core/src/engine/assistant-port.js");
const { NO_CATALOGUE_PORT } = await import("../packages/core/src/engine/catalogue-port.js");
const { shutPortsOf } = await import("../packages/core/src/engine/packs.js");
const { AppsQuery } = await import("../packages/widgetarium/src/studio/logic/apps-queries.js");
registerPacks(corePack);

const APP_NOTE = { path: "Apps/Farm.md", basename: "Farm" };
const PLAIN_NOTE = { path: "Plain.md", basename: "Plain" };
const FRONT_MATTER: Record<string, Record<string, unknown> | undefined> = {
	"Apps/Farm.md": { "widgetarium-app": "Apps/Farm" },
};
const VAULT: Readonly<Record<string, string>> = {
	"Apps/Farm/widgetarium.json": JSON.stringify({ app: { name: "Farm Stand" } }),
	"Apps/Farm/src/app/routes/board.json": JSON.stringify({ v: 2, layout: { dir: "column", of: [] } }),
	"Apps/Broken/widgetarium.json": "{ name: ",
};
const EMPTY_BOARD = { v: 2, layout: { dir: "column", of: [] } };

type NoteFile = typeof APP_NOTE;
type LeafState = { readonly type: string; readonly state: Readonly<Record<string, unknown>> };

class FakeLeaf {
	view: { file: NoteFile | null };
	held: LeafState;
	switches = 0;
	constructor(file: NoteFile) {
		this.view = { file };
		this.held = { type: "markdown", state: { file: file.path } };
	}
	show(file: NoteFile): void {
		this.view = { file };
		this.held = { type: "markdown", state: { file: file.path } };
	}
	getViewState(): LeafState {
		return this.held;
	}
	async setViewState(next: LeafState): Promise<void> {
		this.switches += 1;
		await new Promise((done) => setTimeout(done, 0));
		this.held = next;
	}
}

const frontMatterOf = (file: { readonly path: string }) => ({ frontmatter: FRONT_MATTER[file.path] });
const under = (folder: string): string[] => Object.keys(VAULT).filter((path) => path.startsWith(`${folder}/`));
const kindAt = (path: string): Stat["type"] | null => {
	if (path in VAULT) return "file";
	return under(path).length > 0 ? "folder" : null;
};
const adapter: AppProjectsAdapter = {
	list: async (folder: string) => {
		const children = [
			...new Set(under(folder).map((path) => `${folder}/${path.slice(folder.length + 1).split("/")[0]}`)),
		];
		return {
			files: children.filter((path) => path in VAULT),
			folders: children.filter((path) => under(path).length > 0),
		};
	},
	read: async (path: string) => VAULT[path] ?? "",
	stat: async (path: string) => {
		const type = kindAt(path);
		return type ? { type, ctime: 0, mtime: 0, size: 0 } : null;
	},
	getResourcePath: (path: string) => `app://vault/${path}`,
};
const host = {
	platform: "test",
	type: "test",
	can: {},
	slot: () => null,
	ui: { notify() {} },
	notePath: APP_NOTE.path,
};
const settle = (): Promise<void> => new Promise((done) => setTimeout(done, 200));
const UNTIL_MS = 3000;
async function settledUntil(isThere: () => boolean): Promise<void> {
	const giveUpAt = Date.now() + UNTIL_MS;
	while (!isThere() && Date.now() < giveUpAt) await settle();
}

const opened: string[] = [];
const projects = createAppProjects(adapter);
const countedProjects = {
	...projects,
	open: (folder: string) => {
		opened.push(folder);
		return projects.open(folder);
	},
};

function fakePluginOver(leaves: readonly FakeLeaf[]) {
	const handlers = new Map<string, () => void>();
	const metadataChanged: Array<(file: NoteFile) => void> = [];
	const views: Array<(leaf: unknown) => unknown> = [];
	const plugin = {
		host,
		cataloguePort: NO_CATALOGUE_PORT,
		registerEvent: () => undefined,
		registerView: (_type: string, make: (leaf: unknown) => unknown) => views.push(make),
		app: {
			workspace: {
				on: (name: string, run: () => void) => handlers.set(name, run),
				onLayoutReady: () => undefined,
				getLeavesOfType: (type: string) => leaves.filter((leaf) => leaf.held.type === type),
			},
			metadataCache: {
				on: (_name: string, run: (file: NoteFile) => void) => metadataChanged.push(run),
				getFileCache: frontMatterOf,
			},
			vault: { getFiles: () => [], adapter: { ...adapter, exists: async () => false } },
		},
	};
	registerStudioView(
		standIn<WidgetariumPlugin>(plugin, ["app", "host", "cataloguePort", "registerView", "registerEvent"], "plugin"),
		countedProjects,
		NO_ASSISTANT,
	);
	return {
		fileOpened: () => handlers.get("file-open")?.(),
		metadataChanged: (file: NoteFile) => metadataChanged.forEach((run) => run(file)),
		viewOf: (leaf: FakeLeaf): unknown => views[0]?.(leaf),
	};
}

const appLeaf = new FakeLeaf(APP_NOTE);
const plainLeaf = new FakeLeaf(PLAIN_NOTE);
const laterLeaf = new FakeLeaf(PLAIN_NOTE);
const plugin = fakePluginOver([appLeaf, plainLeaf, laterLeaf]);
plugin.fileOpened();
plugin.fileOpened();
await settle();
check("opening an app note turns its leaf into the studio view", appLeaf.held.type, STUDIO_VIEW_TYPE);
check("once, however many events arrive while it switches", appLeaf.switches, 1);
check("and leaves a plain note in markdown", plainLeaf.held.type, "markdown");

laterLeaf.show(APP_NOTE);
plugin.metadataChanged(PLAIN_NOTE);
await settle();
check("a change to another note leaves an app note's leaf alone", laterLeaf.held.type, "markdown");
plugin.metadataChanged(APP_NOTE);
await settle();
check("a change to the note it shows switches it", laterLeaf.held.type, STUDIO_VIEW_TYPE);

const view: unknown = plugin.viewOf(appLeaf);
const items: { title: string; click: () => void }[] = [];
const menu = {
	addItem(build: (item: object) => void) {
		const item = {
			title: "",
			click: (): void => undefined,
			setTitle(title: string) {
				this.title = title;
				return this;
			},
			setIcon() {
				return this;
			},
			onClick(click: () => void) {
				this.click = click;
				return this;
			},
		};
		build(item);
		items.push(item);
	},
};
if (view instanceof StudioView) {
	Object.assign(view, { file: APP_NOTE });
	view.onPaneMenu(standIn<Menu>(menu, ["addItem"], "menu"), "more-options");
}
items.find((item) => item.title === "Open as Markdown")?.click();
await settle();
appLeaf.view = { file: APP_NOTE };
check("Open as Markdown turns that leaf back", appLeaf.held.type, "markdown");
plugin.fileOpened();
await settle();
check("and the leaf stays markdown the next time the note opens", appLeaf.held.type, "markdown");

const reloaded = fakePluginOver([appLeaf]);
reloaded.fileOpened();
await settle();
check("the choice is read back from the leaf's view state after a reload", appLeaf.held.type, "markdown");

appLeaf.show(PLAIN_NOTE);
plugin.fileOpened();
appLeaf.show(APP_NOTE);
plugin.fileOpened();
await settle();
check("a leaf that showed another note forgets the choice", appLeaf.held.type, STUDIO_VIEW_TYPE);

const shownLeaf = new FakeLeaf(APP_NOTE);
shownLeaf.held = { type: STUDIO_VIEW_TYPE, state: { file: APP_NOTE.path } };
const studioView: unknown = plugin.viewOf(shownLeaf);
const contentEl = {
	addClass: () => undefined,
	createDiv: () => document.body.appendChild(document.createElement("div")),
};
if (studioView instanceof StudioView) {
	Object.assign(studioView, {
		file: APP_NOTE,
		contentEl,
		containerEl: document.createElement("div"),
		registerEvent: () => undefined,
	});
	await studioView.onOpen();
	await studioView.onLoadFile(standIn<TFile>(APP_NOTE, ["path", "basename"], "note"));
	await settle();
	const openedAtLoad = opened.length;
	FRONT_MATTER[APP_NOTE.path] = { "widgetarium-app": "Apps/Farm", tags: ["farm"] };
	studioView.onNoteChanged(standIn<TFile>(APP_NOTE, ["path", "basename"], "note"));
	await settle();
	check("a front matter change keeping app and route does not redraw", opened.length - openedAtLoad, 0);
	FRONT_MATTER[APP_NOTE.path] = { "widgetarium-app": "Apps/Farm", "widgetarium-route": "/barn" };
	studioView.onNoteChanged(standIn<TFile>(APP_NOTE, ["path", "basename"], "note"));
	await settle();
	check("one naming another route does", opened.length - openedAtLoad, 1);
	FRONT_MATTER[APP_NOTE.path] = { tags: ["farm"] };
	studioView.onNoteChanged(standIn<TFile>(APP_NOTE, ["path", "basename"], "note"));
	await settle();
	check("a note whose front matter no longer names an app turns back to markdown", shownLeaf.held.type, "markdown");
	FRONT_MATTER[APP_NOTE.path] = { "widgetarium-app": "Apps/Farm" };
	await studioView.onClose();
} else check("the registered view is a StudioView", false, true);

const ROUTES = [
	{ path: "/tasks", params: [], board: EMPTY_BOARD },
	{ path: "/tasks/:id", params: ["id"], board: EMPTY_BOARD },
];
const memory = createMemoryRouter(() => ROUTES, {
	at: "/tasks/7",
	paramsKeyOf: (pathname) => `Farm.md#leaf${pathname}`,
});
await settle();
const idAt = (pathname: string): Promise<unknown> => pageParamCell(memory.paramsKeyOf(pathname), "id").get();
const idOnTask = await idAt("/tasks/7");
memory.navigate("/tasks");
await settle();
check(
	"a route's params stay on that route: /tasks/:id hands /tasks nothing",
	[idOnTask, (await idAt("/tasks")) ?? null],
	["7", null],
);

const routing = createStudioRouting((pathname) => pathname);
const first = routing.routerFor({ folder: "Apps/Farm", route: "/tasks" }, ROUTES);
const again = routing.routerFor({ folder: "Apps/Farm", route: "/tasks/9" }, ROUTES);
check("one app keeps its router, and a new route moves it", [first === again, again.pathname()], [true, "/tasks/9"]);
check(
	"another app gets a router of its own",
	routing.routerFor({ folder: "Apps/Barn", route: "/tasks" }, ROUTES) === first,
	false,
);

const checkedAssistant = await checkedAssistantPort(check);

const place = standIn<StudioPlace>(
	{
		app: {
			metadataCache: { getFileCache: frontMatterOf },
			vault: { getFiles: () => Object.keys(VAULT).map((path) => ({ path })), adapter },
		},
		projects: createAppProjects(adapter),
		viewType: STUDIO_VIEW_TYPE,
		assistant: checkedAssistant.port,
		catalogue: NO_CATALOGUE_PORT,
		hostOf: () => host,
		openAsMarkdown: async () => undefined,
		showAsMarkdown: async () => undefined,
		designFor: async () => undefined,
	},
	["app", "projects", "viewType", "assistant", "catalogue", "hostOf", "openAsMarkdown", "showAsMarkdown", "designFor"],
	"place",
);
async function drawnFor(file: NoteFile): Promise<HTMLElement> {
	const node = document.createElement("div");
	document.body.appendChild(node);
	const shown = standIn<ShownNote>(
		{ file, note: studioNoteOf(FRONT_MATTER[file.path]), node, leaf: appLeaf, frame: node },
		["file", "note", "node", "leaf", "frame"],
		"note",
	);
	drawStudio(
		place,
		shown,
		createStudioRouting((pathname) => pathname),
	);
	await settle();
	return node;
}
const studioNode = await drawnFor(APP_NOTE);
check(
	"an app note draws the studio: the band over the route",
	[".wg-studio-band", ".wg-studio-outlet .wg-root"].map((selector) => studioNode.querySelector(selector) !== null),
	[true, true],
);
check("and no refusal", studioNode.querySelector(".wg-app-refusal")?.textContent ?? null, null);
const pressIn = (node: HTMLElement, label: string): void =>
	node.querySelector<HTMLElement>(`button[aria-label="${label}"]`)?.click();
pressIn(studioNode, "AI assistant");
await settledUntil(() => studioNode.querySelector(".wg-studio-sidebar .wg-studio-ai-turn.is-mine") !== null);
check(
	"the studio's sidebar draws the chat over the assistant the plugin lends",
	[
		studioNode.querySelector(".wg-studio-sidebar .wg-studio-ai-who")?.textContent ?? null,
		studioNode.querySelector(".wg-studio-sidebar .wg-studio-ai-turn.is-mine")?.textContent ?? null,
	],
	[checkedAssistant.providerLabel, checkedAssistant.asked],
);
pressIn(studioNode, "Widgets");
await settledUntil(() => studioNode.querySelector('.wg-studio-sidebar[data-panel="catalogue"] .wg-board') !== null);
check(
	"the Widgets panel takes the assistant's place and draws the catalogue board",
	[
		studioNode.querySelectorAll(".wg-studio-sidebar").length,
		studioNode.querySelector('.wg-studio-sidebar[data-panel="catalogue"] .wg-studio-catalogue-host .wg-board') !== null,
		studioNode.querySelector(".wg-studio-sidebar .wg-studio-ai-who") === null,
	],
	[1, true, true],
);
pressIn(studioNode, "Widgets");
await settledUntil(() => studioNode.querySelector(".wg-studio-sidebar") === null);
const besideNode = await drawnFor(APP_NOTE);
await settledUntil(() => studioNode.querySelector('button[aria-label="Farm Stand menu"]') !== null);
pressIn(studioNode, "Farm Stand menu");
await settledUntil(() => document.querySelector(".wg-studio-action-said") !== null);
[...document.querySelectorAll(".wg-studio-action-said")]
	.find((said) => said.textContent === "Edit in canvas")
	?.closest<HTMLElement>('[role="button"]')
	?.click();
await settledUntil(() => studioNode.querySelector(".wg-design-view") !== null);
check(
	"Edit in canvas in one studio shows its canvas and leaves the studio beside it on its route",
	[
		studioNode.querySelector(".wg-design-view") !== null,
		besideNode.querySelector(".wg-design-view") !== null,
		besideNode.querySelector(".wg-studio-outlet .wg-root") !== null,
	],
	[true, false, true],
);
pressIn(besideNode, "Widgets");
await settledUntil(() => besideNode.querySelector(".wg-studio-sidebar") !== null);
check(
	"and a panel opened in the one beside it stays there",
	[studioNode.querySelector(".wg-studio-sidebar"), besideNode.querySelector(".wg-studio-sidebar") !== null],
	[null, true],
);
const opening = await createAppProjects(adapter).open("Apps/Farm");
check(
	"an opened app carries the name and icon its widgetarium.json declares",
	opening.ok ? opening.app : opening.findings,
	{ name: "Farm Stand", iconHref: "app://vault/Apps/Farm/public/icon.svg" },
);
const appRows = await new AppsQuery(
	{},
	{
		...shutPortsOf("apps"),
		studio: obsidianStudioHost({
			app: place.app,
			leaf: standIn<WorkspaceLeaf>({}, [], "leaf"),
			frame: studioNode,
			viewType: STUDIO_VIEW_TYPE,
		}),
	},
).query({ cursor: null, limit: 10 });
check(
	"a project its widgetarium.json refuses is listed with the refusal as its line",
	appRows.items.map(({ id, line }) => [id, line.startsWith("widgetarium.json: ")]),
	[
		["Apps/Broken", true],
		["Apps/Farm", false],
	],
);
const plainNode = await drawnFor(PLAIN_NOTE);
check(
	"a note naming no app says what to add",
	(plainNode.querySelector(".wg-app-refusal")?.textContent ?? "").includes("widgetarium-app: <project folder>"),
	true,
);

interface FakeVault {
	readonly files: Map<string, string>;
	readonly folders: Set<string>;
	failOn: string | null;
}

function noteFileAt(path: string): TFile {
	return Object.assign(new TFile(), { path, basename: path.replace(/^.*\//, "").replace(/\.md$/, "") });
}

function fakeAppOver(vault: FakeVault, naming: Readonly<Record<string, string>>): App {
	const exists = (path: string): boolean => vault.files.has(path) || vault.folders.has(path);
	const fake = {
		vault: {
			create: async (path: string, text: string) => {
				if (exists(path)) throw new Error("File already exists.");
				if (path === vault.failOn) throw new Error("disk full");
				vault.files.set(path, text);
				return noteFileAt(path);
			},
			createFolder: async (path: string) => {
				if (exists(path)) throw new Error("Folder already exists.");
				vault.folders.add(path);
			},
			getAbstractFileByPath: (path: string) => {
				if (vault.files.has(path)) return noteFileAt(path);
				return vault.folders.has(path) ? new TFolder() : null;
			},
			getMarkdownFiles: () => Object.keys(naming).map(noteFileAt),
			adapter: {
				rmdir: async (folder: string) => {
					for (const path of [...vault.files.keys()]) if (path.startsWith(`${folder}/`)) vault.files.delete(path);
					for (const path of [...vault.folders])
						if (path === folder || path.startsWith(`${folder}/`)) vault.folders.delete(path);
				},
			},
		},
		metadataCache: {
			getFileCache: (file: { readonly path: string }) => ({ frontmatter: { "widgetarium-app": naming[file.path] } }),
		},
	};
	return standIn<App>(fake, ["vault", "metadataCache"], "app");
}

const shownIn: string[] = [];
const hostLeaf = standIn<WorkspaceLeaf>(
	{
		setViewState: async (state: ViewState) => {
			shownIn.push(String(state.state?.["file"]));
		},
	},
	["setViewState"],
	"leaf",
);
const fakeVault: FakeVault = { files: new Map(), folders: new Set(["Apps", "Apps/Farm"]), failOn: null };
const studioHost = obsidianStudioHost({
	app: fakeAppOver(fakeVault, { "Boards/Barn.md": "Apps/Barn" }),
	leaf: hostLeaf,
	frame: document.createElement("div"),
	viewType: STUDIO_VIEW_TYPE,
});
await studioHost.openApp("Apps/Farm");
await studioHost.openApp("Apps/Farm");
check(
	"opening an app twice writes its note once, beside the folder, and opens it both times",
	[[...fakeVault.files.keys()], shownIn.splice(0)],
	[["Apps/Farm.md"], ["Apps/Farm.md", "Apps/Farm.md"]],
);
check(
	"the note names its folder",
	studioNoteOf(parse(fakeVault.files.get("Apps/Farm.md")?.replaceAll("---", "") ?? "")),
	{
		folder: "Apps/Farm",
		route: "/",
	},
);
await studioHost.openApp("Apps/Barn");
check(
	"a note elsewhere naming the folder is preferred",
	[shownIn.splice(0), fakeVault.files.has("Apps/Barn.md")],
	[["Boards/Barn.md"], false],
);

await Promise.all([studioHost.createApp(), studioHost.createApp()]);
check(
	"two new apps at once take two folders, each with its config and its note",
	["Untitled app", "Untitled app 2"].map((folder) => [
		fakeVault.files.has(`${folder}/widgetarium.json`),
		fakeVault.files.has(`${folder}/src/app/routes/board.json`),
		fakeVault.files.has(`${folder}.md`),
	]),
	[
		[true, true, true],
		[true, true, true],
	],
);
fakeVault.failOn = "Untitled app 3/src/app/routes/board.json";
const refused = await studioHost.createApp().then(
	() => "created",
	(failure: unknown) => (failure instanceof Error ? failure.message : String(failure)),
);
check(
	"a failed write removes the folder it made and says why",
	[refused, fakeVault.folders.has("Untitled app 3"), fakeVault.files.has("Untitled app 3/widgetarium.json")],
	["The new app was not created: disk full", false, false],
);

const renamedFront: Record<string, Record<string, unknown>> = {
	"Apps/Farm.md": { "widgetarium-app": "Apps/Farm" },
	"Boards/Farm.md": { "widgetarium-app": "Apps/Farm/" },
	"Other.md": { "widgetarium-app": "Apps/Farmhouse" },
	"Stale.md": { "widgetarium-app": "Apps/Elsewhere" },
};
const staleCache: Record<string, Record<string, unknown>> = { "Stale.md": { "widgetarium-app": "Apps/Farm" } };
const moved: string[] = [];
const renameApp = standIn<App>(
	{
		vault: {
			getMarkdownFiles: () => Object.keys(renamedFront).map(noteFileAt),
			getAbstractFileByPath: (path: string) => (path in renamedFront ? noteFileAt(path) : null),
		},
		metadataCache: {
			getFileCache: (file: { readonly path: string }) => ({
				frontmatter: staleCache[file.path] ?? renamedFront[file.path],
			}),
		},
		fileManager: {
			processFrontMatter: async (file: TFile, change: (front: Record<string, unknown>) => void) => {
				const front = renamedFront[file.path];
				if (front) change(front);
			},
			renameFile: async (file: TFile, path: string) => {
				moved.push(`${file.path} → ${path}`);
			},
		},
	},
	["vault", "metadataCache", "fileManager"],
	"app",
);
await followAppFolderRename(renameApp, Object.assign(new TFile(), { path: "Apps/Ranch" }), "Apps/Farm");
check("a renamed file is not a renamed folder", moved.length, 0);
await followAppFolderRename(renameApp, Object.assign(new TFolder(), { path: "Apps/Ranch" }), "Apps/Farm");
check(
	"renaming a project folder renames it in every note naming it, judged on the front matter written, and moves the note beside it",
	[Object.values(renamedFront).map((front) => front["widgetarium-app"]), moved],
	[["Apps/Ranch", "Apps/Ranch", "Apps/Farmhouse", "Apps/Elsewhere"], ["Apps/Farm.md → Apps/Ranch.md"]],
);

if (failed > 0) {
	console.log(`obsidian studio: ${failed} failed`);
	process.exit(1);
}
console.log("obsidian studio: clean");
