// CONTEXT: the board owns the property names, the name decides the control, and an unfilled
// CONTEXT: row is still a row — pressed here, because none of it can be read off the markup
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { parse as parseYaml } from "yaml";
import { buildMirror } from "./mirror.mjs";
const EVERY_VERB = ["list", "get", "create", "update", "remove", "replace", "repairIds"];

const VAULT = process.env.WG_VAULT ?? "tools/fixture";
const FOLDER = "Orbitask/Tasks";

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
	"FocusEvent",
	"Event",
	"MutationObserver",
]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}
globalThis.ResizeObserver = class {
	observe() {}
	disconnect() {}
};
globalThis.window.ResizeObserver = globalThis.ResizeObserver;
Object.defineProperty(dom.window.HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 1280 });

buildMirror();
const { createElement: h } = await import("react");
const { render } = await import("./.mjs-cache/engine/render.mjs");
const { WidgetSurface } = await import("./.mjs-cache/surface.mjs");
const { WidgetRegistry } = await import("./.mjs-cache/registry.mjs");
const { normalizeBoard } = await import("./.mjs-cache/model.mjs");
const { createHost } = await import("./.mjs-cache/host.mjs");
const { TFile, TFolder, MarkdownRenderer } = await import("./.mjs-cache/obsidian.mjs");
const { readBody } = await import("./.mjs-cache/block-writer.mjs");
const { TONE_NAMES } = await import("./.mjs-cache/index.mjs");

const adapter = {
	exists: async (p) => fs.existsSync(path.join(VAULT, p)),
	list: async (p) => {
		const names = fs.readdirSync(path.join(VAULT, p));
		const kind = (name) => {
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
	read: async (p) => fs.readFileSync(path.join(VAULT, p), "utf8"),
	stat: async () => ({ mtime: 1, size: 1 }),
};

function frontmatter(text) {
	const found = /^---\n([\s\S]*?)\n---/.exec(text);
	return found ? (parseYaml(found[1]) ?? {}) : {};
}

// CONTEXT: a folder of ONE note that opens straight into its body, so a refused write has a file to prove it
const PLAIN = "Orbitask/Plain";
const PLAIN_NOTE = `${PLAIN}/A plain note.md`;

// CONTEXT: note TEXT lives here, so a body write never reaches the user's own vault
const texts = new Map([[PLAIN_NOTE, "The note opens straight into its body.\n"]]);
const reads = [];
const textOf = (file) => texts.get(file.path) ?? fs.readFileSync(path.join(VAULT, file.path), "utf8");

// CONTEXT: the vault caches its records, so a write must be visible to the next read
const held = new Map();
function fileAt(target, readProps) {
	if (!held.has(target)) {
		const file = Object.assign(new TFile(), {
			path: target,
			basename: target.slice(target.lastIndexOf("/") + 1).replace(/\.md$/, ""),
			extension: "md",
			stat: { ctime: 1, mtime: 2 },
		});
		file.props = readProps();
		held.set(target, file);
	}
	return held.get(target);
}

// THE TEST DECLARES ITS OWN PRECONDITION. "Filling an unset row is what creates it" needs the
// note to carry no deadline — and the notes are the person's REAL ones, which they may set a
// deadline on at any time through this very dialog. Hoping the vault stays clean is how this
// suite started failing on a note somebody had simply used.
function withoutDates(props) {
	const clean = {};
	for (const [key, value] of Object.entries(props)) if (key.toLowerCase() !== "deadline") clean[key] = value;
	return clean;
}

function vaultFiles(folder) {
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

// CONTEXT: what each note embeds, the way Obsidian's own cache reports it
const embedsBy = new Map();

const written = [];
const opened = [];
const folders = new Map();
// CONTEXT: the real cache announces a change, and both the write and the source wait on it
const listeners = new Set();
const announce = (file) => {
	for (const listener of [...listeners]) listener(file);
};
const app = {
	vault: {
		getAbstractFileByPath: (target) => {
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
		cachedRead: async (file) => {
			reads.push(file.path);
			return textOf(file);
		},
		// CONTEXT: a real vault announces AFTER the write returns, and host.js waits for that announcement
		process: async (file, edit) => {
			const next = edit(textOf(file));
			texts.set(file.path, next);
			setTimeout(() => announce(file), 0);
			return next;
		},
		on: () => ({}),
		off: () => {},
	},
	metadataCache: {
		getFileCache: (file) => ({ frontmatter: file.props, embeds: embedsBy.get(file.path) ?? [] }),
		on: (name, handler) => name === "changed" && listeners.add(handler),
		off: (name, handler) => listeners.delete(handler),
	},
	fileManager: {
		processFrontMatter: async (file, edit) => {
			edit(file.props);
			written.push({ path: file.path, props: { ...file.props } });
			announce(file);
		},
	},
	workspace: { getLeaf: () => ({ openFile: async (file) => opened.push(file.path) }) },
};

// CONTEXT: renderMarkdown parents a MarkdownRenderChild on the plugin, and unparents it on cleanup
const children = [];
const realHost = createHost(app, {
	registerEvent: () => {},
	addChild: (child) => children.push(child),
	removeChild: (child) => children.splice(children.indexOf(child), 1),
});
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
				tasks: { allow: EVERY_VERB, path: FOLDER },
				boards: { allow: EVERY_VERB, path: "Orbitask/DialogBoards" },
			},
		},
	],
	layouts: { 20: { places: [{ id: "board", x: 0, y: 0, w: 20, h: 10 }] } },
});

