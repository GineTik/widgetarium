import { JSDOM } from "jsdom";
import { fakeVault } from "./fake-vault.mjs";

const dom = new JSDOM("<!doctype html><body></body>");
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle"]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}

const { declarationIn, dependenciesFrom, packageNames, publishWidget, widgetDependenciesIn, PUBLISHED_SHEET } = await import("./publish.mjs");
const { createInstaller } = await import("./.mjs-cache/installer.mjs");
const { WidgetRegistry } = await import("./.mjs-cache/registry.mjs");
const { WIDGETS_DIR } = await import("./.mjs-cache/paths.mjs");
const { RECORD_FILE } = await import("./.mjs-cache/engine/catalogue-index.mjs");
const { compileWidget } = await import("./.mjs-cache/engine/widget-build.mjs");

let failed = 0;
let checks = 0;
function check(name, got, want) {
	checks += 1;
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
}

const FOLDER = "widgets/@demo/clock";
const ID = "@demo/clock";
const INSTALLED = `${WIDGETS_DIR}/@demo/clock`;
const LOCKFILE = {
	packages: {
		"node_modules/react": { version: "19.2.8" },
		"node_modules/@dnd-kit/core": { version: "6.3.1" },
		"node_modules/@dnd-kit/modifiers": { version: "9.0.0" },
		"node_modules/tidy-cjs": { version: "2.0.0" },
	},
};
const servingEsm = async () => 'export * from "/react@19.2.8/X-abc/es2022/react.bundle.mjs";';
const servingNoEsm = async () => "build failed: the package has no ES module build";

const sourceSaying = (word) => `import { createWidget } from "widgetarium";
export default createWidget(function Clock() {
	return <b>${word}</b>;
});
`;

const declaring = (word, meta) => `import { createWidget } from "widgetarium";
export default createWidget(function Clock() {
	return <b>${word}</b>;
}, ${JSON.stringify(meta)});
`;

async function withoutTheReport(run) {
	const wasError = console.error;
	console.error = () => {};
	try {
		return await run();
	} finally {
		console.error = wasError;
	}
}

async function loadedFrom(vault) {
	const registry = new WidgetRegistry({ vault: { adapter: vault } });
	await withoutTheReport(() => registry.load());
	return registry.get(ID);
}

async function sheetsWornBy(vault) {
	dom.window.document.head.replaceChildren();
	await loadedFrom(vault);
	return [...dom.window.document.head.querySelectorAll("style")].map((node) => node.textContent);
}

function vaultHolding(files) {
	const held = fakeVault();
	held.files.set(`${INSTALLED}/widget.tsx`, sourceSaying("styled"));
	for (const [name, text] of Object.entries(files)) held.files.set(`${INSTALLED}/${name}`, text);
	return held;
}

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

const noNetwork = {
	fetchJson: async () => {
		throw new Error("no network");
	},
	fetchText: async () => {
		throw new Error("no network");
	},
};

const shelf = fakeVault();
shelf.files.set(`/repo/${FOLDER}/widget.tsx`, sourceSaying("only a source"));
const shelved = createInstaller({ adapter: shelf, disk: onMachineOver(shelf.files), ...noNetwork });

const offered = await shelved.discover({ path: "/repo/widgets" });
check("a folder holding no record at all is still offered as a widget", offered.map((entry) => entry.manifest.id), [ID]);
check("and the folder is what names it", offered[0].manifest.title, ID);

const copied = await shelved.install(offered[0]);
check("a folder holding nothing but its source installs", [copied.ok, copied.failure], [true, null]);
check("and lands as source and build, with no record invented beside them", [...shelf.files.keys()].filter((at) => at.startsWith(INSTALLED)).sort(), [`${INSTALLED}/build/widget.js`, `${INSTALLED}/widget.tsx`]);
check("and it draws", (await loadedFrom(shelf))?.component({}).props.children, "only a source");

