import { JSDOM } from "jsdom";
import type { FunctionComponent } from "react";
import type { Query } from "../packages/core/src/gateway/contract.ts";
import { byId } from "./dom-find.ts";
import { runWidgetSource } from "./run-widget-source.ts";

const dom = new JSDOM(`<!doctype html><body><div id="host"></div></body>`, { pretendToBeVisual: true });
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
	ResizeObserver: class {
		observe(): void {}
		disconnect(): void {}
	},
});

const react = await import("react");
const { createElement: h, Fragment } = react;
const { render } = await import("../packages/core/src/engine/render.js");
const { ENGINE_SCOPE } = await import("../packages/core/src/registry.js");
const { api: widgetarium } = ENGINE_SCOPE;
const kit = await import("../packages/kit/src/index.ts");
const { collectionGateway, soloGateway } = await import("../packages/core/src/gateway/create.ts");

type Props = Readonly<Record<string, unknown>>;

const modules: Readonly<Record<string, unknown>> = { widgetarium, "widgetarium/kit": kit, react };

function widgetAt(file: string): FunctionComponent<Props> {
	const held = runWidgetSource(file, (name) => modules[name], h, Fragment)["default"];
	if (typeof held !== "function") throw new Error(`${file} exports no component as its default`);
	return held as FunctionComponent<Props>;
}

const WidgetList = widgetAt("registry/@catalogue/widget-list/widget.tsx");
const FacetList = widgetAt("registry/@catalogue/facet-list/widget.tsx");
const FilterBar = widgetAt("registry/@catalogue/filter-bar/widget.tsx");
const Head = widgetAt("registry/@catalogue/head/widget.tsx");

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
	for (let turn = 0; turn < 6; turn += 1) await new Promise((done) => setTimeout(done, 10));
};

const host = byId(document, "host");
const all = (selector: string): Element[] => [...host.querySelectorAll(selector)];
const press = async (node: Element | null | undefined): Promise<void> => {
	node?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
	await settled();
};

const rowsOf = (id: string, rows: readonly Record<string, unknown>[]) =>
	collectionGateway<Record<string, unknown>>({
		id,
		handlers: {
			list: (query?: Query) => {
				const from = query?.offset ?? 0;
				const page = rows.slice(from, query?.limit === undefined ? undefined : from + query.limit);
				return { rows: page.map((row) => ({ ...row, ref: String(row["id"] ?? row["name"]) })), total: rows.length };
			},
		},
		settlesNow: true,
	});

const sent: [string, unknown][] = [];
const command = (name: string, answer: () => Promise<unknown> = async () => undefined) =>
	Object.assign(
		(input: unknown) => {
			sent.push([name, input]);
			return answer();
		},
		{ can: () => ({ can: true }) },
	);

const entry = (id: string, name: string, more: Record<string, unknown>) => ({
	id,
	scope: id.slice(0, id.indexOf("/")),
	name,
	title: name,
	description: `${name} draws`,
	tags: [],
	installed: true,
	action: "add",
	update: null,
	job: null,
	lacks: null,
	...more,
});

const ENTRIES = [
	entry("@default/task-card", "Task card", {}),
	entry("@demo/clock", "Clock", {
		installed: false,
		action: "install",
		job: { widget: "@demo/clock", state: "writing", done: 1, total: 3, failure: null },
	}),
	entry("@demo/timer", "Timer", { installed: false, action: "install" }),
	entry("@default/streak", "Habit streak", { action: "update", update: { here: "1111111", there: "2222222" } }),
	entry("@media/player", "Player", { lacks: "Wants a queue of tracks" }),
];

let carriedTo: unknown = null;
const lifted: unknown[] = [];

const drawList = async (isAsking: boolean): Promise<void> => {
	sent.length = 0;
	render(
		h(WidgetList, {
			getEntries: rowsOf(`entries-${String(isAsking)}`, ENTRIES),
			getSaid: soloGateway(
				{ title: "Widgets", lead: "", mode: isAsking ? "place" : "browse", isAsking },
				{},
				`said-${String(isAsking)}`,
			),
			getPageSize: soloGateway(12, {}, "size"),
			install: command("install"),
			pick: command("pick", async () => {
				if (!isAsking) throw new Error("Nothing is waiting for a widget");
			}),
			place: command("place"),
			widgetPreview: {
				canPreview: true,
				Drawn: ({ widget }: { widget: string }) => h("i", { className: "pv" }, widget),
			},
			widgetCarrier: {
				canCarry: true,
				lift: async (_pointer: unknown, carried: unknown) => {
					lifted.push(carried);
					return carriedTo;
				},
			},
		}),
		host,
	);
	await settled();
};

const card = (name: string): Element | undefined =>
	all(".wg-catalogue-card").find((node) => node.querySelector(".wg-catalogue-card-name")?.textContent === name);

