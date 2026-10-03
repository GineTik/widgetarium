import { JSDOM } from "jsdom";
import { fakeVault } from "./fake-vault.ts";
import type { SourceDisk } from "../packages/core/src/engine/widget-source.js";
import { fieldAt, fieldIn, textIn } from "./held-fields.ts";
import { present } from "./page-dom.ts";
import { callAsUntypedSource } from "./untyped-source.ts";

const dom = new JSDOM(`<!doctype html><body><div id="host"></div></body>`, { pretendToBeVisual: true });
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
	PointerEvent: Reflect.get(dom.window, "PointerEvent"),
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

const { contentHash } = await import("../packages/core/src/engine/content-hash.js");
const { readIndex, mergeCatalogue, isInstalled } = await import("../packages/core/src/engine/catalogue-index.js");
const { readLock, lockEntry, withEntry, withoutEntry, isEdited } =
	await import("../packages/core/src/engine/widget-lock.js");
const { readRepository, commitUrl, rawUrl, folderFor } = await import("../packages/core/src/engine/github.js");
const { createInstaller, INDEX_PATH } = await import("../packages/core/src/installer.js");
const { updateOffered } = await import("../packages/core/src/catalogue-entries.js");

let failed = 0;
function check(name: string, got: unknown, want: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
}

check("the same text hashes the same", contentHash("widget"), contentHash("widget"));
check("a changed text hashes differently", contentHash("widget") === contentHash("widgets"), false);
const long = contentHash("x".repeat(20000));
check(
	"a long file's hash is still an exact integer",
	Number(long) < Number.MAX_SAFE_INTEGER && Number.isInteger(Number(long)),
	true,
);

const INDEX = {
	widgets: [
		{
			id: "@demo/clock",
			title: "Clock",
			repository: "https://github.com/acme/widgets",
			ref: "main",
			path: "widgets/@demo/clock",
			files: ["manifest.generated.json", "widget.tsx"],
			defaultSize: { w: 3, h: 2 },
		},
		{ id: "@default/task-card", title: "Impostor", repository: "https://github.com/acme/widgets" },
		{ title: "nameless" },
	],
};
const listed = readIndex(INDEX);
const firstListed = present(listed[0], "the first listed widget");
check(
	"an entry with no id is not an entry",
	listed.map((entry) => entry.manifest.id),
	["@demo/clock", "@default/task-card"],
);
check(
	"everything the index offers is marked not installed",
	listed.every((entry) => isInstalled(entry) === false),
	true,
);
check(
	"a local widget wins over an index entry of the same id",
	callAsUntypedSource(mergeCatalogue, [{ manifest: { id: "@default/task-card", title: "Mine" } }], listed).map(
		(entry: unknown) => fieldAt(entry, "manifest", "title"),
	),
	["Mine", "Clock"],
);
check("and the index still brings what the vault does not have", mergeCatalogue([], listed).length, 2);

check("a github url reads as owner and repo", readRepository("https://github.com/acme/widgets"), {
	owner: "acme",
	repo: "widgets",
});
check("a trailing .git and slash are not part of the name", readRepository("https://github.com/acme/widgets.git/"), {
	owner: "acme",
	repo: "widgets",
});
check(
	"anything else is not a repository",
	[readRepository("https://gitlab.com/a/b"), readRepository(""), readRepository(null)],
	[null, null, null],
);
check(
	"a ref is resolved through the commits endpoint",
	commitUrl({ owner: "acme", repo: "widgets" }, "main"),
	"https://api.github.com/repos/acme/widgets/commits/main",
);
check(
	"and files are taken at the commit, never at the ref",
	rawUrl({ owner: "acme", repo: "widgets" }, "abc123", "widgets/@demo/clock/widget.tsx"),
	"https://raw.githubusercontent.com/acme/widgets/abc123/widgets/@demo/clock/widget.tsx",
);
check(
	"a scoped id becomes its folder",
	folderFor(".widgetarium/widgets", "@demo/clock"),
	".widgetarium/widgets/@demo/clock",
);
check("an unscoped id has no folder", folderFor(".widgetarium/widgets", "clock"), null);

const entry = lockEntry({
	source: "https://github.com/acme/widgets",
	commit: "abc123",
	files: { "widget.tsx": "one" },
});
check("a lock entry pins the commit", entry.commit, "abc123");
check("and carries a hash per file", Object.keys(entry.files), ["widget.tsx"]);
check("an untouched widget does not read as edited", isEdited(entry, { "widget.tsx": "one" }), false);
check("an edited one does", isEdited(entry, { "widget.tsx": "two" }), true);
check("a missing file reads as edited, not as unchanged", isEdited(entry, {}), true);
check(
	"an entry goes in and comes out",
	Object.keys(withoutEntry(withEntry(readLock(null), "@demo/clock", entry), "@demo/clock").widgets),
	[],
);

