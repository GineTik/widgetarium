import fs from "node:fs";
import { JSDOM } from "jsdom";
import esbuild from "esbuild";
import type { App } from "obsidian";
import { fakeVault, type FakeVault } from "./fake-vault.ts";
import { standIn } from "./stand-in.ts";
import { byId } from "./dom-find.ts";
import { isObject } from "../packages/core/src/engine/is-object.js";
import type { HostPlugin } from "../apps/obsidian/src/host.js";
import type { Board } from "../packages/core/src/model.js";
import type { Tile } from "../packages/core/src/board-tiles.js";
import { surfaceOptions } from "../apps/obsidian/build.mts";

const dom = new JSDOM(`<!doctype html><body><div class="view-content"><div id="host"></div></div></body>`, {
	pretendToBeVisual: true,
});
class SilentResizeObserver {
	observe(): void {}
	disconnect(): void {}
}
Object.assign(globalThis, {
	window: dom.window,
	document: dom.window.document,
	Node: dom.window.Node,
	Element: dom.window.Element,
	HTMLElement: dom.window.HTMLElement,
	SVGElement: dom.window.SVGElement,
	getComputedStyle: dom.window.getComputedStyle,
	requestAnimationFrame: dom.window.requestAnimationFrame,
	cancelAnimationFrame: dom.window.cancelAnimationFrame,
	KeyboardEvent: dom.window.KeyboardEvent,
	MouseEvent: dom.window.MouseEvent,
	Event: dom.window.Event,
	MutationObserver: dom.window.MutationObserver,
	ResizeObserver: SilentResizeObserver,
});
Object.assign(dom.window, { ResizeObserver: SilentResizeObserver });
Object.defineProperty(dom.window.HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 1280 });

const { createElement: h } = await import("react");
const engineReact = await import("react");
const { render } = await import("../packages/core/src/engine/render.js");
const { WidgetSurface, resolveSlots } = await import("../packages/core/src/surface.js");
const { WidgetRegistry, ENGINE_SCOPE } = await import("../packages/core/src/registry.js");
const { normalizeBoard } = await import("../packages/core/src/model.js");
const { createHost } = await import("../apps/obsidian/src/host.js");
const { gatewayCache } = await import("../packages/core/src/gateway/cache.ts");
const { reactClash, slotFit } = await import("../packages/core/src/fit.js");
const { keyFor, modulePath, createModuleSpace, HELD_BY_THE_ENGINE } =
	await import("../packages/core/src/engine/modules.js");
const { WIDGETS_DIR, LOCK_PATH } = await import("../packages/core/src/paths.js");

const OWN = "@two/own";
const HOSTED = "@two/hosted";
const REACT_18 = "18.3.1";
const ENGINE_REACT = engineReact.version;

const built = await esbuild.build(surfaceOptions());
const SURFACE_SOURCE = surfaceSourceOf(built.outputFiles);

function surfaceSourceOf(outputs: readonly { readonly text: string }[] | undefined): string {
	const first = outputs?.[0];
	if (!first) throw new Error("esbuild wrote no surface bundle");
	return first.text;
}

const pathIn = (value: unknown, ...keys: readonly string[]): unknown =>
	keys.reduce<unknown>((held, key) => (isObject(held) ? held[key] : undefined), value);

const PROBE = `import { IValueGateway, createWidget, defineLayout, soloGateway, useData, z } from "widgetarium";
import { useEffect, useState, version } from "react";

const own = soloGateway(() => globalThis.WG_BOX[version], {}, \`probe/\${version}\`);

export const layout = defineLayout({ size: { preferredWidth: 320, preferredHeight: "auto" } });
export default createWidget({
	inject: { value: IValueGateway.of(z.unknown().default(null)).pick("get") },
	draw: function Probe({ value }) {
		const [pressed, setPressed] = useState(0);
		useEffect(() => () => { globalThis.WG_GONE[version] = (globalThis.WG_GONE[version] ?? 0) + 1; }, []);
		const mine = useData(own.get);
		return (
			<div className="probe">
				<b className="probe-react">{version}</b>
				<span className="probe-value">{String(value)}</span>
				<span className="probe-own">{String(mine.data)}</span>
				<button className="probe-press" onClick={() => setPressed(pressed + 1)}>{String(pressed)}</button>
			</div>
		);
	},
});
`;

const NUMBER_PROP = { value: { kind: "value", type: "number", verbs: { get: "required" } } };

function widgetFolder(vault: FakeVault, id: string, manifest: Readonly<Record<string, unknown>>): void {
	vault.files.set(
		`${WIDGETS_DIR}/${id}/manifest.generated.json`,
		JSON.stringify({ id, api: 1, title: id, props: NUMBER_PROP, ...manifest }),
	);
	vault.files.set(`${WIDGETS_DIR}/${id}/widget.tsx`, PROBE);
}

interface LockedModule {
	readonly path: string;
	readonly hash: string;
	readonly widgets: readonly string[];
}

