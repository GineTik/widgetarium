// CONTEXT: the board owns the property names, the name decides the control, and an unfilled
// CONTEXT: row is still a row — pressed here, because none of it can be read off the markup
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { parse as parseYaml } from "yaml";
import { buildMirror } from "./mirror.mjs";

const VAULT = process.env.WG_VAULT ?? "tools/fixture";
const FOLDER = "Orbitask/Tasks";

const dom = new JSDOM(`<!doctype html><body><div class="view-content"><div id="host"></div></div></body>`, { pretendToBeVisual: true });
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "KeyboardEvent", "MouseEvent", "FocusEvent", "Event"]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
globalThis.window.ResizeObserver = globalThis.ResizeObserver;
Object.defineProperty(dom.window.HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 1280 });

buildMirror();
const { h, render } = await import("preact");
const { WidgetSurface } = await import("./.mjs-cache/surface.mjs");
const { WidgetRegistry } = await import("./.mjs-cache/registry.mjs");
const { normalizeBoard } = await import("./.mjs-cache/model.mjs");
const { createHost } = await import("./.mjs-cache/host.mjs");
const { TFile, TFolder, MarkdownRenderer } = await import("./.mjs-cache/obsidian.mjs");
const { readBody } = await import("./.mjs-cache/block-writer.mjs");

const adapter = {
	exists: async (p) => fs.existsSync(path.join(VAULT, p)),
	list: async (p) => {
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
		.map((name) => fileAt(`${folder}/${name}`, () => withoutDates(frontmatter(fs.readFileSync(path.join(VAULT, folder, name), "utf8")))));
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
				try { folders.set(target, Object.assign(new TFolder(), { path: target, children: vaultFiles(target) })); }
				catch { folders.set(target, null); }
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
		on: () => ({}), off: () => {},
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

const KANBAN = "@orbitask/kanban-board";
const DIALOG = "@orbitask/task-dialog";

let board = normalizeBoard({
	tiles: [
		{ id: "board", widget: KANBAN, settings: { columns: "To Do, Doing, Done" }, sources: { tasks: { path: FOLDER } } },
		{ id: "dialog", widget: DIALOG, sources: { tasks: { path: FOLDER } } },
	],
	properties: ["Status", "Priority", "Progress", "Assignees", "Deadline", "Client"],
	context: { board: "Marketing Team" },
	layouts: { 20: { places: [{ id: "board", x: 0, y: 0, w: 20, h: 10 }, { id: "dialog", x: 0, y: 10, w: 3, h: 1 }] } },
});

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
	for (let i = 0; i < times; i += 1) await new Promise((resolve) => setTimeout(resolve, 1));
};

let failed = 0;
let checks = 0;
const check = (label, got, want) => {
	checks += 1;
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${label}${ok ? "" : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`}`);
};

const body = dom.window.document.body;
const dialog = () => body.querySelector(".orbi-task-dialog");
const all = (selector) => [...(dialog()?.querySelectorAll(selector) ?? [])];
const click = async (node) => { node.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); await settle(); };
const cards = () => [...root.querySelectorAll(".orbi-kanban .ok-card-slot")];
const rowNamed = (name) => all(".otd-row").find((node) => node.querySelector(".otd-name")?.textContent.trim() === name);
const rowNames = () => all(".otd-row .otd-name").map((node) => node.textContent.trim());
const valueOf = (name) => rowNamed(name)?.querySelector(".otd-value")?.textContent.trim();
// CONTEXT: a dismissed panel keeps is-open while it folds away, and jsdom ends no transition
const panel = () => body.querySelector(".wg-kit-pop.is-open:not(.is-exiting)");
const items = () => [...(panel()?.querySelectorAll(".wg-kit-pop-item") ?? [])];
const itemNamed = (text) => items().find((node) => node.textContent.trim().toLowerCase().startsWith(text.toLowerCase()));
const openRow = async (name) => click(rowNamed(name));
const modes = () => [...(dialog()?.querySelectorAll(".otd-desc-head .wg-kit-seg button") ?? [])];
const modeNamed = (label) => modes().find((node) => node.textContent.trim() === label);
const chosenMode = () => modes().find((node) => node.getAttribute("aria-selected") === "true")?.textContent.trim();
const editor = () => dialog()?.querySelector("textarea.wg-kit-md-input");
const mirror = () => dialog()?.querySelector(".wg-kit-md-mirror");
const drawn = () => MarkdownRenderer.calls[MarkdownRenderer.calls.length - 1];
const typeBody = async (text) => {
	editor().value = text;
	editor().dispatchEvent(new dom.window.Event("input", { bubbles: true }));
	await settle();
};
// CONTEXT: preact/compat renames onBlur to onfocusout for the whole app, src/surface.js:2
const leaveBody = async () => {
	editor().dispatchEvent(new dom.window.FocusEvent("focusout", { bubbles: true }));
	await settle(80);
};
const wroteLast = () => written[written.length - 1] ?? { props: {} };
const toneOfPill = (name) => (rowNamed(name).querySelector(".wg-kit-pill")?.className ?? "").replace("wg-kit-pill", "").trim();

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
	const strip = (node) => [...node.querySelectorAll(".orbi-task-card-meta .orbi-task-card-meta-item")].map((item) => item.textContent.trim());
	const named = (title) => cards().find((node) => node.querySelector(".orbi-task-card-title")?.textContent.trim() === title);

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

	check("no checklist, because there is no checklist", strip(named(DATED)).some((text) => /^\d+\/\d+$/.test(text)), false);
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

	await putBack();
	check("and the note is left exactly as this section found it", fileAt(datedPath, () => ({})).props, was);
}



