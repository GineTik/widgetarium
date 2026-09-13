import { catalogueAdapter } from "./perf-fixture.mjs";

const { createInstaller, INDEX_PATH } = await import("./.mjs-cache/installer.mjs");

const GOOD_FOLDER = "/tmp/good-widgets";

const oneWidgetOnDisk = {
	exists: async (at) => at.startsWith(GOOD_FOLDER),
	read: async () => JSON.stringify({ id: "@a/b", title: "B", api: 1 }),
	folders: async (at) => (at === GOOD_FOLDER ? [`${GOOD_FOLDER}/@a`] : [`${GOOD_FOLDER}/@a/b`]),
};

const installerOver = (catalogue, disk = null, added = [], shipped = []) =>
	createInstaller({
		adapter: catalogueAdapter(catalogue, INDEX_PATH),
		fetchJson: async () => null,
		fetchText: async () => "",
		disk,
		readAdded: async () => added,
		shipped,
	});

const pathsIn = (catalogue) => installerOver(catalogue).folderSourcePaths();

let wrong = 0;

async function check(label, catalogue, wanted) {
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

async function offersSurvive(label, catalogue) {
	const offered = await installerOver(catalogue, oneWidgetOnDisk)
		.available()
		.catch((failure) => failure);
	const said = Array.isArray(offered) ? `${offered.length} offer(s)` : `threw ${offered}`;
	const ok = Array.isArray(offered) && offered.length === 1 && offered[0].manifest?.id === "@a/b";
	if (!ok) wrong += 1;
	console.log(`${ok ? "OK " : "BAD"} ${label} → ${said}`);
}

console.log("\na malformed source must not blank the catalogue beside it");
await offersSurvive("a good folder on its own", { sources: [{ path: GOOD_FOLDER }] });
await offersSurvive("a path that is a number, beside it", { sources: [{ path: 42 }, { path: GOOD_FOLDER }] });
await offersSurvive("a null source, beside it", { sources: [null, { path: GOOD_FOLDER }] });
await offersSurvive("a path that is an object, beside it", { sources: [{ path: {} }, { path: GOOD_FOLDER }] });

const { sourcesOf, identityOf } = await import("./.mjs-cache/sources.mjs");
const { SHIPPED_SOURCES } = await import("./.mjs-cache/registries.mjs");

function same(label, found, wanted) {
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
const sameWidgetInTwoFolders = {
	exists: async (at) => at.startsWith(GOOD_FOLDER) || at.startsWith(OTHER_FOLDER),
	read: async () => JSON.stringify({ id: "@a/b", title: "B", api: 1 }),
	folders: async (at) => (at === GOOD_FOLDER || at === OTHER_FOLDER ? [`${at}/@a`] : [`${at}/b`]),
};
const offeredOnce = await installerOver({ sources: [{ path: OTHER_FOLDER }] }, sameWidgetInTwoFolders, [
	{ path: GOOD_FOLDER },
]).available();
same("two sources offering one widget id answer once", offeredOnce.length, 1);
same("and the one nearer the person is the answer", offeredOnce[0]?.origin, GOOD_FOLDER);

const { createWidgetSource } = await import("./.mjs-cache/engine/widget-source.mjs");
const { REGISTRY_FORMAT } = await import("./.mjs-cache/version.mjs");

const REPOSITORY = "https://github.com/acme/widgets";
const SHA = "abc1234567";
const raw = `https://raw.githubusercontent.com/acme/widgets/${SHA}`;
const CLOCK_CARD = JSON.stringify({ id: "@demo/clock", title: "Clock from the manifest", keywords: ["time"] });

const repositoryServing = (served) =>
	createWidgetSource({
		fetchJson: async (url) => answerFrom(served, url),
		fetchText: async (url) => answerFrom(served, url),
		disk: null,
	});

function answerFrom(served, url) {
	if (!(url in served)) throw new Error(`404 ${url}`);
	return served[url];
}

const withRegistry = (registry) => ({
	[`https://api.github.com/repos/acme/widgets/commits/main`]: { sha: SHA },
	[`${raw}/widgetarium-registry.json`]: JSON.stringify(registry),
	[`${raw}/widgets/@demo/clock/manifest.json`]: CLOCK_CARD,
});

const ONE_ROW = {
	name: "Clocks and counters",
	author: "@you",
	widgets: [{ id: "@demo/clock", title: "Clock", path: "widgets/@demo/clock", files: ["widget.tsx", "widget.css"] }],
};

const askedFor = { repository: REPOSITORY, ref: "main" };
const offersOf = (served) => repositoryServing(served).offersFrom(askedFor);

console.log("\na registry file is what a repository offers");
const fromRegistry = await offersOf(withRegistry(ONE_ROW));
same(
	"the rows of the registry are the offers",
	fromRegistry.map((entry) => entry.manifest.id),
	["@demo/clock"],
);
same("the files the row names are carried, so the install knows what to fetch", fromRegistry[0]?.manifest.files, [
	"widget.tsx",
	"widget.css",
]);
same("the widget's own manifest fills the card", fromRegistry[0]?.manifest.keywords, ["time"]);
same("and the folder the row names is where it is fetched from", fromRegistry[0]?.manifest.path, "widgets/@demo/clock");

console.log("\nthe offer carries the commit it was read at");
same("a repository offer names its commit", fromRegistry[0]?.commit, SHA);
same(
	"a widget whose manifest is missing is still offered from its row alone",
	(await offersOf({ ...withRegistry(ONE_ROW), [`${raw}/widgets/@demo/clock/manifest.json`]: undefined }))[0]?.manifest
		.title,
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
		tree: [{ path: "widgets/@demo/clock/manifest.json" }],
	},
	[`${raw}/widgets/@demo/clock/manifest.json`]: CLOCK_CARD,
};
const fromTree = await repositoryServing(TREE_ONLY).offersFrom({
	repository: REPOSITORY,
	ref: "main",
	path: "widgets",
});
same(
	"the tree still answers when no registry is there",
	fromTree.map((entry) => entry.manifest.id),
	["@demo/clock"],
);
same("and that offer names its commit too", fromTree[0]?.commit, SHA);

console.log("\na row names a place inside its own repository, and nothing else");
const rowNaming = (held) => ({ ...ONE_ROW, widgets: [{ ...ONE_ROW.widgets[0], ...held }] });
const idsOffered = async (held) => (await offersOf(withRegistry(rowNaming(held)))).map((entry) => entry.manifest.id);

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
const installRefusing = (manifest) =>
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

console.log(wrong === 0 ? "\nsource gate: clean" : `\nsource gate: ${wrong} wrong`);
process.exit(wrong === 0 ? 0 : 1);
