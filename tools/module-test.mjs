import { JSDOM } from "jsdom";
import { buildMirror } from "./mirror.mjs";
import { fakeVault } from "./fake-vault.mjs";

buildMirror();

const dom = new JSDOM("<!doctype html><body></body>");
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle"]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}

const { keyFor, nameIn, moduleFolder, modulePath, facadeUrl, realPathIn, versionIn, declaredDependencies, MODULES_DIR } = await import("./.mjs-cache/engine/modules.mjs");
const { readLock, withModule, releaseModules, modulesByWidget } = await import("./.mjs-cache/engine/widget-lock.mjs");
const { createInstaller, LOCK_PATH } = await import("./.mjs-cache/installer.mjs");
const { WidgetRegistry } = await import("./.mjs-cache/registry.mjs");

let failed = 0;
let checks = 0;
function check(name, got, want) {
	checks += 1;
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
}

const PACKAGE = "@dnd-kit/core";
const VERSION = "6.3.1";
const KEY = `${PACKAGE}@${VERSION}`;
const REAL_PATH = `/${KEY}/X-ZXJlYWN0LHJlYWN0LWRvbQ/es2022/core.bundle.mjs`;
const FACADE = `export * from "${REAL_PATH}";\nexport { default } from "${REAL_PATH}";\n`;
const BUNDLE = `export const useDraggable = () => "dragging";\n`;
const BUNDLE_URL = `https://esm.sh${REAL_PATH}`;

check("a package and a version make one key", keyFor(PACKAGE, VERSION), KEY);
check("a scoped name survives the key it is half of", nameIn(KEY), PACKAGE);
check("an unscoped one too", nameIn("clsx@2.1.1"), "clsx");
check("a key with no version is no package", nameIn("clsx"), "");
check("the key is the folder", moduleFolder(KEY), `${MODULES_DIR}/${KEY}`);
check("and one file stands in it", modulePath(KEY), `${MODULES_DIR}/${KEY}/index.js`);
check("react is asked to stay outside the bundle", facadeUrl(PACKAGE, "^6.3.1"), `https://esm.sh/${PACKAGE}@%5E6.3.1?bundle&external=react,react-dom`);
check("the facade names the one file that follows", realPathIn(FACADE), REAL_PATH);
check("a facade naming nothing is not a facade", realPathIn("nothing here"), null);
check("the exact version is read off that path", versionIn(REAL_PATH, PACKAGE), VERSION);
check("a path naming another package answers nothing", versionIn(REAL_PATH, "@dnd-kit/sortable"), null);
check("a manifest declares its packages as a map", declaredDependencies({ dependencies: { [PACKAGE]: "^6.3.1" } }), [[PACKAGE, "^6.3.1"]]);
check("and anything else declares none", [declaredDependencies({}), declaredDependencies({ dependencies: ["x"] }), declaredDependencies(null)], [[], [], []]);

const wanted = { key: KEY, path: modulePath(KEY), hash: "7" };
const pointed = withModule(withModule(readLock(null), "@demo/clock", wanted), "@task/board", wanted);
check("two widgets share one entry", Object.keys(pointed.modules), [KEY]);
check("and both are named on it", pointed.modules[KEY].widgets, ["@demo/clock", "@task/board"]);
check("a widget is told which name resolves to which version", [...(modulesByWidget(pointed).get("@task/board") ?? [])], [[PACKAGE, KEY]]);
const afterOne = releaseModules(pointed, "@demo/clock");
check("releasing one of the two collects nothing", afterOne.collected, []);
check("and leaves the other pointing", afterOne.lock.modules[KEY].widgets, ["@task/board"]);
check("releasing the last one collects the version", releaseModules(afterOne.lock, "@task/board").collected, [KEY]);


const widgetSource = (name) => `import { createWidget } from "widgetarium";
import { useDraggable } from "${PACKAGE}";
export default createWidget(function ${name}() {
	return h("b", null, useDraggable());
});
`;

const CLOCK = { id: "@demo/clock", repository: "https://github.com/acme/widgets", ref: "main", path: "widgets/@demo/clock", files: ["manifest.json", "widget.jsx"] };
const BOARD = { id: "@task/board", repository: "https://github.com/acme/widgets", ref: "main", path: "widgets/@task/board", files: ["manifest.json", "widget.jsx"] };

