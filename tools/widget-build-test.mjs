import { JSDOM } from "jsdom";
import { buildMirror } from "./mirror.mjs";
import { fakeVault } from "./fake-vault.mjs";

buildMirror();

const dom = new JSDOM("<!doctype html><body></body>");
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle"]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}

const { createInstaller, LOCK_PATH } = await import("./.mjs-cache/installer.mjs");
const { WidgetRegistry } = await import("./.mjs-cache/registry.mjs");
const { WIDGETS_DIR } = await import("./.mjs-cache/paths.mjs");
const { BUILD_FILE, builtCodePath } = await import("./.mjs-cache/engine/widget-build.mjs");

let failed = 0;
let checks = 0;
function check(name, got, want) {
	checks += 1;
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
}

const FOLDER = `${WIDGETS_DIR}/@demo/clock`;
const SOURCE_FILE = "widget.tsx";
const CLOCK = {
	id: "@demo/clock",
	repository: "https://github.com/acme/widgets",
	ref: "main",
	path: "widgets/@demo/clock",
	files: ["manifest.generated.json", SOURCE_FILE],
};

const sourceSaying = (word) => `import { createWidget, defineLayout } from "widgetarium";
export const layout = defineLayout({ size: { preferredWidth: 320, preferredHeight: "auto" } });
export default createWidget({
	draw: () => {
		const said: string = "${word}";
		return <b>{said}</b>;
	},
});
`;

const buildSaying = (word) => `const { createWidget, defineLayout } = require("widgetarium");
module.exports.layout = defineLayout({ size: { preferredWidth: 320, preferredHeight: "auto" } });
module.exports.default = createWidget({ draw: () => h("b", null, "${word}") });
`;

const served = (source) => ({
	"https://api.github.com/repos/acme/widgets/commits/main": { sha: "abc1234567" },
	"https://raw.githubusercontent.com/acme/widgets/abc1234567/widgets/@demo/clock/manifest.generated.json":
		JSON.stringify({
			id: "@demo/clock",
			title: "Clock",
		}),
	[`https://raw.githubusercontent.com/acme/widgets/abc1234567/widgets/@demo/clock/${SOURCE_FILE}`]: source,
});

const network = (table) => ({
	fetchJson: async (url) => {
		if (!(url in table)) throw new Error(`404 ${url}`);
		return table[url];
	},
	fetchText: async (url) => {
		if (!(url in table)) throw new Error(`404 ${url}`);
		return table[url];
	},
});

async function withoutTheReport(run) {
	const wasError = console.error;
	console.error = () => {};
	try {
		return await run();
	} finally {
		console.error = wasError;
	}
}

async function drawnBy(vault) {
	const registry = new WidgetRegistry({ vault: { adapter: vault } });
	await withoutTheReport(() => registry.load());
	const held = registry.get("@demo/clock");
	if (!held?.component) return String(held?.error ?? "no widget at all");
	return held.component({}).props.children;
}

const vault = fakeVault();
const installer = createInstaller({ adapter: vault, ...network(served(sourceSaying("from the source"))) });
const done = await installer.install({ manifest: CLOCK });
check("installing a widget answers ok", [done.ok, done.failure], [true, null]);

const build = vault.files.get(builtCodePath(FOLDER));
check("and leaves a build in the build folder", typeof build, "string");
check(
	"while the top level holds only what the developer wrote",
	[...vault.files.keys()].filter((at) => at.startsWith(`${FOLDER}/`) && !at.includes("/build/")).sort(),
	[`${FOLDER}/manifest.generated.json`, `${FOLDER}/${SOURCE_FILE}`],
);
check("which holds no JSX", String(build).includes("<b>"), false);
check("and no type annotation", String(build).includes(": string"), false);
const recorded = (await installer.lock()).builds["@demo/clock"];
check("the lock names the source that build was made from", recorded.from, SOURCE_FILE);
check("and hashes every input that build read", Object.keys(recorded.inputs), [`${FOLDER}/${SOURCE_FILE}`]);
check(
	"and what is built is a fact of its own, not of what was installed",
	(await installer.lock()).widgets["@demo/clock"].build,
	undefined,
);
check("and still hashes the source itself", Object.keys((await installer.lock()).widgets["@demo/clock"].files).sort(), [
	"manifest.generated.json",
	SOURCE_FILE,
]);

check("an installed widget draws", await drawnBy(vault), "from the source");

