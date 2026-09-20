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
const { facadeUrl } = await import("./.mjs-cache/engine/modules.mjs");
const { builtSheetPath } = await import("./.mjs-cache/engine/widget-build.mjs");

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

const ID = "@demo/clock";
const INSTALLED = `${WIDGETS_DIR}/@demo/clock`;
const KEY = "tailwindcss@4.3.3";
const REAL_PATH = "/tailwindcss@4.3.3/es2022/tailwindcss.bundle.mjs";

const SOURCE = `import { createWidget } from "widgetarium";
export default createWidget(function Clock() {
	return <b className="text-3xl">tick</b>;
});
`;

const A_COMPILER_THAT_ANSWERS_LIKE_TAILWIND = `export async function compile(css, options) {
	async function resolved(text, base) {
		let held = "";
		for (const line of text.split("\\n")) {
			const found = /@import\\s+"([^"]+)"/.exec(line);
			if (!found) {
				held += line + "\\n";
				continue;
			}
			const sheet = await options.loadStylesheet(found[1], base);
			held += await resolved(sheet.content, sheet.base);
		}
		return held;
	}
	const entry = await resolved(css, options.base);
	return {
		build: (candidates) =>
			entry + candidates.filter((each) => entry.includes("--utility-" + each)).map((each) => "." + each + " { --built: 1; }").join("\\n"),
	};
}
`;

const THEME = ":root { --wg-served-theme: 1; }";
const UTILITIES = "@layer utilities { --utility-text-3xl: 1; --utility-font-bold: 1; }";
const PREFLIGHT = "* { --preflight-reached-the-build: 1; }";

const asked = [];
const network = {
	fetchJson: async (url) => {
		throw new Error(`no json here: ${url}`);
	},
	fetchText: async (url) => {
		asked.push(url);
		const table = {
			[facadeUrl("tailwindcss", "^4")]: `export * from "${REAL_PATH}";\n`,
			[`https://esm.sh${REAL_PATH}`]: A_COMPILER_THAT_ANSWERS_LIKE_TAILWIND,
			[`https://esm.sh/${KEY}/theme.css`]: THEME,
			[`https://esm.sh/${KEY}/utilities.css`]: UTILITIES,
			[`https://esm.sh/${KEY}/preflight.css`]: PREFLIGHT,
		};
		if (!(url in table)) throw new Error(`404 ${url}`);
		return table[url];
	},
};

