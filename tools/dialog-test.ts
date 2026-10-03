import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { parse as parseYaml } from "yaml";
import type { ReactElement } from "react";
import type { App, TFile as ObsidianFile } from "obsidian";
import { standIn } from "./stand-in.ts";
import { byId } from "./dom-find.ts";
import { isObject } from "../packages/core/src/engine/is-object.js";
import type { HostPlugin } from "../apps/obsidian/src/host.js";
import type { Board } from "../packages/core/src/model.js";
const EVERY_VERB = ["list", "get", "create", "update", "remove", "replace", "repairIds"];

const VAULT = process.env["WG_VAULT"] ?? "tools/fixture";
const FOLDER = "Orbitask/Tasks";

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
	FocusEvent: dom.window.FocusEvent,
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
const { TFile, TFolder, MarkdownRenderer } = await import("obsidian");
const { readBody } = await import("../packages/core/src/block-writer.js");
const { TONE_NAMES } = await import("../packages/kit/src/index.ts");

type NoteProps = Record<string, unknown>;
type NoteFile = ObsidianFile & { props: NoteProps };
type FileListener = (file: NoteFile) => void;

const fieldIn = (value: unknown, ...keys: readonly (string | number)[]): unknown =>
	keys.reduce<unknown>((held, key) => (isObject(held) ? held[String(key)] : undefined), value);
const listAt = (value: unknown, ...keys: readonly (string | number)[]): unknown[] => {
	const held = fieldIn(value, ...keys);
	return Array.isArray(held) ? held : [];
};
const textIn = (node: Element | null | undefined): string | undefined => node?.textContent?.trim();
const isTransitionEventKind = (value: unknown): value is typeof TransitionEvent => typeof value === "function";
const transitionEventKind = (): typeof TransitionEvent => {
	const kind: unknown = Reflect.get(dom.window, "TransitionEvent");
	if (!isTransitionEventKind(kind)) throw new Error("jsdom offers no TransitionEvent");
	return kind;
};
const inputIn = (root: ParentNode | null | undefined, selector: string): HTMLInputElement | null => {
	const node = root?.querySelector(selector);
	return node instanceof dom.window.HTMLInputElement ? node : null;
};
const inputNow = (root: ParentNode | null | undefined, selector: string): HTMLInputElement => {
	const node = inputIn(root, selector);
	if (!node) throw new Error(`nothing at ${selector} is an input`);
	return node;
};

