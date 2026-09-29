import { JSDOM } from "jsdom";
import { fakeVault } from "./fake-vault.mjs";

const dom = new JSDOM("<!doctype html><body></body>");
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle"]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}

const { createInstaller } = await import("../packages/core/src/installer.js");
const { WidgetRegistry } = await import("../packages/core/src/registry.js");
const { WIDGETS_DIR } = await import("../packages/core/src/paths.js");
const { builtCodePath, compileWidget, compileWidgetFolder } =
	await import("../packages/core/src/engine/widget-build.js");
const { readRegistry } = await import("../packages/core/src/engine/registry-file.js");
const { publishWidget } = await import("./publish.mjs");

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

const ID = "@demo/split";
const FOLDER = `${WIDGETS_DIR}/${ID}`;
const REPOSITORY_FOLDER = `widgets/${ID}`;
const MODULES = ["widget.tsx", "parts/model.ts", "view.tsx"];

const ENTRY = `import { createWidget } from "widgetarium";
import { answer } from "./parts/model";
import { Said } from "./view";
export { layout } from "./view";
export default createWidget({ draw: () => <Said value={answer()} /> });
`;
const modelSaying = (value) => `export const answer = (): number => ${value};\n`;
const VIEW = `import { Fragment } from "react";
import { defineLayout } from "widgetarium";
import { answer } from "./parts/model.ts";
export const layout = defineLayout({ size: { preferredWidth: 320, preferredHeight: "auto" } });
export const Said = ({ value }: { value: number }) => <b>{\`\${value} of \${answer()}\${typeof Fragment}\`}</b>;
`;

const sourcesWith = (model) => ({ "widget.tsx": ENTRY, "parts/model.ts": model, "view.tsx": VIEW });