const onMachineOver = (files) => ({
	exists: async (at) => files.has(at) || [...files.keys()].some((held) => held.startsWith(`${at}/`)),
	read: async (at) => files.get(at),
	folders: async (at) => {
		const under = `${at}/`;
		const held = new Set();
		for (const each of files.keys()) {
			if (!each.startsWith(under)) continue;
			const rest = each.slice(under.length);
			if (rest.includes("/")) held.add(under + rest.slice(0, rest.indexOf("/")));
		}
		return [...held];
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

async function installedFrom(sheet, scopeSheet, alsoInTheVault = {}) {
	asked.length = 0;
	const shelf = fakeVault();
	for (const [path, text] of Object.entries(alsoInTheVault)) shelf.files.set(path, text);
	shelf.files.set(`/repo/widgets/@demo/clock/widget.tsx`, SOURCE);
	if (sheet !== null) shelf.files.set(`/repo/widgets/@demo/clock/widget.css`, sheet);
	if (scopeSheet !== null) shelf.files.set(`/repo/widgets/@demo/tokens.css`, scopeSheet);
	const installer = createInstaller({ adapter: shelf, disk: onMachineOver(shelf.files), ...network });
	const offered = await installer.discover({ path: "/repo/widgets" });
	const done = await installer.install(offered[0]);
	return { shelf, installer, done, asked: [...asked] };
}

async function sheetsWornBy(vault) {
	dom.window.document.head.replaceChildren();
	const registry = new WidgetRegistry({ vault: { adapter: vault } });
	await withoutTheReport(() => registry.load());
	return [...dom.window.document.head.querySelectorAll("style")].map((node) => node.textContent);
}

const styled = await installedFrom(
	`@import "tailwindcss";\n@import "../tokens.css";\n.clock { color: red; }\n`,
	":root { --wg-kit-accent: red; }",
);
check("a widget whose sheet asks for tailwind installs", [styled.done.ok, styled.done.failure], [true, null]);

const built = styled.shelf.files.get(builtSheetPath(INSTALLED));
check("and the build folder holds a sheet", typeof built, "string");
check("which carries a rule for the class the widget uses", String(built).includes(".text-3xl { --built: 1; }"), true);
check("and none for a utility nothing in the widget names", String(built).includes(".font-bold"), false);
check("and the theme the package serves", String(built).includes("--wg-served-theme"), true);
check("and the scope file the sheet imported", String(built).includes("--wg-kit-accent"), true);
check("and the widget's own rules", String(built).includes(".clock { color: red; }"), true);
check("no preflight reaches it", String(built).includes("--preflight-reached-the-build"), false);
check(
	"and none was ever asked of the network",
	styled.asked.some((url) => url.includes("preflight")),
	false,
);

check(
	"the top level holds only what the developer wrote",
	[...styled.shelf.files.keys()].filter((at) => at.startsWith(`${INSTALLED}/`) && !at.includes("/build/")).sort(),
	[`${INSTALLED}/widget.css`, `${INSTALLED}/widget.tsx`],
);

const worn = await sheetsWornBy(styled.shelf);
check(
	"a vault wears the built sheet",
	worn.some((text) => String(text).includes(".text-3xl { --built: 1; }")),
	true,
);
check(
	"and never the unbuilt one",
	worn.some((text) => String(text).includes(`@import "tailwindcss"`)),
	false,
);

const lock = await styled.installer.lock();
check("the lock names every input the sheet was built from", Object.keys(lock.builds[ID].inputs).sort(), [
	`${INSTALLED}/widget.css`,
	`${INSTALLED}/widget.tsx`,
	`${WIDGETS_DIR}/@demo/tokens.css`,
]);
check("and the compiler that built it", lock.builds[ID].compiler, KEY);
check("and the compiler is a module the widget points at", lock.modules[KEY].widgets, [ID]);

const plain = await installedFrom(".clock { color: red; }\n", null);
check("a widget that never asks for tailwind installs too", [plain.done.ok, plain.done.failure], [true, null]);
check("and no sheet is built for it", plain.shelf.files.has(builtSheetPath(INSTALLED)), false);
check("and nothing at all was fetched", plain.asked, []);
check(
	"and its own sheet is what a vault wears",
	(await sheetsWornBy(plain.shelf)).includes(".clock { color: red; }\n"),
	true,
);

plain.shelf.files.set(`${INSTALLED}/widget.css`, `@import "tailwindcss";\n.clock { color: red; }\n`);
const askedLater = await plain.installer.rebuildDrifted();
check("a sheet that asks for tailwind after the install is built then", askedLater.rebuilt, [ID]);
check(
	"and the sheet it produces is what the vault gets",
	String(plain.shelf.files.get(builtSheetPath(INSTALLED))).includes(".text-3xl { --built: 1; }"),
	true,
);

const reset = await installedFrom(`@import "tailwindcss";\n@import "tailwindcss/preflight.css";\n`, null);
check("a sheet importing preflight is refused at install", reset.done.ok, false);
check("and the refusal names it", String(reset.done.failure).includes("tailwindcss/preflight.css"), true);
check(
	"and nothing of it reached the vault",
	[...reset.shelf.files.keys()].some((at) => at.startsWith(`${INSTALLED}/`)),
	false,
);

const wrecked = await installedFrom(".clock { color: red; }\n", null);
wrecked.shelf.files.set(
	LOCK_PATH,
	JSON.stringify({ version: 1, builds: { [ID]: { from: "widget.tsx", inputs: "not an object at all" } } }),
);
const overIt = await wrecked.installer.rebuildDrifted();
check("a lock whose build record is nonsense is built over, not thrown on", overIt.rebuilt, [ID]);

const OUTSIDE = `${WIDGETS_DIR}/what-the-vault-holds.md`;
const escaping = await installedFrom(`@import "tailwindcss";\n@import "../../what-the-vault-holds.md";\n`, null, {
	[OUTSIDE]: "words no widget may read",
});
check("a sheet reaching a file outside its scope is refused, though the file is right there", escaping.done.ok, false);
check(
	"and the refusal names what it may not leave",
	String(escaping.done.failure).includes(`${WIDGETS_DIR}/@demo`),
	true,
);
check(
	"and nothing of that file was built into anything",
	[...escaping.shelf.files.values()].some(
		(text) => String(text).includes("words no widget may read") && text !== escaping.shelf.files.get(OUTSIDE),
	),
	false,
);

const missing = await installedFrom(`@import "tailwindcss";\n@import "../nowhere.css";\n`, null);
check("a sheet importing a file nothing holds is refused", missing.done.ok, false);
check("and the refusal names the import", String(missing.done.failure).includes("../nowhere.css"), true);

const settled = await styled.installer.rebuildDrifted();
check("a build nothing has touched is left alone", settled, { rebuilt: [], failures: [] });

styled.shelf.files.set(`${INSTALLED}/widget.tsx`, SOURCE.replace("text-3xl", "font-bold"));
const afterTheSource = await styled.installer.rebuildDrifted();
check("a source edited in the vault is built again", afterTheSource.rebuilt, [ID]);
check(
	"and the sheet built with it follows the classes now used",
	String(styled.shelf.files.get(builtSheetPath(INSTALLED))).includes(".font-bold { --built: 1; }"),
	true,
);
check(
	"and drops the ones that are gone",
	String(styled.shelf.files.get(builtSheetPath(INSTALLED))).includes(".text-3xl"),
	false,
);

styled.shelf.files.set(`${WIDGETS_DIR}/@demo/tokens.css`, ":root { --wg-kit-accent: blue; }");
const afterTheScope = await styled.installer.rebuildDrifted();
check("a scope file the sheet imports is an input like any other", afterTheScope.rebuilt, [ID]);
check(
	"and the built sheet carries what it now says",
	String(styled.shelf.files.get(builtSheetPath(INSTALLED))).includes("--wg-kit-accent: blue"),
	true,
);

const AUTHORED = `${WIDGETS_DIR}/@demo/draft`;
styled.shelf.files.set(`${AUTHORED}/widget.tsx`, SOURCE);
styled.shelf.files.set(`${AUTHORED}/widget.css`, `@import "tailwindcss";\n`);
const authored = await styled.installer.rebuildDrifted();
check("a widget nobody installed is built too", authored.rebuilt, ["@demo/draft"]);
check(
	"and its sheet lands in its own build folder",
	String(styled.shelf.files.get(builtSheetPath(AUTHORED))).includes(".text-3xl { --built: 1; }"),
	true,
);
check("and nothing is built a second time", (await styled.installer.rebuildDrifted()).rebuilt, []);

styled.shelf.files.set(`${INSTALLED}/widget.css`, ".clock { color: red; }\n");
const afterTheAsk = await styled.installer.rebuildDrifted();
check("a sheet that stopped asking for tailwind is built again", afterTheAsk.rebuilt, [ID]);
check(
	"and the sheet built for it is gone, not left standing",
	styled.shelf.files.has(builtSheetPath(INSTALLED)),
	false,
);
check(
	"and a vault wears the widget's own sheet again",
	(await sheetsWornBy(styled.shelf)).includes(".clock { color: red; }\n"),
	true,
);

styled.shelf.files.set(`${AUTHORED}/widget.tsx`, "export default createWidget(function Draft() { return <b>;");
const broke = await withoutTheReport(() => styled.installer.rebuildDrifted());
check(
	"a source that stopped compiling is reported, not thrown",
	broke.failures.map((each) => each.id),
	["@demo/draft"],
);
check(
	"and the build it had is still standing",
	String(styled.shelf.files.get(builtSheetPath(AUTHORED))).includes(".text-3xl { --built: 1; }"),
	true,
);

console.log(
	`\n${failed === 0 ? `tailwind at install: clean (${checks} checks)` : `tailwind at install: ${failed} failed`}`,
);
process.exit(failed === 0 ? 0 : 1);
