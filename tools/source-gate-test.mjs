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

console.log(wrong === 0 ? "\nsource gate: clean" : `\nsource gate: ${wrong} wrong`);
process.exit(wrong === 0 ? 0 : 1);