const first = cards()[0];
const openedCard = first.textContent.trim();
await click(first);
check("pressing a card opens the dialog", Boolean(dialog()), true);
check("and it carries that note's own title", openedCard.includes(dialog().querySelector(".otd-title").textContent.trim()), true);
check("the strip says what the window is", dialog().querySelector(".otd-where").textContent.trim().startsWith("Task"), true);
check("and which board the task sits on", dialog().querySelector(".otd-where").textContent.includes("Marketing Team"), true);
const shownTitle = dialog().querySelector(".otd-title").textContent.trim();
const openPath = vaultFiles(FOLDER).find((file) => (file.props.title ?? file.basename) === shownTitle).path;
check("opening it reads ONE note's text, the one on screen", reads, [openPath]);

console.log("\n— the list of properties belongs to the board —");
check("the tile carries no list of its own", "properties" in board.tiles.find((tile) => tile.id === "dialog").settings, false);
check("the board carries it instead", board.properties, ["Status", "Priority", "Progress", "Assignees", "Deadline", "Client"]);

console.log("\n— the plate is the BOARD's list, in the board's order —");
check("one row per name the board declares", rowNames(), ["Status", "Priority", "Progress", "Assignees", "Deadline", "Client"]);
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
check("pressing it offers the board's own columns", items().map((node) => node.textContent.trim()).slice(0, 3), ["To Do", "Doing", "Done"]);
check("with the column this task is in ticked", items().filter((node) => node.getAttribute("aria-checked") === "true").length, 1);
await click(itemNamed("To Do"));
check("picking one writes the note", wroteLast().props.status, "To Do");
check("under the key the note already spells", "status" in wroteLast().props, true);
check("and the row follows", String(valueOf("Status")).startsWith("To Do"), true);

console.log("\n— filling an unset row is what creates it on the note —");
check("the note carries no deadline of any spelling", Object.keys(wroteLast().props).some((key) => key.toLowerCase() === "deadline"), false);
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
// CONTEXT: preact/compat renames onBlur to onfocusout for the whole app, src/surface.js:2
field.dispatchEvent(new dom.window.FocusEvent("focusout", { bubbles: true }));
await settle();
check("leaving the field writes it", wroteLast().props.Client, "Internal");

