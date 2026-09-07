import { catalogueAdapter } from "./perf-fixture.mjs";

const { createInstaller, INDEX_PATH } = await import("./.mjs-cache/installer.mjs");

const GOOD_FOLDER = "/tmp/good-widgets";

const oneWidgetOnDisk = {
	exists: async (at) => at.startsWith(GOOD_FOLDER),
	read: async () => JSON.stringify({ id: "@a/b", title: "B", api: 1 }),
	folders: async (at) => (at === GOOD_FOLDER ? [`${GOOD_FOLDER}/@a`] : [`${GOOD_FOLDER}/@a/b`]),
};

const installerOver = (catalogue, disk = null) =>
	createInstaller({
		adapter: catalogueAdapter(catalogue, INDEX_PATH),
		fetchJson: async () => null,
		fetchText: async () => "",
		disk,
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
await check("a folder beside a repository", { sources: [{ repository: "a/b" }, { path: "/tmp/widgets" }] }, ["/tmp/widgets"]);

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

console.log(wrong === 0 ? "\nsource gate: clean" : `\nsource gate: ${wrong} wrong`);
process.exit(wrong === 0 ? 0 : 1);