check("a widget's sheet is published under the widget's own name", PUBLISHED_SHEET, "widget.css");
check("and a vault wears it", await sheetsWornBy(vaultHolding({ "widget.css": ".clock { color: red; }" })), [".clock { color: red; }"]);
check("and the name it used to carry is worn as well", await sheetsWornBy(vaultHolding({ "styles.css": ".clock { color: blue; }" })), [".clock { color: blue; }"]);
check("a folder holding both wears the published one, once", await sheetsWornBy(vaultHolding({ "widget.css": ".clock { color: red; }", "styles.css": ".clock { color: blue; }" })), [".clock { color: red; }"]);
const loose = fakeVault();
loose.files.set(`${WIDGETS_DIR}/loose/thing/widget.tsx`, sourceSaying("nowhere"));
const looseRegistry = new WidgetRegistry({ vault: { adapter: loose } });
await withoutTheReport(() => looseRegistry.load());
check("a folder no @scope holds is not a widget at all", looseRegistry.list().length, 0);

const older = fakeVault();
older.files.set(`${INSTALLED}/${RECORD_FILE}`, JSON.stringify({ id: ID, title: "Clock", props: { days: { kind: "value", verbs: { get: "required" } } } }));
older.files.set(`${INSTALLED}/widget.tsx`, sourceSaying("from a record's props"));
const fromRecord = await loadedFrom(older);
check("a record still carrying props still draws", fromRecord?.component({}).props.children, "from a record's props");
check("and the props come from it while the code declares none", fromRecord?.manifest.props.days.kind, "value");

const declared = fakeVault();
declared.files.set(`${INSTALLED}/${RECORD_FILE}`, JSON.stringify({ id: ID, title: "Clock", props: { days: { kind: "value", verbs: { get: "required" } } } }));
declared.files.set(`${INSTALLED}/widget.tsx`, declaring("from the code", { props: { days: { kind: "collection", verbs: { list: "required" } } } }));
const fromCode = await loadedFrom(declared);
check("where the code declares them the props come from the code", fromCode?.manifest.props.days.kind, "collection");
check("and the record still says what its card draws", fromCode?.manifest.title, "Clock");

const renaming = fakeVault();
renaming.files.set(`${INSTALLED}/widget.tsx`, declaring("named elsewhere", { id: "@evil/miner", title: "Miner" }));
check("a declaration cannot move a widget to an id its folder does not hold", (await loadedFrom(renaming))?.manifest.id, ID);

const importing = `import { createWidget } from "widgetarium";
import { Icon } from "widgetarium/kit";
import { useState } from "react";
import { DndContext } from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers/dist/edges";
import { shared } from "@demo/lib";
import type { Board } from "tidy-cjs";
export default createWidget(function Clock({ board }: { board: Board }) {
	return <b>{String([Icon, useState, DndContext, restrictToWindowEdges, shared, board].length)}</b>;
});
`;
const code = compileWidget(importing, `${FOLDER}/widget.tsx`);
check("what the engine itself hands a widget is not a package", packageNames(code, ["widgetarium", "widgetarium/kit", "@demo/lib"]), ["@dnd-kit/core", "@dnd-kit/modifiers", "react"]);
check("a subpath is the package it belongs to, not a name of its own", packageNames('require("@dnd-kit/modifiers/dist/edges");require("@dnd-kit/modifiers")', []), ["@dnd-kit/modifiers"]);
check("a type-only import is nothing at run time and nothing a widget depends on", Object.keys((await publishWidget({ folder: FOLDER, files: { "widget.tsx": importing }, lockfile: LOCKFILE, askEsm: servingEsm })).record.dependencies), ["@dnd-kit/core", "@dnd-kit/modifiers", "react"]);
check("a version comes from the author's lockfile", dependenciesFrom(["react"], LOCKFILE), { ok: true, dependencies: { react: "^19.2.8" }, failure: null });
check("and a package the lockfile pins nowhere stops the publish", dependenciesFrom(["nowhere"], LOCKFILE).failure, '"nowhere" is imported by the widget, and the lockfile pins no version for it');