const root = dom.window.document.getElementById("host");
const draw = () =>
	render(
		h(WidgetSurface, {
			boardNode: root,
			board,
			registry,
			host,
			editing: false,
			screen: true,
			initialWidth: 1280,
			onChange: (next) => {
				board = next;
				draw();
			},
			onToggleEditing: () => {},
			onWidth: () => {},
		}),
		root,
	);

const settle = async (times = 40) => {
	for (let i = 0; i < times; i += 1) await new Promise((resolve) => setTimeout(resolve, 1));
};

let failed = 0;
let checks = 0;
const check = (label, got, want) => {
	checks += 1;
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK " : "!! "} ${label}${ok ? "" : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`}`,
	);
};

const body = dom.window.document.body;
const dialog = () => body.querySelector(".orbi-task-dialog");
const all = (selector) => [...(dialog()?.querySelectorAll(selector) ?? [])];
const click = async (node) => {
	node.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
	await settle();
};
const cards = () => [...root.querySelectorAll(".orbi-kanban .ok-card-slot")];
const rowNamed = (name) =>
	all(".otd-row").find((node) => node.querySelector(".wg-kit-row-label")?.textContent.trim() === name);
const rowNames = () => all(".otd-row .wg-kit-row-label").map((node) => node.textContent.trim());
const valueOf = (name) => rowNamed(name)?.querySelector(".otd-value")?.textContent.trim();
// CONTEXT: a dismissed panel keeps is-open while it folds away, and jsdom ends no transition
const panel = () => body.querySelector(".wg-kit-pop.is-open:not(.is-exiting)");
const items = () => [...(panel()?.querySelectorAll(".wg-kit-pop-item") ?? [])];
const itemNamed = (text) =>
	items().find((node) => node.textContent.trim().toLowerCase().startsWith(text.toLowerCase()));
const openRow = async (name) => click(rowNamed(name));
const modes = () => [...(dialog()?.querySelectorAll(".otd-desc-head .wg-kit-seg button") ?? [])];
const modeNamed = (label) => modes().find((node) => node.textContent.trim() === label);
const chosenMode = () =>
	modes()
		.find((node) => node.getAttribute("aria-selected") === "true")
		?.textContent.trim();
const editor = () => dialog()?.querySelector("textarea.wg-kit-md-input");
const focused = () => dom.window.document.activeElement;
const mirror = () => dialog()?.querySelector(".wg-kit-md-mirror");
const drawn = () => MarkdownRenderer.calls[MarkdownRenderer.calls.length - 1];
const typeBody = async (text) => {
	editor().value = text;
	editor().dispatchEvent(new dom.window.Event("input", { bubbles: true }));
	await settle();
};
// CONTEXT: preact/compat renames onBlur to onfocusout for the whole app, packages/core/src/surface.js:2
const leaveBody = async () => {
	editor().dispatchEvent(new dom.window.FocusEvent("focusout", { bubbles: true }));
	await settle(80);
};
const wroteLast = () => written[written.length - 1] ?? { props: {} };
const toneOfPill = (name) =>
	(rowNamed(name).querySelector(".wg-kit-pill")?.className ?? "").replace("wg-kit-pill", "").trim();

draw();
await settle();

console.log("— nothing is open until a task is —\n");
check("no dialog before a card is pressed", Boolean(dialog()), false);
check("and no note's text has been read to draw the cards", reads, []);

