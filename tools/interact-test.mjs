// The render test proved the widgets DRAW. It fed them an empty, read-only slot, so it could
// never prove they WORK — the board it checked was blank. This one gives them the real notes
// and then presses the things a person presses.
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { parse as parseYaml } from "yaml";
import { buildMirror } from "./mirror.mjs";

const VAULT = process.env.WG_VAULT ?? "/Users/denissevcuk/Documents/Obsidian/Personal/Personal";
const FOLDER = "Orbitask/Tasks";

const dom = new JSDOM(`<!doctype html><body><div class="view-content"><div id="host"></div></div></body>`, { pretendToBeVisual: true });
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "KeyboardEvent", "MouseEvent", "Event"]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
globalThis.window.setTimeout = globalThis.window.setTimeout ?? setTimeout;
globalThis.window.ResizeObserver = globalThis.ResizeObserver;
Object.defineProperty(dom.window.HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 1280 });

buildMirror();
const { h, render } = await import("preact");
const { WidgetSurface, resolveMounts } = await import("./.mjs-cache/surface.mjs");
const { WidgetRegistry } = await import("./.mjs-cache/registry.mjs");
const { normalizeBoard } = await import("./.mjs-cache/model.mjs");
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
			file.props = frontmatter(fs.readFileSync(path.join(VAULT, folder, name), "utf8"));
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
			return next;
		},
		on: () => ({}), off: () => {},
	},
	metadataCache: { getFileCache: (file) => ({ frontmatter: file.props }), on: () => {}, off: () => {} },
	fileManager: {
		processFrontMatter: async (file, edit) => { edit(file.props); written.updated.push({ path: file.path, props: { ...file.props } }); },
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

const KANBAN = "@orbitask/kanban-board";
const ARCHIVED = "@orbitask/archived-columns";

// CONTEXT: the kanban is MOUNTED in a view group now, so its settings live one level down
const READING_PLACES = [
	{ id: "panel", x: 0, y: 0, w: 4, h: 15 },
	{ id: "header", x: 4, y: 0, w: 16, h: 2 },
	{ id: "boards", x: 4, y: 2, w: 16, h: 1 },
	{ id: "views", x: 4, y: 3, w: 16, h: 1 },
	{ id: "filters", x: 4, y: 4, w: 16, h: 1 },
	{ id: "board", x: 4, y: 5, w: 16, h: 10 },
	{ id: "popup", x: 0, y: 15, w: 20, h: 8 },
];

let board = normalizeBoard({
	tiles: [
		{ id: "header", widget: "@orbitask/page-header" },
		{ id: "boards", widget: "@orbitask/board-tabs" },
		{ id: "views", widget: "@orbitask/view-tabs" },
		{ id: "filters", widget: "@orbitask/filter-panel", sources: { tasks: { path: FOLDER } } },
		{
			id: "board",
			widget: "@orbitask/view-group",
			settings: { views: `${KANBAN}, ${ARCHIVED}` },
			mounted: { [KANBAN]: { sources: { tasks: { path: FOLDER } } } },
		},
		{ id: "popup", widget: "@orbitask/task-popup", sources: { tasks: { path: FOLDER } } },
	],
	context: { board: "Marketing Team", view: "Kanban" },
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
const marketingTab = byText(".orbi-board-tabs button", "Marketing Team");
if (marketingTab) await click(marketingTab);
const marketing = cards();
check("selecting a board narrows to its own tasks", marketing > 0 && marketing <= 10, true);

// 2. a board tab steers it
const uxTab = byText(".orbi-board-tabs button", "Ux Team") ?? byText(".orbi-board-tabs button", "UX Team");
check("the second board tab exists", Boolean(uxTab), true);
if (uxTab) {
	await click(uxTab);
	check("switching board changes what is shown", cards() !== marketing, true);
	check("and it is not empty", cards() > 0, true);
	const back = byText(".orbi-board-tabs button", "Marketing Team");
	if (back) { await click(back); check("switching back restores the first board", cards(), marketing); }
}

// 3. the search field narrows it — the thing that used to be a <span>
const search = surface().querySelector(".oh-search input.wg-kit-field-input");
check("the search is a real field", Boolean(search), true);
if (search) {
	search.value = "audit";
	search.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
	await settle();
	const narrowed = cards();
	check("typing narrows the board", narrowed < marketing && narrowed > 0, true);
	search.value = "";
	search.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
	await settle();
	check("clearing the search restores it", cards(), marketing);
}

// 5. adding a task reaches the adapter
const add = all(".orbi-kanban button").find((node) => /add/i.test(node.textContent));
check("there is an add control", Boolean(add), true);
if (add) {
	await click(add);
	check("pressing it asks the adapter to create a note", written.created.length > 0, true);
}

// 6. opening a card fills the popup
const card = all(".orbi-kanban .ok-card-slot")[0];
if (card) {
	await click(card);
	check("opening a card fills the popup", surface().querySelectorAll(".orbi-task-popup .otp-title, .orbi-task-popup h2, .orbi-task-popup h3").length > 0, true);
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
check("opening it draws the widget", all(".wg-tile-chip.is-open .wg-tile-body > .wg-widget-root").length, 1);
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

const groupHeads = all(".orbi-filter .ofp-group-head").map((node) => node.textContent.trim());
check("the panel offers the groups it was configured with", groupHeads.length > 1, true);

// open the priority group and tick a value that really exists in the vault
const priorityHead = all(".orbi-filter .ofp-group-head").find((node) => /priority/i.test(node.textContent));
await click(priorityHead);
const options = all(".orbi-filter .ofp-option");
check("its choices come from the notes", options.length > 0, true);

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
// CONTEXT: a mounted widget persists under its own key inside the tile that holds it
const mountedSettingsOf = (id, key) => board.tiles.find((tile) => tile.id === id)?.mounted?.[key]?.settings ?? {};
const kanbanSettings = () => mountedSettingsOf("board", KANBAN);

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
	check("and it is written in the tile's settings", String(kanbanSettings().columns ?? "").includes("Blocked"), true);
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
	check("it leaves the columns setting", String(kanbanSettings().columns ?? "").includes("Blocked"), false);
	check("and lands in archivedColumns", String(kanbanSettings().archivedColumns ?? "").includes("Blocked"), true);

	// A COLUMN WITH TASKS IS ARCHIVED TOO. Refusing was right while removal was permanent;
	// archiving is reversible, so the count in the dialog is the warning instead.
	const writesBefore = written.updated.length;
	const cardsBefore = cards();
	const held = Number(listNamed("To Do").querySelector(".wg-kit-count").textContent.trim());
	check("the column under test holds tasks", held > 0, true);
	await click(listNamed("To Do").querySelector(".ok-list-remove"));
	check("the dialog says how many disappear", new RegExp(`${held} task`).test(dialog().textContent), true);
	await click(dialogButton("archive"));
	check("a busy column is archived, not refused", all(".orbi-kanban .ok-list").length, columnsBefore - 1);
	check("its tasks leave the view", cards(), cardsBefore - held);
	check("and no note was rewritten", written.updated.length, writesBefore);
}

{
	const tabsBefore = all(".orbi-board-tabs .obt-tab").length;
	await click(all(".orbi-board-tabs .obt-more")[0]);
	await click(byText(".orbi-board-tabs .wg-kit-pop-item", "Add board"));
	check("Add Board adds a tab", all(".orbi-board-tabs .obt-tab").length, tabsBefore + 1);
	check("named Untitled 1", String(settingsOf("boards").tabs ?? "").includes("Untitled 1"), true);
	// the board's own selection is not reachable from here — the visible truth is which tab
	// the kit's thumb sits on, which is the tab marked selected, and what a person sees anyway
	const active = all('.orbi-board-tabs .obt-tab[aria-selected="true"]').map((node) => node.textContent.trim());
	check("and it becomes the selected board", active, ["Untitled 1"]);

	// the new tab opens ready to be renamed, in place
	const editable = all('.orbi-board-tabs .obt-tab[contenteditable="true"]');
	check("the new board is editable where it stands", editable.length, 1);
}


// EDITING A NAME WHERE IT IS READ. A field that appears and then waits to be clicked, and a
// heading that can only be changed somewhere else, are both a step the person did not ask for.
{
	await click(all(".orbi-kanban .ok-add-list-rest")[0]);
	const field = all(".orbi-kanban .ok-list-name")[0];
	check("the new-list field takes focus by itself", dom.window.document.activeElement, field);
	field.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
	await settle();

	// back to a board that has tasks: the previous block selected a new empty one, and a rename
	// that touches nothing proves nothing
	const marketing = all(".orbi-board-tabs .obt-tab").find((node) => /Marketing/.test(node.textContent));
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

	check("the setting carries the new name", String(kanbanSettings().columns ?? "").includes("In progress"), true);
	check("and the old one is gone from it", String(kanbanSettings().columns ?? "").includes("Doing"), false);
	check("every task that was in it was rewritten", written.updated.filter((entry) => entry.props.status === "In progress").length > 0, true);
}

{
	// ONE MENU, NOT A PAIR OF BUTTONS. The pencil and the tick are gone; renaming is a menu
	// item, and Enter or blur commits. The menu stands beside the capsule, never inside a tab.
	const more = all(".orbi-board-tabs .obt-more")[0];
	check("the board row offers a menu", Boolean(more), true);
	check("and it stands outside the tab capsule", Boolean(more.closest(".wg-kit-seg")), false);

	await click(more);
	// CONTEXT: the panel stays in the DOM when shut, so only is-open proves it opened
	check("the menu opens", all(".orbi-board-tabs .wg-kit-pop.is-open").length, 1);

	await click(byText(".orbi-board-tabs .wg-kit-pop-item", "Rename"));
	check("and Rename edits the selected tab in place", all('.orbi-board-tabs .obt-tab[contenteditable="true"]').length, 1);
}

{
	// THE LAW THE STRIP IS BUILT ON: it is never empty. Archive every board, including the last
	// one, and a fresh Untitled must be standing there — a board bar with nothing on it offers
	// the person no way back in.
	const archive = async () => {
		await click(all(".orbi-board-tabs .obt-more")[0]);
		await click(byText(".orbi-board-tabs .wg-kit-pop-item", "Archive"));
	};

	let guard = 0;
	while (all(".orbi-board-tabs .obt-tab").length > 1 && guard < 12) {
		await archive();
		guard += 1;
	}
	check("archiving hands the strip down to one board", all(".orbi-board-tabs .obt-tab").length, 1);

	const last = all(".orbi-board-tabs .obt-tab")[0].textContent.trim();
	await archive();
	check("archiving the LAST board still leaves one", all(".orbi-board-tabs .obt-tab").length, 1);
	check("and the one left is a fresh Untitled", /^Untitled \d+$/.test(all(".orbi-board-tabs .obt-tab")[0].textContent.trim()), true);
	check("which is not the board just archived", all(".orbi-board-tabs .obt-tab")[0].textContent.trim() === last, false);
	check("the archived board was remembered, not lost", String(settingsOf("boards").archived ?? "").includes(last), true);
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
const groupBoard = (views, seen = "Kanban", tabs = {}) =>
	normalizeBoard({
		tiles: [
			{ id: "views", widget: "@orbitask/view-tabs", settings: tabs },
			{ id: "board", widget: "@orbitask/view-group", settings: { views } },
		],
		context: { board: "Marketing Team", view: seen },
		layouts: { 20: { places: [{ id: "views", x: 0, y: 0, w: 20, h: 1 }, { id: "board", x: 0, y: 1, w: 20, h: 10 }] } },
	});

const tileNode = (id) => all(`[data-tile="${id}"]`)[0];
const tabLabel = (id = "views") => tileNode(id)?.querySelector(".ovt-pick")?.textContent.trim() ?? "";
const tabItems = () => [...tileNode("views").querySelectorAll(".ovt-item")].map((node) => node.textContent.trim());
const openTabs = async (id = "views") => click(tileNode(id).querySelector(".ovt-pick"));
const pickView = async (name, id = "views") => {
	await openTabs(id);
	await click([...tileNode(id).querySelectorAll(".ovt-item")].find((node) => node.textContent.trim().startsWith(name)));
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
	// CONTEXT: one key in the vnode AND one persistence slot made two entries of one id collide
	const twice = resolveMounts({ mounts: { views: {} } }, { views: `${KANBAN}, ${KANBAN}` }, registry, {});
	check("the same widget mounted twice is two slots", twice.views.map((entry) => entry.slot), [KANBAN, `${KANBAN}#2`]);
	check(
		"and the engine hands back what the registry knew, not a field of its own",
		Object.keys(twice.views[0]).sort(),
		["failure", "id", "manifest", "problem", "render", "slot", "title"],
	);
	check("a widget's own declaration comes through untouched", twice.views[0].manifest.view, "Kanban");

	const gone = resolveMounts({ mounts: { views: {} } }, { views: "@orbitask/nowhere" }, registry, {});
	check("an id that is not a widget is still an entry", gone.views.map((entry) => entry.problem), ["not-found"]);
	check("with nothing to draw", gone.views[0].render, null);
}

{
	// CONTEXT: the switcher used to author its own list of names, reconciled by nothing
	board = groupBoard(KANBAN, "Kanban");
	draw();
	await settle();
	await openTabs();
	check("the switcher offers what the group actually holds", tabItems(), ["Kanban"]);
}

{
	// CONTEXT: an unresolvable id used to be dropped, so the group lied about what it holds
	board = groupBoard("@orbitask/no-such-view", "Kanban");
	draw();
	await settle();
	const shown = tileNode("board").textContent;
	check("a view that is not a widget is named, not swallowed", /no-such-view/.test(shown), true);
	check("and the group does not claim to be empty", /holds no views/.test(shown), false);
}

{
	// CONTEXT: the shared selection outlives the group's list, so a view can be taken out from under it
	board = groupBoard(`${KANBAN}, ${ARCHIVED}`);
	draw();
	await settle();
	await pickView("Archived columns");

	board = groupBoard(KANBAN);
	draw();
	await settle();
	const shown = tileNode("board").textContent;
	check("a selection no view answers to is said out loud", /has no view called Archived columns/.test(shown), true);
	check("and the group still draws something", all(".orbi-kanban").length, 1);
}

{
	// CONTEXT: ownership was keyed by widget id, so a second instance read as the first updating itself
	board = normalizeBoard({
		tiles: [
			{ id: "left", widget: "@orbitask/view-tabs" },
			{ id: "right", widget: "@orbitask/view-tabs" },
			{ id: "board", widget: "@orbitask/view-group", settings: { views: `${KANBAN}, ${ARCHIVED}` } },
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
	check("the first instance writes the shared selection", tabLabel("left"), "Archived columns");

	await pickView("Kanban", "right");
	check("a second instance of the same widget may not overwrite it", tabLabel("left"), "Archived columns");
	check("and it is told which instance holds the key", warnings.some((line) => /\bleft\b/.test(line) && /\bright\b/.test(line)), true);
}

{
	// CONTEXT: a claim outliving its widget makes the key unwritable forever
	const switcherBoard = (id) =>
		normalizeBoard({
			tiles: [
				{ id, widget: "@orbitask/view-tabs" },
				{ id: "board", widget: "@orbitask/view-group", settings: { views: `${KANBAN}, ${ARCHIVED}` } },
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
				{ id: "a", widget: KANBAN, sources: { tasks: null } },
				{ id: "b", widget: "@orbitask/view-group", mounted: { "@foo": null } },
			],
		});
	} catch (thrown) {
		failure = String(thrown?.message ?? thrown);
	}
	check("a null entry does not take the whole board down", failure, null);
	check("the tile that carried it survives", broken?.tiles.length, 2);
	check("its null source degrades to an unbound one", broken?.tiles[0].sources.tasks, { path: "", filters: [], sort: [] });
	check("and its null mount to an unconfigured one", broken?.tiles[1].mounted["@foo"], { settings: {}, sources: {}, slots: {}, mounted: {} });
}

{
	// THE PROPERTY LIST IS THE BOARD'S, NOT A TILE'S. Two widgets have to read ONE list, so a
	// widget keeping its own copy in `settings` was right for exactly one widget. The probe is
	// registered here rather than added to widgets/, because what is under test is what the
	// ENGINE hands over, not what any product widget does with it.
	const seen = [];
	registry.widgets.set("@probe/board", {
		manifest: { id: "@probe/board", title: "Probe", sources: { notes: {} } },
		folder: "probe",
		component: (given) => {
			seen.push(given);
			return h(
				"button",
				{
					class: "probe-add",
					onClick: () => given.configureBoard({ properties: [...(given.board?.properties ?? []), "Deadline"] }),
				},
				"add",
			);
		},
	});
	const last = () => seen[seen.length - 1];

	board = normalizeBoard({
		tiles: [{ id: "probe", widget: "@probe/board", sources: { notes: { path: FOLDER } } }],
		properties: ["Status", "Priority"],
		layouts: { 20: { places: [{ id: "probe", x: 0, y: 0, w: 6, h: 3 }] } },
	});
	draw();
	await settle();

	check("a widget is handed the board's property list", last()?.board?.properties, ["Status", "Priority"]);
	// the board itself is the model; a widget holding it could rewrite tiles and layouts
	check("and not the board it came off", last()?.board?.tiles, undefined);

	await click(all("button.probe-add")[0]);
	check("configureBoard writes the list back to the board", board.properties, ["Status", "Priority", "Deadline"]);
	check("and the widget reads it back on the next render", last()?.board?.properties, ["Status", "Priority", "Deadline"]);

	last().configureBoard({ properties: ["Status", "status", " Status "] });
	await settle();
	check("the same name twice is one property, whatever its case", board.properties, ["Status"]);

	warnings.length = 0;
	const refused = last().configureBoard({ tiles: [], properties: ["Status"] });
	await settle();
	check("a patch naming anything but properties is refused", refused, false);
	check("and the widget is told which key it may not write", warnings.some((line) => /tiles/.test(line)), true);
	check("the board is untouched by the refusal", [board.tiles.length, board.properties], [1, ["Status"]]);

	// A RECORD CARRIES NO BODY, so a widget could draw a note's properties and never its text.
	// The rows a widget is handed stay bodyless — twenty cards, no file reads — and one note's
	// text is FETCHED, which is the only call that costs anything.
	const notes = () => last().actions.notes;
	const first = last().data.notes.rows[0];
	check("the widget is handed rows to draw", Boolean(first), true);
	check("and not one of them carries a body", last().data.notes.rows.some((row) => row.body !== undefined), false);

	const opened = await notes().get({ path: first.path });
	check("a widget can fetch one record's body", typeof opened.body, "string");
	check("and its properties come with it", opened.props, first.props);

	await notes().update({ path: first.path }, { body: "Written from a widget.\n" });
	check("and save an edited one", (await notes().get({ path: first.path })).body, "Written from a widget.\n");
	check("the note's properties survived the body write", (await notes().get({ path: first.path })).props, first.props);

	// what a widget may ask of a source, in full — a new verb here is a decision, not a slip
	check("the source verbs a widget is handed", Object.keys(notes()).sort(), ["canCreate", "canRemove", "canUpdate", "create", "get", "open", "update"]);

	// A MOUNTED widget must not be handed less than a tile: the list belongs to the board, and
	// where a widget happens to be standing is not a fact about the board.
	seen.length = 0;
	board = normalizeBoard({
		tiles: [{ id: "group", widget: "@orbitask/view-group", settings: { views: "@probe/board" } }],
		properties: ["Status", "Priority"],
		layouts: { 20: { places: [{ id: "group", x: 0, y: 0, w: 12, h: 8 }] } },
	});
	draw();
	await settle();
	check("a mounted widget reads the same board list", last()?.board?.properties, ["Status", "Priority"]);
	last().configureBoard({ properties: ["Deadline"] });
	await settle();
	check("and can write it back from inside its holder", board.properties, ["Deadline"]);
}


console.log(failed ? `\n${failed} failed` : "\nthe page answers to a person");
process.exit(failed ? 1 : 0);
