// FETCHING SOMEBODY'S CODE, proved without a network: the installer's only two doors outward are
// handed in, so a test drives them itself and every refusal is a value, never a thrown error.
import { JSDOM } from "jsdom";
import { buildMirror } from "./mirror.mjs";
import { fakeVault } from "./fake-vault.mjs";

const dom = new JSDOM(`<!doctype html><body><div id="host"></div></body>`, { pretendToBeVisual: true });
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "KeyboardEvent", "MouseEvent", "PointerEvent", "Event", "MutationObserver"]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
globalThis.window.ResizeObserver = globalThis.ResizeObserver;
Object.defineProperty(dom.window.HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 1280 });

buildMirror();
const { createElement: h } = await import("react");
const { render } = await import("./.mjs-cache/engine/render.mjs");
const { contentHash } = await import("./.mjs-cache/engine/content-hash.mjs");
const { readIndex, mergeCatalogue, isInstalled } = await import("./.mjs-cache/engine/catalogue-index.mjs");
const { readLock, lockEntry, withEntry, withoutEntry, isEdited } = await import("./.mjs-cache/engine/widget-lock.mjs");
const { readRepository, commitUrl, rawUrl, folderFor } = await import("./.mjs-cache/engine/github.mjs");
const { createInstaller, INDEX_PATH, LOCK_PATH } = await import("./.mjs-cache/installer.mjs");
const { Catalogue } = await import("./.mjs-cache/catalogue.mjs");

let failed = 0;
function check(name, got, want) {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
}
const settle = () => new Promise((resolve) => setTimeout(resolve, 30));

// ── the hash, whose failure mode is silence ──────────────────────────────────────────────
check("the same text hashes the same", contentHash("widget"), contentHash("widget"));
check("a changed text hashes differently", contentHash("widget") === contentHash("widgets"), false);
const long = contentHash("x".repeat(20000));
check("a long file's hash is still an exact integer", Number(long) < Number.MAX_SAFE_INTEGER && Number.isInteger(Number(long)), true);

// ── the index, which is a second LIST and never a second inventory ───────────────────────
const INDEX = {
	widgets: [
		{ id: "@demo/clock", title: "Clock", repository: "https://github.com/acme/widgets", ref: "main", path: "widgets/@demo/clock", files: ["manifest.json", "widget.jsx"], defaultSize: { w: 3, h: 2 } },
		{ id: "@task/task-card", title: "Impostor", repository: "https://github.com/acme/widgets" },
		{ title: "nameless" },
	],
};
const listed = readIndex(INDEX);
check("an entry with no id is not an entry", listed.map((entry) => entry.manifest.id), ["@demo/clock", "@task/task-card"]);
check("everything the index offers is marked not installed", listed.every((entry) => isInstalled(entry) === false), true);
check("a local widget wins over an index entry of the same id", mergeCatalogue([{ manifest: { id: "@task/task-card", title: "Mine" } }], listed).map((entry) => entry.manifest.title), ["Mine", "Clock"]);
check("and the index still brings what the vault does not have", mergeCatalogue([], listed).length, 2);

// ── the repository URLs, built in one place ──────────────────────────────────────────────
check("a github url reads as owner and repo", readRepository("https://github.com/acme/widgets"), { owner: "acme", repo: "widgets" });
check("a trailing .git and slash are not part of the name", readRepository("https://github.com/acme/widgets.git/"), { owner: "acme", repo: "widgets" });
check("anything else is not a repository", [readRepository("https://gitlab.com/a/b"), readRepository(""), readRepository(null)], [null, null, null]);
check("a ref is resolved through the commits endpoint", commitUrl({ owner: "acme", repo: "widgets" }, "main"), "https://api.github.com/repos/acme/widgets/commits/main");
check("and files are taken at the commit, never at the ref", rawUrl({ owner: "acme", repo: "widgets" }, "abc123", "widgets/@demo/clock/widget.jsx"), "https://raw.githubusercontent.com/acme/widgets/abc123/widgets/@demo/clock/widget.jsx");
check("a scoped id becomes its folder", folderFor(".widgetarium/widgets", "@demo/clock"), ".widgetarium/widgets/@demo/clock");
check("an unscoped id has no folder", folderFor(".widgetarium/widgets", "clock"), null);