console.log("\n— the strip under a card carries facts the note HAS, and nothing else —");
{
	// Every card used to claim a comment count and a checklist, read off properties nothing in
	// this app ever writes — so every card said "0 comments, 0/5 done" about features that do
	// not exist. A strip that reports absent things is worse than no strip.
	const strip = (node) =>
		[...node.querySelectorAll(".orbi-task-card-meta .orbi-task-card-meta-item")].map((item) => item.textContent.trim());
	const named = (title) =>
		cards().find((node) => node.querySelector(".orbi-task-card-title")?.textContent.trim() === title);

	const DATED = "Design the onboarding flow";
	const datedPath = `${FOLDER}/design-the-onboarding-flow.md`;
	const was = { ...fileAt(datedPath, () => ({})).props };
	const setProps = async (patch) => {
		Object.assign(fileAt(datedPath, () => ({})).props, patch);
		announce(fileAt(datedPath, () => ({})));
		await settle();
	};
	// CONTEXT: every section after this one reads the same note — what is set here must not survive
	const putBack = async () => {
		const file = fileAt(datedPath, () => ({}));
		for (const key of Object.keys(file.props)) delete file.props[key];
		Object.assign(file.props, was);
		announce(file);
		await settle();
	};

	// A DATE ON A CARD IS A DEADLINE. The notes carry a `due` property too, and letting it stand
	// in meant every card showed a date whether or not anybody had set a deadline.
	check("a note with no deadline shows no date", strip(named(DATED)).length, 0);
	await setProps({ Deadline: "2026-08-31" });
	check("setting one puts it on the card", strip(named(DATED)).length, 1);
	check("spelled the way a person reads a date", strip(named(DATED))[0], "31 Aug");
	check("not the way the file stores it", strip(named(DATED))[0].includes("2026-08-31"), false);
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

	// an empty bar spends a whole row of a card to say nothing
	const track = () => named(DATED).querySelector(".orbi-task-card-track");
	await setProps({ progress: 0 });
	check("a task at nought draws no progress bar", Boolean(track()), false);
	await setProps({ progress: 34 });
	check("and one that has started draws one", Boolean(track()), true);
	check("saying how far it has come", track().textContent.trim(), "34%");

	// CONTEXT: one value drew one dash, so a note wearing two tags said nothing about the second
	const dashes = (title) => [...named(title).querySelectorAll(".orbi-task-card-stripe")];
	const toneOfDash = (node) => node.className.replace("orbi-task-card-stripe", "").trim();
	check("one dash per tag the note lists", dashes(DATED).length, 2);
	check("the first takes the tone the map gives it", toneOfDash(dashes(DATED)[0]), "is-err");
	check("and a tag the map says nothing about stays grey", toneOfDash(dashes(DATED)[1]), "");
	check("a note with no map at all still draws its tags", dashes("New task").length, 1);
	check("all of them grey", toneOfDash(dashes("New task")[0]), "");

	await putBack();
	check("and the note is left exactly as this section found it", fileAt(datedPath, () => ({})).props, was);
}

const first = cards()[0];
const openedCard = first.textContent.trim();
await click(first);
check("pressing a card opens the dialog", Boolean(dialog()), true);
check(
	"and it carries that note's own title",
	openedCard.includes(dialog().querySelector(".otd-title").textContent.trim()),
	true,
);
check(
	"the strip says what the window is",
	dialog().querySelector(".otd-where").textContent.trim().startsWith("Card"),
	true,
);
check(
	"and which board the task sits on",
	dialog().querySelector(".otd-where").textContent.includes("Marketing Team"),
	true,
);
const shownTitle = dialog().querySelector(".otd-title").textContent.trim();
const openPath = vaultFiles(FOLDER).find((file) => (file.props.title ?? file.basename) === shownTitle).path;
check("opening it reads ONE note's text, the one on screen", reads, [openPath]);

