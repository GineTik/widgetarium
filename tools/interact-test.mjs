// The render test proved the widgets DRAW. It fed them an empty, read-only slot, so it could
// never prove they WORK — the board it checked was blank. This one gives them the real notes
// and then presses the things a person presses.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { JSDOM } from "jsdom";
import { parse as parseYaml } from "yaml";
import { buildMirror } from "./mirror.mjs";

const VAULT = process.env.WG_VAULT ?? "tools/fixture";
const FOLDER = "Orbitask/Tasks";
const KANBAN_VIEW = "Kanban";

const dom = new JSDOM(`<!doctype html><body><div class="view-content"><div id="host"></div></div></body>`, { pretendToBeVisual: true });
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "KeyboardEvent", "MouseEvent", "Event", "MutationObserver"]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
globalThis.window.setTimeout = globalThis.window.setTimeout ?? setTimeout;
globalThis.window.ResizeObserver = globalThis.ResizeObserver;
Object.defineProperty(dom.window.HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 1280 });

buildMirror();
const { createElement: h } = await import("react");
const { render } = await import("./.mjs-cache/engine/render.mjs");
const { WidgetSurface, resolveMounts } = await import("./.mjs-cache/surface.mjs");
const { WidgetRegistry, boardWidgets } = await import("./.mjs-cache/registry.mjs");
const { normalizeBoard, serializeBoard } = await import("./.mjs-cache/model.mjs");
const { findBlocks } = await import("./.mjs-cache/block-writer.mjs");
const { createHost } = await import("./.mjs-cache/host.mjs");
const { TFile, TFolder } = await import("./.mjs-cache/obsidian.mjs");

const adapter = {
	exists: async (p) => fs.existsSync(path.join(VAULT, p)),
	list: async (p) => {
		// statSync FOLLOWS symlinks; dirent.isDirectory() does not. A linked widget scope
		// reported as neither folder nor file, so the whole scope was silently skipped and
		// the board rendered "widget not found" placeholders the test then counted as tiles.
		const names = fs.readdirSync(path.join(VAULT, p));
		const kind = (name) => { try { return fs.statSync(path.join(VAULT, p, name)); } catch { return null; } };
		return {
			folders: names.filter((name) => kind(name)?.isDirectory()).map((name) => `${p}/${name}`),
			files: names.filter((name) => kind(name)?.isFile()).map((name) => `${p}/${name}`),
		};
	},
	read: async (p) => fs.readFileSync(path.join(VAULT, p), "utf8"),
	stat: async () => ({ mtime: 1, size: 1 }),
};


// The slot comes from src/host.js — the adapter that ships. Building one here is how the
// board passed this test while being dead in the app.
const written = { created: [], updated: [] };
const notices = [];
// note text lives here, so a body write never reaches the user's own vault
const texts = new Map();
const propsByPath = new Map();
const vaultWatchers = new Map();
const watch = (name, run) => {
	if (!vaultWatchers.has(name)) vaultWatchers.set(name, new Set());
	vaultWatchers.get(name).add(run);
	return { name, run };
};
const unwatch = (name, run) => vaultWatchers.get(name)?.delete(run);
const announce = (name, file) => {
	for (const run of [...(vaultWatchers.get(name) ?? [])]) run(file);
};

function frontmatter(text) {
	const found = /^---\n([\s\S]*?)\n---/.exec(text);
	return found ? (parseYaml(found[1]) ?? {}) : {};
}

function vaultFiles(folder) {
	return fs
		.readdirSync(path.join(VAULT, folder))
		.filter((name) => name.endsWith(".md"))
		.map((name) => {
			const file = Object.assign(new TFile(), {
				path: `${folder}/${name}`,
				basename: name.replace(/\.md$/, ""),
				extension: "md",
				stat: { ctime: 1, mtime: 2 },
			});
			const at = `${folder}/${name}`;
			if (!propsByPath.has(at)) propsByPath.set(at, frontmatter(fs.readFileSync(path.join(VAULT, folder, name), "utf8")));
			file.props = propsByPath.get(at);
			return file;
		});
}

const folders = new Map();
const app = {
	vault: {
		// A path is a FILE as often as a folder, and a stub that only answers for folders makes
		// every write silently do nothing — update() looks the file up first and gives up when
		// it is not there.
		getAbstractFileByPath: (target) => {
			if (target.endsWith(".md")) {
				const folder = target.slice(0, target.lastIndexOf("/"));
				return vaultFiles(folder).find((file) => file.path === target) ?? null;
			}
			if (!folders.has(target)) {
				try { folders.set(target, Object.assign(new TFolder(), { path: target, children: vaultFiles(target) })); }
				catch { folders.set(target, null); }
			}
			return folders.get(target);
		},
		create: async (target, body) => { written.created.push({ target, body }); return vaultFiles("Orbitask/Tasks")[0]; },
		cachedRead: async (file) => texts.get(file.path) ?? fs.readFileSync(path.join(VAULT, file.path), "utf8"),
		process: async (file, edit) => {
			const next = edit(texts.get(file.path) ?? fs.readFileSync(path.join(VAULT, file.path), "utf8"));
			texts.set(file.path, next);
			written.updated.push({ path: file.path, text: next });
			announce("modify", file);
			return next;
		},
		on: watch,
		off: (held) => unwatch(held?.name, held?.run),
	},
	metadataCache: { getFileCache: (file) => ({ frontmatter: file.props }), on: watch, off: (held) => unwatch(held?.name, held?.run) },
	fileManager: {
		processFrontMatter: async (file, edit) => {
			edit(file.props);
			written.updated.push({ path: file.path, props: { ...file.props } });
			announce("changed", file);
		},
	},
	workspace: { getLeaf: () => ({ openFile: async () => {} }) },
};

// CONTEXT: renderMarkdown parents a MarkdownRenderChild on the plugin, and unparents it on cleanup
const children = [];
const realHost = createHost(app, {
	registerEvent: () => {},
	addChild: (child) => children.push(child),
	removeChild: (child) => children.splice(children.indexOf(child), 1),
});
// the widget speaks to the person through host.ui.notify; a test that cannot hear it cannot
// tell "refused and said why" from "silently did nothing"
const host = { ...realHost, ui: { ...realHost.ui, notify: (message) => notices.push(String(message)) } };

const registry = new WidgetRegistry({ vault: { adapter } });
await registry.load();

// The board is built HERE, not read from a note. Pointing this at a live page tied the
// suite to whatever was last clicked in the app: a tile deleted there failed a test about
// search. The note proves the format; this proves the behaviour.
// CONTEXT: a refusal that says nothing reads exactly like a rule that never ran
const warnings = [];
console.warn = (...parts) => {
	warnings.push(parts.map((part) => String(part)).join(" "));
};
const reactComplaints = [];
console.error = (...parts) => {
	const said = parts.map((part) => String(part)).join(" ");
	if (/unique "key"|flushSync|unmount a root/.test(said)) reactComplaints.push(said.split("\n")[0]);
};

const KANBAN = "@task/kanban-board";
const ARCHIVED = "@task/archived-columns";

// CONTEXT: the kanban is MOUNTED in a view group now, so its settings live one level down
const READING_PLACES = [
	{ id: "panel", x: 0, y: 0, w: 4, h: 15 },
	{ id: "header", x: 4, y: 0, w: 16, h: 2 },
	{ id: "boards", x: 4, y: 2, w: 16, h: 1 },
	{ id: "views", x: 4, y: 3, w: 16, h: 1 },
	{ id: "filters", x: 4, y: 4, w: 16, h: 1 },
	{ id: "board", x: 4, y: 5, w: 16, h: 10 },
];

