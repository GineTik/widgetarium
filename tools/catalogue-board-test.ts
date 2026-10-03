import { JSDOM } from "jsdom";
import { createFileTree, createProbeHost, createRowSlot } from "./vault-fixture.ts";
import { catalogueWidgetFiles } from "./catalogue-widget-files.mts";
import type { MergedEntry } from "../packages/core/src/catalogue-entries.ts";
import type { CataloguePort } from "../packages/core/src/engine/catalogue-port.ts";
import { INSTALL_JOBS } from "../packages/core/src/engine/install-jobs.ts";
import { CATALOGUE_REQUESTS } from "../packages/core/src/engine/catalogue-requests.ts";
import { placeWidget } from "../packages/core/src/surface/drop-receivers.ts";

const dom = new JSDOM(
	`<!doctype html><body><div class="workspace-leaf-content"><div id="host" class="wg-root"></div></div></body>`,
	{
		pretendToBeVisual: true,
	},
);
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
	KeyboardEvent: dom.window.KeyboardEvent,
	Event: dom.window.Event,
	MutationObserver: dom.window.MutationObserver,
	CSS: { escape: (said: string) => said.replace(/["\\]/g, "\\$&") },
	ResizeObserver: class {
		observe(): void {}
		disconnect(): void {}
	},
});
Object.assign(dom.window, { ResizeObserver: Reflect.get(globalThis, "ResizeObserver") });

const react = await import("react");
const { createElement: h } = react;
const { render } = await import("../packages/core/src/engine/render.js");
const { WidgetSurface } = await import("../packages/core/src/surface.js");
const { WidgetRegistry } = await import("../packages/core/src/registry.js");
const { normalizeBoard } = await import("../packages/core/src/model.js");
const { boardEdits } = await import("../packages/core/src/surface/board-edits.js");
const { CATALOGUE_BOARD, DOCS_BOARD } = await import("../apps/obsidian/src/catalogue-boards.ts");
const { DOC_PAGES } = await import("../packages/core/src/docs.js");
const { TEMPLATES } = await import("../packages/core/src/templates.js");

let failed = 0;
let checks = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	checks += 1;
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "ok  " : "FAIL"} ${what}${ok ? "" : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(wanted)}`}`,
	);
}

const settled = async (): Promise<void> => {
	for (let turn = 0; turn < 12; turn += 1) await new Promise((done) => setTimeout(done, 15));
};

const laid = Object.fromEntries(
	Object.entries(catalogueWidgetFiles()).map(([name, text]) => [`.widgetarium/widgets/@catalogue/${name}`, text]),
);
const registry = new WidgetRegistry({ vault: { adapter: createFileTree(laid) } });
await registry.load();

function entryOf(id: string, title: string, held: { installed: boolean; keywords: string[] }): MergedEntry {
	const manifest = { id, title, description: `${title} draws`, keywords: held.keywords };
	return {
		definition: { manifest, installed: held.installed },
		offer: null,
		manifest,
		installed: held.installed,
		update: null,
	};
}

const ENTRIES = [
	entryOf("@default/task-card", "Task card", { installed: true, keywords: ["tasks"] }),
	entryOf("@demo/clock", "Clock", { installed: false, keywords: ["time"] }),
	entryOf("@default/streak", "Habit streak", { installed: true, keywords: ["habit"] }),
];

const port: CataloguePort = {
	can: true,
	entries: async () => ENTRIES,
	entryOf: (widget) => ENTRIES.find((entry) => entry.manifest["id"] === widget) ?? null,
	templates: () => TEMPLATES,
	install: async () => ({ ok: true }),
	uninstall: async () => ({ ok: true }),
	applyTemplate: async () => ({ ok: true }),
	place: placeWidget,
	openView: () => undefined,
	subscribe: () => () => undefined,
	jobs: INSTALL_JOBS,
	requests: CATALOGUE_REQUESTS,
	previewRegistry: null,
	previewHost: null,
};

const host = { ...createProbeHost(createRowSlot([])), catalogue: port };
const node = document.getElementById("host");
if (!node) throw new Error("no host");
let board = normalizeBoard(CATALOGUE_BOARD);
const draw = (): void =>
	render(
		h(WidgetSurface, {
			board,
			boardNode: node,
			registry,
			host,
			editing: true,
			isReadOnly: true,
			screen: true,
			initialWidth: 380,
			onChange: (next) => {
				board = next;
				draw();
			},
		}),
		node,
	);
draw();
await settled();
await settled();

const all = (selector: string): Element[] => [...document.querySelectorAll(selector)];
const text = (selector: string): string | null => document.querySelector(selector)?.textContent ?? null;
const press = async (target: Element | null | undefined): Promise<void> => {
	target?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
	await settled();
};
const facet = (label: string): Element | undefined =>
	all(".wg-catalogue-facet").find((row) => row.textContent?.includes(label));
const names = (): (string | null)[] => all(".wg-catalogue-card-name").map((one) => one.textContent);

console.log("\n— the board the sidebar draws is made of the catalogue's own widgets —");
check(
	"every widget of it is installed in the scope",
	registry.list().filter((one) => String(one.manifest?.["id"]).startsWith("@catalogue/")).length,
	11,
);
check("the head says what is browsed", text(".wg-catalogue-head-title"), "Widgets");
check("every entry is a card", names(), ["Task card", "Clock", "Habit streak"]);
check("the bar counts them", text(".wg-catalogue-bar-count"), "3 widgets");
check("and no filter is on yet", all(".wg-catalogue-bar-badge").length, 0);

