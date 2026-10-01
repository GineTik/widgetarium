import { catalogueAdapter } from "./perf-fixture.ts";
import { isObject } from "../packages/core/src/engine/is-object.js";
import type { SourceDisk } from "../packages/core/src/engine/source-disk.js";
import type { WidgetSourcePlace } from "../packages/core/src/engine/source-offers.js";
import type { InstallerAdapter } from "../packages/core/src/installer-context.js";
import { standIn } from "./stand-in.ts";

const { createInstaller, INDEX_PATH } = await import("../packages/core/src/installer.js");

const GOOD_FOLDER = "/tmp/good-widgets";

const ON_THE_GOOD_FOLDER = new Set([
	GOOD_FOLDER,
	`${GOOD_FOLDER}/@a`,
	`${GOOD_FOLDER}/@a/b`,
	`${GOOD_FOLDER}/@a/b/manifest.generated.json`,
	`${GOOD_FOLDER}/@a/b/widget.tsx`,
]);

const pathIn = (value: unknown, ...keys: readonly string[]): unknown =>
	keys.reduce<unknown>((held, key) => (isObject(held) ? held[key] : undefined), value);

const oneWidgetOnDisk: SourceDisk = {
	exists: async (at) => ON_THE_GOOD_FOLDER.has(at),
	read: async () => JSON.stringify({ id: "@a/b", title: "B", api: 1 }),
	folders: async (at) => (at === GOOD_FOLDER ? [`${GOOD_FOLDER}/@a`] : [`${GOOD_FOLDER}/@a/b`]),
};

const installerOver = (
	catalogue: unknown,
	disk: SourceDisk | null = null,
	added: readonly WidgetSourcePlace[] = [],
	shipped: readonly WidgetSourcePlace[] = [],
) =>
	createInstaller({
		adapter: standIn<InstallerAdapter>(
			catalogueAdapter(catalogue, INDEX_PATH),
			["exists", "read"],
			"installer adapter",
		),
		fetchJson: async () => null,
		fetchText: async () => "",
		disk,
		readAdded: async () => added,
		shipped,
	});

const pathsIn = (catalogue: unknown) => installerOver(catalogue).folderSourcePaths();

let wrong = 0;

async function check(label: string, catalogue: unknown, wanted: unknown): Promise<void> {
	const found = await pathsIn(catalogue);
	const ok = JSON.stringify(found) === JSON.stringify(wanted);
	if (!ok) wrong += 1;
	console.log(`${ok ? "OK " : "BAD"} ${label} → ${JSON.stringify(found)}`);
}

await check("no catalogue at all", null, []);
await check("no sources key", {}, []);
await check("sources is not a list", { sources: "nonsense" }, []);
await check("a null source", { sources: [null] }, []);
await check("a source that is a bare string", { sources: ["/tmp/widgets"] }, []);
await check("a path that is not a string", { sources: [{ path: 42 }] }, []);
await check("an empty path", { sources: [{ path: "" }] }, []);
await check("a repository source only", { sources: [{ repository: "a/b" }] }, []);
await check("a folder source", { sources: [{ path: "/tmp/widgets" }] }, ["/tmp/widgets"]);
await check("a folder beside a repository", { sources: [{ repository: "a/b" }, { path: "/tmp/widgets" }] }, [
	"/tmp/widgets",
]);

async function offersSurvive(label: string, catalogue: unknown): Promise<void> {
	const offered: unknown = await installerOver(catalogue, oneWidgetOnDisk)
		.available()
		.catch((failure: unknown) => failure);
	const said = Array.isArray(offered) ? `${offered.length} offer(s)` : `threw ${String(offered)}`;
	const ok = Array.isArray(offered) && offered.length === 1 && pathIn(offered[0], "manifest", "id") === "@a/b";
	if (!ok) wrong += 1;
	console.log(`${ok ? "OK " : "BAD"} ${label} → ${said}`);
}

console.log("\na malformed source must not blank the catalogue beside it");
await offersSurvive("a good folder on its own", { sources: [{ path: GOOD_FOLDER }] });
await offersSurvive("a path that is a number, beside it", { sources: [{ path: 42 }, { path: GOOD_FOLDER }] });
await offersSurvive("a null source, beside it", { sources: [null, { path: GOOD_FOLDER }] });
await offersSurvive("a path that is an object, beside it", { sources: [{ path: {} }, { path: GOOD_FOLDER }] });

