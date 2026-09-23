import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { widgetsCliBundle } from "../apps/obsidian/build.mjs";

const run = promisify(execFile);

let failed = 0;
let checks = 0;
const check = (name, got, want) => {
	checks += 1;
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
};

const SERVED = {
	"markdown-preview": { title: "Markdown", description: "Words on the screen.", keywords: ["text"], role: "text" },
	"spend-table": { title: "Spend", description: "What was spent.", keywords: ["money"], role: "collection" },
};

const served = await mkdtemp(join(tmpdir(), "wg-registry-"));
await writeFile(
	join(served, "widgetarium-registry.json"),
	JSON.stringify({
		registry: 1,
		name: "Test",
		scope: "@served",
		widgets: Object.keys(SERVED).map((name) => ({ name })),
	}),
);
for (const [name, card] of Object.entries(SERVED)) {
	const folder = join(served, "@served", name);
	await mkdir(folder, { recursive: true });
	await writeFile(join(folder, "widget.tsx"), "export default null;\n");
	await writeFile(join(folder, "manifest.generated.json"), JSON.stringify(card));
}
await writeFile(join(served, "@served", "lib.js"), "export const shared = 1;\n");

const vault = await mkdtemp(join(tmpdir(), "wg-offer-"));
const bin = join(vault, ".widgetarium", "bin");
await mkdir(bin, { recursive: true });
await writeFile(join(bin, "widgets.mjs"), await widgetsCliBundle());
const held = join(vault, ".widgetarium", "widgets", "@here", "already");
await mkdir(held, { recursive: true });
await writeFile(join(held, "widget.tsx"), "export default null;\n");
await writeFile(join(held, "manifest.json"), JSON.stringify({ title: "Already", role: "collection", keywords: [] }));
const pluginData = join(vault, ".obsidian", "plugins", "widgetarium");
await mkdir(pluginData, { recursive: true });
await writeFile(join(pluginData, "data.json"), JSON.stringify({ registries: [{ path: served }] }));

const tool = join(bin, "widgets.mjs");
const askedFor = async (verb, ...args) => {
	try {
		const { stdout } = await run("node", [tool, verb, ...args], { maxBuffer: 1 << 22 });
		return { code: 0, said: stdout };
	} catch (thrown) {
		return { code: thrown.code, said: String(thrown.stderr) };
	}
};
const find = async (...args) => JSON.parse((await askedFor("find", ...args)).said);

const all = await find();
const ids = all.widgets.map((row) => row.id);
check("a registry on this machine is read, not only a remote one", all.total, 3);
check("what is served is offered beside what is held", ids.sort(), [
	"@here/already",
	"@served/markdown-preview",
	"@served/spend-table",
]);

const offered = all.widgets.find((row) => row.id === "@served/markdown-preview");
check("an offered widget is marked as not installed", offered.installed, false);
check("and carries the role its own folder declares, so it can be ranked", offered.role, "text");
check("the held one is marked installed", all.widgets.find((row) => row.id === "@here/already").installed, true);

const byRole = await find("--role", "text");
check("an offered widget wins on role like any other", byRole.widgets[0].id, "@served/markdown-preview");
check(
	"and the text output says whether it has to be fetched",
	(await askedFor("find", "--role", "text", "--text")).said.includes("GET "),
	true,
);

const installed = await askedFor("install", "@served/markdown-preview", "--text");
check("installing an offered widget leaves a zero exit", installed.code, 0);
check("and names what it wrote", installed.said.includes("widget.tsx"), true);

const laid = join(vault, ".widgetarium", "widgets", "@served", "markdown-preview");
check(
	"the widget's own files land in the vault",
	(await readFile(join(laid, "widget.tsx"), "utf8")).trim(),
	"export default null;",
);
check(
	"the scope's shared file lands beside it",
	(await readFile(join(vault, ".widgetarium", "widgets", "@served", "lib.js"), "utf8")).trim(),
	"export const shared = 1;",
);

const lock = JSON.parse(await readFile(join(vault, ".widgetarium", "widgets.lock.json"), "utf8"));
check("the lock records it as installed", lock.widgets["@served/markdown-preview"].state, "installed");
check("the lock names where it came from", lock.widgets["@served/markdown-preview"].source, served);
check("the lock hashes every file it wrote", Object.keys(lock.widgets["@served/markdown-preview"].files).sort(), [
	"manifest.generated.json",
	"widget.tsx",
]);