function vaultWithBothReacts(): FakeVault {
	const vault = fakeVault();
	widgetFolder(vault, HOSTED, {});
	widgetFolder(vault, OWN, { dependencies: { react: `^${REACT_18}`, "react-dom": `^${REACT_18}` } });
	const modules: Record<string, LockedModule> = {};
	for (const name of ["react", "react-dom"]) {
		const key = keyFor(name, REACT_18);
		vault.files.set(modulePath(key), fs.readFileSync(`tools/fixture-react/${name}.js`, "utf8"));
		modules[key] = { path: modulePath(key), hash: "fixture", widgets: [OWN] };
	}
	vault.files.set(LOCK_PATH, JSON.stringify({ version: 1, widgets: {}, modules }));
	return vault;
}

const adapter = vaultWithBothReacts();
const app = {
	vault: {
		adapter,
		getAbstractFileByPath: () => null,
		cachedRead: async () => "",
		read: async () => "",
		process: async () => "",
		on: () => ({}),
		off: () => {},
	},
	metadataCache: { getFileCache: () => ({ frontmatter: {} }), on: () => ({}), off: () => {} },
	fileManager: { processFrontMatter: async () => {} },
	workspace: { getLeaf: () => ({ openFile: async () => {} }) },
};

const box: Record<string, number> = { [ENGINE_REACT]: 100, [REACT_18]: 200 };
const gone: Record<string, number> = {};
Object.assign(globalThis, { WG_BOX: box, WG_GONE: gone });
const host = createHost(
	standIn<App>(app, ["vault", "metadataCache", "fileManager", "workspace"], "app"),
	standIn<HostPlugin>(
		{ registerEvent: () => {}, addChild: () => {}, removeChild: () => {} },
		["addChild", "removeChild"],
		"plugin",
	),
);
const registry = new WidgetRegistry({ vault: { adapter } }, SURFACE_SOURCE);
await registry.load();

const BOARD = {
	tiles: [
		{ id: "hosted", widget: HOSTED, props: { value: { implementation: "@core/typed-value", fields: { value: 11 } } } },
		{ id: "own", widget: OWN, props: { value: { implementation: "@core/typed-value", fields: { value: 22 } } } },
	],
	layout: { left: [], main: [[{ id: "hosted", height: 120 }], [{ id: "own", height: 120 }]], right: [] },
};

let board = normalizeBoard(BOARD);
const root = byId(dom.window.document, "host");
const draw = (): void => {
	const surfaceProps = {
		boardNode: root,
		board,
		registry,
		host,
		editing: false,
		screen: true,
		initialWidth: 1280,
		onChange: (next: Board) => {
			board = next;
			draw();
		},
		onToggleEditing: () => {},
		onWidth: () => {},
	};
	render(h(WidgetSurface, surfaceProps), root);
};

const settle = async (times = 40): Promise<void> => {
	for (let index = 0; index < times; index += 1) await new Promise((resolve) => setTimeout(resolve, 1));
};

let failed = 0;
let checks = 0;
const check = (label: string, got: unknown, want: unknown): void => {
	checks += 1;
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${label}${ok ? "" : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`}`,
	);
};

const all = (selector: string): Element[] => [...root.querySelectorAll(selector)];
const said = (selector: string): (string | undefined)[] => all(selector).map((node) => node.textContent?.trim());

draw();
await settle();

console.log("\n— a widget brings its own React, and the plugin keeps its own —");
check("the engine's React is the one the plugin was built with", ENGINE_SCOPE.react.version, ENGINE_REACT);
check("a widget declaring nothing is left on it", registry.get(HOSTED)?.react?.version, ENGINE_REACT);
check("and needs no root of its own", registry.get(HOSTED)?.draw, null);
check("a widget declaring react gets the version it asked for", registry.get(OWN)?.react?.version, REACT_18);
check("and is handed a way to draw itself", typeof registry.get(OWN)?.draw, "function");
check(
	"neither loaded with an error",
	[registry.get(HOSTED)?.error ?? null, registry.get(OWN)?.error ?? null],
	[null, null],
);

console.log("\n— and both draw on one board —");
check("two widgets drew", said(".probe-react").length, 2);
check("each one says which React drew it", said(".probe-react").sort(), [REACT_18, ENGINE_REACT].sort());
check("each one read its own prop through a hook", said(".probe-value").sort(), ["11", "22"]);
check("the one on its own React stands behind a seam", all(".wg-mounted .probe").length, 1);

const press = all(".probe-press").find((node) => node.closest(".wg-mounted"));
if (!press) throw new Error("the widget on its own React drew no button");
await (async () => {
	press.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
	await settle();
})();
check("a hook inside it answers a press", press.textContent?.trim(), "1");
check(
	"while the widget on the engine's React keeps its own count",
	all(".probe-press")
		.find((node) => !node.closest(".wg-mounted"))
		?.textContent?.trim(),
	"0",
);

console.log("\n— one cache, however many Reacts —");
const ownSaid = (inSeam: boolean): string | undefined =>
	all(".probe-own")
		.find((node) => Boolean(node.closest(".wg-mounted")) === inSeam)
		?.textContent?.trim();
check("each widget read a gateway of its own making", [ownSaid(false), ownSaid(true)], ["100", "200"]);