console.log("\na JavaScript widget in a folder source is not offered, and the log says why");
const JAVASCRIPT_FOLDER = "/tmp/javascript-widgets";
const javascriptOnDisk: SourceDisk = {
	exists: async (at) => [JAVASCRIPT_FOLDER, `${JAVASCRIPT_FOLDER}/@a/b/widget.jsx`].includes(at),
	read: async () => "export default () => null;",
	folders: async (at) => (at === JAVASCRIPT_FOLDER ? [`${JAVASCRIPT_FOLDER}/@a`] : [`${JAVASCRIPT_FOLDER}/@a/b`]),
};
const logged: string[] = [];
const wasError = console.error;
console.error = (...said: unknown[]): void => {
	logged.push(said.join(" "));
};
const javascriptOffers = await installerOver({ sources: [{ path: JAVASCRIPT_FOLDER }] }, javascriptOnDisk).available();
console.error = wasError;
const javascriptSaid = logged.some((line) => line.includes(`${JAVASCRIPT_FOLDER}/@a/b/widget.jsx is JavaScript`));
const javascriptOk = javascriptOffers.length === 0 && javascriptSaid;
if (!javascriptOk) wrong += 1;
console.log(`${javascriptOk ? "OK " : "BAD"} offered ${javascriptOffers.length}, refusal logged ${javascriptSaid}`);

const { sourcesOf, identityOf } = await import("../packages/core/src/sources.js");
const { SHIPPED_SOURCES } = await import("../packages/core/src/registries.js");

function same(label: string, found: unknown, wanted: unknown): void {
	const ok = JSON.stringify(found) === JSON.stringify(wanted);
	if (!ok) wrong += 1;
	console.log(`${ok ? "OK " : "BAD"} ${label} → ${JSON.stringify(found)}`);
}

console.log("\nthree homes, one list");
const ADDED = { repository: "https://github.com/me/mine", ref: "main", path: "widgets" };
const LEGACY = { path: "/tmp/legacy" };

const SHIPPED = { repository: "https://github.com/curated/pack", ref: "main", path: "widgets" };

same("what the plugin ships is a module, not a file in the vault", Array.isArray(SHIPPED_SOURCES), true);
same("a registry the person added is offered", sourcesOf({ added: [ADDED], legacy: null, shipped: [] }), [ADDED]);
same("the legacy vault file is still read", sourcesOf({ added: [], legacy: { sources: [LEGACY] }, shipped: [] }), [
	LEGACY,
]);
same("what shipped with the plugin is offered", sourcesOf({ added: [], legacy: null, shipped: [SHIPPED] }), [SHIPPED]);
same(
	"the person's own comes before what shipped",
	sourcesOf({ added: [ADDED], legacy: { sources: [LEGACY] }, shipped: [SHIPPED] }).map(identityOf),
	[identityOf(ADDED), identityOf(LEGACY), identityOf(SHIPPED)],
);
same(
	"one source named twice is read once",
	sourcesOf({ added: [ADDED], legacy: { sources: [{ ...ADDED }] }, shipped: [] }).length,
	1,
);
same(
	"the same repository at another ref is another source",
	sourcesOf({ added: [ADDED, { ...ADDED, ref: "next" }], legacy: null, shipped: [] }).length,
	2,
);
same(
	"an unreachable registry is dropped, not carried",
	sourcesOf({ added: [{ ref: "main" }], legacy: null, shipped: [] }),
	[],
);
same(
	"a ref that is not a name is refused rather than keyed as one",
	sourcesOf({ added: [{ ...ADDED, ref: { branch: "main" } }], legacy: null, shipped: [] }),
	[],
);
same(
	"the shipped list is handed in, so a test can drive it",
	await installerOver({}, null, [], [{ path: "/tmp/from-the-release" }]).folderSourcePaths(),
	["/tmp/from-the-release"],
);

const OTHER_FOLDER = "/tmp/other-widgets";
const ON_EITHER_FOLDER = new Set(
	[GOOD_FOLDER, OTHER_FOLDER].flatMap((root) => [
		root,
		`${root}/@a`,
		`${root}/@a/b`,
		`${root}/@a/b/manifest.generated.json`,
		`${root}/@a/b/widget.tsx`,
	]),
);
const sameWidgetInTwoFolders: SourceDisk = {
	exists: async (at) => ON_EITHER_FOLDER.has(at),
	read: async () => JSON.stringify({ id: "@a/b", title: "B", api: 1 }),
	folders: async (at) => (at === GOOD_FOLDER || at === OTHER_FOLDER ? [`${at}/@a`] : [`${at}/b`]),
};
const offeredOnce = await installerOver({ sources: [{ path: OTHER_FOLDER }] }, sameWidgetInTwoFolders, [
	{ path: GOOD_FOLDER },
]).available();
same("two sources offering one widget id answer once", offeredOnce.length, 1);
same("and the one nearer the person is the answer", offeredOnce[0]?.origin, GOOD_FOLDER);

