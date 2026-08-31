// FETCHING SOMEBODY'S CODE, proved without a network: the installer's only two doors outward are
// handed in, so a test drives them itself and every refusal is a value, never a thrown error.
import { JSDOM } from "jsdom";
import { buildMirror } from "./mirror.mjs";

const dom = new JSDOM(`<!doctype html><body><div id="host"></div></body>`, { pretendToBeVisual: true });
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "KeyboardEvent", "MouseEvent", "PointerEvent", "Event", "MutationObserver"]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
globalThis.window.ResizeObserver = globalThis.ResizeObserver;
Object.defineProperty(dom.window.HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 1280 });

buildMirror();
const { h, render } = await import("preact");
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
function fakeVault() {
	const files = new Map();
	return {
		files,
		exists: async (path) => files.has(path) || [...files.keys()].some((held) => held.startsWith(`${path}/`)),
		read: async (path) => files.get(path),
		write: async (path, text) => { files.set(path, text); },
		mkdir: async () => {},
		remove: async (path) => { files.delete(path); },
		rmdir: async (path) => { for (const held of [...files.keys()]) if (held.startsWith(`${path}/`)) files.delete(held); },
	};
}

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
check("and writes the files where the registry looks", [...vault.files.keys()].filter((path) => path.includes("@demo/clock")).sort(), [".widgetarium/widgets/@demo/clock/manifest.json", ".widgetarium/widgets/@demo/clock/widget.jsx"]);
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
const noManifest = await installer.install({ manifest: { id: "@demo/y", repository: "https://github.com/acme/widgets", files: ["widget.jsx"] } });
check("an entry that does not list its manifest is refused", noManifest.failure, "the entry does not list manifest.json");

const offline = createInstaller({ adapter: fakeVault(), ...network({}) });
const lost = await offline.install(listed[0]);
check("a network that answers nothing is a refusal, not a crash", [lost.ok, lost.failure.startsWith("404")], [false, true]);

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
const offered = readIndex({ widgets: [{ id: "@demo/clock", title: "Clock", repository: "https://github.com/acme/widgets", defaultSize: { w: 3, h: 2 } }] });

const panel = dom.window.document.getElementById("host");
const picked = [];
const installs = [];
let answer = { ok: true };
const draw = () =>
	render(
		h(Catalogue, {
			registry,
			host: null,
			mode: "place",
			available: offered,
			onPick: (id) => picked.push(id),
			onInstall: async (entry) => { installs.push(entry.manifest.id); return answer; },
		}),
		panel,
	);
draw();
await settle();

const all = (selector) => [...panel.querySelectorAll(selector)];
const named = (title) => all(".wg-cat-tile").find((tile) => tile.querySelector(".wg-cat-name").textContent === title);
const tabs = all(".wg-cat-shown button");

check("the catalogue offers both a filtered and a full list", tabs.map((node) => node.textContent), ["All", "Installed"]);
check("and starts on the full one", all(".wg-cat-tile").length, 2);
check("which carries what the vault has and what the index offers", all(".wg-cat-name").map((node) => node.textContent).sort(), ["Clock", "Task card"]);

// CONTEXT: the card must not betray which of the two it is — that was the rejected distinction
const shapeOf = (tile) => `${tile.className}|${tile.getAttribute("aria-label")}|${[...tile.querySelectorAll("button")].filter((node) => !node.closest(".wg-cat-pic")).length}`;
check("an offered widget's card looks exactly like an installed one's", shapeOf(named("Clock")).replace("Clock", "X"), shapeOf(named("Task card")).replace("Task card", "X"));

tabs[1].dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
await settle();
check("Installed narrows to what the vault actually has", all(".wg-cat-name").map((node) => node.textContent), ["Task card"]);
tabs[0].dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
await settle();
check("and All brings the rest back", all(".wg-cat-tile").length, 2);

named("Task card").dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
await settle();
check("pressing one the vault has picks it and fetches nothing", [picked, installs], [["@task/task-card"], []]);

named("Clock").dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
await settle();
check("pressing one it does not have fetches it first", installs, ["@demo/clock"]);
check("and then picks it, on the same press", picked, ["@task/task-card", "@demo/clock"]);

answer = { ok: false, failure: "the repository answered 404" };
named("Clock").dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
await settle();
check("a fetch that failed says so on the card", named("Clock").querySelector(".wg-cat-lack.is-failure")?.textContent, "the repository answered 404");
check("and picks nothing", picked, ["@task/task-card", "@demo/clock"]);

render(null, panel);
console.log(failed === 0 ? "\ninstall: clean" : `\ninstall: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