const SERVED = {
	"https://api.github.com/repos/acme/widgets/commits/main": { sha: "abc1234567" },
	"https://raw.githubusercontent.com/acme/widgets/abc1234567/widgets/@demo/clock/manifest.json": JSON.stringify({ id: "@demo/clock", title: "Clock", dependencies: { [PACKAGE]: "^6.3.1" } }),
	"https://raw.githubusercontent.com/acme/widgets/abc1234567/widgets/@demo/clock/widget.jsx": widgetSource("Clock"),
	"https://raw.githubusercontent.com/acme/widgets/abc1234567/widgets/@task/board/manifest.json": JSON.stringify({ id: "@task/board", title: "Board", dependencies: { [PACKAGE]: "6.3.1" } }),
	"https://raw.githubusercontent.com/acme/widgets/abc1234567/widgets/@task/board/widget.jsx": widgetSource("Board"),
	[facadeUrl(PACKAGE, "^6.3.1")]: FACADE,
	[facadeUrl(PACKAGE, "6.3.1")]: FACADE,
	[BUNDLE_URL]: BUNDLE,
};

async function withoutTheReport(run) {
	const wasError = console.error;
	console.error = () => {};
	try {
		return await run();
	} finally {
		console.error = wasError;
	}
}

const asked = [];
const network = (served) => ({
	fetchJson: async (url) => { if (!(url in served)) throw new Error(`404 ${url}`); return served[url]; },
	fetchText: async (url) => { asked.push(url); if (!(url in served)) throw new Error(`404 ${url}`); return served[url]; },
});

const vault = fakeVault();
const installer = createInstaller({ adapter: vault, ...network(SERVED) });

const first = await installer.install({ manifest: CLOCK });
check("installing a widget that declares a package answers ok", [first.ok, first.failure], [true, null]);
check("and writes the package where the registry looks", vault.files.has(modulePath(KEY)), true);
check("the lock pins the exact version the range resolved to", Object.keys((await installer.lock()).modules), [KEY]);
check("and names the widget that wanted it", (await installer.lock()).modules[KEY].widgets, ["@demo/clock"]);

const second = await installer.install({ manifest: BOARD });
check("a second widget wanting the same version installs too", second.ok, true);
check("the bundle is fetched exactly once for both", asked.filter((url) => url === BUNDLE_URL).length, 1);
check("one folder holds it", [...vault.files.keys()].filter((path) => path.startsWith(`${MODULES_DIR}/`)), [modulePath(KEY)]);
check("and both widgets point at that one entry", (await installer.lock()).modules[KEY].widgets, ["@demo/clock", "@task/board"]);

const registry = new WidgetRegistry({ vault: { adapter: vault } });
await registry.load();
check("a widget importing a locked package loads", [Boolean(registry.get("@demo/clock")?.component), String(registry.get("@demo/clock")?.error ?? "")], [true, ""]);
check("and what it draws came out of the package", registry.get("@demo/clock").component({}).props.children, "dragging");
check("the second one draws from the same version", registry.get("@task/board").component({}).props.children, "dragging");

const orphan = fakeVault();
orphan.files.set(".widgetarium/widgets/@demo/clock/manifest.json", JSON.stringify({ id: "@demo/clock", title: "Clock" }));
orphan.files.set(".widgetarium/widgets/@demo/clock/widget.jsx", widgetSource("Clock"));
const alone = new WidgetRegistry({ vault: { adapter: orphan } });
await withoutTheReport(() => alone.load());
check("a widget importing a package nothing holds refuses", Boolean(alone.get("@demo/clock")?.error), true);
check("and names the package in the refusal", String(alone.get("@demo/clock")?.error ?? "").includes(`cannot import "${PACKAGE}"`), true);

const moved = fakeVault();
for (const [path, text] of vault.files) moved.files.set(path === modulePath(KEY) ? `${MODULES_DIR}/elsewhere.js` : path, text);
const movedLock = JSON.parse(moved.files.get(LOCK_PATH));
movedLock.modules[KEY].path = `${MODULES_DIR}/elsewhere.js`;
moved.files.set(LOCK_PATH, JSON.stringify(movedLock));
const elsewhere = new WidgetRegistry({ vault: { adapter: moved } });
await elsewhere.load();
check("the package is read where the lock says it was written", String(elsewhere.get("@demo/clock")?.error ?? ""), "");
check("and the widget still draws from it", elsewhere.get("@demo/clock").component({}).props.children, "dragging");