const SERVED: Readonly<Record<string, unknown>> = {
	"https://api.github.com/repos/acme/widgets/commits/main": { sha: "abc1234567" },
	"https://raw.githubusercontent.com/acme/widgets/abc1234567/widgets/@demo/clock/manifest.generated.json":
		'{"id":"@demo/clock","title":"Clock"}',
	"https://raw.githubusercontent.com/acme/widgets/abc1234567/widgets/@demo/clock/widget.tsx":
		"export default () => null;",
};
const network = (
	served: Readonly<Record<string, unknown>>,
): { fetchJson: (url: string) => Promise<unknown>; fetchText: (url: string) => Promise<string> } => ({
	fetchJson: async (url) => {
		if (!(url in served)) throw new Error(`404 ${url}`);
		return served[url];
	},
	fetchText: async (url) => {
		if (!(url in served)) throw new Error(`404 ${url}`);
		return String(served[url]);
	},
});

const vault = fakeVault();
vault.files.set(INDEX_PATH, JSON.stringify(INDEX));
const installer = createInstaller({ adapter: vault, ...network(SERVED) });

check(
	"the installer reads the index off disk",
	(await installer.available()).map((entry) => entry.manifest["id"]),
	["@demo/clock", "@default/task-card"],
);
const done = await installer.install(firstListed);
check("installing answers with the commit it resolved", [done.ok, fieldIn(done, "commit")], [true, "abc1234567"]);
check(
	"and writes the files where the registry looks, the build in its own folder",
	[...vault.files.keys()].filter((path) => path.includes("@demo/clock")).sort(),
	[
		".widgetarium/widgets/@demo/clock/build/widget.js",
		".widgetarium/widgets/@demo/clock/manifest.generated.json",
		".widgetarium/widgets/@demo/clock/widget.tsx",
	],
);
check(
	"the lock pins that commit, not the ref",
	fieldAt((await installer.lock()).widgets, "@demo/clock", "commit"),
	"abc1234567",
);
check(
	"and records a hash for every file it took",
	Object.keys(Object(fieldAt((await installer.lock()).widgets, "@demo/clock", "files"))).sort(),
	["manifest.generated.json", "widget.tsx"],
);

const liar = fakeVault();
const lying = createInstaller({
	adapter: liar,
	...network({
		...SERVED,
		"https://raw.githubusercontent.com/acme/widgets/abc1234567/widgets/@demo/clock/manifest.generated.json":
			'{"id":"@evil/miner"}',
	}),
});
const refused = await lying.install(firstListed);
check("a repository serving another widget under a known id is refused", refused.ok, false);
check(
	"and says which id it actually served",
	refused.failure,
	'the repository served "@evil/miner" under "@demo/clock"',
);
check("and nothing of it reached the vault", liar.files.size, 0);

const noRepo = await installer.install({ manifest: { id: "@demo/x" } });
check("an entry naming no repository is refused", noRepo.failure, "this entry names no repository to fetch from");
const unscoped = await installer.install({ manifest: { id: "clock", repository: "https://github.com/acme/widgets" } });
check("an unscoped id is refused before any fetch", unscoped.failure, '"clock" is not a scoped widget id');
const noSource = await installer.install({
	manifest: { id: "@demo/y", repository: "https://github.com/acme/widgets", files: ["manifest.generated.json"] },
});
check("an entry listing no widget source is refused", noSource.failure, "the entry lists no widget source");

const bareVault = fakeVault();
const bareInstaller = createInstaller({ adapter: bareVault, ...network(SERVED) });
const bareDone = await bareInstaller.install({ manifest: { ...firstListed.manifest, files: ["widget.tsx"] } });
check("a widget served as nothing but its source installs", [bareDone.ok, bareDone.failure], [true, null]);
check(
	"and no record is invented beside it",
	[...bareVault.files.keys()].filter((path) => path.includes("@demo/clock")).sort(),
	[".widgetarium/widgets/@demo/clock/build/widget.js", ".widgetarium/widgets/@demo/clock/widget.tsx"],
);

const offline = createInstaller({ adapter: fakeVault(), ...network({}) });
const lost = await offline.install(firstListed);
check(
	"a network that answers nothing is a refusal, not a crash",
	[lost.ok, String(lost.failure).startsWith("404")],
	[false, true],
);

const shelf = fakeVault();
shelf.files.set("/repo/widgets/@default/lib.js", "export const RATE = 21;");
shelf.files.set("/repo/widgets/@default/tokens.css", ".habit-dot { }");
shelf.files.set(
	"/repo/widgets/@default/heatmap/manifest.generated.json",
	'{"id":"@default/heatmap","title":"Heatmap"}',
);
shelf.files.set("/repo/widgets/@default/heatmap/widget.tsx", "export default () => null;");
shelf.files.set("/repo/widgets/@habit/nothing/readme.md", "not a widget");
shelf.files.set(INDEX_PATH, JSON.stringify({ sources: [{ path: "/repo/widgets" }] }));