const { createWidgetSource } = await import("../packages/core/src/engine/widget-source.js");
const { REGISTRY_FORMAT } = await import("../packages/core/src/version.js");

const REPOSITORY = "https://github.com/acme/widgets";
const SHA = "abc1234567";
const raw = `https://raw.githubusercontent.com/acme/widgets/${SHA}`;
const CLOCK_CARD = JSON.stringify({ id: "@demo/clock", title: "Clock from the manifest", keywords: ["time"] });

type Served = Readonly<Record<string, unknown>>;

const repositoryServing = (served: Served) =>
	createWidgetSource({
		fetchJson: async (url: string) => answerFrom(served, url),
		fetchText: async (url: string) => String(answerFrom(served, url)),
		disk: null,
	});

function answerFrom(served: Served, url: string): unknown {
	if (!(url in served)) throw new Error(`404 ${url}`);
	return served[url];
}

const withRegistry = (registry: unknown): Served => ({
	[`https://api.github.com/repos/acme/widgets/commits/main`]: { sha: SHA },
	[`${raw}/widgetarium-registry.json`]: JSON.stringify(registry),
	[`${raw}/widgets/@demo/clock/manifest.generated.json`]: CLOCK_CARD,
});

const ONE_ROW = {
	name: "Clocks and counters",
	author: "@you",
	widgets: [{ id: "@demo/clock", title: "Clock", path: "widgets/@demo/clock", files: ["widget.tsx", "widget.css"] }],
};

const askedFor = { repository: REPOSITORY, ref: "main" };
const offersOf = (served: Served) => repositoryServing(served).offersFrom(askedFor);

console.log("\na registry file is what a repository offers");
const fromRegistry = await offersOf(withRegistry(ONE_ROW));
same(
	"the rows of the registry are the offers",
	fromRegistry.map((entry) => entry.manifest["id"]),
	["@demo/clock"],
);
same("the files the row names are carried, so the install knows what to fetch", fromRegistry[0]?.manifest["files"], [
	"widget.tsx",
	"widget.css",
]);
same("the widget's own manifest fills the card", fromRegistry[0]?.manifest["keywords"], ["time"]);
same(
	"and the folder the row names is where it is fetched from",
	fromRegistry[0]?.manifest["path"],
	"widgets/@demo/clock",
);

console.log("\nthe offer carries the commit it was read at");
same("a repository offer names its commit", fromRegistry[0]?.commit, SHA);
same(
	"a widget whose manifest is missing is still offered from its row alone",
	(await offersOf({ ...withRegistry(ONE_ROW), [`${raw}/widgets/@demo/clock/manifest.generated.json`]: undefined }))[0]
		?.manifest["title"],
	"Clock",
);

console.log("\nthe registry declares a format, and a newer one is refused whole");
same("a registry with no format is read as the oldest", (await offersOf(withRegistry({ ...ONE_ROW }))).length, 1);
same(
	"a registry written for a newer plugin offers nothing",
	(await offersOf(withRegistry({ ...ONE_ROW, registry: REGISTRY_FORMAT + 1 }))).length,
	0,
);
same(
	"a format that is not a version number offers nothing",
	(await offersOf(withRegistry({ ...ONE_ROW, registry: "two" }))).length,
	0,
);
same(
	"the format this plugin writes is read",
	(await offersOf(withRegistry({ ...ONE_ROW, registry: REGISTRY_FORMAT }))).length,
	1,
);

console.log("\na repository with no registry file is read the way it always was");
const TREE_ONLY = {
	[`https://api.github.com/repos/acme/widgets/commits/main`]: { sha: SHA },
	[`https://api.github.com/repos/acme/widgets/git/trees/${SHA}?recursive=1`]: {
		tree: [{ path: "widgets/@demo/clock/manifest.generated.json" }],
	},
	[`${raw}/widgets/@demo/clock/manifest.generated.json`]: CLOCK_CARD,
};
const fromTree = await repositoryServing(TREE_ONLY).offersFrom({
	repository: REPOSITORY,
	ref: "main",
	path: "widgets",
});
same(
	"the tree still answers when no registry is there",
	fromTree.map((entry) => entry.manifest["id"]),
	["@demo/clock"],
);
same("and that offer names its commit too", fromTree[0]?.commit, SHA);

console.log("\na row names a place inside its own repository, and nothing else");
const rowNaming = (held: Readonly<Record<string, unknown>>) => ({
	...ONE_ROW,
	widgets: [{ ...ONE_ROW.widgets[0], ...held }],
});
const idsOffered = async (held: Readonly<Record<string, unknown>>): Promise<unknown[]> =>
	(await offersOf(withRegistry(rowNaming(held)))).map((entry) => entry.manifest["id"]);