const unlocked = fakeVault();
for (const [path, text] of vault.files) unlocked.files.set(path, text);
unlocked.files.set(LOCK_PATH, JSON.stringify({ version: 1, widgets: JSON.parse(unlocked.files.get(LOCK_PATH)).widgets, modules: {} }));
const without = new WidgetRegistry({ vault: { adapter: unlocked } });
await withoutTheReport(() => without.load());
check("a widget whose lock entry is gone refuses rather than drawing", Boolean(without.get("@demo/clock")?.error), true);
check("and names the package it was promised", String(without.get("@demo/clock")?.error ?? "").includes(`cannot import "${PACKAGE}"`), true);

await installer.uninstall("@demo/clock");
check("uninstalling one of two leaves the package standing", vault.files.has(modulePath(KEY)), true);
check("and the entry names only the one left", (await installer.lock()).modules[KEY].widgets, ["@task/board"]);
await installer.uninstall("@task/board");
check("uninstalling the last one takes the folder with it", [...vault.files.keys()].filter((path) => path.startsWith(`${MODULES_DIR}/`)), []);
check("and the lock holds no module nobody wants", (await installer.lock()).modules, {});

const PLAIN_PATH = "/clsx@2.1.1/es2022/clsx.bundle.mjs";
const mixed = fakeVault();
const twoPackages = await createInstaller({
	adapter: mixed,
	...network({
		...SERVED,
		"https://raw.githubusercontent.com/acme/widgets/abc1234567/widgets/@demo/clock/manifest.json": JSON.stringify({ id: "@demo/clock", dependencies: { [PACKAGE]: "^6.3.1", clsx: "2.1.1" } }),
		[facadeUrl("clsx", "2.1.1")]: `export * from "${PLAIN_PATH}";\n`,
		[`https://esm.sh${PLAIN_PATH}`]: `export const clsx = () => "joined";\n`,
	}),
}).install({ manifest: CLOCK });
check("a widget may declare more than one package", [twoPackages.ok, twoPackages.failure], [true, null]);
check("an unscoped package stands beside a scoped one", [...mixed.files.keys()].filter((path) => path.startsWith(`${MODULES_DIR}/`)).sort(), [modulePath("clsx@2.1.1"), modulePath(KEY)].sort());

const lying = fakeVault();
const liar = createInstaller({ adapter: lying, ...network({ ...SERVED, [facadeUrl(PACKAGE, "^6.3.1")]: `export * from "/@evil/miner@1.0.0/es2022/miner.mjs";` }) });
const refusedPackage = await liar.install({ manifest: CLOCK });
check("esm.sh answering with another package is refused", refusedPackage.ok, false);
check("and says which package was asked for", refusedPackage.failure, `esm.sh answered "${PACKAGE}@^6.3.1" with something that is not that package`);
check("and nothing of the widget reached the vault", [...lying.files.keys()].filter((path) => path.startsWith(".widgetarium/widgets")), []);

const cut = { ...SERVED };
delete cut[BUNDLE_URL];
const offline = createInstaller({ adapter: fakeVault(), ...network(cut) });
const lost = await offline.install({ manifest: CLOCK });
check("a bundle that will not come back is a refusal, not a crash", [lost.ok, lost.failure.startsWith(`cannot fetch "${PACKAGE}@^6.3.1"`)], [false, true]);

const escaping = fakeVault();
const escaped = await createInstaller({ adapter: escaping, ...network({ ...SERVED, "https://raw.githubusercontent.com/acme/widgets/abc1234567/widgets/@demo/clock/manifest.json": JSON.stringify({ id: "@demo/clock", dependencies: { "../../evil": "1.0.0" } }) }) }).install({ manifest: CLOCK });
check("a package name that is a path is refused", escaped.failure, `"../../evil" is not a package name`);
check("and nothing was asked of the network for it", asked.includes("https://esm.sh/../../evil@1.0.0?bundle&external=react,react-dom"), false);

console.log(`\n${failed === 0 ? `module space: clean (${checks} checks)` : `module space: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