let board = normalizeBoard({
	tiles: [
		{ id: "boards", widget: "@task/board-tabs", props: { tabs: { value: [{ name: "Marketing Team" }, { name: "Ux Team" }] } } },
		{ id: "views", widget: "@task/view-tabs", props: { options: { from: "ref", ref: "board/holds" }, selection: { from: "ref", ref: "board/selection" } } },
		{ id: "filters", widget: "@core/filter-panel", props: { tasks: { path: FOLDER } } },
		{
			id: "board",
			widget: "@core/view-group",
			settings: { holds: [{ name: "Kanban", widget: KANBAN }, { name: "Archived columns", widget: ARCHIVED }] },
			mounted: {
				"Archived columns": { widget: ARCHIVED, props: { selection: { from: "ref", ref: "boards/selection" } } },
				Kanban: {
					widget: KANBAN,
					props: {
						tasks: {
							path: FOLDER,
							where: [{ prop: "board", op: "is", value: { ref: "boards/selection" } }, { spread: { ref: "filters/chosen" } }],
						},
						selection: { from: "ref", ref: "boards/selection" },
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
const root = dom.window.document.getElementById("host");
const draw = () =>
	render(
		h(WidgetSurface, {
			board, registry, host, editing, screen: true, initialWidth: 1280,
			onChange: (next) => { board = next; draw(); },
			onToggleEditing: () => {}, onWidth: () => {},
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
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${label}${ok ? ` — ${JSON.stringify(got)}` : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`}`);
};

// An expanded board renders into a portal outside the mount element, so the page has to be
// looked for where it actually is — the same board either way, which is the point.
const surface = () => dom.window.document.querySelector(".wg-page") ?? root;
const all = (selector) => [...surface().querySelectorAll(selector)];
const cards = () => all(".orbi-kanban .ok-card-slot").length;
const byText = (selector, text) => all(selector).find((node) => node.textContent.trim().toLowerCase() === text.toLowerCase());
const click = async (node) => { node.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); await settle(); };

// CONTEXT: a dialog is portalled onto document.body, outside the surface all() searches
const dialog = () => dom.window.document.body.querySelector(".wg-dialog");
const dialogButton = (text) =>
	[...dialog().querySelectorAll("button")].find((node) => node.textContent.trim().toLowerCase() === text);

const noteTitles = new Set(vaultFiles(FOLDER).map((file) => file.props.title ?? file.basename));

// 1. the board draws the real notes
check("the board shows cards from real notes", cards() > 0, true);

// The baseline is taken WITH a board selected, not before: unselected means unfiltered, and
// comparing a later filtered count against that would fail on the board filter working.
const marketingTab = byText(".wg-tabs:not(.ovg-strip) button", "Marketing Team");
if (marketingTab) await click(marketingTab);
const marketing = cards();
check("selecting a board narrows to its own tasks", marketing > 0 && marketing <= 10, true);

// 2. a board tab steers it
const uxTab = byText(".wg-tabs:not(.ovg-strip) button", "Ux Team") ?? byText(".wg-tabs:not(.ovg-strip) button", "UX Team");
check("the second board tab exists", Boolean(uxTab), true);
if (uxTab) {
	await click(uxTab);
	check("switching board changes what is shown", cards() !== marketing, true);
	check("and it is not empty", cards() > 0, true);
	const back = byText(".wg-tabs:not(.ovg-strip) button", "Marketing Team");
	if (back) { await click(back); check("switching back restores the first board", cards(), marketing); }
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
	const naming = all(".orbi-kanban .ok-task-name")[0];
	check("it asks for a name first", Boolean(naming), true);
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
	await click(opened.querySelector(".otd-corner button:last-child"));
	check("and closing it hands the board back", Boolean(dom.window.document.body.querySelector(".orbi-task-dialog")), false);
}


// REGRESSION: the card read only its own settings, so ten different notes rendered as ten
// copies of the design mock — "Design the onboarding flow", 60%, 12 Aug, on every one.
const titles = all(".orbi-task-card-title").map((node) => node.textContent.trim());
check("the board drew a card per note", titles.length > 1, true);
check("and they are not all the same text", new Set(titles).size > 1, true);
check("every title really comes from a note", titles.every((title) => noteTitles.has(title)), true);

// a note that carries no comments count must not show one
const bare = written.created.length >= 0 && vaultFiles(FOLDER).find((file) => file.props.comments === undefined);
if (bare) {
	const card = all(".orbi-task-card").find((node) => node.querySelector(".orbi-task-card-title")?.textContent.trim() === (bare.props.title ?? bare.basename));
	if (card) {
		const metaCount = card.querySelectorAll(".orbi-task-card-meta > *").length;
		check(`"${bare.props.title ?? bare.basename}" hides what its note does not carry`, metaCount < 4, true);
	}
}


// A TILE TOO NARROW TO BE ITSELF. Squeeze the board until the kanban cannot show a list and
// it must stand aside for a chip — not fall to the next row, which is what a minimum used to
// force and what read as half the screen vanishing.
board = {
	...board,
	layouts: { 20: [{ id: "board", x: 0, y: 0, w: 2, h: 8 }, { id: "header", x: 2, y: 0, w: 18, h: 2 }] },
};
draw();
await settle();

const chips = all(".wg-tile-chip");
check("a squeezed tile becomes a chip", chips.length, 1);
check("and the chip offers to open", Boolean(chips[0]?.querySelector(".wg-narrow-open")), true);
check("the widget itself is not drawn", all(".wg-tile-chip .wg-widget-root").length, 0);
// REGRESSION: a minimum used to force a tile that could not fit onto the next row, which is
// what read as half the screen disappearing. Every tile is still on the board.
check("every tile is still on the board", all("[data-tile]").length, board.tiles.length);

await click(chips[0].querySelector(".wg-narrow"));
check("opening it draws the widget", all(".wg-tile-chip.is-open .wg-tile-body .wg-drawn > .wg-widget-root").length, 1);
check("and the board steps back behind a scrim", all(".wg-scrim").length, 1);

// the opened panel is wider than the tile it grew from — otherwise opening changed nothing
const openedTile = all(".wg-tile-chip.is-open")[0];
const width = parseFloat(openedTile.style.width);
check("the panel is wider than its chip", width > 200, true);

// one click closes, the next reaches the board again
all(".wg-scrim")[0].dispatchEvent(new dom.window.PointerEvent("pointerdown", { bubbles: true }));
await settle();
check("a click on the scrim closes it", all(".wg-tile-chip.is-open").length, 0);
check("and the scrim goes with it", all(".wg-scrim").length, 0);


// REGRESSION: the chip was hidden while editing, so the person arranging the board saw the
// full widget spilling out of a tile it does not fit, and the person reading saw a chip. The
// arranger could not tell which block was the problem — which is the one moment they need to.
board = { ...board, mode: "collapsed" };
draw();
await settle();
const readingChips = all(".wg-tile-chip").length;

editing = true;
draw();
await settle();
check("editing shows the same chip reading does", all(".wg-tile-chip").length, readingChips);
check("and it is not a button there — the tile is being dragged, not opened", all(".wg-tile-chip button.wg-narrow").length, 0);
editing = false;
draw();
await settle();
check("back in reading it is a button again", all(".wg-tile-chip button.wg-narrow").length, readingChips);


// TODO: restore the end-to-end fold test — the sidebar was the only widget that offered a fold
// control, and it has been removed from the product. The engine still exposes size.collapse()
// and size.expand() (src/surface.js:238), so the capability is now WRITE-ONLY: nothing in the
// product calls it and nothing proves it works. Either a widget takes it up again, or the
// engine drops it. The model-level half of this is still covered by tools/collapse-test.mjs.


// back to a board with room, after the chip and folding checks squeezed it
board = {
	...board,
	layouts: { 20: READING_PLACES },
};
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
check("and every one of them is the kit's own item", options.every((node) => node.classList.contains("wg-kit-pop-item")), true);
check("with the kit's tick inside it, not one of ours", options.every((node) => Boolean(node.querySelector(".wg-kit-pop-tick"))), true);

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
const settingsOf = (id) => board.tiles.find((tile) => tile.id === id)?.settings ?? {};
const tabRowsOf = (id) => (board.tiles.find((tile) => tile.id === id)?.props?.tabs?.value ?? []).map((row) => row.value ?? row);
const tabFieldOf = (row, field) => row?.props?.[field] ?? row?.[field];
// CONTEXT: a mounted widget persists under the NAME the board gave it, not under its widget id
const mountedOf = (id, key) => board.tiles.find((tile) => tile.id === id)?.mounted?.[key];
const boardNote = (name) => vaultFiles("Orbitask/Boards").find((file) => file.props.board === name);
const boardColumns = (name) => (boardNote(name)?.props?.columns ?? []).map((row) => row?.name ?? row);
const boardArchived = (name) => (boardNote(name)?.props?.columns ?? []).filter((row) => row?.archivedAt).map((row) => row.name);

{
	const columnsBefore = all(".orbi-kanban .ok-list").length;
	const tasksBefore = cards();

	await click(all(".orbi-kanban .ok-add-list-rest")[0]);
	const nameField = all(".orbi-kanban .ok-list-name")[0];
	check("Add List opens a field", Boolean(nameField), true);

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
	check("the edit lands under the board-owned name", Boolean(mountedOf("board", KANBAN_VIEW)), true);
	check("the widget-id key it arrived under is gone", Boolean(mountedOf("board", KANBAN)), false);
	check("and the record it held came across", mountedOf("board", KANBAN_VIEW)?.props?.tasks?.path, FOLDER);
	check("no task was invented to make it appear", cards(), tasksBefore);

	// ARCHIVING ASKS FIRST. The control no longer deletes, so pressing it changes nothing until
	// the dialog is confirmed — and the board is re-rendered after each click, so re-find the node.
	const listNamed = (name) => all(".orbi-kanban .ok-list").find((node) => new RegExp(name).test(node.textContent));

	await click(listNamed("Blocked").querySelector(".ok-list-remove"));
	check("the archive control asks first", Boolean(dialog()), true);
	check("and nothing has left the board yet", all(".orbi-kanban .ok-list").length, columnsBefore + 1);
	await click(dialogButton("cancel"));
	check("Cancel keeps the column", all(".orbi-kanban .ok-list").length, columnsBefore + 1);

	await click(listNamed("Blocked").querySelector(".ok-list-remove"));
	await click(dialogButton("archive"));
	check("confirming archives it", all(".orbi-kanban .ok-list").length, columnsBefore);
	// THE NAME STAYS AUTHORED. Archiving used to strike it out of `columns`, so a restore had to
	// guess where the column went and appended it; keeping it is what makes the way back exact.
	check("the name stays authored on the board", boardColumns("Marketing Team").includes("Blocked"), true);
	check("and it is the column itself that carries the archiving", boardArchived("Marketing Team"), ["Blocked"]);
	check("the board block keeps no map of archived columns", serializeBoard(board).archivedColumns, undefined);
	check("nor a second list on the tile", mountedOf("board", KANBAN_VIEW)?.props?.archivedColumns, undefined);

	// A COLUMN WITH TASKS IS ARCHIVED TOO. Refusing was right while removal was permanent;
	// archiving is reversible, so the count in the dialog is the warning instead.
	const writesBefore = written.updated.filter((entry) => entry.path.startsWith(FOLDER)).length;
	const cardsBefore = cards();
	const held = Number(listNamed("To Do").querySelector(".wg-kit-count").textContent.trim());
	check("the column under test holds tasks", held > 0, true);
	await click(listNamed("To Do").querySelector(".ok-list-remove"));
	check("the dialog says how many disappear", new RegExp(`${held} task`).test(dialog().textContent), true);
	await click(dialogButton("archive"));
	check("a busy column is archived, not refused", all(".orbi-kanban .ok-list").length, columnsBefore - 1);
	check("its tasks leave the view", cards(), cardsBefore - held);
	check("and no task was rewritten", written.updated.filter((entry) => entry.path.startsWith(FOLDER)).length, writesBefore);
}

// THE VIEW IS THE PROOF, NOT THE SETTING. The archived list lived in the kanban's own mount, and
// the archived view is the kanban's SIBLING — the two never draw together, so it read nothing.
{
	const viewsTile = () => all('[data-tile="views"]')[0];
	const showView = async (name) => {
		await click(viewsTile().querySelector(".ovt-pick"));
		await click([...viewsTile().querySelectorAll(".wg-kit-pop-item")].find((node) => node.textContent.trim().startsWith(name)));
	};
	const archivedRows = () => all(".orbi-archived-columns .wg-kit-row");
	const archivedNames = () => archivedRows().map((node) => node.querySelector(".wg-kit-row-label").textContent.trim());
	const cardsWithoutIt = cards();

	await showView("Archived columns");
	check("the archived view draws while the kanban does not", `${all(".orbi-archived-columns").length}|${all(".orbi-kanban").length}`, "1|0");
	check("and it LISTS what was archived, in the order the board authored them", archivedNames(), ["To Do", "Blocked"]);

	const rowNamed = (name) => archivedRows().find((node) => node.querySelector(".wg-kit-row-label").textContent.trim() === name);
	await click(rowNamed("To Do").querySelector("button"));
	check("Restore takes the column off the list", archivedNames(), ["Blocked"]);

	await showView("Kanban");
	check("and puts it back on the board", all(".orbi-kanban .ok-list").length, 3);
	// the position is the point: appending it would pass a count and still move the column
	check("in the place it was archived from", all(".orbi-kanban .ok-list-title").map((node) => node.textContent.trim()), ["To Do", "Doing", "Done"]);
	check("and its tasks came back with it", cards() > cardsWithoutIt, true);

	// CONTEXT: on the note, every board read one list — archived on one, shown on all
	const firstBoard = () => byText(".wg-tabs:not(.ovg-strip) button", "Marketing Team");
	const otherBoard = () => byText(".wg-tabs:not(.ovg-strip) button", "Ux Team") ?? byText(".wg-tabs:not(.ovg-strip) button", "UX Team");
	const columnNamed = (name) => all(".orbi-kanban .ok-list").find((node) => node.textContent.includes(name));

	await showView("Archived columns");
	check("the board it was archived on lists it", archivedNames(), ["Blocked"]);

	await click(otherBoard());
	check("the next board over lists nothing", archivedNames(), []);

	await click(firstBoard());
	check("and switching back brings the list with it", archivedNames(), ["Blocked"]);

	await click(otherBoard());
	await showView("Kanban");
	await click(columnNamed("Done").querySelector(".ok-list-remove"));
	await click(dialogButton("archive"));
	await showView("Archived columns");
	check("a second board lists what was archived on it", archivedNames(), ["Done"]);

	await click(firstBoard());
	check("and the first board still lists only its own", archivedNames(), ["Blocked"]);
	check("each board note keeps its own", [boardArchived("Marketing Team"), boardArchived("Ux Team")], [["Blocked"], ["Done"]]);

	await click(otherBoard());
	await click(archivedRows()[0].querySelector("button"));
	check("Restore empties the second board's list", archivedNames(), []);

	await click(firstBoard());
	check("and leaves the first board's alone", archivedNames(), ["Blocked"]);
	await showView("Kanban");
}

{
	const tabsBefore = all(".wg-tabs:not(.ovg-strip) .wg-tabs-tab").length;
	await click(all(".wg-tabs:not(.ovg-strip) .wg-tabs-more")[0]);
	await click(byText(".wg-tabs:not(.ovg-strip) .wg-kit-pop-item", "Add"));
	check("Add Board adds a tab", all(".wg-tabs:not(.ovg-strip) .wg-tabs-tab").length, tabsBefore + 1);
	check("named Untitled 1", tabRowsOf("boards").some((row) => tabFieldOf(row, "name") === "Untitled 1"), true);
	// the board's own selection is not reachable from here — the visible truth is which tab
	// the kit's thumb sits on, which is the tab marked selected, and what a person sees anyway
	const active = all('.wg-tabs:not(.ovg-strip) .wg-tabs-tab[aria-selected="true"]').map((node) => node.textContent.trim());
	check("and it becomes the selected board", active, ["Untitled 1"]);

	// the new tab opens ready to be renamed, in place
	const editable = all('.wg-tabs:not(.ovg-strip) .wg-tabs-tab[contenteditable="true"]');
	check("the new board is editable where it stands", editable.length, 1);
}


// EDITING A NAME WHERE IT IS READ. A field that appears and then waits to be clicked, and a
// heading that can only be changed somewhere else, are both a step the person did not ask for.
{
	await click(all(".orbi-kanban .ok-add-list-rest")[0]);
	const field = all(".orbi-kanban .ok-list-name")[0];
	// CONTEXT: React hangs a fiber off the node, so a DOM node cannot be compared by JSON
	check("the new-list field takes focus by itself", dom.window.document.activeElement === field, true);
	field.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
	await settle();

	// back to a board that has tasks: the previous block selected a new empty one, and a rename
	// that touches nothing proves nothing
	const marketing = all(".wg-tabs:not(.ovg-strip) .wg-tabs-tab").find((node) => /Marketing/.test(node.textContent));
	await click(marketing);

	// RENAMING A COLUMN MUST REACH THE TASKS. The heading is a setting; what files a task under
	// it is the property in its note — changing only the heading empties the column.
	const heading = all(".orbi-kanban .ok-list-title").find((node) => node.textContent.trim() === "Doing");
	check("a column heading is editable in place", heading.getAttribute("contenteditable"), "true");

	const inDoing = vaultFiles(FOLDER).filter((file) => file.props.status === "Doing").length;
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
	check("every task that was in it was rewritten", written.updated.filter((entry) => entry.props.status === "In progress").length > 0, true);
}

{
	// ONE MENU, NOT A PAIR OF BUTTONS. The pencil and the tick are gone; renaming is a menu
	// item, and Enter or blur commits. The menu stands beside the capsule, never inside a tab.
	const more = all(".wg-tabs:not(.ovg-strip) .wg-tabs-more")[0];
	check("the board row offers a menu", Boolean(more), true);
	check("and it stands outside the tab capsule", Boolean(more.closest(".wg-kit-seg")), false);

	await click(more);
	// CONTEXT: the panel stays in the DOM when shut, so only is-open proves it opened
	check("the menu opens", all(".wg-tabs:not(.ovg-strip) .wg-kit-pop.is-open").length, 1);

	await click(byText(".wg-tabs:not(.ovg-strip) .wg-kit-pop-item", "Rename"));
	check("and Rename edits the selected tab in place", all('.wg-tabs:not(.ovg-strip) .wg-tabs-tab[contenteditable="true"]').length, 1);
}

{
	// THE LAW THE STRIP IS BUILT ON: it is never empty. Archive every board, including the last
	// one, and a fresh Untitled must be standing there — a board bar with nothing on it offers
	// the person no way back in.
	const archive = async () => {
		await click(all(".wg-tabs:not(.ovg-strip) .wg-tabs-more")[0]);
		await click(byText(".wg-tabs:not(.ovg-strip) .wg-kit-pop-item", "Archive"));
	};

	let guard = 0;
	while (all(".wg-tabs:not(.ovg-strip) .wg-tabs-tab").length > 1 && guard < 12) {
		await archive();
		guard += 1;
	}
	check("archiving hands the strip down to one board", all(".wg-tabs:not(.ovg-strip) .wg-tabs-tab").length, 1);

	const last = all(".wg-tabs:not(.ovg-strip) .wg-tabs-tab")[0].textContent.trim();
	await archive();
	check("archiving the LAST board still leaves one", all(".wg-tabs:not(.ovg-strip) .wg-tabs-tab").length, 1);
	check("and the one left is a fresh Untitled", /^Untitled \d+$/.test(all(".wg-tabs:not(.ovg-strip) .wg-tabs-tab")[0].textContent.trim()), true);
	check("which is not the board just archived", all(".wg-tabs:not(.ovg-strip) .wg-tabs-tab")[0].textContent.trim() === last, false);
	check("the archived board was remembered, not lost", Boolean(tabFieldOf(tabRowsOf("boards").find((row) => tabFieldOf(row, "name") === last), "archivedAt")), true);
}

// THE BOARD IS NEVER EMPTY EITHER. Archiving is the one way a column leaves, and the last one
// out is replaced rather than removed — a board with no columns is not a board.
{
	for (let guard = 0; all(".orbi-kanban .ok-list").length > 0 && guard < 12; guard += 1) {
		await click(all(".orbi-kanban .ok-list")[0].querySelector(".ok-list-remove"));
		await click(dialogButton("archive"));
	}
	check("one column survives archiving them all", all(".orbi-kanban .ok-list").length, 1);
	// the NUMBER is not the law — the free one is picked around every name already taken,
	// archived ones included, so asserting "Untitled 1" would only pin the order of this file
	check("and it is a fresh untitled one", /^Untitled \d+$/.test(all(".orbi-kanban .ok-list-title")[0].textContent.trim()), true);
}

// CONTEXT: one tile, several whole widgets, one of them on screen
const groupBoard = (views, archived = null) =>
	normalizeBoard({
		tiles: [
			{ id: "boards", widget: "@task/board-tabs", props: { tabs: { value: [{ name: "Marketing Team" }] } } },
			{ id: "views", widget: "@task/view-tabs", props: { options: { from: "ref", ref: "board/holds" }, selection: { from: "ref", ref: "board/selection" } } },
			{
				id: "board",
				widget: "@core/view-group",
				settings: { views },
				mounted: { "Archived columns": { widget: ARCHIVED, props: { selection: { from: "ref", ref: "boards/selection" } } } },
			},
		],
		...(archived ? { archivedColumns: archived } : {}),
		layouts: { 20: { places: [
			{ id: "boards", x: 0, y: 0, w: 20, h: 1 },
			{ id: "views", x: 0, y: 1, w: 20, h: 1 },
			{ id: "board", x: 0, y: 2, w: 20, h: 10 },
		] } },
	});

const tileNode = (id) => all(`[data-tile="${id}"]`)[0];
const tabLabel = (id = "views") => tileNode(id)?.querySelector(".ovt-pick")?.textContent.trim() ?? "";
const tabItems = () => [...tileNode("views").querySelectorAll(".wg-kit-pop-item")].map((node) => node.textContent.trim());
const openTabs = async (id = "views") => click(tileNode(id).querySelector(".ovt-pick"));
const pickView = async (name, id = "views") => {
	await openTabs(id);
	await click([...tileNode(id).querySelectorAll(".wg-kit-pop-item")].find((node) => node.textContent.trim().startsWith(name)));
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
	propsByPath.set("Orbitask/Boards/Marketing Team.md", { board: "Marketing Team", columns: "To Do, Blocked, On hold", archivedColumns: "Blocked, On hold" });
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
	check("and the write leaves the old key empty behind it", boardNote("Marketing Team").props.archivedColumns, []);
	check("with the archiving carried on the column itself", boardArchived("Marketing Team"), ["On hold"]);
}

{
	// CONTEXT: the shape before the board held a list at all — the kanban's own tile carried it
	board = normalizeBoard({
		tiles: [
			{
				id: "fallback",
				widget: "@core/view-group",
				settings: { views: `${KANBAN}, ${ARCHIVED}` },
				mounted: { [KANBAN]: { settings: { columns: "To Do, Blocked", archivedColumns: "Blocked" }, props: { boards: { path: "Orbitask/Nowhere" } } } },
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
		all('[data-tile="fallback"] .ok-list-title').map((node) => node.textContent.trim()).includes("Blocked"),
		false,
	);
}

{
	// CONTEXT: one key in the vnode AND one persistence slot made two entries of one id collide
	const twice = resolveMounts({ mounts: { holds: {} } }, registry, { tile: { mounts: { holds: `${KANBAN}, ${KANBAN}` } } });
	check("the same widget mounted twice is two names, not one repeated", twice.holds.map((entry) => entry.name), ["Kanban", "Kanban 2"]);
	check(
		"and the engine hands back what the registry knew, not a field of its own",
		Object.keys(twice.holds[0]).sort(),
		["drawInto", "failure", "hidden", "id", "manifest", "name", "problem", "title"],
	);
	check("a widget's own declaration comes through untouched", twice.holds[0].manifest.view, "Kanban");

	// THE BOARD OWNS THE NAME: the same widget id, named twice, answers to what the board typed
	const named = resolveMounts({ mounts: { holds: {} } }, registry, { tile: { mounts: { holds: [{ name: "Mine", widget: KANBAN }, { name: "Theirs", widget: KANBAN }] } } });
	check("a stored row answers to its own name", named.holds.map((entry) => entry.name), ["Mine", "Theirs"]);
	check("and both still name the same widget", named.holds.map((entry) => entry.id), [KANBAN, KANBAN]);

	// AN INVARIANT THAT ONLY RAN ON ADD IS THE APPSMITH BUG: two rows may never share a name,
	// however the file came to say they do
	const clashed = resolveMounts({ mounts: { holds: {} } }, registry, { tile: { mounts: { holds: [{ name: "Same", widget: KANBAN }, { name: "Same", widget: ARCHIVED }] } } });
	check("a duplicate name in the file is disambiguated on read", clashed.holds.map((entry) => entry.name), ["Same", "Same 2"]);

	// THE SETTING'S OWN OLD KEY. A note written before the rename still fills the mount.
	const older = resolveMounts({ mounts: { holds: { was: "views" } } }, registry, { tile: { settings: { views: `${KANBAN}, ${ARCHIVED}` } } });
	check("the setting's former key still fills the mount", older.holds.map((entry) => entry.name), ["Kanban", "Archived columns"]);
	check("and each row carries the widget-id key its record still sits under", older.holds.map((entry) => entry.id), [KANBAN, ARCHIVED]);

	const gone = resolveMounts({ mounts: { holds: {} } }, registry, { tile: { mounts: { holds: "@task/nowhere" } } });
	check("an id that is not a widget is still an entry", gone.holds.map((entry) => entry.problem), ["not-found"]);
	check("with nothing to draw", gone.holds[0].drawInto, null);
	check("and it is named off the id, because nothing else knows it", gone.holds.map((entry) => entry.name), ["@task/nowhere"]);
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
	const shown = tileNode("board").textContent;
	check("a view that is not a widget is named, not swallowed", /no-such-view/.test(shown), true);
	check("and the group does not claim to be empty", /holds no views/.test(shown), false);
}

{
	// CONTEXT: ownership was keyed by widget id, so a second instance read as the first updating itself
	board = normalizeBoard({
		tiles: [
			{ id: "left", widget: "@task/view-tabs", props: { options: { from: "ref", ref: "board/holds" }, selection: { from: "ref", ref: "board/selection" } } },
			{ id: "right", widget: "@task/view-tabs", props: { options: { from: "ref", ref: "board/holds" }, selection: { from: "ref", ref: "board/selection" } } },
			{ id: "board", widget: "@core/view-group", settings: { views: `${KANBAN}, ${ARCHIVED}` } },
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
	check("one switcher writes the box both read", [tabLabel("left"), tabLabel("right")], ["Archived columns", "Archived columns"]);

	await pickView("Kanban", "right");
	check("and the other moves it back for both", [tabLabel("left"), tabLabel("right")], ["Kanban", "Kanban"]);
	check("with nothing refused along the way", warnings.filter((line) => /may not/.test(line)), []);
}

{
	// CONTEXT: a claim outliving its widget makes the key unwritable forever
	const switcherBoard = (id) =>
		normalizeBoard({
			tiles: [
				{ id, widget: "@task/view-tabs" },
				{ id: "board", widget: "@core/view-group", settings: { views: `${KANBAN}, ${ARCHIVED}` } },
			],
			layouts: { 20: { places: [{ id, x: 0, y: 0, w: 20, h: 1 }, { id: "board", x: 0, y: 1, w: 20, h: 10 }] } },
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
	let broken = null;
	let failure = null;
	try {
		broken = normalizeBoard({
			tiles: [
				{ id: "a", widget: KANBAN, props: { tasks: null } },
				{ id: "b", widget: "@core/view-group", mounted: { "@foo": null } },
			],
		});
	} catch (thrown) {
		failure = String(thrown?.message ?? thrown);
	}
	check("a null entry does not take the whole board down", failure, null);
	check("the tile that carried it survives", broken?.tiles.length, 2);
	check("its null binding is carried as it stands", broken?.tiles[0].props.tasks, null);
	check("and its null mount to an unconfigured one, named off its key", broken?.tiles[1].mounted["@foo"], { widget: "@foo", settings: {}, mounts: {}, props: {}, slots: {}, mounted: {} });
}

{
	// THE PROPERTY LIST IS THE BOARD'S, NOT A TILE'S. Two widgets have to read ONE list, so a
	// widget keeping its own copy in `settings` was right for exactly one widget. The probe is
	// registered here rather than added to widgets/, because what is under test is what the
	// ENGINE hands over, not what any product widget does with it.
	const seen = [];
	const PROBE_PROPS = {
		notes: { kind: "collection", label: "Notes", verbs: { list: "required" }, default: { path: FOLDER } },
		boards: {
			kind: "collection",
			label: "Boards",
			verbs: { list: "required", update: "optional" },
			default: { value: [{ name: "A", columns: [{ name: "To Do" }] }, { name: "B", columns: [{ name: "Backlog" }] }] },
		},
		chosen: { kind: "value", label: "Shown board", of: "boards", field: "name", fallback: "first", verbs: { get: "required", update: "required" } },
		board: { kind: "value", label: "Board", picks: "chosen", of: "boards", verbs: { get: "required", update: "optional" } },
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
	const columnsNow = async () => (await last().board.get())?.columns?.map((column) => column.name);

	board = normalizeBoard({
		tiles: [{ id: "probe", widget: "@probe/board", props: { notes: { path: FOLDER } } }],
		layouts: { 20: { places: [{ id: "probe", x: 0, y: 0, w: 6, h: 3 }] } },
	});
	draw();
	await settle();

	check("a widget asking for the row its selection names is handed that row", await columnsNow(), ["To Do"]);
	check("the board is a gateway now, not a bag the host hands down", typeof last()?.board?.get, "function");
	check("and the bus it replaced is gone from the props", [last().configureBoard, last().board.properties], [undefined, undefined]);
	check("what a widget may still ask the board for is folding its views", typeof last().foldIntoGroup, "function");

	await last().board.update({ columns: [{ name: "To Do" }, { name: "Added" }] });
	await settle();
	check("a write through it lands on the row that was picked", await columnsNow(), ["To Do", "Added"]);

	await last().chosen.update("i1");
	await settle();
	check("and the board next door never heard of it", await columnsNow(), ["Backlog"]);

	// A RECORD CARRIES NO BODY, so a widget could draw a note's properties and never its text.
	// The rows a widget is handed stay bodyless — twenty cards, no file reads — and one note's
	// text is FETCHED, which is the only call that costs anything.
	const notes = () => last().notes;
	const listed = await notes().list();
	const first = listed.rows[0];
	check("the widget is handed rows to draw", Boolean(first), true);
	check("and not one of them carries a body", listed.rows.some((row) => row.value.body !== undefined), false);

	const opened = await notes().get(first.ref);
	check("a widget can fetch one record's body", typeof opened.value.body, "string");
	check("and its properties come with it", opened.value.props, first.value.props);

	await notes().update({ ref: first.ref, data: { body: "Written from a widget.\n" } });
	check("and save an edited one", (await notes().get(first.ref)).value.body, "Written from a widget.\n");
	check("the note's properties survived the body write", (await notes().get(first.ref)).value.props, first.value.props);

	check("the verbs a widget is handed on a folder", Object.keys(notes()).filter((key) => typeof notes()[key] === "function").sort(), ["create", "describe", "get", "list", "remove", "repairIds", "subscribe", "update"]);

	// A MOUNTED widget must not be handed less than a tile: the list belongs to the board, and
	// where a widget happens to be standing is not a fact about the board.
	seen.length = 0;
	board = normalizeBoard({
		tiles: [{ id: "group", widget: "@core/view-group", settings: { views: "@probe/board" } }],
		layouts: { 20: { places: [{ id: "group", x: 0, y: 0, w: 12, h: 8 }] } },
	});
	draw();
	await settle();
	check("a mounted widget resolves its own board the same way a tile does", await columnsNow(), ["To Do"]);
	await last().board.update({ columns: [{ name: "To Do" }, { name: "From inside" }] });
	await settle();
	check("and can write it back from inside its holder", await columnsNow(), ["To Do", "From inside"]);
}


// A BOARD THAT NAMES NOTHING STILL FILTERS. Most boards were authored before property lists
// existed, and an empty bar on all of them is worse than a bar that reads the data.
{
	const spare = dom.window.document.createElement("div");
	dom.window.document.body.appendChild(spare);
	let plain = normalizeBoard({
		tiles: [{ id: "filters", widget: "@core/filter-panel", props: { tasks: { path: FOLDER } } }],
		layouts: { 20: { places: [{ id: "filters", x: 0, y: 0, w: 3, h: 1 }] } },
	});
	const drawPlain = () =>
		render(
			h(WidgetSurface, {
				board: plain, registry, host, editing: false, screen: true, initialWidth: 1280,
				onChange: (next) => { plain = next; drawPlain(); },
				onToggleEditing: () => {}, onWidth: () => {},
			}),
			spare,
		);
	drawPlain();
	await settle();

	const heads = () => [...spare.querySelectorAll(".ofp-group-head")].map((node) => node.textContent.trim());
	spare.querySelector(".ofp-open").dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
	await settle();
	check("with no list on the board the bar reads the data instead", heads().length > 1, true);
	check("and it offers the properties the notes carry", heads().includes("Priority"), true);
	check("but not the title, which every note spells differently", heads().includes("Title"), false);
	check("nor the board, which every row on this board shares", heads().includes("Board"), false);
	// a number is not a category: the bar ticks values, and a count wants a range instead
	check("nor a counter, which wants a range and not a tick", heads().some((name) => /checklist|comments|files|progress|order/i.test(name)), false);
	// the columns ARE the status, so filtering by it hides the board inside itself
	check("nor status, which the board already draws as its columns", heads().includes("Status"), false);

	render(null, spare);
	spare.remove();
}

// THE CATALOGUE HAS TO STAND UP WITHOUT A BOARD UNDER IT. Every other surface in this plugin is
// drawn inside a note's own element; this one is opened from the command palette, where there is
// no note, no block and no tree to hang it on.
{
	const { default: WidgetariumPlugin } = await import("./.mjs-cache/main.mjs");
	const commands = [];
	const ribbon = [];
	const posts = [];
	const fences = [];
	const pluginApp = {
		vault: { adapter: { ...adapter, mkdir: async () => {} }, getAbstractFileByPath: () => null },
		metadataCache: { getFileCache: () => null, getFirstLinkpathDest: () => null },
		workspace: { getLeavesOfType: () => [], on: () => ({}) },
	};
	const plugin = Object.assign(new WidgetariumPlugin(), {
		app: pluginApp,
		manifest: { id: "widgetarium" },
		_data: { substitutions: [{ id: "sub-1", name: "Reminder", mode: "line", open: "!", widget: "@inline/reminder" }] },
		addCommand: (command) => commands.push(command),
		addRibbonIcon: (icon, title) => ribbon.push(title),
		registerMarkdownCodeBlockProcessor: (language, handler) => fences.push({ language, handler }),
		registerMarkdownPostProcessor: (handler) => posts.push(handler),
		registerInterval: () => {},
	});
	await plugin.onload();

	check("the plugin hands Obsidian a post processor", posts.length, 1);
	check("and a processor for its own fence", fences[0]?.language, "widgetarium");

	const noteContext = { sourcePath: "Orbitask/Board.md", addChild: () => {}, getSectionInfo: () => null };
	const note = dom.window.document.createElement("div");
	note.innerHTML = "<p>! call Olena before Friday</p>";
	dom.window.document.body.appendChild(note);
	posts[0](note, noteContext);
	check("running it replaces the triggered line with the widget", note.querySelectorAll(".wgi-reminder").length, 1);
	check("and the paragraph it stood in is gone", note.querySelectorAll("p").length, 0);
	check("and the host carries the kit's scope, or nothing in it is painted", note.querySelectorAll(".wg-inline-host.wg-root").length, 1);
	note.remove();

	const boardBlock = dom.window.document.createElement("div");
	dom.window.document.body.appendChild(boardBlock);
	const sided = normalizeBoard({
		tiles: [{ id: "a", widget: "@inline/reminder" }],
		layout: { left: { rows: [[{ id: "a" }]] }, main: { rows: [[{ id: "a" }]] } },
		layouts: {},
	});
	plugin.mount(boardBlock, sided, () => {}, false, noteContext, "Orbitask/Board.md#0");
	const boardMount = plugin.firstMountIn("Orbitask/Board.md");
	check("the plugin can find the board a note carries", Boolean(boardMount), true);
	boardBlock.remove();

	// CONTEXT: Obsidian never reprocesses a note rendered before registration
	const brokenPosts = [];
	const broken = Object.assign(new WidgetariumPlugin(), {
		app: { ...pluginApp, vault: { adapter: { ...adapter, exists: async () => { throw new Error("vault unreachable"); } } } },
		manifest: { id: "widgetarium" },
		addCommand: () => {},
		addRibbonIcon: () => {},
		registerMarkdownCodeBlockProcessor: () => {},
		registerMarkdownPostProcessor: (handler) => brokenPosts.push(handler),
		registerInterval: () => {},
	});
	const failure = await broken.onload().then(() => null, (error) => error.message);
	check("an await that rejects still fails the load", failure, "vault unreachable");
	check("but the post processor was registered before it", brokenPosts.length, 1);
	check("and it substitutes nothing rather than throwing", brokenPosts[0](dom.window.document.createElement("div"), noteContext), 0);

	// CONTEXT: Obsidian draws the open note while onload still awaits, and never draws it twice
	const asked = [];
	const openLeaf = { view: { previewMode: { rerender: (full) => asked.push(full) } } };
	const startingPosts = [];
	const starting = Object.assign(new WidgetariumPlugin(), {
		app: { ...pluginApp, workspace: { getLeavesOfType: (kind) => (kind === "markdown" ? [openLeaf] : []), on: () => ({}) } },
		manifest: { id: "widgetarium" },
		_data: { substitutions: [{ id: "sub-1", name: "Reminder", mode: "line", open: "!", widget: "@inline/reminder" }] },
		addCommand: () => {},
		addRibbonIcon: () => {},
		registerMarkdownCodeBlockProcessor: () => {},
		registerMarkdownPostProcessor: (handler) => startingPosts.push(handler),
		registerInterval: () => {},
	});
	const loading = starting.onload();
	const early = dom.window.document.createElement("div");
	early.innerHTML = "<p>! call Olena before Friday</p>";
	dom.window.document.body.appendChild(early);
	check("the processor is live before the load's awaits have landed", startingPosts.length, 1);
	check("and a note drawn in that gap gets nothing, because there are no rules yet", startingPosts[0](early, noteContext), 0);
	check("which leaves the note plain", early.querySelectorAll(".wg-inline-host").length, 0);
	await loading;
	check("so the load ends by asking every open note to draw again", asked.length, 1);
	check("in full, because a substitution is only made while a note renders", asked[0], true);
	check("and the rules it will draw with are the ones on disk", starting.rules.length, 1);
	const redrawn = dom.window.document.createElement("div");
	redrawn.innerHTML = early.innerHTML;
	dom.window.document.body.appendChild(redrawn);
	check("the very same paragraph, drawn after them, becomes the widget", startingPosts[0](redrawn, noteContext), 1);
	check("so the empty gap was the timing, not the guard or the selector", redrawn.querySelectorAll(".wg-inline-host").length, 1);
	redrawn.remove();
	early.remove();

	check("the ribbon offers substitutions beside edit mode", ribbon, ["Widgetarium: edit mode", "Widgetarium: substitutions"]);
	check("and a command opens the same surface", commands.some((entry) => entry.id === "edit-substitutions"), true);
	commands.find((entry) => entry.id === "edit-substitutions").callback();
	await settle();
	check("running it opens the substitutions dialog", Boolean(dom.window.document.body.querySelector(".wg-sub-dialog")), true);
	plugin.closeSubstitutions();
	await settle();
	check("and closing it takes the dialog off the page", Boolean(dom.window.document.body.querySelector(".wg-sub-dialog")), false);

	const command = commands.find((entry) => entry.id === "browse-widgets");
	check("the plugin registers a command for the catalogue", command?.name, "Browse widgets");
	command.callback();
	await settle();

	const opened = dom.window.document.body.querySelector(".wg-cat-dialog");
	check("running it opens the catalogue", Boolean(opened), true);
	check("with no board under it", Boolean(root.querySelector(".wg-cat-dialog")), false);
	check("drawing the widgets the plugin's own registry loaded", opened.querySelectorAll(".wg-cat-tile").length, boardWidgets(plugin.registry.list()).length);
	check("in browse mode", [...opened.querySelectorAll(".wg-cat-tile")].every((tile) => tile.getAttribute("aria-label").startsWith("Open ")), true);

	plugin.onunload();
	check("and unloading takes it down, because nothing else owns that node", Boolean(dom.window.document.body.querySelector(".wg-cat-dialog")), false);
}



{
	board = normalizeBoard({
		tiles: [
			{ id: "boards", widget: "@task/board-tabs", props: { tabs: { value: [{ name: "Marketing Team" }] } } },
			{ id: "filters", widget: "@core/filter-panel", props: { tasks: { path: FOLDER } } },
		],
		layouts: { 20: { places: [{ id: "boards", x: 0, y: 0, w: 12, h: 1 }, { id: "filters", x: 12, y: 0, w: 4, h: 1 }] } },
	});
	editing = true;
	render(null, root);
	await settle();
	draw();
	await settle();

	await click(all(".wg-palette .wg-palette-open")[0]);
	const card = [...dom.window.document.body.querySelectorAll(".wg-cat-dialog .wg-cat-tile")].find((tile) => tile.textContent.includes("Kanban board"));
	await click(card);

	const added = board.tiles.find((tile) => tile.widget === KANBAN);
	check("the added kanban points its board at the strip already standing", added?.props?.selection, { from: "ref", ref: "boards/selection" });
	check("and its tasks are narrowed by that strip and by the filter beside it", added?.props?.tasks?.where, [
		{ prop: "board", op: "is", value: { ref: "boards/selection" }, fixed: true },
		{ spread: { ref: "filters/chosen" }, fixed: true },
	]);
	check("nothing was refused on the way", warnings.filter((line) => /may not/.test(line)), []);
}

// THE PALETTE IS THE CATALOGUE NOW. A row of titles said nothing about what a widget looks like,
// which is the only question a person adding one is actually asking.
{
	board = normalizeBoard({
		tiles: [{ id: "header", widget: "@task/board-tabs" }],
		layouts: { 20: { places: [{ id: "header", x: 0, y: 0, w: 12, h: 2 }] } },
	});
	editing = true;
	draw();
	await settle();

	check("the palette is one press, not a chip per widget", all(".wg-palette .wg-chip").length, 1);
	check("and it says what the press does", all(".wg-palette .wg-palette-open")[0]?.textContent, "Add widget");

	await click(all(".wg-palette .wg-palette-open")[0]);
	// CONTEXT: a redraw remounts the dialog, so a node captured once points at a detached copy
	const grid = () => dom.window.document.body.querySelector(".wg-cat-dialog");
	check("pressing it opens the catalogue", Boolean(grid), true);
	check("outside the board, on the body", Boolean(root.querySelector(".wg-cat-dialog")), false);
	check("it draws every installed widget", grid().querySelectorAll(".wg-cat-tile").length, boardWidgets(registry.list()).length);
	check("in place mode, so every press adds", [...grid().querySelectorAll(".wg-cat-tile")].every((tile) => tile.getAttribute("aria-label").startsWith("Add ")), true);

	// EACH CARD CARRIES THE WIDGET'S OWN PLAYGROUND — the board's lattice at the scale that
	// card needs — and says the span in words. On one shared lattice the widgets ran together
	// and nothing marked where a widget ended; a card is what separates it from the space.
	const drawn = [...grid().querySelectorAll(".wg-cat-tile")];
	const stageOf = (tile) => tile.querySelector(".wg-cat-stage");
	// NO LATTICE. The card is what separates a widget from the space around it; cells behind it
	// drew a second grid nothing ever stood on.
	check("no card draws a lattice", drawn.some((tile) => tile.querySelector(".wg-cells")), false);
	check("every card still gives the widget a box of its own", drawn.every((tile) => stageOf(tile).querySelector(".wg-cat-frame > .wg-cat-pic")), true);
	check("with more than one span among them, or this proves nothing", new Set(drawn.map((tile) => tile.getAttribute("data-span"))).size > 1, true);

	const named = (title) => drawn.find((tile) => tile.querySelector(".wg-cat-name").textContent === title);
	const declared = registry.get("@task/task-card").manifest.preview.size;
	const onGrid = named("Task card");
	check("a card names the widget", Boolean(onGrid), true);
	check("and says the span the manifest declares", onGrid.getAttribute("data-span"), `${declared.w}x${declared.h}`);
	check("in words a person reads", onGrid.querySelector(".wg-cat-span").textContent, `${declared.w}\u00d7${declared.h}`);
	check("and the card says which pack it came from, in one line with the name", onGrid.querySelector(".wg-cat-said").textContent, "@task/Task card");

	// INSTALLED IS NOT A STATE WORTH DRAWING. Fetching a widget and placing one both land at the
	// press, so the card must look the same either way — no badge, no second verb, one button.
	const foot = onGrid.querySelector(".wg-cat-foot");
	// CONTEXT: the card's own buttons, not the widget's — a preview may draw buttons of its own
	const chromeButtons = (tile) => [...tile.querySelectorAll("button")].filter((node) => !node.closest(".wg-cat-pic"));
	check("a card carries one button", chromeButtons(onGrid).length, 1);
	check("and it sits in the card's foot", Boolean(foot?.querySelector(".wg-cat-go")), true);
	// THE PILL IS GONE. Glass over the picture, it hid the bottom of every widget and made the stage
	// keep 58px it never gave one. Being the stage's NEXT SIBLING is what proves the foot is out of
	// the stage and below it, and the exact class name is what proves it dropped the glass.
	check("which is laid in the card's grey right after the stage, wearing no glass", stageOf(onGrid).nextElementSibling?.className, "wg-cat-foot");
	const shapeOf = (tile) => `${tile.className}|${tile.getAttribute("aria-label")}|${chromeButtons(tile).length}`;
	const wasInstalled = shapeOf(onGrid);
	registry.get("@task/task-card").installed = false;
	registry.get("@task/board-tabs").update = true;
	draw();
	await settle();
	const renamed = (title) => [...grid().querySelectorAll(".wg-cat-tile")].find((tile) => tile.querySelector(".wg-cat-name").textContent === title);
	check("a widget the vault does not have looks exactly like one it has", shapeOf(renamed("Task card")), wasInstalled);
	check("and its press still says Add, not Install", renamed("Task card").getAttribute("aria-label").startsWith("Add "), true);
	check("nothing marks one with a newer version either", renamed("Editable tabs").querySelectorAll(".wg-cat-badge").length, 0);
	delete registry.get("@task/task-card").installed;
	delete registry.get("@task/board-tabs").update;
	draw();
	await settle();

	// THE SELECTION STRIP WAS REJECTED. Nothing sits under the board — the card's own glass strip
	// carries everything the strips used to.
	check("nothing sits under the showcase board", grid().querySelector(".wg-cat").lastElementChild.className, "wg-cat-scroll");
	// WHAT IS FORBIDDEN IS THE GLOBAL STRIP — one bar at the foot of the panel naming whatever is
	// selected. A card's own identity row is not that: it belongs to the card and travels with it.
	check("no global strip names a selection", grid().querySelector(":scope > .wg-cat-bar"), null);
	check("but every card says what it is", drawn.every((tile) => tile.querySelector(".wg-cat-foot")), true);

	const before = board.tiles.length;
	// A BOARD IS MORE THAN ITS TILES: whatever it carried before an add, it carries after. Given
	// something to carry on purpose — an empty list surviving an add proves nothing at all.
	board = { ...board, mode: "expanded", properties: ["Status", "Priority", "Assignees"] };
	draw();
	await settle();
	const carried = { mode: board.mode, properties: board.properties };
	const card = [...grid().querySelectorAll(".wg-cat-tile")].find((tile) => tile.textContent.includes("Task card"));
	check("the card is offered", Boolean(card), true);
	await click(card);
	check("picking it adds a tile", board.tiles.length, before + 1);
	check("of the widget that was drawn", board.tiles.at(-1).widget, "@task/task-card");
	const placed = Object.values(board.layouts).flat().find((place) => place.id === board.tiles.at(-1).id);
	check("at the size that widget asks for", placed?.w, 4);
	check("and the catalogue closes behind it", Boolean(dom.window.document.body.querySelector(".wg-cat-dialog")), false);

	// Adding one used to rebuild the board as { tiles, layouts } and throw the rest away — an
	// expanded board collapsed, and the property list went with it, which is the list the filter
	// bar offers and the task dialog draws its rows from.
	check("the board keeps the mode it was in", board.mode, carried.mode);
	check("and the property list the rest of the app reads", board.properties, carried.properties);
	check("and the context it was carrying", board.context, carried.context);
	check("and what it kept was not nothing", carried.properties.length > 0 && carried.mode === "expanded", true);
}


// A PICK IS A BOARD WRITE, AND THE BOARD IS A DRAFT WHILE THE SETTINGS WINDOW IS OPEN. Nobody
// reaches the palette through the window — it covers the board — so this presses the write PATH,
// not a journey: the catalogue must go through onChange like the chips did, or a pick made while
// something is staged would land in the file and survive a cancel.
{
	const saved = JSON.stringify(board);
	const drawn = () => all("[data-tile]").length;
	const before = drawn();

	await click(surface().querySelector('.wg-tile-actions button[aria-label="Settings"]'));
	check("the settings window is open, so the board is staged", Boolean(dom.window.document.body.querySelector(".wg-set-window")), true);

	await click(all(".wg-palette .wg-palette-open")[0]);
	const tabs = [...dom.window.document.body.querySelectorAll(".wg-cat-dialog .wg-cat-tile")].find((tile) => tile.textContent.includes("Editable tabs"));
	await click(tabs);
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
	const fence = findBlocks(lines)[0];
	const authored = parseYaml(lines.slice(fence.start + 1, fence.end).join("\n"));

	check("the shipped board is stored in the pre-record shape", authored.tiles.find((tile) => tile.slots)?.slots, { card: "@task/task-card" });
	check("and it holds the four widgets the owner placed", authored.tiles.map((tile) => tile.widget), ["@task/board-tabs", "@task/view-tabs", "@task/kanban-board", "@core/filter-panel"]);

	const drawBoard = async (source) => {
		const spare = dom.window.document.createElement("div");
		dom.window.document.body.appendChild(spare);
		const standing = new Set(dom.window.document.querySelectorAll(".wg-page"));
		const writes = [];
		render(
			h(WidgetSurface, {
				board: normalizeBoard(source), registry, host, editing: false, screen: true, initialWidth: 1280,
				// CONTEXT: a probe counts writes and does not answer them — repainting turns one write into a loop
				onChange: (next) => writes.push(next),
				onToggleEditing: () => {}, onWidth: () => {},
			}),
			spare,
		);
		await settle();
		// CONTEXT: an expanded board draws through a portal on the body, not into its own element
		const page = [...dom.window.document.querySelectorAll(".wg-page")].find((node) => !standing.has(node)) ?? spare;
		const seen = {
			// CONTEXT: React's useId counts per root, so two mounts of one tree differ by that id alone
			html: page.innerHTML.replace(/_r_[0-9a-z]+_/g, "_id_"),
			tiles: [...page.querySelectorAll("[data-tile]")].map((node) => node.getAttribute("data-tile")).sort(),
			cards: page.querySelectorAll(".orbi-kanban .ok-card-slot").length,
			// CONTEXT: the slot's gives clause promises the card a task's title, so a fed slot draws one
			titles: [...page.querySelectorAll(".orbi-kanban .ok-card-slot")].map((node) => node.textContent.trim()).filter(Boolean).length,
			writes: writes.length,
		};
		// CONTEXT: a counter that cannot go up proves nothing, so one real edit has to move it
		await click(page.querySelector('.wg-toolbar button[title="Collapse"]'));
		seen.writesAfterAnEdit = writes.length;
		render(null, spare);
		spare.remove();
		return seen;
	};

	const old = await drawBoard(authored);
	const fresh = await drawBoard(serializeBoard(normalizeBoard(authored)));

	// CONTEXT: the owner's pick IS the manifest default, so only a different pick can tell a read from a fallback
	const repointed = (pick) => ({ ...authored, tiles: authored.tiles.map((tile) => (tile.slots ? { ...tile, slots: { card: pick } } : tile)) });
	const oldElsewhere = await drawBoard(repointed("@nope/missing"));
	const freshElsewhere = await drawBoard(repointed({ widget: "@nope/missing" }));

	check("the old-shape board draws every tile the owner placed", old.tiles, ["board", "boards", "views", "wynttpz"]);
	check("a pick the registry cannot resolve draws a different page, so the pick is READ", oldElsewhere.html === old.html, false);
	check("and the bare string is read exactly as the record is", freshElsewhere.html, oldElsewhere.html);
	check("its fed slot draws real cards, so the slot is not merely declared", old.cards > 0, true);
	check("and every one of them was fed what the gives clause promised", old.titles, old.cards);
	check("the record-shape board draws the same tiles", fresh.tiles, old.tiles);
	check("and the same number of cards through the same slot", fresh.cards, old.cards);
	check("the two boards render the SAME page, byte for byte", fresh.html === old.html, true);
	check("drawing the old-shape board writes nothing back", old.writes, 0);
	check("drawing the record-shape board writes nothing back", fresh.writes, 0);
	check("and the counter that says so does move when a person edits", old.writesAfterAnEdit > 0, true);
	check("and the note on disk is byte-identical after both", createHash("md5").update(fs.readFileSync(NOTE, "utf8")).digest("hex"), beforeBytes);
}



// AN ARCHIVED TAB HAD NO WAY OUT. Archive moved a name aside and Restore brought it back, so a
// name typed by mistake stayed on the note for good. Delete is the way out, and it asks first.
{
	const stage = dom.window.document.createElement("div");
	dom.window.document.body.appendChild(stage);
	const standing = new Set(dom.window.document.querySelectorAll(".wg-page"));

	let strip = normalizeBoard({
		tiles: [{ id: "boards", widget: "@core/editable-tabs", props: { tabs: { value: [{ name: "Marketing Team" }, { name: "Ux Team" }] } } }],
		layouts: { 20: { places: [{ id: "boards", x: 0, y: 0, w: 16, h: 1 }] } },
	});
	const paint = () =>
		render(
			h(WidgetSurface, {
				board: strip, registry, host, editing: false, screen: true, initialWidth: 1280,
				onChange: (next) => { strip = next; paint(); },
				onToggleEditing: () => {}, onWidth: () => {},
			}),
			stage,
		);
	paint();
	await settle();

	// CONTEXT: an expanded board draws through a portal on the body, not into its own element
	const page = [...dom.window.document.querySelectorAll(".wg-page")].find((node) => !standing.has(node)) ?? stage;
	const tile = () => page.querySelector('[data-tile="boards"]');
	const shown = () => [...tile().querySelectorAll(".wg-tabs-tab")].map((node) => node.textContent.trim());
	const menu = async (item) => {
		await click(tile().querySelector(".wg-tabs-more"));
		await click([...tile().querySelectorAll(".wg-kit-pop-item")].find((node) => node.textContent.includes(item)));
	};
	const listed = () => [...dom.window.document.body.querySelectorAll(".wg-tabs-archive .wg-kit-row")];
	const listedNames = () => listed().map((row) => row.querySelector(".wg-kit-row-label").textContent.trim());
	const asking = () => dom.window.document.body.querySelector(".wg-tabs-confirm");
	const kept = () => (serializeBoard(strip).tiles.find((held) => held.id === "boards")?.props?.tabs?.value ?? []).map((row) => row.value ?? row);
	const keptNamed = (name) => kept().find((row) => tabFieldOf(row, "name") === name) ?? null;

	check("the strip draws the tabs the note names", shown(), ["Marketing Team", "Ux Team"]);

	await menu("Archive");
	check("archiving takes the tab off the strip", shown(), ["Ux Team"]);
	check("and the row it archived carries the day", typeof tabFieldOf(keptNamed("Marketing Team"), "archivedAt"), "string");

	await menu("Archived list");
	check("the archived list draws it as a row", listedNames(), ["Marketing Team"]);
	check("with a Delete beside the Restore", [...listed()[0].querySelectorAll("button")].map((node) => node.textContent.trim()), ["Restore", "Delete"]);

	await click(listed()[0].querySelector(".wg-tabs-delete"));
	check("Delete asks before it takes anything", Boolean(asking()), true);
	check("and the note still holds the row", Boolean(keptNamed("Marketing Team")), true);
	await click(asking().querySelector(".wg-dialog-cancel"));
	check("dismissing leaves the entry on the list", listedNames(), ["Marketing Team"]);
	check("and the note exactly as it was", typeof tabFieldOf(keptNamed("Marketing Team"), "archivedAt"), "string");

	await click(listed()[0].querySelector(".wg-tabs-delete"));
	await click(asking().querySelector(".wg-dialog-confirm"));
	check("confirming takes the entry off the list", listedNames(), []);
	check("and off the note", keptNamed("Marketing Team"), null);
	check("the tabs still on the strip are untouched", kept().map((row) => tabFieldOf(row, "name")), ["Ux Team"]);
	check("and no widget was left behind under the deleted name", strip.tiles[0].mounted?.["Marketing Team"], undefined);

	render(null, stage);
	stage.remove();
}

check("react complained about nothing on the way", [...new Set(reactComplaints)], []);

console.log(failed ? `\n${failed} failed` : "\nthe page answers to a person");
process.exit(failed ? 1 : 0);