same("a path stepping out of the repository is refused", await idsOffered({ path: "../../other/repo/widget" }), []);
same("a path starting at the root is refused", await idsOffered({ path: "/etc/passwd" }), []);
same("a path that is a URL of its own is refused", await idsOffered({ path: "https://evil.example/x" }), []);
same("a path with a backslash is refused", await idsOffered({ path: "widgets\\@demo\\clock" }), []);
same("a dot segment inside the path is refused", await idsOffered({ path: "widgets/../../@evil/miner" }), []);
same("a file name carrying a folder is refused", await idsOffered({ files: ["../../../../evil.js"] }), []);
same("a file name that is a dot is refused", await idsOffered({ files: [".."] }), []);
same("an ordinary nested path is still offered", await idsOffered({ path: "packs/widgets/@demo/clock" }), [
	"@demo/clock",
]);

console.log("\nand the install refuses the same, wherever the entry came from");
const installRefusing = (manifest: Readonly<Record<string, unknown>>) =>
	repositoryServing(withRegistry(ONE_ROW))
		.filesOf({ manifest: { repository: REPOSITORY, ref: "main", ...manifest } })
		.then((held) => held.failure);
same(
	"a path out of the repository never reaches a fetch",
	await installRefusing({ id: "@demo/clock", path: "../../elsewhere" }),
	'"../../elsewhere" is not a place inside the repository',
);
same(
	"a file name that would be written outside the widget folder never reaches a fetch",
	await installRefusing({ id: "@demo/clock", path: "widgets/@demo/clock", files: ["../../../evil.js"] }),
	'"../../../evil.js" is not a file name a widget folder can hold',
);

console.log("\na registry that is not a registry says so rather than emptying the source");
same("a registry that is a list offers nothing", (await offersOf(withRegistry([]))).length, 0);
same("a registry that is a number offers nothing", (await offersOf(withRegistry(42))).length, 0);

console.log("\na folder source reads a registry the same way a repository does");

const LIBRARY = "/tmp/library";
const TWO_WIDGETS = ["one", "two"];

const filesOfTheLibrary = (registryText: string | null): Map<string, string> =>
	new Map<string, string>([
		...TWO_WIDGETS.flatMap((name) => [
			[
				`${LIBRARY}/@lib/${name}/manifest.generated.json`,
				JSON.stringify({ id: `@lib/${name}`, title: name, api: 1 }),
			] as const,
			[`${LIBRARY}/@lib/${name}/widget.tsx`, "export default () => null;"] as const,
		]),
		...(registryText === null ? [] : [[`${LIBRARY}/widgetarium-registry.json`, registryText] as const]),
	]);

const foldersOfTheLibrary = (): Map<string, string[]> =>
	new Map<string, string[]>([
		[LIBRARY, [`${LIBRARY}/@lib`]],
		[`${LIBRARY}/@lib`, TWO_WIDGETS.map((name) => `${LIBRARY}/@lib/${name}`)],
		...TWO_WIDGETS.map((name): [string, string[]] => [`${LIBRARY}/@lib/${name}`, []]),
	]);

function libraryHolding(registryText: string | null): SourceDisk {
	const files = filesOfTheLibrary(registryText);
	const folders = foldersOfTheLibrary();
	return {
		exists: async (at) => files.has(at) || folders.has(at),
		read: async (at) => files.get(at) ?? "",
		folders: async (at) => folders.get(at) ?? [],
	};
}

const libraryOffers = async (registryText: string | null): Promise<unknown[]> =>
	(await installerOver({ sources: [{ path: LIBRARY }] }, libraryHolding(registryText)).available())
		.map((entry) => entry.manifest["id"])
		.sort();

same("a folder with no registry offers every widget folder under it", await libraryOffers(null), [
	"@lib/one",
	"@lib/two",
]);
same(
	"a registry naming one of them offers only that one",
	await libraryOffers(JSON.stringify({ registry: 1, scope: "@lib", widgets: [{ name: "one" }] })),
	["@lib/one"],
);
same(
	"a registry written for a newer plugin offers nothing rather than half of itself",
	await libraryOffers(JSON.stringify({ registry: REGISTRY_FORMAT + 1, scope: "@lib", widgets: [{ name: "one" }] })),
	[],
);
same(
	"a row naming a folder that holds no widget is skipped, and the rest still answer",
	await libraryOffers(JSON.stringify({ registry: 1, scope: "@lib", widgets: [{ name: "one" }, { name: "gone" }] })),
	["@lib/one"],
);

console.log(wrong === 0 ? "\nsource gate: clean" : `\nsource gate: ${wrong} wrong`);
process.exit(wrong === 0 ? 0 : 1);