console.log("\n— the filters open as a sheet, and a pick narrows the list —");
await press(document.querySelector(".wg-catalogue-bar-filters"));
check("pressing Filters opens the sheet", all(".wg-drawer-over.is-open .wg-drawer.is-sheet").length, 1);
await press(facet("Installed"));
check("Installed is drawn picked", facet("Installed")?.classList.contains("is-selected"), true);
check("and the list keeps only what is installed", names(), ["Task card", "Habit streak"]);
check("the bar says one filter is on", text(".wg-catalogue-bar-badge"), "1");
await press(facet("Installed"));
check("pressing it again lets it go", names(), ["Task card", "Clock", "Habit streak"]);
await press(facet("@demo"));
check("a pack narrows to its widgets", names(), ["Clock"]);
await press(all(".wg-catalogue-bar-clear")[0]);
check("Clear all brings every widget back", names(), ["Task card", "Clock", "Habit streak"]);
check("and leaves no filter counted", all(".wg-catalogue-bar-badge").length, 0);

console.log("\n— the search narrows the list it stands above —");
const search = document.querySelector(".wg-catalogue-head")?.closest(".wg-tree")?.querySelector(".wg-kit-field input");
if (search instanceof dom.window.HTMLInputElement) {
	search.value = "clock";
	search.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
}
await settled();
check("typing a word leaves only the widgets it names", names(), ["Clock"]);

console.log("\n— the views switch stands full width under the head, and nothing edits them —");
const tabs = (): Element[] => [
	...(document.querySelector(".wg-catalogue-views")?.querySelectorAll('[role="tab"]') ?? []),
];
const isOnScreen = (selector: string): boolean => all(selector).some((one) => !one.closest("[hidden]"));
check(
	"the switch offers both views",
	tabs().map((tab) => tab.textContent),
	["Widgets", "Templates"],
);
check("the view box draws no strip of its own", all(".wg-tree-swap-strip").length, 0);
check("and no tab menu is offered", all(".wg-tabs-more").length, 0);
await press(tabs()[1]);
const shownAt = (): number => all(".wg-tree-swap-held").findIndex((held) => !held.hasAttribute("hidden"));
check("pressing Templates shows the templates", shownAt(), 1);
check("and the filters, which belong to the widgets, step aside", isOnScreen(".wg-catalogue-bar-filters"), false);
await press(tabs()[0]);
check("pressing Widgets brings them back", isOnScreen(".wg-catalogue-bar-filters"), true);

console.log("\n— the sidebar's board is read-only —");
const tilesBefore = board.tiles.map((tile) => tile.id);
const placedAnywhere = Array.from({ length: 8 }, (_, at) =>
	placeWidget("@default/streak", {
		kind: "board",
		board: `board-${at + 1}`,
		target: { kind: "beside", box: [0], at: 0 },
	}),
);
check("no board here takes a dropped widget", placedAnywhere.includes(true), false);
check(
	"so its tiles stay as shipped",
	board.tiles.map((tile) => tile.id),
	tilesBefore,
);
check(
	"asked to edit, it still draws no edit chrome",
	all(".wg-root.is-editing").length + all(".wg-tree-add:not(.is-quiet)").length,
	0,
);
const written: string[] = [];
const readOnly = boardEdits({
	boardAsItStands: () => board,
	onChange: () => written.push("write"),
	registry,
	isReadOnly: true,
});
readOnly.removeTile("search");
readOnly.addTileInto("@default/streak", [0]);
readOnly.commitLayout((layout) => layout);
check("removing, adding and relaying write nothing", written.length, 0);
check("and it offers no place to drop", readOnly.addTileAt, null);
readOnly.patchTile("search", { props: {} });
check("a widget's own value still writes", written.length, 1);

console.log("\n— the docs are a board of their own —");
render(null, node);
let docs = normalizeBoard(DOCS_BOARD);
const drawDocs = (): void =>
	render(
		h(WidgetSurface, {
			board: docs,
			boardNode: node,
			registry,
			host,
			editing: false,
			screen: true,
			initialWidth: 380,
			onChange: (next) => {
				docs = next;
				drawDocs();
			},
		}),
		node,
	);
drawDocs();
await settled();
await settled();
check("its head says it is the documentation", text(".wg-catalogue-head-title"), "Documentation");
check(
	"and its switch stands on the docs side",
	all(".wg-catalogue-head-tab").map((tab) => tab.classList.contains("is-on")),
	[false, true],
);
check(
	"every page is listed",
	all(".wg-catalogue-facet").map((row) => row.textContent?.trim()),
	DOC_PAGES.map((page) => page.title),
);
check(
	"the first page is shown before any is picked",
	text(".wg-catalogue-doc-source"),
	`docs/catalogue/${DOC_PAGES[0]?.id}.md`,
);
await press(document.querySelector(".wg-catalogue-doc-next"));
check("Next opens the page after it", text(".wg-catalogue-doc-source"), `docs/catalogue/${DOC_PAGES[1]?.id}.md`);
check("and the list follows the page", facet(DOC_PAGES[1]?.title ?? "")?.classList.contains("is-selected"), true);

console.log(`\n${checks - failed}/${checks} catalogue board checks passed`);
process.exit(failed === 0 ? 0 : 1);