console.log("\n— the list of properties belongs to the board —");
check(
	"the tile carries no setting of its own",
	"properties" in board.tiles.find((tile) => tile.id === "board").settings,
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

// THE SIDEBAR'S SHAPE, both halves of it corrected by hand once already: an icon is a glyph and
// never the kit's filled badge, and the grey group holds the VALUES — not the heading above them.
check("a property row's icon is a glyph, not a filled badge", all(".otd-row .wg-kit-row-badge").length, 0);
check(
	"and every row carries one",
	all(".otd-row").length > 0 && all(".otd-row").every((node) => node.querySelector(".wg-kit-side-icon")),
	true,
);
check("the group holds the values", Boolean(dialog().querySelector(".otd-props .wg-kit-side-list .otd-row")), true);
check("and the heading sits outside it", Boolean(dialog().querySelector(".wg-kit-side-list .otd-plate-head")), false);
check("a name no note has ever carried is still a row", Boolean(rowNamed("Deadline")), true);
check("and it reads as unset", valueOf("Deadline"), "Empty");
check("as a real, pressable row", rowNamed("Deadline").tagName, "BUTTON");
check("marked unset for the eye too", rowNamed("Deadline").classList.contains("is-unset"), true);

console.log("\n— the NAME decides the control —");
check("Priority is a tag", Boolean(rowNamed("Priority").querySelector(".wg-kit-pill")), true);
check("carrying the priority's own tone", ["is-err", "is-warn", "is-ok"].includes(toneOfPill("Priority")), true);
check("Progress is a track", Boolean(rowNamed("Progress").querySelector(".wg-kit-progress-track")), true);
check("Assignees is people", Boolean(rowNamed("Assignees").querySelector(".otd-avatars")), true);
check("Client, anchored to nothing, is plain text", Boolean(rowNamed("Client").querySelector("input.otd-text")), true);
check("and a text row is the field, not a button", rowNamed("Client").tagName, "DIV");

console.log("\n— Status is the one anchor whose values are not fixed —");
await openRow("Status");
check(
	"pressing it offers the board's own columns",
	items()
		.map((node) => node.textContent.trim())
		.slice(0, 3),
	["To Do", "Doing", "Done"],
);
check(
	"with the column this task is in ticked",
	items().filter((node) => node.getAttribute("aria-checked") === "true").length,
	1,
);
// CONTEXT: a task always sits in a column, so status is the one choice with nothing to clear to
check(
	"and no way to empty it, because a task is always in some column",
	items().some((node) => node.textContent.trim() === "Clear"),
	false,
);
await click(itemNamed("To Do"));
check("picking one writes the note", wroteLast().props.status, "To Do");
check("under the key the note already spells", "status" in wroteLast().props, true);
check("and the row follows", String(valueOf("Status")).startsWith("To Do"), true);
await openRow("Priority");
check(
	"a choice that can be emptied still offers it",
	items().some((node) => node.textContent.trim() === "Clear"),
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
check("the date anchor opens a calendar", Boolean(panel().querySelector(".wg-kit-cal-grid")), true);
check("with Today and Next Monday under it", [itemNamed("Today"), itemNamed("Next Monday")].every(Boolean), true);
await click(itemNamed("Today"));
check("choosing a date creates the key, spelled as the board named it", "Deadline" in wroteLast().props, true);
check("stored as a plain ISO date", /^\d{4}-\d{2}-\d{2}$/.test(String(wroteLast().props.Deadline)), true);
check("the row is no longer unset", rowNamed("Deadline").classList.contains("is-unset"), false);
check("and it reads as a date a person reads", /^\d{1,2} \w{3} \d{4}$/.test(valueOf("Deadline")), true);

console.log("\n— people are ours: the roster is whoever the board already names —");
await openRow("Assignees");
check("the panel offers the people on this board", items().length > 1, true);
check("and can be searched", Boolean(panel().querySelector(".wg-kit-pop-search input")), true);
// CONTEXT: a property panel opens OVER the row it belongs to, the way every other panel in the
// kit does — six of them were asking for the placement that drops below it instead
check("and it opens over the row, not under it", panel().classList.contains("is-below"), false);
const ticked = items().filter((node) => node.getAttribute("aria-checked") === "true");
check("the ones on this task are ticked", ticked.length > 0, true);
await click(ticked[0]);
check("unticking one takes them off the note", wroteLast().props.assignees.length, ticked.length - 1);
check("and the rest stay a list", Array.isArray(wroteLast().props.assignees), true);

console.log("\n— text is edited where it is read —");
const field = rowNamed("Client").querySelector("input.otd-text");
field.value = "Internal";
field.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
await settle();
// CONTEXT: preact/compat renames onBlur to onfocusout for the whole app, packages/core/src/surface.js:2
field.dispatchEvent(new dom.window.FocusEvent("focusout", { bubbles: true }));
await settle();
check("leaving the field writes it", wroteLast().props.Client, "Internal");

console.log("\n— the description: the note's own text, in the two modes it is worth reading in —");
const wasOnDisk = textOf(held.get(openPath));
const bodyOnDisk = readBody(wasOnDisk);
check(
	"the description offers both modes",
	modes().map((node) => node.textContent.trim()),
	["Preview", "Detail"],
);
check("and opens on the one that reads", chosenMode(), "Preview");
check("preview is Obsidian's own rendering, not ours", Boolean(drawn()), true);
check("handed the note's body", drawn().markdown, bodyOnDisk);
check("into the element the widget owns", drawn().el === dialog().querySelector(".otd-md"), true);

await click(modeNamed("Detail"));
check("detail hands over the raw note", editor().value, bodyOnDisk);
check("switching to Detail hands the caret to the editor", focused() === editor(), true);
check("and stands it at the very start", [editor().selectionStart, editor().selectionEnd], [0, 0]);
const EDITED = "## Why one surface\n\n**bold** text and a [[link]]";
await typeBody(EDITED);
check("nothing is hidden — the markers stay on screen", mirror().textContent.includes("## Why one surface"), true);
check("a heading is only made heavier", Boolean(mirror().querySelector(".is-heading")), true);
check("bold markup is only made bolder", Boolean(mirror().querySelector(".is-strong")), true);
check("a link takes the accent", Boolean(mirror().querySelector(".is-link")), true);

await leaveBody();
check("leaving the editor writes the body", readBody(texts.get(openPath)), EDITED);
check(
	"and the note's properties are left exactly as they were",
	texts.get(openPath).startsWith(wasOnDisk.slice(0, wasOnDisk.length - bodyOnDisk.length)),
	true,
);
await click(modeNamed("Preview"));
check("preview draws what was just saved", drawn().markdown, EDITED);
check(
	"AND PREVIEW HOLDS NO CARET — it is there to be read",
	[Boolean(editor()), focused()?.tagName === "TEXTAREA"],
	[false, false],
);

console.log("\n— the anchor ignores case, on the whole name and nothing less —");
const listBecomes = async (properties) => {
	// CONTEXT: through the model, so the list under test is one the file could actually hold
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
							boards: { allow: EVERY_VERB, path: "Orbitask/NoBoards" },
							board: { value: record },
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
check("a lowercase deadline is still a date", Boolean(panel().querySelector(".wg-kit-cal-grid")), true);
check("a near miss falls through to text", Boolean(rowNamed("DEADLINE (soft)").querySelector("input.otd-text")), true);
check("Members anchors to people, the same as Assignees", valueOf("Members"), "Empty");

console.log("\n— Add property asks one question, and the answer decides everything —");
await listBecomes(["Status", "Priority"]);
await click(dialog().querySelector(".otd-add"));
const naming = body.querySelector(".otd-pop-field input");
check("it asks for a name", Boolean(naming), true);
const typeName = async (name) => {
	naming.value = name;
	naming.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
	await settle();
};
await typeName("Deadline");
check(
	"and says what the name will make, while it is typed",
	body.querySelector(".otd-hint").textContent.includes("a date"),
	true,
);
await typeName("Repo");
check("a name it does not know says so too", body.querySelector(".otd-hint").textContent.includes("plain text"), true);
naming.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
await settle();
const dialogSettings = () => board.tiles.find((tile) => tile.id === "board").settings;
const recordProperties = () => board.tiles.find((tile) => tile.id === "board").props.board.value.properties;
check("committing puts the name last on the board's own list", recordProperties().slice(-1)[0], "Repo");
check("and it landed on the board record, not on a setting of the tile", "properties" in dialogSettings(), false);
check("the row lands unset", valueOf("Repo"), "");
check("as text, because Repo is anchored to nothing", Boolean(rowNamed("Repo").querySelector("input.otd-text")), true);

console.log("\n— and it landed on EVERY task, not just the one that was open —");
await click(dialog().querySelector(".otd-corner button:last-child"));
check("closing dismisses the dialog", Boolean(dialog()), false);
await click(cards()[1]);
check("a different task opens", Boolean(dialog()), true);
check("carrying the same list", rowNames(), ["Status", "Priority", "Repo"]);

console.log("\n— the two controls in the corner —");
await click(dialog().querySelector(".otd-corner button:first-child"));
check("expand leaves the dialog for the note itself", opened.length, 1);
await click(dialog().querySelector(".otd-corner button:last-child"));
check("close leaves nothing behind", Boolean(dialog()), false);
await click(cards()[1]);
check("and pressing the SAME card again opens it once more", Boolean(dialog()), true);

console.log("\n— a tag carries its own colour, and the chip is where both are changed —");
{
	const TAGGED = "Design the onboarding flow";
	const taggedPath = `${FOLDER}/design-the-onboarding-flow.md`;
	const openTagged = async () => {
		if (dialog()) await click(dialog().querySelector(".otd-corner button:last-child"));
		await click(cards().find((node) => node.textContent.includes(TAGGED)));
	};
	await openTagged();

	const chips = () => all(".otd-tags .otd-tag");
	const worn = () => chips().map((node) => node.textContent.trim());
	const toneOfChip = (node) => node.className.replace(/wg-kit-pill|otd-tag|is-held/g, "").trim();
	// CONTEXT: jsdom lays nothing out, so the chips are given a believable row of 80px slots
	const placeChips = () => {
		chips().forEach((node, at) => {
			const box = { left: at * 80, top: 0, width: 80, height: 24, right: at * 80 + 80, bottom: 24 };
			node.getBoundingClientRect = () => box;
		});
	};
	const pointer = (name, x) => new dom.window.MouseEvent(name, { bubbles: true, clientX: x, clientY: 12 });
	const dragChip = async (from, toX) => {
		placeChips();
		chips()[from].dispatchEvent(pointer("pointerdown", from * 80 + 40));
		dom.window.dispatchEvent(pointer("pointermove", toX));
		await settle();
		dom.window.dispatchEvent(pointer("pointerup", toX));
	};
	const chipPanel = () =>
		body.querySelector(".wg-kit-pop.is-open:not(.is-exiting) .otd-tones")?.closest(".wg-kit-pop") ?? null;

	check("the note's tags are worn in the order it lists them", worn(), ["#design", "#onboarding"]);
	check("each chip carries the tone the map gives it", chips().map(toneOfChip), ["is-err", ""]);
	check("and no chip carries a cross any more", all(".otd-tag-drop").length, 0);

	await click(chips()[0]);
	check("pressing a chip opens its own panel instead of taking it off", Boolean(chipPanel()), true);
	check("the tag is still worn", worn().includes("#design"), true);
	check("the panel offers every tone the kit has", chipPanel().querySelectorAll(".otd-tone").length, TONE_NAMES.length);
	check(
		"with the tag's own already picked",
		chipPanel().querySelector(".otd-tone.is-picked")?.getAttribute("aria-label"),
		"error",
	);

	const naming = () => chipPanel().querySelector(".otd-pop-field input");
	naming().value = "product-design";
	naming().dispatchEvent(new dom.window.Event("input", { bubbles: true }));
	await settle();
	await click(
		[...chipPanel().querySelectorAll(".otd-tone")].find((node) => node.getAttribute("aria-label") === "success"),
	);
	const beforeSave = written.length;
	await click([...chipPanel().querySelectorAll(".wg-kit-btn")].find((node) => node.textContent.trim() === "Save"));
	check("saving writes the new name into the list, in place", wroteLast().props.tags, ["product-design", "onboarding"]);
	check("and the colour into the map beside it", wroteLast().props.tagTones, { "product-design": "success" });
	check("in ONE write, so the list and the map can never disagree", written.length - beforeSave, 1);
	check("the chip follows", worn(), ["#product-design", "#onboarding"]);

	await click(chips()[0]);
	await click(
		[...chipPanel().querySelectorAll(".otd-tone")].find((node) => node.getAttribute("aria-label") === "neutral"),
	);
	await click([...chipPanel().querySelectorAll(".wg-kit-btn")].find((node) => node.textContent.trim() === "Save"));
	check("grey is no entry at all, not an entry saying grey", wroteLast().props.tagTones, {});

	await click(chips()[0]);
	naming().value = "renamed-and-dropped";
	naming().dispatchEvent(new dom.window.Event("input", { bubbles: true }));
	await settle();
	await click([...chipPanel().querySelectorAll(".wg-kit-btn")].find((node) => node.textContent.trim() === "Cancel"));
	check("cancel writes nothing", worn(), ["#product-design", "#onboarding"]);

	await dragChip(1, 10);
	await settle();
	check("dragging a chip past another writes the new order", wroteLast().props.tags, ["onboarding", "product-design"]);
	check("and the row reads in that order", worn(), ["#onboarding", "#product-design"]);

	// CONTEXT: a real pointerup is followed by a click in the same turn, so it is sent unsettled
	await dragChip(0, 30);
	chips()[0].dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
	await settle();
	check("a drag does not open the panel the press would have", Boolean(chipPanel()), false);

	const before = written.length;
	chips()[0].dispatchEvent(pointer("pointerdown", 40));
	dom.window.dispatchEvent(pointer("pointerup", 42));
	await settle();
	check("and a press that never moved writes nothing", written.length, before);

	fileAt(taggedPath, () => ({})).props.tags = ["design", "onboarding"];
	fileAt(taggedPath, () => ({})).props.tagTones = { design: "error" };
	announce(fileAt(taggedPath, () => ({})));
	await settle();
}

console.log("\n— a code block is carried away, not retyped —");
{
	const FENCED = "Run it:\n\n```sh\nnpm run build\n```\n";
	const copiers = () => all(".otd-md pre .otd-copy");
	await click(modeNamed("Detail"));
	await typeBody(FENCED);
	await leaveBody();
	await click(modeNamed("Preview"));
	await settle();
	check("the block the renderer produced carries a copy button", copiers().length, 1);
	check(
		"it is the kit's own icon button, at the small size",
		copiers()[0].className.includes("wg-kit-icon is-s"),
		true,
	);
	check(
		"standing inside the block it copies",
		copiers()[0].closest("pre")?.querySelector("code")?.textContent.trim(),
		"npm run build",
	);

	let carried = null;
	dom.window.navigator.clipboard = {
		writeText: (text) => {
			carried = text;
		},
	};
	await click(copiers()[0]);
	check("pressing it hands over the code and nothing else", carried.trim(), "npm run build");
	check("and says so", Boolean(copiers()[0].querySelector("svg")), true);

	await click(modeNamed("Detail"));
	await settle();
	check("leaving the preview takes the button with it", all(".otd-copy").length, 0);
	await click(modeNamed("Preview"));
	await settle();
	check("and coming back does not leave two", copiers().length, 1);
}

console.log("\n— a body the file cannot hold is refused, and the dialog says so —");
// CONTEXT: its own board, because a note that opens straight into its body carries no board to filter on
render(null, root);
let plain = normalizeBoard({
	tiles: [
		{
			id: "board",
			widget: KANBAN,
			props: {
				tasks: { allow: EVERY_VERB, path: PLAIN },
				boards: { allow: EVERY_VERB, path: "Orbitask/NoBoards" },
				board: { value: { columns: [{ name: "To Do" }], properties: ["Status"] } },
			},
		},
	],
	layouts: { 20: { places: [{ id: "board", x: 0, y: 0, w: 20, h: 10 }] } },
});
const drawPlain = () =>
	render(
		h(WidgetSurface, {
			boardNode: root,
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
			onToggleEditing: () => {},
			onWidth: () => {},
		}),
		root,
	);
drawPlain();
await settle();

await click(cards()[0]);
await click(modeNamed("Detail"));
check("the plain note has no properties at all", editor().value, "The note opens straight into its body.\n");
await typeBody("---\ntitle: hijacked\n---\n\nA body that would become the note's properties.");
await leaveBody();
check("the note is left exactly as it was", texts.get(PLAIN_NOTE), "The note opens straight into its body.\n");
check("the dialog says the write did not land", Boolean(dialog().querySelector(".otd-refused")), true);
check("and the text is still there to be fixed", editor().value.startsWith("---"), true);
await typeBody("A body the file can hold.");
await leaveBody();
check("a body it CAN hold lands", texts.get(PLAIN_NOTE), "A body the file can hold.");
check("and the warning goes with it", Boolean(dialog().querySelector(".otd-refused")), false);

console.log("\n— a tag comes off where it is worn, and Enter takes the first match —");
{
	const openFirst = async () => {
		if (!dialog()) await click(cards()[0]);
	};
	await openFirst();
	const tags = () => [...dialog().querySelectorAll(".otd-tags .otd-tag")].map((node) => node.textContent.trim());
	const tagPanel = () => body.querySelector(".wg-kit-pop-search")?.closest(".wg-kit-pop") ?? body;

	await click(dialog().querySelector(".otd-tag-add"));
	const field = tagPanel().querySelector(".wg-kit-pop-search-field input");
	check("the tag panel opens on a field", Boolean(field), true);
	field.value = "urgent";
	field.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
	await settle();
	// ENTER TAKES THE FIRST ROW. Typing the whole name and then reaching for the mouse is the
	// one thing a search field is supposed to save.
	field.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
	await settle();
	check(
		"Enter applies the first match",
		tags().some((text) => text.startsWith("#urgent")),
		true,
	);

	// CONTEXT: with the cross gone, unticking the tag in its own panel is how it comes off
	const before = tags().length;
	await click(dialog().querySelector(".otd-tag-add"));
	await click(
		[...tagPanel().querySelectorAll(".wg-kit-pop-item")].find((node) => node.textContent.trim() === "#urgent"),
	);
	check("unticking it takes the tag off", tags().length, before - 1);
	const written_ = wroteLast().props.tags ?? [];
	check(
		"and the note no longer names it",
		(Array.isArray(written_) ? written_ : String(written_).split(",")).includes("urgent"),
		false,
	);
	check("its colour leaves with it", "urgent" in (wroteLast().props.tagTones ?? {}), false);
}

console.log("\n— a description nobody switched to keeps its hands off the caret —");
{
	// CONTEXT: no renderMarkdown means no Preview to offer, so Detail is what the dialog opens on
	const editOnly = { ...host, can: { ...host.can, renderMarkdown: false } };
	render(null, root);
	render(
		h(WidgetSurface, {
			boardNode: root,
			board: plain,
			registry,
			host: editOnly,
			editing: false,
			screen: true,
			initialWidth: 1280,
			onChange: () => {},
			onToggleEditing: () => {},
			onWidth: () => {},
		}),
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

	// CONTEXT: jsdom lays nothing out, and a window with no box has no origin to fall from
	const BOX = { x: 360, y: 140, left: 360, top: 140, width: 560, height: 420, right: 920, bottom: 560 };
	const NOWHERE = { x: 0, y: 0, left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 };
	const wasRect = dom.window.Element.prototype.getBoundingClientRect;
	const flushes = [];
	dom.window.Element.prototype.getBoundingClientRect = function () {
		if (!this.classList?.contains("wg-dialog")) return { ...NOWHERE };
		flushes.push({ opacity: this.style.opacity, transition: this.style.transition });
		return { ...BOX };
	};

	const realNow = Date.now;
	let skewMs = 0;
	Date.now = () => realNow.call(Date) + skewMs;

	const frame = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
	const press = (node, x, y) =>
		node.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, clientX: x, clientY: y, detail: 1 }));
	// CONTEXT: Enter on a button fires a click reporting detail 0 at the screen corner
	const keyPress = (node) => node.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
	const shotOf = (panel) =>
		!panel
			? { ...BARE }
			: {
					origin: panel.style.transformOrigin,
					translate: panel.style.translate,
					scale: panel.style.scale,
					opacity: panel.style.opacity,
					transition: panel.style.transition,
				};
	const BARE = { origin: "", translate: "", scale: "", opacity: "", transition: "" };
	// CONTEXT: a beat that never came must not read as the bare panel the last beat leaves
	const MISSED = {
		origin: "no beat",
		translate: "no beat",
		scale: "no beat",
		opacity: "no beat",
		transition: "no beat",
	};
	const endFold = (panel) =>
		panel.dispatchEvent(new dom.window.TransitionEvent("transitionend", { bubbles: true, propertyName: "scale" }));
	const shutDown = async () => {
		if (!dialog()) return;
		press(dialog().querySelector(".otd-corner button:last-child"), 900, 90);
		await frame();
		if (dialog()) endFold(dialog());
		await frame();
	};

	// CONTEXT: sampling faster than the beats are scheduled is what measures their order
	const trace = [];
	const sample = () => {
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
	// CONTEXT: press (400, 500) on a 560x420 window at (360, 140) — 40px in, 360px down, centre (640, 350)
	press(cards()[0], 400, 500);
	await new Promise((resolve) => setTimeout(resolve, 620));
	clearInterval(beat);

	const seat = trace[0]?.style ?? MISSED;
	const grow = trace[1]?.style ?? MISSED;
	const settled = trace[2]?.style ?? MISSED;
	const rest = trace[3]?.style ?? MISSED;
	const beatAt = (at) => trace[at]?.at ?? 0;

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

	// CONTEXT: one number for both axes keeps the shape exactly; the widest step is a tenth
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
	press(dialog().querySelector(".otd-corner button:last-child"), 900, 90);
	await frame();
	check("closing does not take the window out in the same frame", Boolean(dialog()), true);
	const folding = shotOf(dialog());
	check("it goes back to WHERE IT CAME FROM, not to where the closing press landed", folding.origin, "40px 360px");
	check("shrinking to the size it arrived at", folding.scale, "0.9");
	check("pulled back toward the press it came from", folding.translate, "-43px 27px");
	check("and the opacity is carried out on a curve too", /opacity 160ms/.test(folding.transition), true);
	check("to nothing", folding.opacity, "0");

	// CONTEXT: a measurement commits the style, so an implicit opacity 1 would land untransitioned
	check("the fold measures the window before it folds it", flushes.length > 0, true);
	check("SO IT HOLDS THE OPACITY UP BEFORE MEASURING", flushes[0]?.opacity, "1");
	check(
		"because opacity is not in the curve still in force there",
		/opacity/.test(flushes[0]?.transition ?? ""),
		false,
	);

	check("the window is still there while it folds", Boolean(dialog()), true);
	if (dialog()) endFold(dialog());
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
	press(dialog().querySelector(".otd-corner button:last-child"), 900, 90);
	await frame();
	check("and folds back to that same centre", shotOf(dialog()).origin, "50% 50%");
	await shutDown();

	console.log("\n— reduced motion is given the end of the gesture, not the gesture —");
	const wasMedia = dom.window.matchMedia;
	dom.window.matchMedia = (query) => ({
		matches: /prefers-reduced-motion/.test(query),
		media: query,
		onchange: null,
		addListener() {},
		removeListener() {},
		addEventListener() {},
		removeEventListener() {},
		dispatchEvent: () => false,
	});
	press(cards()[1], 400, 500);
	await settle();
	check("the window is simply there, with nothing painted on it", shotOf(dialog()), BARE);
	press(dialog().querySelector(".otd-corner button:last-child"), 900, 90);
	await frame();
	check("and simply gone, without waiting for a transition", Boolean(dialog()), false);
	dom.window.matchMedia = wasMedia;

	// CONTEXT: measured in headless Chrome — a starved rAF held the seat 1300ms, once for ever
	console.log("\n— rAF can be starved, and the window still arrives —");
	const wasRaf = globalThis.requestAnimationFrame;
	const wasCancel = globalThis.cancelAnimationFrame;
	let asked = 0;
	globalThis.requestAnimationFrame = () => (asked += 1);
	globalThis.cancelAnimationFrame = () => {};
	trace.length = 0;
	const starved = setInterval(sample, 2);
	press(cards()[0], 400, 500);
	await new Promise((resolve) => setTimeout(resolve, 400));
	clearInterval(starved);
	globalThis.requestAnimationFrame = wasRaf;
	globalThis.cancelAnimationFrame = wasCancel;
	check("a frame was asked for and never given", asked > 0, true);
	check("the seat is painted all the same", (trace[0] ?? { style: MISSED }).style.scale, "0.9");
	check("AND THE GROWTH STILL COMES, carried by a timer", (trace[1] ?? { style: MISSED }).style.scale, "1.05");
	check("so the window is never left standing at nothing", (trace[1] ?? { style: MISSED }).style.opacity, "1");
	await shutDown();

	Date.now = realNow;
	dom.window.Element.prototype.getBoundingClientRect = wasRect;
}

console.log(failed ? `\n${failed} of ${checks} failed` : `\n${checks} checks: the board's list is the task's rows`);
process.exit(failed ? 1 : 0);