// ── the lockfile ─────────────────────────────────────────────────────────────────────────
const entry = lockEntry({ source: "https://github.com/acme/widgets", commit: "abc123", files: { "widget.jsx": "one" } });
check("a lock entry pins the commit", entry.commit, "abc123");
check("and carries a hash per file", Object.keys(entry.files), ["widget.jsx"]);
check("an untouched widget does not read as edited", isEdited(entry, { "widget.jsx": "one" }), false);
check("an edited one does", isEdited(entry, { "widget.jsx": "two" }), true);
check("a missing file reads as edited, not as unchanged", isEdited(entry, {}), true);
check("an entry goes in and comes out", Object.keys(withoutEntry(withEntry(readLock(null), "@demo/clock", entry), "@demo/clock").widgets), []);

// ── the installer, driven by a fake vault and a fake network ─────────────────────────────

const SERVED = {
	"https://api.github.com/repos/acme/widgets/commits/main": { sha: "abc1234567" },
	"https://raw.githubusercontent.com/acme/widgets/abc1234567/widgets/@demo/clock/manifest.json": '{"id":"@demo/clock","title":"Clock"}',
	"https://raw.githubusercontent.com/acme/widgets/abc1234567/widgets/@demo/clock/widget.jsx": "export default () => null;",
};
const network = (served) => ({
	fetchJson: async (url) => { if (!(url in served)) throw new Error(`404 ${url}`); return served[url]; },
	fetchText: async (url) => { if (!(url in served)) throw new Error(`404 ${url}`); return served[url]; },
});

const vault = fakeVault();
vault.files.set(INDEX_PATH, JSON.stringify(INDEX));
const installer = createInstaller({ adapter: vault, ...network(SERVED) });

check("the installer reads the index off disk", (await installer.available()).map((entry) => entry.manifest.id), ["@demo/clock", "@task/task-card"]);
const done = await installer.install(listed[0]);
check("installing answers with the commit it resolved", [done.ok, done.commit], [true, "abc1234567"]);
check("and writes the files where the registry looks, the build beside the source", [...vault.files.keys()].filter((path) => path.includes("@demo/clock")).sort(), [".widgetarium/widgets/@demo/clock/manifest.json", ".widgetarium/widgets/@demo/clock/widget.js", ".widgetarium/widgets/@demo/clock/widget.jsx"]);
check("the lock pins that commit, not the ref", (await installer.lock()).widgets["@demo/clock"].commit, "abc1234567");
check("and records a hash for every file it took", Object.keys((await installer.lock()).widgets["@demo/clock"].files).sort(), ["manifest.json", "widget.jsx"]);

// THE ONE ATTACK THIS CATALOGUE CAN ACTUALLY SEE: a repository serving something else under an
// id the index promised. Nothing may reach disk before that is checked.
const liar = fakeVault();
const lying = createInstaller({ adapter: liar, ...network({ ...SERVED, "https://raw.githubusercontent.com/acme/widgets/abc1234567/widgets/@demo/clock/manifest.json": '{"id":"@evil/miner"}' }) });
const refused = await lying.install(listed[0]);
check("a repository serving another widget under a known id is refused", refused.ok, false);
check("and says which id it actually served", refused.failure, 'the repository served "@evil/miner" under "@demo/clock"');
check("and nothing of it reached the vault", liar.files.size, 0);

const noRepo = await installer.install({ manifest: { id: "@demo/x" } });
check("an entry naming no repository is refused", noRepo.failure, "this entry names no repository to fetch from");
const unscoped = await installer.install({ manifest: { id: "clock", repository: "https://github.com/acme/widgets" } });
check("an unscoped id is refused before any fetch", unscoped.failure, '"clock" is not a scoped widget id');
const noSource = await installer.install({ manifest: { id: "@demo/y", repository: "https://github.com/acme/widgets", files: ["manifest.json"] } });
check("an entry listing no widget source is refused", noSource.failure, "the entry lists no widget source");

const bareVault = fakeVault();
const bareInstaller = createInstaller({ adapter: bareVault, ...network(SERVED) });
const bareDone = await bareInstaller.install({ manifest: { ...listed[0].manifest, files: ["widget.jsx"] } });
check("a widget served as nothing but its source installs", [bareDone.ok, bareDone.failure], [true, null]);
check("and no record is invented beside it", [...bareVault.files.keys()].filter((path) => path.includes("@demo/clock")).sort(), [".widgetarium/widgets/@demo/clock/widget.js", ".widgetarium/widgets/@demo/clock/widget.jsx"]);