vault.files.set(builtCodePath(FOLDER), buildSaying("from the build"));
check("and what it runs is the stored build, not the source", await drawnBy(vault), "from the build");

const beforeTheFolder = fakeVault();
for (const [path, text] of vault.files)
	beforeTheFolder.files.set(path === builtCodePath(FOLDER) ? `${FOLDER}/${BUILD_FILE}` : path, text);
check(
	"a widget.js beside a TypeScript source is neither a build nor a refusal, so the source is compiled",
	await drawnBy(beforeTheFolder),
	"from the source",
);

vault.files.set(`${FOLDER}/${SOURCE_FILE}`, sourceSaying("edited in the vault"));
check("a build whose source has changed since is not used", await drawnBy(vault), "edited in the vault");

const older = fakeVault();
for (const [path, text] of vault.files) older.files.set(path, text);
const lock = JSON.parse(older.files.get(LOCK_PATH));
delete lock.widgets["@demo/clock"].build;
older.files.set(LOCK_PATH, JSON.stringify(lock));
older.files.set(`${FOLDER}/${SOURCE_FILE}`, sourceSaying("installed before builds existed"));
check(
	"a lock written before builds existed compiles the source",
	await drawnBy(older),
	"installed before builds existed",
);

const authored = fakeVault();
authored.files.set(`${FOLDER}/manifest.generated.json`, JSON.stringify({ id: "@demo/clock", title: "Clock" }));
authored.files.set(`${FOLDER}/${SOURCE_FILE}`, sourceSaying("first draft"));
check("a widget nobody installed draws from its source", await drawnBy(authored), "first draft");

authored.files.set(`${FOLDER}/${SOURCE_FILE}`, sourceSaying("second draft"));
check("and an edit shows on the next read, with no install", await drawnBy(authored), "second draft");

authored.files.set(`${FOLDER}/${BUILD_FILE}`, buildSaying("a build no lock stands behind"));
check("a build the lock never recorded loses to the source", await drawnBy(authored), "second draft");

const broken = fakeVault();
const refused = await createInstaller({
	adapter: broken,
	...network(served("export default createWidget(function Clock() { return <b>;")),
}).install({ manifest: CLOCK });
check("a source that will not compile is refused at install", refused.ok, false);
check("and the refusal names the file", String(refused.failure).startsWith(`${SOURCE_FILE} did not compile`), true);
check("and nothing of it reached the vault", broken.files.size, 0);

const RENAME_TO_TSX = "Rename it to widget.tsx";

for (const javascriptFile of ["widget.jsx", "widget.js"]) {
	const written = fakeVault();
	written.files.set(`${FOLDER}/manifest.generated.json`, JSON.stringify({ id: "@demo/clock", title: "Clock" }));
	written.files.set(`${FOLDER}/${javascriptFile}`, "export default () => null;");
	const said = await drawnBy(written);
	check(`a vault widget written as ${javascriptFile} does not draw, and says why`, said.includes(RENAME_TO_TSX), true);
	check(
		"and names the command that renames it",
		said.includes(`mv "${FOLDER}/${javascriptFile}" "${FOLDER}/widget.tsx"`),
		true,
	);
}

const javascriptInstall = await createInstaller({ adapter: fakeVault(), ...network({}) }).install({
	manifest: { ...CLOCK, files: ["manifest.generated.json", "widget.jsx"] },
});
check("a registry entry serving widget.jsx is refused before anything is fetched", javascriptInstall.ok, false);
check(
	"and the refusal says it is JavaScript and how to rename it",
	String(javascriptInstall.failure).startsWith(`${CLOCK.path}/widget.jsx is JavaScript`) &&
		String(javascriptInstall.failure).includes(RENAME_TO_TSX),
	true,
);

const placeholderInPath = await createInstaller({ adapter: fakeVault(), ...network({}) }).install({
	manifest: { ...CLOCK, path: "widgets/{file}", files: ["manifest.generated.json", "widget.jsx"] },
});
check(
	"a registry path holding a placeholder is quoted as it stands, never filled in again",
	String(placeholderInPath.failure).startsWith("widgets/{file}/widget.jsx is JavaScript"),
	true,
);

console.log(
	`\n${failed === 0 ? `compile at install: clean (${checks} checks)` : `compile at install: ${failed} failed`}`,
);
process.exit(failed === 0 ? 0 : 1);