const after = await find();
check(
	"it reads as installed the moment it is there",
	after.widgets.find((row) => row.id === "@served/markdown-preview").installed,
	true,
);
check("and the catalogue is no longer than it was", after.total, 3);

const again = await askedFor("install", "@served/markdown-preview", "--text");
check("installing it twice is refused", again.code, 1);
check("and says why", again.said.includes("already installed"), true);

const unknown = await askedFor("install", "@served/nothing", "--text");
check("installing a widget nobody serves is refused", unknown.code, 1);

const typedOnly = join(served, "@served", "typed");
await mkdir(typedOnly, { recursive: true });
await writeFile(join(typedOnly, "widget.ts"), "export default null;\n");
await writeFile(join(typedOnly, "manifest.generated.json"), JSON.stringify({ title: "Typed", role: "collection" }));
const newer = join(served, "@served", "newer");
await mkdir(newer, { recursive: true });
await writeFile(join(newer, "widget.tsx"), "export default null;\n");
await writeFile(
	join(newer, "manifest.generated.json"),
	JSON.stringify({ title: "Newer", role: "collection", api: 99 }),
);
const cardless = join(served, "@served", "cardless");
await mkdir(cardless, { recursive: true });
await writeFile(join(cardless, "manifest.generated.json"), JSON.stringify({ title: "Cardless", role: "collection" }));
await writeFile(
	join(served, "widgetarium-registry.json"),
	JSON.stringify({
		registry: 1,
		name: "Test",
		scope: "@served",
		widgets: [...Object.keys(SERVED), "typed", "newer", "cardless"].map((name) => ({ name })),
	}),
);

const typedIn = await askedFor("install", "@served/typed", "--text");
check("a widget whose source is widget.ts installs its source, not its manifest alone", typedIn.code, 0);
check(
	"and the source lands",
	(await readFile(join(vault, ".widgetarium", "widgets", "@served", "typed", "widget.ts"), "utf8")).trim(),
	"export default null;",
);

const sourceless = await askedFor("install", "@served/cardless", "--text");
check("a folder with a manifest and no source is refused", sourceless.code, 1);
check("and says what it did hold", sourceless.said.includes("holds no widget source"), true);

const tooNew = await askedFor("install", "@served/newer", "--text");
check("a widget needing a newer api is refused rather than quietly installed", tooNew.code, 1);
check("and says which api it needs", tooNew.said.includes("99"), true);

await writeFile(join(vault, ".widgetarium", "widgets.lock.json"), "{ broken");
const overBroken = await askedFor("install", "@served/spend-table", "--text");
check("nothing is installed over a lock that is not JSON", overBroken.code, 1);
check("and it says so in a sentence, not a stack trace", overBroken.said.includes("not readable JSON"), true);
check(
	"and no files were written first",
	await readFile(join(vault, ".widgetarium", "widgets", "@served", "spend-table", "widget.tsx"), "utf8").then(
		() => "written",
		() => "nothing",
	),
	"nothing",
);
await writeFile(join(vault, ".widgetarium", "widgets.lock.json"), JSON.stringify(lock, null, "\t"));

await writeFile(join(vault, ".widgetarium", "widgets", "@served", "lib.js"), "export const shared = 2;\n");
const wouldTake = await askedFor("install", "@served/spend-table", "--text");
check("a scope file standing with other contents stops the install", wouldTake.code, 1);
check("and names the file it would have taken", wouldTake.said.includes("lib.js"), true);
await writeFile(join(vault, ".widgetarium", "widgets", "@served", "lib.js"), "export const shared = 1;\n");

const escaping = await mkdtemp(join(tmpdir(), "wg-escape-"));
await writeFile(
	join(escaping, "widgetarium-registry.json"),
	JSON.stringify({ registry: 1, name: "Bad", widgets: [{ id: "../../../escaped" }] }),
);
await writeFile(join(pluginData, "data.json"), JSON.stringify({ registries: [{ path: served }, { path: escaping }] }));
const withEscaper = await find();
check(
	"a registry row naming a place outside itself never reaches the catalogue",
	withEscaper.widgets.some((row) => row.id.includes("..")),
	false,
);
check("and the rows beside it still do", withEscaper.total, 6);
const escaped = await askedFor("install", "../../../escaped", "--text");
check("so installing it finds no such widget", escaped.code, 1);
await writeFile(join(pluginData, "data.json"), JSON.stringify({ registries: [{ path: served }] }));

console.log(`${checks - failed}/${checks} checks passed`);
process.exit(failed === 0 ? 0 : 1);
