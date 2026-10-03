import { JSDOM } from "jsdom";
import type { ReactElement } from "react";
import { isObject } from "../packages/core/src/engine/is-object.js";
import { rowOf } from "../packages/core/src/gateway/create.js";
import type { CollectionGateway, ValueGateway } from "../packages/core/src/gateway/contract.js";
import type { HostConsole, ViewHost } from "../packages/core/src/gateway/host.js";
import type { EveryValueVerb } from "../packages/core/src/gateway/needs.js";
import { byId } from "./dom-find.ts";

const dom = new JSDOM(`<!doctype html><body><div id="host"></div></body>`, { pretendToBeVisual: true });
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
	MouseEvent: dom.window.MouseEvent,
	Event: dom.window.Event,
	MutationObserver: dom.window.MutationObserver,
	NodeFilter: dom.window.NodeFilter,
	ResizeObserver: SilentResizeObserver,
});
Object.assign(dom.window, { ResizeObserver: SilentResizeObserver });

const { createElement: h } = await import("react");
const { render } = await import("../packages/core/src/engine/render.js");
const { previewProps, previewGateways, previewSize, previewReader, previewHost } =
	await import("../packages/core/src/preview.js");
const { GRID } = await import("../packages/core/src/paths.js");
const { manifestOfEveryShippedWidget } = await import("./widget-props.ts");