const offline = createInstaller({ adapter: fakeVault(), ...network({}) });
const lost = await offline.install(listed[0]);
check("a network that answers nothing is a refusal, not a crash", [lost.ok, lost.failure.startsWith("404")], [false, true]);

// ── A SOURCE IS A PLACE: name a folder and the widgets in it are found by reading it ─────
const shelf = fakeVault();
shelf.files.set("/repo/widgets/@habit/lib.js", "export const RATE = 21;");
shelf.files.set("/repo/widgets/@habit/tokens.css", ".habit-dot { }");
shelf.files.set("/repo/widgets/@habit/heatmap/manifest.json", '{"id":"@habit/heatmap","title":"Heatmap"}');
shelf.files.set("/repo/widgets/@habit/heatmap/widget.jsx", "export default () => null;");
shelf.files.set("/repo/widgets/@habit/nothing/readme.md", "not a widget");
shelf.files.set(INDEX_PATH, JSON.stringify({ sources: [{ path: "/repo/widgets" }] }));

const onMachine = {
	exists: async (at) => shelf.files.has(at) || [...shelf.files.keys()].some((held) => held.startsWith(`${at}/`)),
	read: async (at) => shelf.files.get(at),
	folders: async (at) => {
		const under = `${at}/`;
		const held = new Set();
		for (const each of shelf.files.keys()) {
			if (!each.startsWith(under)) continue;
			const rest = each.slice(under.length);
			if (rest.includes("/")) held.add(under + rest.slice(0, rest.indexOf("/")));
		}
		return [...held];
	},
};
const shelved = createInstaller({ adapter: shelf, disk: onMachine, ...network({}) });
const onShelf = await shelved.available();
check("a folder source is read, not listed by hand", onShelf.map((entry) => entry.manifest.id), ["@habit/heatmap"]);
check("and what it offers is not installed", onShelf[0].installed, false);
// A CARD DRAWS THE WIDGET, INSTALLED OR NOT: the code has to travel with the offer
check("an offer carries the code its card will draw", [typeof onShelf[0].code, onShelf[0].path], ["string", "/repo/widgets/@habit/heatmap/widget.jsx"]);
check("and the scope lib it cannot run without", [typeof onShelf[0].lib, onShelf[0].scope], ["string", "@habit"]);
check("a folder with no manifest is not a widget", onShelf.length, 1);

const copied = await shelved.install(onShelf[0]);
check("installing from a folder needs no network", [copied.ok, copied.commit], [true, "local"]);
check("and puts the widget where the registry looks", [...shelf.files.keys()].filter((path) => path.startsWith(".widgetarium/widgets/@habit/heatmap")).sort(), [".widgetarium/widgets/@habit/heatmap/manifest.json", ".widgetarium/widgets/@habit/heatmap/widget.js", ".widgetarium/widgets/@habit/heatmap/widget.jsx"]);
// A WIDGET IMPORTING ITS SCOPE'S LIB IS BROKEN WITHOUT IT
check("the scope comes along with it", [shelf.files.has(".widgetarium/widgets/@habit/lib.js"), shelf.files.has(".widgetarium/widgets/@habit/tokens.css")], [true, true]);
check("and the lock records where it came from", (await shelved.lock()).widgets["@habit/heatmap"].source, "/repo/widgets");

const bare = await shelved.install({ manifest: { id: "@habit/ghost" }, from: { folder: "/repo/widgets/@habit/ghost" } });
check("a folder that holds no widget source is refused", bare.failure, "/repo/widgets/@habit/ghost holds no widget source");

const noDoor = createInstaller({ adapter: fakeVault(), ...network({}) });
check("a build with no door to the machine offers no folder source", (await noDoor.discover({ path: "/repo/widgets" })).length, 0);
const refusedCopy = await noDoor.install({ manifest: { id: "@habit/heatmap" }, from: { folder: "/repo/widgets/@habit/heatmap" } });
check("and refuses to install from one, rather than writing nothing quietly", refusedCopy.failure, "this build cannot read a folder outside the vault");

const gone = await installer.uninstall("@demo/clock");
check("uninstalling answers ok", gone.ok, true);
check("and takes the files with it", [...vault.files.keys()].some((path) => path.includes("@demo/clock")), false);
check("and the lock entry too", Object.keys((await installer.lock()).widgets), []);
// CONTEXT: caught on purpose — a refusal that throws must read as a wrong VALUE, not as a crash
const mine = await installer.uninstall("@task/task-card").catch((failure) => ({ threw: String(failure?.message ?? failure) }));
check("a widget the person wrote is never ours to remove", mine.failure, "that widget was not installed from a repository");