const onMachine: SourceDisk = {
	exists: async (at) => shelf.files.has(at) || [...shelf.files.keys()].some((held) => held.startsWith(`${at}/`)),
	read: async (at) => textIn(shelf.files.get(at), at),
	folders: async (at) => {
		const under = `${at}/`;
		const held = new Set<string>();
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
check(
	"a folder source is read, not listed by hand",
	onShelf.map((entry) => entry.manifest["id"]),
	["@default/heatmap"],
);
const firstOnShelf = present(onShelf[0], "the first shelved offer");
check("and what it offers is not installed", firstOnShelf.installed, false);
check(
	"an offer carries the code its card will draw",
	[typeof fieldAt(firstOnShelf, "sources", "widget.tsx"), fieldIn(firstOnShelf, "path")],
	["string", "/repo/widgets/@default/heatmap"],
);
check(
	"and the scope lib it cannot run without",
	[typeof fieldIn(firstOnShelf, "lib"), fieldIn(firstOnShelf, "scope")],
	["string", "@default"],
);
check("a folder with no manifest is not a widget", onShelf.length, 1);

const copied = await shelved.install(firstOnShelf);
check("installing from a folder needs no network", copied.ok, true);
check(
	"and what it records instead of a commit is a stamp of the files",
	fieldIn(copied, "commit"),
	fieldIn(firstOnShelf, "commit"),
);

shelf.files.set("/repo/widgets/@default/heatmap/widget.tsx", "export default () => null; // one line more");
const offeredAgain = present((await shelved.discover({ path: "/repo/widgets" }))[0], "the offer again");
check(
	"a folder whose widget changed offers a different stamp",
	offeredAgain.commit === fieldIn(firstOnShelf, "commit"),
	false,
);
check(
	"and that is what tells the catalogue an update is out",
	updateOffered(offeredAgain.manifest, offeredAgain, await shelved.lock()),
	{
		here: String(fieldIn(copied, "commit")).slice(0, 7),
		there: String(offeredAgain.commit).slice(0, 7),
	},
);
shelf.files.set("/repo/widgets/@default/heatmap/widget.tsx", "export default () => null;");
check(
	"and the same files offer the same stamp again",
	(await shelved.discover({ path: "/repo/widgets" }))[0]?.commit,
	fieldIn(firstOnShelf, "commit"),
);
check(
	"and puts the widget where the registry looks",
	[...shelf.files.keys()].filter((path) => path.startsWith(".widgetarium/widgets/@default/heatmap")).sort(),
	[
		".widgetarium/widgets/@default/heatmap/build/widget.js",
		".widgetarium/widgets/@default/heatmap/manifest.generated.json",
		".widgetarium/widgets/@default/heatmap/widget.tsx",
	],
);
check(
	"the scope comes along with it",
	[
		shelf.files.has(".widgetarium/widgets/@default/lib.js"),
		shelf.files.has(".widgetarium/widgets/@default/tokens.css"),
	],
	[true, true],
);
check(
	"and the lock records where it came from",
	fieldAt((await shelved.lock()).widgets, "@default/heatmap", "source"),
	"/repo/widgets",
);

const bare = await shelved.install({
	manifest: { id: "@habit/ghost" },
	from: { folder: "/repo/widgets/@habit/ghost" },
});
check(
	"a folder that holds no widget source is refused",
	bare.failure,
	"/repo/widgets/@habit/ghost holds no widget source",
);

const noDoor = createInstaller({ adapter: fakeVault(), ...network({}) });
check(
	"a build with no door to the machine offers no folder source",
	(await noDoor.discover({ path: "/repo/widgets" })).length,
	0,
);
const refusedCopy = await noDoor.install({
	manifest: { id: "@default/heatmap" },
	from: { folder: "/repo/widgets/@default/heatmap" },
});
check(
	"and refuses to install from one, rather than writing nothing quietly",
	refusedCopy.failure,
	"this build cannot read a folder outside the vault",
);

const gone = await installer.uninstall("@demo/clock");
check("uninstalling answers ok", gone.ok, true);
check(
	"and takes the files with it",
	[...vault.files.keys()].some((path) => path.includes("@demo/clock")),
	false,
);
check("and the lock entry too", Object.keys((await installer.lock()).widgets), []);
const mine = await installer
	.uninstall("@default/task-card")
	.catch((failure: unknown) => ({ threw: failure instanceof Error ? failure.message : String(failure) }));
check(
	"a widget the person wrote is never ours to remove",
	fieldIn(mine, "failure"),
	"that widget was not installed from a repository",
);

console.log(failed === 0 ? "\ninstall: clean" : `\ninstall: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