const lying = { [RECORD_FILE]: JSON.stringify({ id: ID, title: "Clock", dependencies: { "left-pad": "^1.0.0" } }), "widget.tsx": importing };
const published = await publishWidget({ folder: FOLDER, files: lying, lockfile: LOCKFILE, askEsm: servingEsm });
check("a dependency written into the record by hand loses to what the source imports", published.record?.dependencies, { "@dnd-kit/core": "^6.3.1", "@dnd-kit/modifiers": "^9.0.0", react: "^19.2.8" });

const cjsOnly = { "widget.tsx": `import { createWidget } from "widgetarium";\nimport { pad } from "tidy-cjs";\nexport default createWidget(function Clock() { return <b>{String(pad)}</b>; });\n` };
const refused = await publishWidget({ folder: FOLDER, files: cjsOnly, lockfile: LOCKFILE, askEsm: servingNoEsm });
check("a package with no ES module build is refused at publish", [refused.ok, refused.failure], [false, '"tidy-cjs@^2.0.0" has no ES module build on esm.sh, so no vault could load it']);
check("and the same package served as one is published", (await publishWidget({ folder: FOLDER, files: cjsOnly, lockfile: LOCKFILE, askEsm: servingEsm })).record.dependencies, { "tidy-cjs": "^2.0.0" });

const unpublished = fakeVault();
unpublished.files.set(`/repo/${FOLDER}/widget.tsx`, cjsOnly["widget.tsx"]);
const unpublishedInstaller = createInstaller({ adapter: unpublished, disk: onMachineOver(unpublished.files), ...noNetwork });
const installedAnyway = await unpublishedInstaller.install((await unpublishedInstaller.discover({ path: "/repo/widgets" }))[0]);
check("while installing a folder nobody published reaches for no package at all", [installedAnyway.ok, installedAnyway.failure], [true, null]);

const whole = {
	[RECORD_FILE]: JSON.stringify({ id: ID, title: "Clock", description: "Tells the time.", slots: { face: { default: "@demo/face" } } }),
	"widget.tsx": declaring("published", { props: { days: { kind: "collection", verbs: { list: "required" } } } }),
	"styles.css": ".clock { color: red; }",
};
const wholly = await publishWidget({ folder: FOLDER, files: whole, lockfile: LOCKFILE, askEsm: servingEsm });
check("the record keeps what its card is drawn from", [wholly.record.id, wholly.record.title, wholly.record.description], [ID, "Clock", "Tells the time."]);
check("it lists the files a vault has to fetch, the sheet under the widget's own name", wholly.record.files, ["widget.tsx", "widget.css"]);
check("and the sheet travels beside it", wholly.sheet, ".clock { color: red; }");
check("the props are the ones the code declares", Object.keys(wholly.record.props), ["days"]);
check("and the widgets it cannot draw without are read off its slots", wholly.record.widgetDependencies, ["@demo/face"]);
check("a mount's default rows name widgets too", widgetDependenciesIn({ mounts: { holds: { default: [{ name: "Kanban", widget: "@task/kanban-board" }] } } }), ["@task/kanban-board"]);

check("a source declaring nothing declares nothing", declarationIn(compileWidget(sourceSaying("bare"), `${FOLDER}/widget.tsx`)), null);
check("a folder with no source is refused before anything else", (await publishWidget({ folder: FOLDER, files: {}, lockfile: LOCKFILE, askEsm: servingEsm })).failure, `${FOLDER} holds no widget source`);
check("and a folder outside a scope is refused too", (await publishWidget({ folder: "widgets/clock", files: whole, lockfile: LOCKFILE, askEsm: servingEsm })).failure, "widgets/clock is not a @scope/name folder");

console.log(`\n${failed === 0 ? `publish: clean (${checks} checks)` : `publish: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