// ── the toggle, over one merged list ─────────────────────────────────────────────────────
const definition = (id, title) => ({ manifest: { id, title, defaultSize: { w: 3, h: 2 } }, component: () => h("div", null, title) });
const registry = { list: () => [definition("@task/task-card", "Task card")], get: (id) => (id === "@task/task-card" ? definition(id, "Task card") : null) };
const offered = readIndex({ widgets: [{ id: "@demo/clock", title: "Clock", repository: "https://github.com/acme/widgets", defaultSize: { w: 3, h: 2 } }, { id: "@task/task-card", title: "Task card", commit: "2222222222", repository: "https://github.com/acme/widgets", defaultSize: { w: 3, h: 2 } }] });

const panel = dom.window.document.getElementById("host");
const picked = [];
const installs = [];
let answer = { ok: true };
let settleInstall = null;
let stepTo = null;
const draw = (lock = null) =>
	render(
		h(Catalogue, {
			registry,
			host: null,
			mode: "place",
			available: offered,
			lock,
			onPick: (id) => picked.push(id),
			onInstall: async (entry, onStep) => {
				installs.push(entry.manifest.id);
				stepTo = onStep;
				if (!settleInstall) return answer;
				return new Promise((resolve) => {
					settleInstall = resolve;
				});
			},
		}),
		panel,
	);
draw();
await settle();

const all = (selector) => [...panel.querySelectorAll(selector)];
const named = (title) => all(".wg-cat-tile").find((tile) => tile.querySelector(".wg-cat-name").textContent === title);
const names = () => all(".wg-cat-name").map((node) => node.textContent).sort();
const press = (node) => node.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
const labelled = (selector) => all(selector).map((node) => node.querySelector(".wg-kit-row-label").textContent);
const packRow = (name) => all(".wg-cat-pack").find((node) => node.querySelector(".wg-kit-row-label").textContent === name);
const typeInto = (input, value) => {
	Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value").set.call(input, value);
	input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
};

check("the sidebar offers the three lists one merged catalogue can answer", labelled(".wg-cat-show"), ["All widgets", "Installed", "Update ready"]);
check("each counted from that one list", all(".wg-cat-show").map((node) => node.querySelector(".wg-kit-side-value").textContent), ["2", "1", "0"]);
check("and it starts on the full one", all(".wg-cat-tile").length, 2);
check("which carries what the vault has and what the index offers", names(), ["Clock", "Task card"]);

check("a widget the vault has wears the add", named("Task card").dataset.state, "add");
check("one that must be fetched wears the install", named("Clock").dataset.state, "install");
check("and the button carries that state too", named("Clock").querySelector(".wg-cat-go").className.includes("is-install"), true);
check("the two buttons are not the same", named("Clock").querySelector(".wg-cat-go").className === named("Task card").querySelector(".wg-cat-go").className, false);

press(panel.querySelector(".wg-cat-show.is-installed"));
await settle();
check("Installed narrows to what the vault actually has", names(), ["Task card"]);
press(panel.querySelector(".wg-cat-show.is-all"));
await settle();
check("and All brings the rest back", all(".wg-cat-tile").length, 2);

check("the packs are the ids' own halves, counted", labelled(".wg-cat-pack"), ["@demo", "@task"]);
press(packRow("@demo"));
await settle();
check("pressing a pack narrows the catalogue to it", names(), ["Clock"]);
press(packRow("@demo"));
await settle();
check("and pressing it again lets the rest back in", all(".wg-cat-tile").length, 2);

typeInto(panel.querySelectorAll(".wg-cat-facet-search input")[0], "task");
await settle();
check("the packs have a search of their own", labelled(".wg-cat-pack"), ["@task"]);
check("which narrows the packs and not the widgets", all(".wg-cat-tile").length, 2);
typeInto(panel.querySelectorAll(".wg-cat-facet-search input")[0], "");
await settle();

press(named("Task card"));
await settle();
check("pressing one the vault has picks it and fetches nothing", [picked, installs], [["@task/task-card"], []]);

