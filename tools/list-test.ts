import { JSDOM } from "jsdom";
import type { FunctionComponent, ReactElement } from "react";
import type { CollectionGateway, Query } from "../packages/core/src/gateway/contract.ts";
import { byId, found } from "./dom-find.ts";
import { fieldIn } from "./held-fields.ts";
import { present } from "./page-dom.ts";
import { runWidgetSource } from "./run-widget-source.ts";
import { useData } from "../packages/core/src/gateway/use-data.ts";
import type { SlotDraw } from "../packages/core/src/widget-root.js";

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
});

const react = await import("react");
const { createElement: h, Fragment } = react;
const { render } = await import("../packages/core/src/engine/render.js");
const { ENGINE_SCOPE } = await import("../packages/core/src/registry.js");
const { api: widgetarium } = ENGINE_SCOPE;
const kit = await import("../packages/kit/src/index.ts");
const { collectionGateway, soloGateway, valueGateway } = await import("../packages/core/src/gateway/create.ts");
const { withSlotSurface } = await import("../packages/core/src/widget-root.js");

type ListProps = Readonly<Record<string, unknown>>;

const isList = (value: unknown): value is FunctionComponent<ListProps> => typeof value === "function";

const WIDGET = "registry/@default/list/widget.tsx";
const modules: Readonly<Record<string, unknown>> = { widgetarium, "widgetarium/kit": kit, react };
const List = runWidgetSource(WIDGET, (name) => modules[name], h, Fragment)["default"];
if (!isList(List)) throw new Error(`${WIDGET} exports no component as its default`);

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
const click = async (node: Element): Promise<void> => {
	node.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
	await settled();
};

const TASKS = Array.from({ length: 25 }, (_, at) => ({
	path: `Tasks/${String(at + 1).padStart(2, "0")}.md`,
	title: `Ship the board ${at + 1}`,
	priority: at % 3 === 0 ? "P1" : "P3",
}));

type Task = (typeof TASKS)[number];

const asked: { readonly limit: number | null; readonly where: Query["where"] }[] = [];

function holds(row: Task, where: NonNullable<Query["where"]>): boolean {
	return where.every((one) =>
		String(fieldIn(row, one.prop ?? "") ?? "")
			.toLowerCase()
			.includes(String(one.value ?? "").toLowerCase()),
	);
}

function tasksIn(held: readonly Task[], id: string): CollectionGateway<Task> {
	return collectionGateway<Task>({
		id,
		handlers: {
			list: (query?: Query) => {
				const where = query?.where ?? [];
				asked.push({ limit: query?.limit ?? null, where });
				const kept = held.filter((row) => holds(row, where));
				const from = query?.offset ?? 0;
				const page = kept.slice(from, query?.limit === undefined ? undefined : from + query.limit);
				return { rows: page.map((row) => ({ ...row, ref: row.path })), total: kept.length };
			},
		},
		settlesNow: true,
	});
}

function cell(start: string | null, id: string): { gateway: ReturnType<typeof valueGateway>; read: () => unknown } {
	const held: { value: unknown } = { value: start };
	const gateway = valueGateway({
		id,
		handlers: { get: () => held.value, update: (next: unknown) => void (held.value = next) },
		settlesNow: true,
	});
	return { gateway, read: () => held.value };
}

type HandedRow = ReturnType<typeof valueGateway>;

function Probe({ task }: { readonly task: HandedRow }): ReactElement {
	const held = useData(task.get).data;
	return h(
		"p",
		{ className: "probe" },
		`${String(fieldIn(held, "title") ?? "")} @ ${String(fieldIn(held, "path") ?? "")}`,
	);
}

function Commit({ commit }: { readonly commit: HandedRow }): ReactElement {
	const held = useData(commit.get).data;
	return h("p", { className: "probe" }, String(fieldIn(held, "title") ?? ""));
}

const slotOf = <Given>(draw: SlotDraw<Given>): ReturnType<typeof withSlotSurface<Given>> =>
	withSlotSurface(draw, { surface: "group", isCard: true });

const shown = (): (string | null)[] => [...host.querySelectorAll(".probe")].map((node) => node.textContent);
const said = (): string | null => host.querySelector(".wg-list-said")?.textContent?.trim() ?? null;
const foot = (): string | null => host.querySelector(".wg-list-foot span")?.textContent?.trim() ?? null;
const picks = (): Element[] => [...host.querySelectorAll(".wg-list-pick")];