console.log("\n— every widget is a card drawn as it really looks —");
await drawList(false);
check("a card per widget", all(".wg-catalogue-card").length, 5);
check(
	"each card holds the preview the host draws",
	all(".pv").map((node) => node.textContent),
	ENTRIES.map((one) => one.id),
);
check(
	"each card says what pressing it does",
	all(".wg-catalogue-card").map((node) => node.getAttribute("data-state")),
	["add", "busy", "install", "update", "add"],
);
check(
	"an installing widget wears the ring instead of a button",
	Boolean(card("Clock")?.querySelector(".wg-kit-ring")),
	true,
);
check(
	"the ring is measured once files are counted",
	Boolean(card("Clock")?.querySelector(".wg-kit-ring-svg.is-waiting")),
	false,
);
check(
	"and the card counts them",
	card("Clock")?.querySelector(".wg-catalogue-card-step")?.textContent,
	"Writing 1 of 3 files",
);
check(
	"an update names both commits",
	card("Habit streak")?.querySelector(".wg-catalogue-card-step")?.textContent,
	"1111111 here · 2222222 out",
);
check("a widget that lacks something stands after the divider", all(".wg-catalogue-divide").length, 1);

console.log("\n— a press installs or picks —");
await press(card("Timer"));
check("browsing, a missing widget is installed and nothing is picked", sent, [["install", { widget: "@demo/timer" }]]);
await press(card("Clock"));
check("a widget already installing is not asked twice", sent, [["install", { widget: "@demo/timer" }]]);
await press(card("Task card"));
check(
	"with nothing asked, adding says how to place instead",
	card("Task card")?.querySelector(".is-failure")?.textContent,
	"Nothing is waiting for a widget",
);
await drawList(true);
await press(card("Timer"));
check("asked by a board, a missing widget is installed and then picked", sent, [
	["install", { widget: "@demo/timer" }],
	["pick", { widget: "@demo/timer" }],
]);

console.log("\n— a drag places the widget where the carrier says —");
sent.length = 0;
carriedTo = { kind: "board", board: "b1", target: { kind: "beside", box: [0], at: 0 } };
card("Clock")?.dispatchEvent(new dom.window.MouseEvent("pointerdown", { bubbles: true, button: 0 }));
await settled();
check("the carrier is handed the widget and its name", lifted.at(-1), { widget: "@demo/clock", label: "Clock" });
check("and the drop becomes a place", sent, [["place", { widget: "@demo/clock", at: carriedTo }]]);
sent.length = 0;
carriedTo = null;
card("Clock")?.dispatchEvent(new dom.window.MouseEvent("pointerdown", { bubbles: true, button: 0 }));
await settled();
check("a drag that lands nowhere places nothing", sent, []);
check("and the card stays in the list", all(".wg-catalogue-card").length, 5);

console.log("\n— a facet picks and lets go —");
sent.length = 0;
const drawFacets = async (picked: string | null): Promise<void> => {
	render(
		h(FacetList, {
			getHeading: soloGateway("Show", {}, "heading"),
			getRows: rowsOf("facets", [
				{ name: "all", label: "All widgets", count: 3, icon: "layout-grid" },
				{ name: "installed", label: "Installed", count: 2, icon: "check" },
			]),
			getSelection: soloGateway(picked, {}, `picked-${String(picked)}`),
			select: command("select"),
			getFilter: soloGateway("", {}, "filter"),
			setFilter: command("filter"),
			getFilterPlaceholder: soloGateway("", {}, "placeholder"),
		}),
		host,
	);
	await settled();
};
await drawFacets(null);
const rowNamed = (label: string): Element | undefined =>
	all(".wg-catalogue-facet").find((node) => node.textContent?.includes(label));
await press(rowNamed("Installed"));
check("pressing a row picks its name", sent, [["select", "installed"]]);
await drawFacets("installed");
check("the picked row is drawn selected", rowNamed("Installed")?.classList.contains("is-selected"), true);
sent.length = 0;
await press(rowNamed("Installed"));
check("pressing it again lets it go", sent, [["select", null]]);
check("with no placeholder there is no search field", all(".wg-kit-field").length, 0);

console.log("\n— the filter bar counts and clears —");
sent.length = 0;
render(
	h(FilterBar, {
		getIsOpen: soloGateway(false, {}, "open"),
		setIsOpen: command("open"),
		getShown: soloGateway(2, {}, "shown"),
		getNarrowed: soloGateway(2, {}, "narrowed"),
		clearFilters: command("clear"),
	}),
	host,
);
await settled();
check("it says how many are shown", host.querySelector(".wg-catalogue-bar-count")?.textContent, "2 widgets");
check("and how many filters are on", host.querySelector(".wg-catalogue-bar-badge")?.textContent, "2");
await press(host.querySelector(".wg-catalogue-bar-filters"));
await press(host.querySelector(".wg-catalogue-bar-clear"));
check("the button opens the filters and Clear all clears them", sent, [
	["open", true],
	["clear", null],
]);

console.log("\n— the head's switch opens the other view —");
sent.length = 0;
render(
	h(Head, {
		getSaid: soloGateway({ title: "Widgets", lead: "Every widget", mode: "browse", isAsking: false }, {}, "said"),
		getView: soloGateway("catalogue", {}, "view"),
		openView: command("view"),
	}),
	host,
);
await settled();
const tabs = all(".wg-catalogue-head-tab");
check(
	"this view is the one switched on",
	tabs.map((tab) => tab.classList.contains("is-on")),
	[true, false],
);
await press(tabs[0]);
await press(tabs[1]);
check("only the other side opens anything", sent, [["view", { view: "docs" }]]);

console.log(`\n${checks - failed}/${checks} catalogue widget checks passed`);
process.exit(failed === 0 ? 0 : 1);