box[REACT_18] = 201;
box[ENGINE_REACT] = 101;
gatewayCache.invalidate(`probe/${REACT_18}`);
gatewayCache.invalidate(`probe/${ENGINE_REACT}`);
await settle();
check("invalidating the one cache reaches the widget on its own React", ownSaid(true), "201");
check("and the widget on the engine's React alike", ownSaid(false), "101");

board = normalizeBoard({
	tiles: BOARD.tiles.slice(0, 1),
	layout: { left: [], main: [[{ id: "hosted", height: 120 }]], right: [] },
});
draw();
await settle();
check(
	"taking the tile away releases the root it drew in",
	[all(".wg-mounted .probe").length, gone[REACT_18] ?? 0],
	[0, 1],
);
check("and leaves the widget beside it mounted", [said(".probe-react"), gone[ENGINE_REACT] ?? 0], [[ENGINE_REACT], 0]);

console.log("\n— nothing may be installed under a name the engine answers —");
let askedOfTheNetwork = 0;
const space = createModuleSpace({
	adapter: fakeVault(),
	fetchText: async () => {
		askedOfTheNetwork += 1;
		return "";
	},
});
for (const name of HELD_BY_THE_ENGINE) {
	const refused = await space.take({ modules: {} }, name, "1.0.0");
	check(
		`"${name}" is refused before anything is fetched`,
		[refused.ok, refused.failure?.includes(name), askedOfTheNetwork],
		[false, true, 0],
	);
}

console.log("\n— the surface takes the core, it does not carry one —");
const coreExports = await import("../packages/core/src/api-core.js");
const coreHolders = [...SURFACE_SOURCE.matchAll(/var (\w+) = require\("widgetarium\/core"\)/g)].map(
	(found) => found[1] ?? "",
);
const readFromCore = new Set(
	coreHolders.flatMap((holder) =>
		[...SURFACE_SOURCE.matchAll(new RegExp(`\\b${holder}\\.(\\w+)`, "g"))].map((found) => found[1] ?? ""),
	),
);
check("the surface asks the core for what it needs", coreHolders.length > 0, true);
check(
	"and asks for nothing the core does not export",
	[...readFromCore].filter((name) => !(name in coreExports)),
	[],
);
check("the emoji drawings stay behind that boundary", SURFACE_SOURCE.includes('"grinning-face"'), false);
check("and so does the class merger", SURFACE_SOURCE.includes("twJoin"), false);

console.log("\n— a slot may not cross a React —");
const onePlace = { instance: "one", version: "19.2.8" };
check("one React is no clash", reactClash(onePlace, { ...onePlace }), null);
check(
	"but a second instance of that very version is",
	reactClash(onePlace, { instance: "another", version: "19.2.8" })?.includes("19.2.8"),
	true,
);
check(
	"a widget nobody has loaded is no clash",
	[reactClash(null, onePlace), reactClash(onePlace, undefined)],
	[null, null],
);
const OWN_MANIFEST: Readonly<Record<string, unknown>> = { id: OWN };
const NO_SLOTS_PICKED = standIn<Tile>({ slots: {} }, ["slots"], "tile");
const clash = reactClash(registry.get(HOSTED)?.react, registry.get(OWN)?.react);
check("two widgets on two Reacts clash, and it names the parent's version", clash?.includes(ENGINE_REACT), true);
check("and the child's", clash?.includes(REACT_18), true);
check("the picker ranks it short and says why", slotFit(OWN_MANIFEST, {}, clash), { order: 2, lacks: clash });
check("with nothing to say, the picker is unchanged", slotFit(OWN_MANIFEST, {}, null), { order: 1, lacks: null });

const holder = { id: HOSTED, slots: { card: { default: OWN } } };
const refused = resolveSlots({
	manifest: holder,
	tile: NO_SLOTS_PICKED,
	registry,
	host,
	foldIntoGroup: null,
	gatewaysOf: () => ({}),
})["card"];
const drawnRefusal: unknown = typeof refused === "function" ? Reflect.apply(refused, undefined, []) : undefined;
check(
	"the slot draws the refusal rather than emptiness",
	[typeof refused, pathIn(drawnRefusal, "props", "children", "1", "props", "children")],
	["function", clash],
);
check(
	"while a slot filled from the same React draws",
	typeof resolveSlots({
		manifest: { id: HOSTED, slots: { card: { default: HOSTED } } },
		tile: NO_SLOTS_PICKED,
		registry,
		host,
		foldIntoGroup: null,
		gatewaysOf: () => ({}),
	})["card"],
	"function",
);

console.log("\n— and a reload strands no scope —");
await registry.load();
board = normalizeBoard(BOARD);
draw();
await settle();
check(
	"both widgets draw again after the registry reloads",
	said(".probe-react").sort(),
	[REACT_18, ENGINE_REACT].sort(),
);
check("and the one on its own React still has it", registry.get(OWN)?.react?.version, REACT_18);

console.log(
	`\n${failed === 0 ? `react as a module: clean (${checks} checks)` : `react as a module: ${failed} failed`}`,
);
process.exit(failed === 0 ? 0 : 1);