const adapter = {
	exists: async (p: string): Promise<boolean> => fs.existsSync(path.join(VAULT, p)),
	list: async (p: string) => {
		const names = fs.readdirSync(path.join(VAULT, p));
		const kind = (name: string): fs.Stats | null => {
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
	read: async (p: string): Promise<string> => fs.readFileSync(path.join(VAULT, p), "utf8"),
	stat: async () => ({ mtime: 1, size: 1 }),
};

function frontmatter(text: string): NoteProps {
	const found = /^---\n([\s\S]*?)\n---/.exec(text);
	const parsed: unknown = found ? parseYaml(found[1] ?? "") : null;
	return isObject(parsed) ? Object.fromEntries(Object.entries(parsed)) : {};
}

const PLAIN = "Orbitask/Plain";
const PLAIN_NOTE = `${PLAIN}/A plain note.md`;

const texts = new Map([[PLAIN_NOTE, "The note opens straight into its body.\n"]]);
const reads: string[] = [];
const textOf = (file: NoteFile): string => texts.get(file.path) ?? fs.readFileSync(path.join(VAULT, file.path), "utf8");

const held = new Map<string, NoteFile>();
function fileAt(target: string, readProps: () => NoteProps): NoteFile {
	const known = held.get(target);
	if (known) return known;
	const file = Object.assign(new TFile(), {
		path: target,
		basename: target.slice(target.lastIndexOf("/") + 1).replace(/\.md$/, ""),
		extension: "md",
		stat: { ctime: 1, mtime: 2 },
	});
	const noted = Object.assign(file, { props: readProps() });
	held.set(target, noted);
	return noted;
}

function withoutDates(props: NoteProps): NoteProps {
	const clean: NoteProps = {};
	for (const [key, value] of Object.entries(props)) if (key.toLowerCase() !== "deadline") clean[key] = value;
	return clean;
}

function vaultFiles(folder: string): NoteFile[] {
	if (folder === PLAIN) return [fileAt(PLAIN_NOTE, () => ({}))];
	return fs
		.readdirSync(path.join(VAULT, folder))
		.filter((name) => name.endsWith(".md"))
		.map((name) =>
			fileAt(`${folder}/${name}`, () =>
				withoutDates(frontmatter(fs.readFileSync(path.join(VAULT, folder, name), "utf8"))),
			),
		);
}

const embedsBy = new Map<string, readonly { readonly link: string }[]>();

const written: { readonly path: string; readonly props: NoteProps }[] = [];
const opened: string[] = [];
const folders = new Map<string, unknown>();
const listeners = new Set<FileListener>();
const announce = (file: NoteFile): void => {
	for (const listener of [...listeners]) listener(file);
};
const app = {
	vault: {
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
		create: async () => vaultFiles(FOLDER)[0],
		cachedRead: async (file: NoteFile) => {
			reads.push(file.path);
			return textOf(file);
		},
		process: async (file: NoteFile, edit: (text: string) => string) => {
			const next = edit(textOf(file));
			texts.set(file.path, next);
			setTimeout(() => announce(file), 0);
			return next;
		},
		on: () => ({}),
		off: () => {},
	},
	metadataCache: {
		getFileCache: (file: NoteFile) => ({ frontmatter: file.props, embeds: embedsBy.get(file.path) ?? [] }),
		on: (name: string, handler: FileListener) => name === "changed" && listeners.add(handler),
		off: (_name: string, handler: FileListener) => listeners.delete(handler),
	},
	fileManager: {
		processFrontMatter: async (file: NoteFile, edit: (props: NoteProps) => void) => {
			edit(file.props);
			written.push({ path: file.path, props: { ...file.props } });
			announce(file);
		},
	},
	workspace: { getLeaf: () => ({ openFile: async (file: NoteFile) => opened.push(file.path) }) },
};

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
const host = { ...realHost, ui: { ...realHost.ui, notify: () => {} } };

const registry = new WidgetRegistry({ vault: { adapter } });
await registry.load();

const KANBAN = "@default/kanban-board";

let board = normalizeBoard({
	tiles: [
		{
			id: "board",
			widget: KANBAN,
			props: {
				tasks: { implementation: "@obsidian/folder", fields: { path: FOLDER }, allow: EVERY_VERB },
				boards: { implementation: "@obsidian/folder", fields: { path: "Orbitask/DialogBoards" }, allow: EVERY_VERB },
			},
		},
	],
	layouts: { 20: { places: [{ id: "board", x: 0, y: 0, w: 20, h: 10 }] } },
});

const root = byId(dom.window.document, "host");
function surfaceOf(shown: Board, onChange: (next: Board) => void, drawingHost: typeof host = host): ReactElement {
	const surfaceProps = {
		boardNode: root,
		board: shown,
		registry,
		host: drawingHost,
		editing: false,
		screen: true,
		initialWidth: 1280,
		onChange,
		onToggleEditing: () => {},
		onWidth: () => {},
	};
	return h(WidgetSurface, surfaceProps);
}
const draw = (): void =>
	render(
		surfaceOf(board, (next) => {
			board = next;
			draw();
		}),
		root,
	);

const settle = async (times = 40): Promise<void> => {
	for (let i = 0; i < times; i += 1) await new Promise((resolve) => setTimeout(resolve, 1));
};

let failed = 0;
let checks = 0;
const check = (label: string, got: unknown, want: unknown): void => {
	checks += 1;
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK " : "!! "} ${label}${ok ? "" : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`}`,
	);
};

const body = dom.window.document.body;
const dialog = (): Element | null => body.querySelector(".orbi-task-dialog");
const dialogNow = (): Element => {
	const shown = dialog();
	if (!shown) throw new Error("no task dialog is open");
	return shown;
};
const all = (selector: string): Element[] => [...(dialog()?.querySelectorAll(selector) ?? [])];
const click = async (node: Element | null | undefined): Promise<void> => {
	if (!node) throw new Error("nothing to press");
	node.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
	await settle();
};
const cards = (): Element[] => [...root.querySelectorAll(".orbi-kanban .ok-card-slot")];
const rowNamed = (name: string): Element | undefined =>
	all(".otd-row").find((node) => textIn(node.querySelector(".wg-kit-row-label")) === name);
const rowNames = (): (string | undefined)[] => all(".otd-row .wg-kit-row-label").map((node) => textIn(node));
const valueOf = (name: string): string | undefined => textIn(rowNamed(name)?.querySelector(".otd-value"));
const panel = (): Element | null => body.querySelector(".wg-kit-pop.is-open:not(.is-exiting)");
const items = (): Element[] => [...(panel()?.querySelectorAll(".wg-kit-pop-item") ?? [])];
const itemNamed = (text: string): Element | undefined =>
	items().find((node) => (textIn(node) ?? "").toLowerCase().startsWith(text.toLowerCase()));
const openRow = async (name: string): Promise<void> => click(rowNamed(name));
const modes = (): Element[] => [...(dialog()?.querySelectorAll(".otd-desc-head .wg-kit-seg button") ?? [])];
const modeNamed = (label: string): Element | undefined => modes().find((node) => textIn(node) === label);
const chosenMode = (): string | undefined =>
	textIn(modes().find((node) => node.getAttribute("aria-selected") === "true"));
const editor = (): HTMLTextAreaElement | null => {
	const node = dialog()?.querySelector("textarea.wg-kit-md-input");
	return node instanceof dom.window.HTMLTextAreaElement ? node : null;
};
const editorField = (): HTMLTextAreaElement => {
	const node = editor();
	if (!node) throw new Error("the dialog drew no body editor");
	return node;
};
const focused = (): Element | null => dom.window.document.activeElement;
const mirror = (): Element | null | undefined => dialog()?.querySelector(".wg-kit-md-mirror");
const RENDERED_CALLS: unknown = Reflect.get(MarkdownRenderer, "calls");
const drawn = (): unknown => listAt(RENDERED_CALLS).at(-1);
const typeBody = async (text: string): Promise<void> => {
	editorField().value = text;
	editorField().dispatchEvent(new dom.window.Event("input", { bubbles: true }));
	await settle();
};
const leaveBody = async (): Promise<void> => {
	editorField().dispatchEvent(new dom.window.FocusEvent("focusout", { bubbles: true }));
	await settle(80);
};
const wroteLast = (): { readonly props: NoteProps } => written[written.length - 1] ?? { props: {} };
const toneOfPill = (name: string): string =>
	(rowNamed(name)?.querySelector(".wg-kit-pill")?.className ?? "").replace("wg-kit-pill", "").trim();

draw();
await settle();

console.log("— nothing is open until a task is —\n");
check("no dialog before a card is pressed", Boolean(dialog()), false);
check("and no note's text has been read to draw the cards", reads, []);

console.log("\n— the strip under a card carries facts the note HAS, and nothing else —");
{
	const strip = (node: Element | undefined): string[] =>
		[...(node?.querySelectorAll(".orbi-task-card-meta .orbi-task-card-meta-item") ?? [])].map(
			(item) => textIn(item) ?? "",
		);
	const named = (title: string): Element | undefined =>
		cards().find((node) => textIn(node.querySelector(".orbi-task-card-title")) === title);

	const DATED = "Design the onboarding flow";
	const datedPath = `${FOLDER}/design-the-onboarding-flow.md`;
	const was = { ...fileAt(datedPath, () => ({})).props };
	const setProps = async (patch: NoteProps): Promise<void> => {
		Object.assign(fileAt(datedPath, () => ({})).props, patch);
		announce(fileAt(datedPath, () => ({})));
		await settle();
	};
	const putBack = async (): Promise<void> => {
		const file = fileAt(datedPath, () => ({}));
		for (const key of Object.keys(file.props)) delete file.props[key];
		Object.assign(file.props, was);
		announce(file);
		await settle();
	};

	check("a note with no deadline shows no date", strip(named(DATED)).length, 0);
	await setProps({ Deadline: "2026-08-31" });
	check("setting one puts it on the card", strip(named(DATED)).length, 1);
	check("spelled the way a person reads a date", strip(named(DATED))[0], "31 Aug");
	check("not the way the file stores it", strip(named(DATED))[0]?.includes("2026-08-31"), false);
	await setProps({ Deadline: "2027-01-04" });
	check("a deadline in another year says which year", strip(named(DATED))[0], "4 Jan 2027");
	await setProps({ Deadline: "2026-08-31" });

	check(
		"no checklist, because there is no checklist",
		strip(named(DATED)).some((text) => /^\d+\/\d+$/.test(text)),
		false,
	);
	check("no comment count, because there are no comments", strip(named(DATED)).length, 1);

	embedsBy.set(datedPath, [{ link: "a.png" }, { link: "b.pdf" }]);
	await setProps({});
	const counted = strip(named(DATED));
	check("two embedded files are counted as two", counted.includes("2"), true);
	check("and they join the date, not replace it", counted.length, 2);

	embedsBy.clear();
	await setProps({});
	check("a note that embeds nothing shows no file count", strip(named(DATED)).length, 1);

	const track = (): Element | null | undefined => named(DATED)?.querySelector(".orbi-task-card-track");
	await setProps({ progress: 0 });
	check("a task at nought draws no progress bar", Boolean(track()), false);
	await setProps({ progress: 34 });
	check("and one that has started draws one", Boolean(track()), true);
	check("saying how far it has come", textIn(track()), "34%");

	const dashes = (title: string): Element[] => [...(named(title)?.querySelectorAll(".orbi-task-card-stripe") ?? [])];
	const toneOfDash = (node: Element | undefined): string =>
		(node?.className ?? "").replace("orbi-task-card-stripe", "").trim();
	check("one dash per tag the note lists", dashes(DATED).length, 2);
	check("the first takes the tone the map gives it", toneOfDash(dashes(DATED)[0]), "is-err");
	check("and a tag the map says nothing about stays grey", toneOfDash(dashes(DATED)[1]), "");
	check("a note with no map at all still draws its tags", dashes("New task").length, 1);
	check("all of them grey", toneOfDash(dashes("New task")[0]), "");

	await putBack();
	check("and the note is left exactly as this section found it", fileAt(datedPath, () => ({})).props, was);
}

const first = cards()[0];
const openedCard = textIn(first) ?? "";
await click(first);
check("pressing a card opens the dialog", Boolean(dialog()), true);
check(
	"and it carries that note's own title",
	openedCard.includes(String(textIn(dialogNow().querySelector(".otd-title")))),
	true,
);
check("the strip says what the window is", textIn(dialogNow().querySelector(".otd-where"))?.startsWith("Card"), true);
check(
	"and which board the task sits on",
	dialogNow().querySelector(".otd-where")?.textContent?.includes("Marketing Team"),
	true,
);
const shownTitle = textIn(dialogNow().querySelector(".otd-title"));
const openPath = vaultFiles(FOLDER).find((file) => (file.props["title"] ?? file.basename) === shownTitle)?.path;
const openPathNow = openPath ?? "";
const heldNow = (at: string): NoteFile => {
	const file = held.get(at);
	if (!file) throw new Error(`no note is held at ${at}`);
	return file;
};
check("opening it reads ONE note's text, the one on screen", reads, [openPath]);

console.log("\n— the list of properties belongs to the board —");
check(
	"the tile carries no setting of its own",
	"properties" in (board.tiles.find((tile) => tile.id === "board")?.settings ?? {}),
	false,
);
check("the board record carries it instead", rowNames(), [
	"Status",
	"Priority",
	"Progress",
	"Assignees",
	"Deadline",
	"Client",
]);

console.log("\n— the plate is the BOARD's list, in the board's order —");
check("one row per name the board declares", rowNames(), [
	"Status",
	"Priority",
	"Progress",
	"Assignees",
	"Deadline",
	"Client",
]);

check("a property row's icon is a glyph, not a filled badge", all(".otd-row .wg-kit-row-badge").length, 0);
check(
	"and every row carries one",
	all(".otd-row").length > 0 && all(".otd-row").every((node) => node.querySelector(".wg-kit-side-icon")),
	true,
);
check("the group holds the values", Boolean(dialogNow().querySelector(".otd-props .wg-kit-side-list .otd-row")), true);
check(
	"and the heading sits outside it",
	Boolean(dialogNow().querySelector(".wg-kit-side-list .otd-plate-head")),
	false,
);
check("a name no note has ever carried is still a row", Boolean(rowNamed("Deadline")), true);
check("and it reads as unset", valueOf("Deadline"), "Empty");
check("as a real, pressable row", rowNamed("Deadline")?.tagName, "BUTTON");
check("marked unset for the eye too", rowNamed("Deadline")?.classList.contains("is-unset"), true);

console.log("\n— the NAME decides the control —");
check("Priority is a tag", Boolean(rowNamed("Priority")?.querySelector(".wg-kit-pill")), true);
check("carrying the priority's own tone", ["is-err", "is-warn", "is-ok"].includes(toneOfPill("Priority")), true);
check("Progress is a track", Boolean(rowNamed("Progress")?.querySelector(".wg-kit-progress-track")), true);
check("Assignees is people", Boolean(rowNamed("Assignees")?.querySelector(".otd-avatars")), true);
check("Client, anchored to nothing, is plain text", Boolean(rowNamed("Client")?.querySelector("input.otd-text")), true);
check("and a text row is the field, not a button", rowNamed("Client")?.tagName, "DIV");

console.log("\n— Status is the one anchor whose values are not fixed —");
await openRow("Status");
check(
	"pressing it offers the board's own columns",
	items()
		.map((node) => node.textContent?.trim())
		.slice(0, 3),
	["To Do", "Doing", "Done"],
);
check(
	"with the column this task is in ticked",
	items().filter((node) => node.getAttribute("aria-checked") === "true").length,
	1,
);
check(
	"and no way to empty it, because a task is always in some column",
	items().some((node) => node.textContent?.trim() === "Clear"),
	false,
);
await click(itemNamed("To Do"));
check("picking one writes the note", wroteLast().props["status"], "To Do");
check("under the key the note already spells", "status" in wroteLast().props, true);
check("and the row follows", String(valueOf("Status")).startsWith("To Do"), true);
await openRow("Priority");
check(
	"a choice that can be emptied still offers it",
	items().some((node) => node.textContent?.trim() === "Clear"),
	true,
);
await click(rowNamed("Priority"));

console.log("\n— filling an unset row is what creates it on the note —");
check(
	"the note carries no deadline of any spelling",
	Object.keys(wroteLast().props).some((key) => key.toLowerCase() === "deadline"),
	false,
);
await openRow("Deadline");
check("the date anchor opens a calendar", Boolean(panel()?.querySelector(".wg-kit-cal-grid")), true);
check("with Today and Next Monday under it", [itemNamed("Today"), itemNamed("Next Monday")].every(Boolean), true);
await click(itemNamed("Today"));
check("choosing a date creates the key, spelled as the board named it", "Deadline" in wroteLast().props, true);
check("stored as a plain ISO date", /^\d{4}-\d{2}-\d{2}$/.test(String(wroteLast().props["Deadline"])), true);
check("the row is no longer unset", rowNamed("Deadline")?.classList.contains("is-unset"), false);
check("and it reads as a date a person reads", /^\d{1,2} \w{3} \d{4}$/.test(String(valueOf("Deadline"))), true);

console.log("\n— people are ours: the roster is whoever the board already names —");
await openRow("Assignees");
check("the panel offers the people on this board", items().length > 1, true);
check("and can be searched", Boolean(panel()?.querySelector(".wg-kit-pop-search input")), true);
check("and it opens over the row, not under it", panel()?.classList.contains("is-below"), false);
const ticked = items().filter((node) => node.getAttribute("aria-checked") === "true");
check("the ones on this task are ticked", ticked.length > 0, true);
await click(ticked[0]);
check("unticking one takes them off the note", fieldIn(wroteLast().props, "assignees", "length"), ticked.length - 1);
check("and the rest stay a list", Array.isArray(wroteLast().props["assignees"]), true);

console.log("\n— text is edited where it is read —");
const field = inputNow(rowNamed("Client"), "input.otd-text");
field.value = "Internal";
field.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
await settle();
field.dispatchEvent(new dom.window.FocusEvent("focusout", { bubbles: true }));
await settle();
check("leaving the field writes it", wroteLast().props["Client"], "Internal");

console.log("\n— the description: the note's own text, in the two modes it is worth reading in —");
const wasOnDisk = textOf(heldNow(openPathNow));
const bodyOnDisk = readBody(wasOnDisk);
check(
	"the description offers both modes",
	modes().map((node) => node.textContent?.trim()),
	["Preview", "Detail"],
);
check("and opens on the one that reads", chosenMode(), "Preview");
check("preview is Obsidian's own rendering, not ours", Boolean(drawn()), true);
check("handed the note's body", fieldIn(drawn(), "markdown"), bodyOnDisk);
check("into the element the widget owns", fieldIn(drawn(), "el") === dialogNow().querySelector(".otd-md"), true);

await click(modeNamed("Detail"));
check("detail hands over the raw note", editorField().value, bodyOnDisk);
check("switching to Detail hands the caret to the editor", focused() === editor(), true);
check("and stands it at the very start", [editorField().selectionStart, editorField().selectionEnd], [0, 0]);
const EDITED = "## Why one surface\n\n**bold** text and a [[link]]";
await typeBody(EDITED);
check("nothing is hidden — the markers stay on screen", mirror()?.textContent?.includes("## Why one surface"), true);
check("a heading is only made heavier", Boolean(mirror()?.querySelector(".is-heading")), true);
check("bold markup is only made bolder", Boolean(mirror()?.querySelector(".is-strong")), true);
check("a link takes the accent", Boolean(mirror()?.querySelector(".is-link")), true);

await leaveBody();
check("leaving the editor writes the body", readBody(texts.get(openPathNow) ?? ""), EDITED);
check(
	"and the note's properties are left exactly as they were",
	texts.get(openPathNow)?.startsWith(wasOnDisk.slice(0, wasOnDisk.length - bodyOnDisk.length)),
	true,
);
await click(modeNamed("Preview"));
check("preview draws what was just saved", fieldIn(drawn(), "markdown"), EDITED);
check(
	"AND PREVIEW HOLDS NO CARET — it is there to be read",
	[Boolean(editor()), focused()?.tagName === "TEXTAREA"],
	[false, false],
);

console.log("\n— the anchor ignores case, on the whole name and nothing less —");
const listBecomes = async (properties: readonly string[]): Promise<void> => {
	const held = board.tiles.find((tile) => tile.id === "board");
	const record = { columns: [{ name: "To Do" }, { name: "Doing" }, { name: "Done" }], properties };
	board = normalizeBoard({
		...board,
		tiles: board.tiles.map((tile) =>
			tile === held
				? {
						...tile,
						props: {
							...tile.props,
							boards: { implementation: "@obsidian/folder", fields: { path: "Orbitask/NoBoards" }, allow: EVERY_VERB },
							board: { implementation: "@core/typed-value", fields: { value: record } },
						},
					}
				: tile,
		),
	});
	draw();
	await settle();
};
await listBecomes(["deadline", "DEADLINE (soft)", "Members"]);
check("the rows are the names as authored", rowNames(), ["deadline", "DEADLINE (soft)", "Members"]);
await openRow("deadline");
check("a lowercase deadline is still a date", Boolean(panel()?.querySelector(".wg-kit-cal-grid")), true);
check("a near miss falls through to text", Boolean(rowNamed("DEADLINE (soft)")?.querySelector("input.otd-text")), true);
check("Members anchors to people, the same as Assignees", valueOf("Members"), "Empty");

console.log("\n— Add property asks one question, and the answer decides everything —");
await listBecomes(["Status", "Priority"]);
await click(dialogNow().querySelector(".otd-add"));
const naming = inputIn(body, ".otd-pop-field input");
check("it asks for a name", Boolean(naming), true);
if (!naming) throw new Error("Add property drew no name field");
const typeName = async (name: string): Promise<void> => {
	naming.value = name;
	naming.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
	await settle();
};
await typeName("Deadline");
check(
	"and says what the name will make, while it is typed",
	body.querySelector(".otd-hint")?.textContent?.includes("a date"),
	true,
);
await typeName("Repo");
check(
	"a name it does not know says so too",
	body.querySelector(".otd-hint")?.textContent?.includes("plain text"),
	true,
);
naming.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
await settle();
const dialogSettings = (): object => board.tiles.find((tile) => tile.id === "board")?.settings ?? {};
const recordProperties = (): unknown[] =>
	listAt(board.tiles.find((tile) => tile.id === "board")?.props, "board", "value", "properties");
check("committing puts the name last on the board's own list", recordProperties().slice(-1)[0], "Repo");
check("and it landed on the board record, not on a setting of the tile", "properties" in dialogSettings(), false);
check("the row lands unset", valueOf("Repo"), "");
check("as text, because Repo is anchored to nothing", Boolean(rowNamed("Repo")?.querySelector("input.otd-text")), true);

console.log("\n— and it landed on EVERY task, not just the one that was open —");
await click(dialogNow().querySelector(".otd-corner button:last-child"));
check("closing dismisses the dialog", Boolean(dialog()), false);
await click(cards()[1]);
check("a different task opens", Boolean(dialog()), true);
check("carrying the same list", rowNames(), ["Status", "Priority", "Repo"]);

console.log("\n— the two controls in the corner —");
await click(dialogNow().querySelector(".otd-corner button:first-child"));
check("expand leaves the dialog for the note itself", opened.length, 1);
await click(dialogNow().querySelector(".otd-corner button:last-child"));
check("close leaves nothing behind", Boolean(dialog()), false);
await click(cards()[1]);
check("and pressing the SAME card again opens it once more", Boolean(dialog()), true);

console.log("\n— a tag carries its own colour, and the chip is where both are changed —");
{
	const TAGGED = "Design the onboarding flow";
	const taggedPath = `${FOLDER}/design-the-onboarding-flow.md`;
	const openTagged = async () => {
		if (dialog()) await click(dialogNow().querySelector(".otd-corner button:last-child"));
		await click(cards().find((node) => node.textContent?.includes(TAGGED)));
	};
	await openTagged();

	const chips = (): Element[] => all(".otd-tags .otd-tag");
	const worn = (): (string | undefined)[] => chips().map((node) => textIn(node));
	const toneOfChip = (node: Element): string => node.className.replace(/wg-kit-pill|otd-tag|is-held/g, "").trim();
	const placeChips = (): void => {
		chips().forEach((node, at) => {
			const box = { left: at * 80, top: 0, width: 80, height: 24, right: at * 80 + 80, bottom: 24 };
			Object.assign(node, { getBoundingClientRect: () => box });
		});
	};
	const pointer = (name: string, x: number): MouseEvent =>
		new dom.window.MouseEvent(name, { bubbles: true, clientX: x, clientY: 12 });
	const dragChip = async (from: number, toX: number): Promise<void> => {
		placeChips();
		chips()[from]?.dispatchEvent(pointer("pointerdown", from * 80 + 40));
		dom.window.dispatchEvent(pointer("pointermove", toX));
		await settle();
		dom.window.dispatchEvent(pointer("pointerup", toX));
	};
	const chipPanel = (): Element | null =>
		body.querySelector(".wg-kit-pop.is-open:not(.is-exiting) .otd-tones")?.closest(".wg-kit-pop") ?? null;

	check("the note's tags are worn in the order it lists them", worn(), ["#design", "#onboarding"]);
	check("each chip carries the tone the map gives it", chips().map(toneOfChip), ["is-err", ""]);
	check("and no chip carries a cross any more", all(".otd-tag-drop").length, 0);

	await click(chips()[0]);
	check("pressing a chip opens its own panel instead of taking it off", Boolean(chipPanel()), true);
	check("the tag is still worn", worn().includes("#design"), true);
	check(
		"the panel offers every tone the kit has",
		chipPanel()?.querySelectorAll(".otd-tone").length,
		TONE_NAMES.length,
	);
	check(
		"with the tag's own already picked",
		chipPanel()?.querySelector(".otd-tone.is-picked")?.getAttribute("aria-label"),
		"error",
	);

	const naming = (): HTMLInputElement => inputNow(chipPanel(), ".otd-pop-field input");
	naming().value = "product-design";
	naming().dispatchEvent(new dom.window.Event("input", { bubbles: true }));
	await settle();
	await click(
		[...(chipPanel()?.querySelectorAll(".otd-tone") ?? [])].find(
			(node) => node.getAttribute("aria-label") === "success",
		),
	);
	const beforeSave = written.length;
	await click(
		[...(chipPanel()?.querySelectorAll(".wg-kit-btn") ?? [])].find((node) => node.textContent?.trim() === "Save"),
	);
	check("saving writes the new name into the list, in place", wroteLast().props["tags"], [
		"product-design",
		"onboarding",
	]);
	check("and the colour into the map beside it", wroteLast().props["tagTones"], { "product-design": "success" });
	check("in ONE write, so the list and the map can never disagree", written.length - beforeSave, 1);
	check("the chip follows", worn(), ["#product-design", "#onboarding"]);

	await click(chips()[0]);
	await click(
		[...(chipPanel()?.querySelectorAll(".otd-tone") ?? [])].find(
			(node) => node.getAttribute("aria-label") === "neutral",
		),
	);
	await click(
		[...(chipPanel()?.querySelectorAll(".wg-kit-btn") ?? [])].find((node) => node.textContent?.trim() === "Save"),
	);
	check("grey is no entry at all, not an entry saying grey", wroteLast().props["tagTones"], {});

	await click(chips()[0]);
	naming().value = "renamed-and-dropped";
	naming().dispatchEvent(new dom.window.Event("input", { bubbles: true }));
	await settle();
	await click(
		[...(chipPanel()?.querySelectorAll(".wg-kit-btn") ?? [])].find((node) => node.textContent?.trim() === "Cancel"),
	);
	check("cancel writes nothing", worn(), ["#product-design", "#onboarding"]);

	await dragChip(1, 10);
	await settle();
	check("dragging a chip past another writes the new order", wroteLast().props["tags"], [
		"onboarding",
		"product-design",
	]);
	check("and the row reads in that order", worn(), ["#onboarding", "#product-design"]);

	await dragChip(0, 30);
	chips()[0]?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
	await settle();
	check("a drag does not open the panel the press would have", Boolean(chipPanel()), false);

	const before = written.length;
	chips()[0]?.dispatchEvent(pointer("pointerdown", 40));
	dom.window.dispatchEvent(pointer("pointerup", 42));
	await settle();
	check("and a press that never moved writes nothing", written.length, before);

	fileAt(taggedPath, () => ({})).props["tags"] = ["design", "onboarding"];
	fileAt(taggedPath, () => ({})).props["tagTones"] = { design: "error" };
	announce(fileAt(taggedPath, () => ({})));
	await settle();
}

console.log("\n— a code block is carried away, not retyped —");
{
	const FENCED = "Run it:\n\n```sh\nnpm run build\n```\n";
	const copiers = (): Element[] => all(".otd-md pre .otd-copy");
	await click(modeNamed("Detail"));
	await typeBody(FENCED);
	await leaveBody();
	await click(modeNamed("Preview"));
	await settle();
	check("the block the renderer produced carries a copy button", copiers().length, 1);
	check(
		"it is the kit's own icon button, at the small size",
		copiers()[0]?.className.includes("wg-kit-icon is-s"),
		true,
	);
	check(
		"standing inside the block it copies",
		copiers()[0]?.closest("pre")?.querySelector("code")?.textContent?.trim(),
		"npm run build",
	);

	let carried = "";
	Object.defineProperty(dom.window.navigator, "clipboard", {
		configurable: true,
		writable: true,
		value: {
			writeText: (text: string) => {
				carried = text;
			},
		},
	});
	await click(copiers()[0]);
	check("pressing it hands over the code and nothing else", carried.trim(), "npm run build");
	check("and says so", Boolean(copiers()[0]?.querySelector("svg")), true);

	await click(modeNamed("Detail"));
	await settle();
	check("leaving the preview takes the button with it", all(".otd-copy").length, 0);
	await click(modeNamed("Preview"));
	await settle();
	check("and coming back does not leave two", copiers().length, 1);
}

console.log("\n— a body the file cannot hold is refused, and the dialog says so —");
render(null, root);
let plain = normalizeBoard({
	tiles: [
		{
			id: "board",
			widget: KANBAN,
			props: {
				tasks: { implementation: "@obsidian/folder", fields: { path: PLAIN }, allow: EVERY_VERB },
				boards: { implementation: "@obsidian/folder", fields: { path: "Orbitask/NoBoards" }, allow: EVERY_VERB },
				board: {
					implementation: "@core/typed-value",
					fields: { value: { columns: [{ name: "To Do" }], properties: ["Status"] } },
				},
			},
		},
	],
	layouts: { 20: { places: [{ id: "board", x: 0, y: 0, w: 20, h: 10 }] } },
});
const drawPlain = (): void =>
	render(
		surfaceOf(plain, (next) => {
			plain = next;
			drawPlain();
		}),
		root,
	);
drawPlain();
await settle();

await click(cards()[0]);
await click(modeNamed("Detail"));
check("the plain note has no properties at all", editorField().value, "The note opens straight into its body.\n");
await typeBody("---\ntitle: hijacked\n---\n\nA body that would become the note's properties.");
await leaveBody();
check("the note is left exactly as it was", texts.get(PLAIN_NOTE), "The note opens straight into its body.\n");
check("the dialog says the write did not land", Boolean(dialogNow().querySelector(".otd-refused")), true);
check("and the text is still there to be fixed", editorField().value.startsWith("---"), true);
await typeBody("A body the file can hold.");
await leaveBody();
check("a body it CAN hold lands", texts.get(PLAIN_NOTE), "A body the file can hold.");
check("and the warning goes with it", Boolean(dialogNow().querySelector(".otd-refused")), false);

console.log("\n— a tag comes off where it is worn, and Enter takes the first match —");
{
	const openFirst = async () => {
		if (!dialog()) await click(cards()[0]);
	};
	await openFirst();
	const tags = (): string[] =>
		[...dialogNow().querySelectorAll(".otd-tags .otd-tag")].map((node) => textIn(node) ?? "");
	const tagPanel = (): Element => body.querySelector(".wg-kit-pop-search")?.closest(".wg-kit-pop") ?? body;

	await click(dialogNow().querySelector(".otd-tag-add"));
	const searched = inputIn(tagPanel(), ".wg-kit-pop-search-field input");
	check("the tag panel opens on a field", Boolean(searched), true);
	if (!searched) throw new Error("the tag panel drew no search field");
	const field = searched;
	field.value = "urgent";
	field.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
	await settle();
	field.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
	await settle();
	check(
		"Enter applies the first match",
		tags().some((text) => text.startsWith("#urgent")),
		true,
	);

	const before = tags().length;
	await click(dialogNow().querySelector(".otd-tag-add"));
	await click(
		[...tagPanel().querySelectorAll(".wg-kit-pop-item")].find((node) => node.textContent?.trim() === "#urgent"),
	);
	check("unticking it takes the tag off", tags().length, before - 1);
	const written_ = wroteLast().props["tags"] ?? [];
	check(
		"and the note no longer names it",
		(Array.isArray(written_) ? written_ : String(written_).split(",")).includes("urgent"),
		false,
	);
	const tones = wroteLast().props["tagTones"];
	check("its colour leaves with it", isObject(tones) && "urgent" in tones, false);
}

console.log("\n— a description nobody switched to keeps its hands off the caret —");
{
	const editOnly = { ...host, can: { ...host.can, renderMarkdown: false } };
	render(null, root);
	render(
		surfaceOf(plain, () => {}, editOnly),
		root,
	);
	await settle();
	await click(cards()[0]);
	check("with nothing to preview the description opens on Detail", Boolean(editor()), true);
	check("there is no mode to switch", modes().length, 0);
	check("AND THE CARET IS LEFT WHERE IT WAS", focused() === editor(), false);
}

console.log("\n— the window falls out of the place that was pressed —");
{
	render(null, root);
	await settle();

	const BOX = { x: 360, y: 140, left: 360, top: 140, width: 560, height: 420, right: 920, bottom: 560 };
	const NOWHERE = { x: 0, y: 0, left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 };
	const wasRect = dom.window.Element.prototype.getBoundingClientRect;
	const flushes: { readonly opacity: string; readonly transition: string }[] = [];
	const styleOf = (node: Element): CSSStyleDeclaration | undefined =>
		node instanceof dom.window.HTMLElement ? node.style : undefined;
	Object.assign(dom.window.Element.prototype, {
		getBoundingClientRect(this: Element) {
			if (!this.classList?.contains("wg-dialog")) return { ...NOWHERE };
			flushes.push({ opacity: styleOf(this)?.opacity ?? "", transition: styleOf(this)?.transition ?? "" });
			return { ...BOX };
		},
	});

	const realNow = Date.now;
	let skewMs = 0;
	Date.now = () => realNow.call(Date) + skewMs;

	const frame = (): Promise<unknown> => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
	const press = (node: Element | null | undefined, x: number, y: number): boolean => {
		if (!node) throw new Error("nothing to press");
		return node.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, clientX: x, clientY: y, detail: 1 }));
	};
	const keyPress = (node: Element | undefined): boolean => {
		if (!node) throw new Error("nothing to press");
		return node.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
	};
	const shotOf = (panel: Element | null): typeof BARE => {
		const style = panel ? styleOf(panel) : undefined;
		return !style
			? { ...BARE }
			: {
					origin: style.transformOrigin,
					translate: style.translate,
					scale: style.scale,
					opacity: style.opacity,
					transition: style.transition,
				};
	};
	const BARE = { origin: "", translate: "", scale: "", opacity: "", transition: "" };
	const MISSED = {
		origin: "no beat",
		translate: "no beat",
		scale: "no beat",
		opacity: "no beat",
		transition: "no beat",
	};
	const endFold = (panel: Element): boolean =>
		panel.dispatchEvent(new (transitionEventKind())("transitionend", { bubbles: true, propertyName: "scale" }));
	const shutDown = async (): Promise<void> => {
		if (!dialog()) return;
		press(dialogNow().querySelector(".otd-corner button:last-child"), 900, 90);
		await frame();
		const folding = dialog();
		if (folding) endFold(folding);
		await frame();
	};

	const trace: { readonly at: number; readonly style: typeof BARE }[] = [];
	const sample = (): void => {
		const panel = dialog();
		if (!panel) return;
		const shot = shotOf(panel);
		const last = trace[trace.length - 1];
		if (last && JSON.stringify(last.style) === JSON.stringify(shot)) return;
		trace.push({ at: realNow.call(Date), style: shot });
	};

	draw();
	await settle();
	const beat = setInterval(sample, 2);
	press(cards()[0], 400, 500);
	await new Promise((resolve) => setTimeout(resolve, 620));
	clearInterval(beat);

	const seat = trace[0]?.style ?? MISSED;
	const grow = trace[1]?.style ?? MISSED;
	const settled = trace[2]?.style ?? MISSED;
	const rest = trace[3]?.style ?? MISSED;
	const beatAt = (at: number): number => trace[at]?.at ?? 0;

	check("the window is opened by a press, and four beats are painted", trace.length, 4);
	check("THE FIRST FRAME GROWS FROM THE PRESS", seat.origin, "40px 360px");
	check("not from the centre a window would otherwise sit at", seat.origin === "50% 50%", false);
	check("and it starts pulled toward the press, not at rest", seat.translate, "-43px 27px");
	check("at nine tenths of its size, already substantial", seat.scale, "0.9");
	check("painted on nothing yet", seat.opacity, "0");
	check("with no curve in force, so the seat is not itself a slide", seat.transition, "none");

	check("the next beat brings it home", grow.translate, "0px 0px");
	check("PAST its own size", Number(grow.scale) > 1, true);
	check("by the five percent the design asks for", grow.scale, "1.05");
	check("and the opacity is carried there on a curve", /opacity 220ms/.test(grow.transition), true);
	check("not set and left", grow.opacity, "1");
	check("the fade is a beat later than the frame it starts from", beatAt(1) > beatAt(0), true);

	check("the overshoot is then given back", settled.scale, "1");
	check("to exactly its own size", Number(settled.scale), 1);
	check("and nothing but the scale is still moving", settled.transition, "scale 160ms var(--wg-ease)");
	check("after the fall has had its 220ms", beatAt(2) - beatAt(1) >= 200, true);

	check("the last beat leaves nothing painted on the window", rest, BARE);
	check("after the settle has had its 160ms", beatAt(3) - beatAt(2) >= 140, true);

	const scales = trace.map((shot) => shot.style.scale).filter(Boolean);
	check(
		"every beat scales both axes by one number",
		scales.map((value) => value.trim().split(/\s+/).length),
		[1, 1, 1],
	);
	const shapes = scales.map(
		(value) => Math.round(((BOX.width * Number(value)) / (BOX.height * Number(value))) * 10000) / 10000,
	);
	check("so the window keeps its shape at every beat", shapes, [
		Math.round((BOX.width / BOX.height) * 10000) / 10000,
		Math.round((BOX.width / BOX.height) * 10000) / 10000,
		Math.round((BOX.width / BOX.height) * 10000) / 10000,
	]);
	check(
		"and the widest step from its own size is a tenth",
		Math.round(Math.max(...scales.map((value) => Math.abs(1 - Number(value)))) * 1000) / 1000,
		0.1,
	);

	console.log("\n— and it goes back the way it came —");
	flushes.length = 0;
	press(dialogNow().querySelector(".otd-corner button:last-child"), 900, 90);
	await frame();
	check("closing does not take the window out in the same frame", Boolean(dialog()), true);
	const folding = shotOf(dialog());
	check("it goes back to WHERE IT CAME FROM, not to where the closing press landed", folding.origin, "40px 360px");
	check("shrinking to the size it arrived at", folding.scale, "0.9");
	check("pulled back toward the press it came from", folding.translate, "-43px 27px");
	check("and the opacity is carried out on a curve too", /opacity 160ms/.test(folding.transition), true);
	check("to nothing", folding.opacity, "0");

	check("the fold measures the window before it folds it", flushes.length > 0, true);
	check("SO IT HOLDS THE OPACITY UP BEFORE MEASURING", flushes[0]?.opacity, "1");
	check(
		"because opacity is not in the curve still in force there",
		/opacity/.test(flushes[0]?.transition ?? ""),
		false,
	);

	check("the window is still there while it folds", Boolean(dialog()), true);
	const stillFolding = dialog();
	if (stillFolding) endFold(stillFolding);
	await frame();
	check("and leaves only when its transition ends", Boolean(dialog()), false);

	console.log("\n— a window nobody pressed for grows from its own centre —");
	skewMs = 5000;
	trace.length = 0;
	const centred = setInterval(sample, 2);
	keyPress(cards()[1]);
	await new Promise((resolve) => setTimeout(resolve, 60));
	clearInterval(centred);
	check(
		"a keyboard click is not a place on screen, so the press is not remembered",
		(trace[0] ?? { style: MISSED }).style.origin,
		"50% 50%",
	);
	check(
		"and the stale press it stands next to is not borrowed",
		(trace[0] ?? { style: MISSED }).style.translate,
		"0px 0px",
	);
	check("it still arrives at nine tenths", (trace[0] ?? { style: MISSED }).style.scale, "0.9");
	flushes.length = 0;
	press(dialogNow().querySelector(".otd-corner button:last-child"), 900, 90);
	await frame();
	check("and folds back to that same centre", shotOf(dialog()).origin, "50% 50%");
	await shutDown();

	console.log("\n— reduced motion is given the end of the gesture, not the gesture —");
	const wasMedia = dom.window.matchMedia;
	Object.assign(dom.window, {
		matchMedia: (query: string) => ({
			matches: /prefers-reduced-motion/.test(query),
			media: query,
			onchange: null,
			addListener() {},
			removeListener() {},
			addEventListener() {},
			removeEventListener() {},
			dispatchEvent: () => false,
		}),
	});
	press(cards()[1], 400, 500);
	await settle();
	check("the window is simply there, with nothing painted on it", shotOf(dialog()), BARE);
	press(dialogNow().querySelector(".otd-corner button:last-child"), 900, 90);
	await frame();
	check("and simply gone, without waiting for a transition", Boolean(dialog()), false);
	Object.assign(dom.window, { matchMedia: wasMedia });

	console.log("\n— rAF can be starved, and the window still arrives —");
	const wasRaf = globalThis.requestAnimationFrame;
	const wasCancel = globalThis.cancelAnimationFrame;
	let asked = 0;
	Object.assign(globalThis, { requestAnimationFrame: () => (asked += 1), cancelAnimationFrame: () => {} });
	trace.length = 0;
	const starved = setInterval(sample, 2);
	press(cards()[0], 400, 500);
	await new Promise((resolve) => setTimeout(resolve, 400));
	clearInterval(starved);
	Object.assign(globalThis, { requestAnimationFrame: wasRaf, cancelAnimationFrame: wasCancel });
	check("a frame was asked for and never given", asked > 0, true);
	check("the seat is painted all the same", (trace[0] ?? { style: MISSED }).style.scale, "0.9");
	check("AND THE GROWTH STILL COMES, carried by a timer", (trace[1] ?? { style: MISSED }).style.scale, "1.05");
	check("so the window is never left standing at nothing", (trace[1] ?? { style: MISSED }).style.opacity, "1");
	await shutDown();

	Date.now = realNow;
	Object.assign(dom.window.Element.prototype, { getBoundingClientRect: wasRect });
}

console.log(failed ? `\n${failed} of ${checks} failed` : `\n${checks} checks: the board's list is the task's rows`);
process.exit(failed ? 1 : 0);