settleInstall = () => {};
press(named("Clock"));
await settle();
check("a press that fetches turns the button into a ring", Boolean(named("Clock").querySelector(".wg-cat-ring")), true);
check("and the ring waits until a file count arrives", named("Clock").querySelector(".wg-cat-ring").className.baseVal.includes("is-waiting"), true);
stepTo({ done: 1, total: 3 });
await settle();
check("the card counts the files as they land", named("Clock").querySelector(".wg-cat-step").textContent, "Writing 1 of 3 files");
check("and the ring is measured now", named("Clock").querySelector(".wg-cat-ring").className.baseVal.includes("is-waiting"), false);
const held = settleInstall;
settleInstall = null;
held({ ok: true });
await settle();
check("a finished fetch picks it, on the same press", picked, ["@task/task-card", "@demo/clock"]);
check("and the counting line is gone", named("Clock").querySelector(".wg-cat-step"), null);

answer = { ok: false, failure: "the repository answered 404" };
press(named("Clock"));
await settle();
check("a fetch that failed says so on the card", named("Clock").querySelector(".wg-cat-lack.is-failure")?.textContent, "the repository answered 404");
check("and the button becomes the retry", named("Clock").dataset.state, "failed");
check("while nothing was picked", picked, ["@task/task-card", "@demo/clock"]);

render(null, panel);
draw({ widgets: { "@task/task-card": { commit: "1111111111" } } });
await settle();
check("a locked commit the index disagrees with is an update", named("Task card").dataset.state, "update");
check("which the card reads back", named("Task card").querySelector(".wg-cat-step").textContent, "1111111 here · 2222222 out");
check("and the Update ready list counts it", panel.querySelector(".wg-cat-show.is-update .wg-kit-side-value").textContent, "1");

render(null, panel);

const TAGGED = ["tabs", "board", "kanban", "habit", "streak", "chart", "calendar", "filter", "inline"];
const manyTags = {
	list: () => [
		{ manifest: { id: "@task/task-card", title: "Task card", defaultSize: { w: 3, h: 2 }, keywords: TAGGED }, component: () => h("div", null, "Task card") },
		{ manifest: { id: "@core/filter", title: "Filter", defaultSize: { w: 3, h: 1 }, keywords: ["filter"] }, component: () => h("div", null, "Filter") },
	],
	get: () => null,
};

Object.defineProperty(dom.window.HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 420 });
Object.defineProperty(dom.window.HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 720 });
render(h(Catalogue, { registry: manyTags, host: null, mode: "place", available: [], onPick: () => {}, onInstall: async () => ({ ok: true }) }), panel);
await settle();

check("at a phone's width the column becomes a sheet", [all(".wg-cat-side").length, all(".wg-cat-sheet").length], [0, 1]);
check("and the sheet is the kit's own, with the grip that drags it", Boolean(panel.querySelector(".wg-cat-sheet .wg-kit-sheet-grip")), true);
const sheet = panel.querySelector(".wg-cat-sheet");
const peeking = sheet.style.height;
sheet.querySelector(".wg-kit-sheet-grip").dispatchEvent(new dom.window.PointerEvent("pointerdown", { bubbles: true, clientY: 600 }));
sheet.querySelector(".wg-kit-sheet-grip").dispatchEvent(new dom.window.PointerEvent("pointerup", { bubbles: true, clientY: 600 }));
await settle();
check("a press on the grip raises it", panel.querySelector(".wg-cat-sheet").style.height !== peeking, true);
check("and the filters stand inside it", Boolean(panel.querySelector(".wg-cat-sheet .wg-cat-show")), true);

check("nine tags are capped to one row and a count of the rest", all(".wg-cat-tag").map((node) => node.textContent), ["filter", "board", "calendar", "chart", "habit", "inline", "+3"]);
press(panel.querySelector(".wg-cat-more-tags"));
await settle();
check("pressing that count shows every tag", all(".wg-cat-tag").length, TAGGED.length);

check("nothing offers to clear while nothing is narrowed", panel.querySelector(".wg-cat-clear"), null);
press(all(".wg-cat-tag").find((node) => node.textContent === "kanban"));
await settle();
check("a chosen tag narrows the catalogue", all(".wg-cat-tile").length, 1);
check("and offers to clear what it narrowed", Boolean(panel.querySelector(".wg-cat-clear")), true);
press(panel.querySelector(".wg-cat-clear"));
await settle();
check("Clear all puts every widget back", all(".wg-cat-tile").length, 2);
check("and stops offering itself", panel.querySelector(".wg-cat-clear"), null);

render(null, panel);
console.log(failed === 0 ? "\ninstall: clean" : `\ninstall: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