const draw = async (props: ListProps): Promise<void> => {
	render(
		h(List, {
			rows: tasksIn(TASKS, "list-test/tasks"),
			handedAs: soloGateway("task", {}, "list-test/handed-task"),
			selection: soloGateway(null, {}, "list-test/pick-unwritable"),
			filter: soloGateway("", {}, "list-test/filter-empty"),
			filterField: soloGateway("title", {}, "list-test/field-title"),
			pageSize: soloGateway(10, {}, "list-test/size-ten"),
			heading: soloGateway("", {}, "list-test/heading-empty"),
			slots: { row: slotOf(Probe) },
			...props,
		}),
		host,
	);
	await settled();
};

const afresh = async (props: ListProps): Promise<void> => {
	render(null, host);
	await draw(props);
};

console.log("— a page at a time —");
await draw({});
check("the first load draws one page", shown().length, 10);
check(
	"the list is never read without a limit",
	asked.every((one) => one.limit !== null),
	true,
);
check("the foot counts what is shown against what there is", foot(), "10 of 25");

await click(found(host, ".wg-list-foot button"));
check("Show more draws the next page", shown().length, 20);
check("and the count follows it", foot(), "20 of 25");
check(
	"every row stands in the plate its slot wears",
	host.querySelectorAll('.wg-slot[data-surface="group"]').length,
	20,
);

console.log("\n— the whole row reaches the child —");
await afresh({});
check(
	"the child is handed the record whole, not the fields the parent named",
	shown()[0],
	"Ship the board 1 @ Tasks/01.md",
);

await afresh({ handedAs: soloGateway("commit", {}, "list-test/handed-commit"), slots: { row: slotOf(Commit) } });
check("a child naming its prop otherwise is handed the row under that name", shown()[0], "Ship the board 1");

console.log("\n— the heading —");
await afresh({});
check("an empty heading draws none", host.querySelectorAll(".wg-list-heading").length, 0);

await afresh({ heading: soloGateway("Everything open", {}, "list-test/heading-set") });
check(
	"a heading that was written stands above the rows",
	host.querySelector(".wg-list-heading")?.textContent,
	"Everything open",
);

console.log("\n— nothing, and nothing that matches —");
await afresh({ rows: tasksIn([], "list-test/empty") });
check("an empty collection says so", said(), "Nothing here yet.");
check("and offers nothing to press", host.querySelectorAll(".wg-list-said button").length, 0);

const filter = cell("nothing at all", "list-test/filter-cell");
await afresh({ filter: filter.gateway });
check(
	"a filter that matches nothing says so, keeps the count and offers to clear",
	said(),
	"No row matches the filter.25 in all.Clear the filter",
);
await click(found(host, ".wg-list-said button"));
check("pressing clear empties the filter", filter.read(), "");
check("and the rows come back", shown().length, 10);

console.log("\n— what could not be read, and what cannot draw —");
await afresh({
	rows: collectionGateway({
		id: "list-test/broken",
		handlers: {
			list: () => {
				throw new Error("The folder Tasks is not in this vault.");
			},
		},
	}),
});
check("a failed read shows the reason", said(), "The folder Tasks is not in this vault.");

await afresh({ slots: {} });
check("a list with no widget in its slot says so", said(), "This list has no widget to draw its rows with.");

console.log("\n— the press belongs to the list —");
const picked = cell(null, "list-test/pick-cell");
await afresh({ selection: picked.gateway });
check("every row is pressable", host.querySelectorAll('.wg-list-pick[role="button"]').length, 10);
await click(present(picks()[2], "the third row"));
check("a press writes that row's ref to the selection", picked.read(), "Tasks/03.md");
check(
	"and the row it names is marked, alone",
	picks().map((node) => node.hasAttribute("data-picked")),
	[false, false, true, false, false, false, false, false, false, false],
);

await afresh({});
check(
	"a selection that cannot be written leaves the rows unpressable",
	host.querySelectorAll('.wg-list-pick[role="button"]').length,
	0,
);

console.log(failed ? `\n${failed} of ${checks} failed` : `\n${checks} checks — the list holds`);
process.exit(failed ? 1 : 0);