console.log("\n— the description: the note's own text, in the two modes it is worth reading in —");
const wasOnDisk = textOf(held.get(openPath));
const bodyOnDisk = readBody(wasOnDisk);
check("the description offers both modes", modes().map((node) => node.textContent.trim()), ["Preview", "Detail"]);
check("and opens on the one that reads", chosenMode(), "Preview");
check("preview is Obsidian's own rendering, not ours", Boolean(drawn()), true);
check("handed the note's body", drawn().markdown, bodyOnDisk);
check("into the element the widget owns", drawn().el === dialog().querySelector(".otd-md"), true);

await click(modeNamed("Detail"));
check("detail hands over the raw note", editor().value, bodyOnDisk);
const EDITED = "## Why one surface\n\n**bold** text and a [[link]]";
await typeBody(EDITED);
check("nothing is hidden — the markers stay on screen", mirror().textContent.includes("## Why one surface"), true);
check("a heading is only made heavier", Boolean(mirror().querySelector(".is-heading")), true);
check("bold markup is only made bolder", Boolean(mirror().querySelector(".is-strong")), true);
check("a link takes the accent", Boolean(mirror().querySelector(".is-link")), true);

await leaveBody();
check("leaving the editor writes the body", readBody(texts.get(openPath)), EDITED);
check("and the note's properties are left exactly as they were", texts.get(openPath).startsWith(wasOnDisk.slice(0, wasOnDisk.length - bodyOnDisk.length)), true);
await click(modeNamed("Preview"));
check("preview draws what was just saved", drawn().markdown, EDITED);

console.log("\n— the anchor ignores case, on the whole name and nothing less —");
const listBecomes = async (properties) => {
	// CONTEXT: through the model, so the list under test is one the file could actually hold
	board = normalizeBoard({ ...board, properties });
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
check("and says what the name will make, while it is typed", body.querySelector(".otd-hint").textContent.includes("a date"), true);
await typeName("Repo");
check("a name it does not know says so too", body.querySelector(".otd-hint").textContent.includes("plain text"), true);
naming.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
await settle();
const dialogSettings = () => board.tiles.find((tile) => tile.id === "dialog").settings;
check("committing puts the name last on the board's list", board.properties.slice(-1)[0], "Repo");
check("and it landed on the BOARD, not on the tile that wrote it", "properties" in dialogSettings(), false);
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


console.log("\n— a body the file cannot hold is refused, and the dialog says so —");
// CONTEXT: its own board, because a note that opens straight into its body carries no board to filter on
render(null, root);
let plain = normalizeBoard({
	tiles: [
		{ id: "board", widget: KANBAN, settings: { columns: "To Do" }, sources: { tasks: { path: PLAIN } } },
		{ id: "dialog", widget: DIALOG, sources: { tasks: { path: PLAIN } } },
	],
	properties: ["Status"],
	layouts: { 20: { places: [{ id: "board", x: 0, y: 0, w: 20, h: 10 }, { id: "dialog", x: 0, y: 10, w: 3, h: 1 }] } },
});
const drawPlain = () =>
	render(
		h(WidgetSurface, {
			board: plain, registry, host, editing: false, screen: true, initialWidth: 1280,
			onChange: (next) => { plain = next; drawPlain(); },
			onToggleEditing: () => {}, onWidth: () => {},
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
	check("Enter applies the first match", tags().some((text) => text.startsWith("#urgent")), true);

	const worn = dialog().querySelector(".otd-tags .otd-tag");
	check("and the tag it wrote carries a cross", Boolean(worn.querySelector(".otd-tag-drop")), true);
	const before = tags().length;
	await click(worn.querySelector(".otd-tag-drop"));
	check("pressing it takes the tag off", tags().length, before - 1);
	const written_ = wroteLast().props.tags ?? [];
	check("and the note no longer names it", (Array.isArray(written_) ? written_ : String(written_).split(",")).includes("urgent"), false);
}


console.log(failed ? `\n${failed} of ${checks} failed` : `\n${checks} checks: the board's list is the task's rows`);
process.exit(failed ? 1 : 0);