let failed = 0;
const checks: string[] = [];
function check(label: string, got: unknown, want: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	checks.push(label);
	console.log(
		`${ok ? "OK " : "!! "} ${label}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
}

const pathIn = (value: unknown, ...keys: readonly string[]): unknown =>
	keys.reduce<unknown>((held, key) => (isObject(held) ? held[key] : undefined), value);
const lengthOf = (value: unknown): unknown => (Array.isArray(value) ? value.length : undefined);

const isGatewayOf = (value: unknown, kind: string): boolean =>
	isObject(value) && value["kind"] === kind && typeof value["get"] === "function";
const isCollectionGateway = (value: unknown): value is CollectionGateway<unknown> => isGatewayOf(value, "collection");
const isValueGateway = (value: unknown): value is ValueGateway<unknown, EveryValueVerb> => isGatewayOf(value, "value");
const isCallable = (value: unknown): value is () => unknown => typeof value === "function";

function collectionIn(gateways: Readonly<Record<string, unknown>>, name: string): CollectionGateway<unknown> {
	const gateway = gateways[name];
	if (!isCollectionGateway(gateway)) throw new Error(`${name} is no collection gateway`);
	return gateway;
}

function valueIn(gateways: Readonly<Record<string, unknown>>, name: string): ValueGateway<unknown, EveryValueVerb> {
	const gateway = gateways[name];
	if (!isValueGateway(gateway)) throw new Error(`${name} is no value gateway`);
	return gateway;
}

const shipped = await manifestOfEveryShippedWidget();
const kanban = shipped["@default/kanban-board"];
const card = shipped["@default/task-card"];

console.log("— the data a preview draws comes from the manifest —\n");
const gateways = previewGateways(kanban);
const tasks = collectionIn(gateways, "getTasks");
const listed = await tasks.list();
check(
	"the prop the widget declares is answered",
	listed.total,
	lengthOf(pathIn(kanban, "preview", "props", "getTasks", "rows")),
);
check(
	"and the rows carry the widget's own property names",
	pathIn(listed.rows[0], "props", "title"),
	"Design the onboarding flow",
);
check("each row is a record, with a ref of its own", listed.rows[0]?.ref, "preview/1.md");

console.log("\n— and every way back to the vault is shut —");
check("it cannot create", tasks.create.can().can, false);
check("it cannot update", tasks.update.can().can, false);
check("it cannot remove", tasks.remove.can().can, false);
check(
	"calling one anyway is refused, not a crash",
	await tasks.create({ props: {} }).then(
		() => "made",
		() => "refused",
	),
	"refused",
);
check(
	"and update the same",
	await tasks.update({ ref: rowOf({}, "preview/1.md").ref, data: {} }).then(
		() => "made",
		() => "refused",
	),
	"refused",
);

console.log("\n— a widget with no source of its own still previews —");
const cardProps = previewProps({ manifest: card }, {});
const sampled = pathIn(card, "preview", "props", "getTask", "value");
const cardDeclared = pathIn(card, "props", "getTask", "default", "value");
const cardTask = await valueIn(cardProps, "getTask").get();
check("its value comes from the manifest's sample", pathIn(cardTask, "title"), pathIn(sampled, "title"));
check("over the manifest's own default", pathIn(cardTask, "priority"), pathIn(sampled, "priority"));
check(
	"and the sample really overrides something",
	pathIn(sampled, "priority") !== pathIn(cardDeclared, "priority"),
	true,
);
check(
	"and it is handed no gateway it never declared",
	Object.keys(cardProps).filter((name) => name === "getTasks"),
	[],
);

console.log("\n— the sample world is local to the preview —");
const boardProps = previewProps({ manifest: kanban }, {});
const foldIntoGroup = boardProps["foldIntoGroup"];
check("a preview reaches no shared box", boardProps["context"], undefined);
check(
	"and it may not fold the board's views into a group",
	isCallable(foldIntoGroup) ? foldIntoGroup() : undefined,
	false,
);
check("nor open the catalogue it is being drawn inside", boardProps.catalogue.canOpen, false);
check("and pressing that closed catalogue answers nothing", await boardProps.catalogue.open(), null);
check("the board it reads is the sample's", pathIn(await valueIn(boardProps, "getBoard").get(), "properties"), [
	"Status",
	"Priority",
	"Assignees",
]);

console.log("\n— the size is declared, so a tile knows what it is drawing —");
const size = previewSize(kanban, GRID.cellPx, GRID.gapPx);
const declared = pathIn(kanban, "preview", "size");
const declaredWide = Number(pathIn(declared, "w"));
check("it takes the preview's own size", [size.w, size.h], [pathIn(declared, "w"), pathIn(declared, "h")]);
check("in pixels the grid agrees with", size.width, declaredWide * GRID.cellPx + (declaredWide - 1) * GRID.gapPx);
const fallback = previewSize({ defaultSize: { w: 3, h: 1 } }, GRID.cellPx, GRID.gapPx);
check("and falls back to the size the widget takes on a board", [fallback.w, fallback.h], [3, 1]);

console.log("\n— a widget that reads a file reads the manifest's, and nothing else —");
const codeBlock = shipped["@default/code-block"];
const reading = previewReader(codeBlock);
const fromManifest = await reading.read("main.py");
check("the file the manifest declares is answered", fromManifest.ok, true);
check("with the manifest's own text", fromManifest.text.startsWith("import sys"), true);
const stolen = await reading.read("Personal/Diary.md");
check("a file it never declared is refused", stolen.ok, false);
check("and the refusal says it is a preview, not a vault", /not in this preview/.test(String(stolen.failure)), true);
check("a refused read still answers with a text", stolen.text, "");
check("a manifest declaring no files reads nothing at all", (await previewReader({}).read("main.py")).ok, false);
check(
	"and the widget is handed one, so it never reaches around for a vault",
	typeof previewProps({ manifest: codeBlock }, {}).reader.read,
	"function",
);

const REFUSING_CONSOLE: HostConsole = {
	can: { log: false, run: false },
	log: () => false,
	run: async () => ({ ok: false, output: "", failure: "no console" }),
};
const REAL_HOST: ViewHost = {
	platform: "obsidian",
	type: "obsidian-desktop",
	can: { catalogue: false, fullscreen: false, subscribe: false, network: false, renderMarkdown: false },
	console: REFUSING_CONSOLE,
	ui: { notify() {}, renderMarkdown: () => () => {} },
};
const hostCarryingTheVault = { ...REAL_HOST, type: "x", app: {} };

console.log("\n— and an environment that can do nothing says so —");
const bare = previewHost(null);
check("it claims no capability", Object.keys(bare.can), []);
check("so a widget asking whether it may render markdown is told no", Boolean(bare.can.renderMarkdown), false);
check("its console refuses to run anything", (await bare.console.run("ls")).ok, false);
check(
	"but a real host behind it is passed through, narrowed",
	previewHost({ ...REAL_HOST, can: { ...REAL_HOST.can, renderMarkdown: true } }).can.renderMarkdown,
	true,
);
check("and never carries the vault across", "app" in previewHost(hostCarryingTheVault), false);

console.log("\n— it really draws —");
const drawnRows = (await collectionIn(previewProps({ manifest: kanban }, {}), "getTasks").list()).total;
const Leaf = (): ReactElement => h("div", { className: "leaf" }, `${drawnRows} rows`);
const mount = byId(dom.window.document, "host");
render(h(Leaf, previewProps({ manifest: kanban }, {})), mount);
check("the widget is handed the sample rows", mount.textContent?.includes("4 rows"), true);

console.log("\n— the catalogue is a switch, not a fact about the build —");
const { widgetCatalogue } = await import("../packages/core/src/engine/widget-catalogue.js");
const hostWithCatalogue = (catalogue: boolean): ViewHost => ({ ...REAL_HOST, can: { ...REAL_HOST.can, catalogue } });
const hostSilentOnCatalogue = hostWithCatalogue(true);
Reflect.deleteProperty(hostSilentOnCatalogue.can, "catalogue");
check(
	"a host that says nothing about the catalogue keeps it open",
	widgetCatalogue(hostSilentOnCatalogue).canOpen,
	true,
);
check("a host that allows it opens it", widgetCatalogue(hostWithCatalogue(true)).canOpen, true);
check("a host that switches it off closes it", widgetCatalogue(hostWithCatalogue(false)).canOpen, false);
check(
	"and the closed one picks nothing rather than raising a dialog",
	await widgetCatalogue(hostWithCatalogue(false)).open(),
	null,
);

console.log(
	failed
		? `\n${failed} of ${checks.length} failed`
		: `\n${checks.length} checks: a preview reads its manifest and writes nothing`,
);
process.exit(failed ? 1 : 0);