const served = (sources) => ({
	"https://api.github.com/repos/acme/widgets/commits/main": { sha: "abc1234567" },
	[`https://raw.githubusercontent.com/acme/widgets/abc1234567/${REPOSITORY_FOLDER}/manifest.generated.json`]:
		JSON.stringify({ id: ID, title: "Split" }),
	...Object.fromEntries(
		Object.entries(sources).map(([name, text]) => [
			`https://raw.githubusercontent.com/acme/widgets/abc1234567/${REPOSITORY_FOLDER}/${name}`,
			text,
		]),
	),
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

const listed = (files) => ({
	manifest: { id: ID, repository: "https://github.com/acme/widgets", ref: "main", path: REPOSITORY_FOLDER, files },
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
	const held = registry.get(ID);
	if (!held?.component) return String(held?.error ?? "no widget at all");
	const drawn = held.component({});
	return drawn.type(drawn.props).props.children;
}

const vault = fakeVault();
const installer = createInstaller({ adapter: vault, ...network(served(sourcesWith(modelSaying(21)))) });
const done = await installer.install(listed(["manifest.generated.json", ...MODULES]));
check("a widget split into modules installs from a repository", [done.ok, done.failure], [true, null]);
check(
	"and every module the registry listed lands at its own path in the vault",
	MODULES.map((name) => typeof vault.files.get(`${FOLDER}/${name}`)),
	["string", "string", "string"],
);
check(
	"the lock hashes every module the build read",
	Object.keys((await installer.lock()).builds[ID].inputs).sort(),
	MODULES.map((name) => `${FOLDER}/${name}`).sort(),
);
check(
	"the build is one program over the folder",
	vault.files.get(builtCodePath(FOLDER)),
	compileWidgetFolder(sourcesWith(modelSaying(21)), FOLDER),
);
check("it loads through the registry and draws across three modules", await drawnBy(vault), "21 of 21symbol");

const current = await withoutTheReport(() => installer.rebuildDrifted());
check("a folder nobody touched is not rebuilt", current.rebuilt, []);

vault.files.set(`${FOLDER}/parts/model.ts`, modelSaying(42));
check("a sibling edited in the vault shows before any rebuild", await drawnBy(vault), "42 of 42symbol");
const rebuilt = await withoutTheReport(() => installer.rebuildDrifted());
check("and a change to a sibling alone rebuilds the widget", rebuilt.rebuilt, [ID]);
check(
	"into a build that carries the edit",
	vault.files.get(builtCodePath(FOLDER)),
	compileWidgetFolder(sourcesWith(modelSaying(42)), FOLDER),
);
check("which is what draws", await drawnBy(vault), "42 of 42symbol");

const LIBBED = "@demo/libbed";
const LIB_AT = `${WIDGETS_DIR}/@demo/lib.ts`;
const LIBBED_AT = "https://raw.githubusercontent.com/acme/widgets/abc1234567/widgets/@demo/libbed";
const LIBBED_ENTRY = `import { createWidget, defineLayout } from "widgetarium";
import { RATE } from "@demo/lib";
export const layout = defineLayout({ size: { preferredWidth: 320, preferredHeight: "auto" } });
export default createWidget({ draw: () => <b>{RATE}</b> });
`;
vault.files.set(LIB_AT, "export const RATE: number = 1;\n");
const libbedDone = await createInstaller({
	adapter: vault,
	...network({
		"https://api.github.com/repos/acme/widgets/commits/main": { sha: "abc1234567" },
		[`${LIBBED_AT}/manifest.generated.json`]: JSON.stringify({ id: LIBBED, title: "Libbed" }),
		[`${LIBBED_AT}/widget.tsx`]: LIBBED_ENTRY,
	}),
}).install({
	manifest: {
		id: LIBBED,
		repository: "https://github.com/acme/widgets",
		ref: "main",
		path: "widgets/@demo/libbed",
		files: ["manifest.generated.json", "widget.tsx"],
	},
});
check("a widget importing its scope's lib installs", [libbedDone.ok, libbedDone.failure], [true, null]);
check(
	"and its build names the scope's lib.ts among its inputs",
	LIB_AT in (await installer.lock()).builds[LIBBED].inputs,
	true,
);
check("a lib nobody touched rebuilds nothing", (await withoutTheReport(() => installer.rebuildDrifted())).rebuilt, []);
vault.files.set(LIB_AT, "export const RATE: number = 2;\n");
check(
	"a change to lib.ts rebuilds the widget importing it and no other",
	(await withoutTheReport(() => installer.rebuildDrifted())).rebuilt,
	[LIBBED],
);

const missing = fakeVault();
const missingDone = await createInstaller({
	adapter: missing,
	...network(served({ ...sourcesWith(modelSaying(1)), "view.tsx": `import "./nowhere";\n${VIEW}` })),
}).install(listed(["manifest.generated.json", ...MODULES]));
check("a folder with a broken relative import still installs", missingDone.ok, true);
const said = await drawnBy(missing);
check(
	"and draws a failure naming the specifier and the module importing it",
	said.includes('"./nowhere"') && said.includes("view.tsx"),
	true,
);

const SINGLE = `import { createWidget } from "widgetarium";\nexport default createWidget({ draw: () => <b>one</b> });\n`;
check(
	"a single-file widget builds byte for byte as compileWidget of its source",
	compileWidgetFolder({ "widget.tsx": SINGLE, "manifest.generated.json": "{}", "widget.css": "" }, FOLDER),
	compileWidget(SINGLE, `${FOLDER}/widget.tsx`),
);
const single = fakeVault();
await createInstaller({ adapter: single, ...network(served({ "widget.tsx": SINGLE })) }).install(
	listed(["manifest.generated.json", "widget.tsx"]),
);
check(
	"and the build an install writes for it is that same text",
	single.files.get(builtCodePath(FOLDER)),
	compileWidget(SINGLE, `${FOLDER}/widget.tsx`),
);

for (const stray of ["../other/model.ts", "parts/../../model.ts", "/etc/model.ts", "parts//model.ts"]) {
	const strayed = fakeVault();
	const refused = await createInstaller({ adapter: strayed, ...network({}) }).install(
		listed(["manifest.generated.json", "widget.tsx", stray]),
	);
	check(`a listed file "${stray}" is refused`, [refused.ok, String(refused.failure).includes(stray)], [false, true]);
	check("and nothing of it reached the vault", strayed.files.size, 0);
}

const registryText = (files) =>
	JSON.stringify({ registry: 1, scope: "@demo", widgets: [{ name: "split", path: REPOSITORY_FOLDER, files }] });
check(
	"a registry row may list nested paths inside its folder",
	readRegistry(registryText(MODULES), "r").rows.map((row) => row.files),
	[MODULES],
);
check(
	"and a row listing one outside it is skipped",
	await withoutTheReport(() => readRegistry(registryText(["widget.tsx", "../x.ts"]), "r").rows.length),
	0,
);

const published = await publishWidget({
	folder: `registry/${ID}`,
	files: sourcesWith(modelSaying(7)),
	lockfile: {},
	askEsm: async () => {
		throw new Error("no network");
	},
});
check(
	"publishing a split widget reads its declaration across the folder",
	[published.ok, published.failure],
	[true, null],
);
check("and its card lists every module", published.record?.files, MODULES);

console.log(
	failed ? `\nwidget folder: ${failed} failed (${checks} checks)` : `\nwidget folder: clean (${checks} checks)`,
);
process.exit(failed ? 1 : 0);
