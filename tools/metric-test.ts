import fs from "node:fs";
import { JSDOM } from "jsdom";
import type { FunctionComponent } from "react";
import type { RecordRef } from "../packages/core/src/gateway/contract.ts";
import { byId } from "./dom-find.ts";
import { fieldAt } from "./held-fields.ts";
import { present } from "./page-dom.ts";
import { declaredPropIn } from "./card-props.ts";
import { runWidgetSource } from "./run-widget-source.ts";
import { standIn } from "./stand-in.ts";

type MetricOwn = typeof import("../registry/@default/metric-total/summary.ts") &
	typeof import("../registry/@default/metric-total/numbers.ts");
type MetricProps = Readonly<Record<string, unknown>>;

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
class InertResizeObserver {
	observe(): void {}
	disconnect(): void {}
}
Object.assign(globalThis, { ResizeObserver: InertResizeObserver });
Object.assign(dom.window, { ResizeObserver: InertResizeObserver });

const react = await import("react");
const { createElement: h, Fragment } = react;
const { render } = await import("../packages/core/src/engine/render.js");
const { ENGINE_SCOPE } = await import("../packages/core/src/registry.js");
const { api: widgetarium } = ENGINE_SCOPE;
const kit = await import("../packages/kit/src/index.ts");
const { collectionGateway, soloGateway } = await import("../packages/core/src/gateway/create.ts");
const { mapCollection } = await import("../packages/core/src/gateway/mapped.ts");
const { needsOf } = await import("../packages/core/src/gateway/props.js");

const WIDGET = "registry/@default/metric-total/widget.tsx";
const DECLARED: unknown = JSON.parse(fs.readFileSync("registry/@default/metric-total/manifest.generated.json", "utf8"));

const isMetric = (value: unknown): value is FunctionComponent<MetricProps> => typeof value === "function";

const RECORDS_PROP = declaredPropIn(fieldAt(DECLARED, "props", "getRecords"), "metric-total's getRecords");

const libs = new Map<string, unknown>();

function importing(): (name: string) => unknown {
	const modules: Readonly<Record<string, unknown>> = {
		widgetarium,
		"widgetarium/kit": kit,
		react,
		...Object.fromEntries(libs),
	};
	return (name) => {
		const found = modules[name];
		if (!found) throw new Error(`cannot import "${name}"`);
		return found;
	};
}

function run(file: string): Record<string, unknown> {
	return runWidgetSource(file, importing(), h, Fragment);
}

libs.set("@default/lib", run("registry/@default/lib.ts"));
const own = standIn<MetricOwn>(
	{
		...run("registry/@default/metric-total/summary.ts"),
		...run("registry/@default/metric-total/numbers.ts"),
	},
	["summarize", "shiftBy", "compactOf"],
	"metric-total's own modules",
);
function metricOf(file: string): FunctionComponent<MetricProps> {
	const drawn = run(file)["default"];
	if (!isMetric(drawn)) throw new Error(`${file} exports no component as its default`);
	return drawn;
}

const Metric = metricOf(WIDGET);

let failed = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "ok  " : "FAIL"} ${what}${ok ? "" : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(wanted)}`}`,
	);
}

const TODAY = "2026-09-12";
const dayBefore = (back: number): string => own.shiftBy(TODAY, -back);

interface MetricRow {
	readonly date?: string;
	readonly amount?: unknown;
}

type Rising = Parameters<MetricOwn["summarize"]>[3];

const recordsOver = (rows: readonly MetricRow[]): (MetricRow & { ref: string; name: string })[] =>
	rows.map((row, at) => ({ ref: `Metrics/r${at}.md`, name: `r${at}`, ...row }));

const summaryOf = (rows: readonly MetricRow[], days = 7, rising: Rising = "good"): ReturnType<MetricOwn["summarize"]> =>
	own.summarize(standIn<Parameters<MetricOwn["summarize"]>[0]>(recordsOver(rows), [], "records"), days, TODAY, rising);

const STEADY: readonly MetricRow[] = [
	{ date: dayBefore(0), amount: 10 },
	{ date: dayBefore(1), amount: 20 },
	{ date: dayBefore(8), amount: 5 },
];

const steady = summaryOf(STEADY);
check("the window sums only the days inside it", steady.total, 30);
check("today is the sum of today's records", steady.today, 10);
check(
	"peak and low read the days that carry a record, never the zero-filled ones",
	[steady.peak, steady.low],
	[20, 10],
);
check("the percent compares the window against the one before it", Math.round(Number(steady.percent)), 500);
check("the tone follows the change once it clears the neutral band", steady.tone, "up");

const fresh = summaryOf([{ date: dayBefore(0), amount: 40 }]);
check("an empty previous window has no percent rather than a confident zero", fresh.percent, null);
check("a metric that started from nothing still reads as a rise", fresh.tone, "up");

const still = summaryOf([
	{ date: dayBefore(0), amount: 100 },
	{ date: dayBefore(8), amount: 100 },
]);
check("a change under half a percent reads as neutral", still.tone, "flat");

const spending = summaryOf(STEADY, 7, "bad");
check("a rise the person called bad takes the falling tone", spending.tone, "down");

const leftOut = summaryOf([
	{ date: dayBefore(0), amount: 10 },
	{ amount: 7 },
	{ date: dayBefore(0), amount: "two" },
	{ date: own.shiftBy(TODAY, 3), amount: 9 },
]);
check("a record carrying no date is counted as left out", leftOut.undated, 1);
check("a record left out does not reach the total", leftOut.total, 10);

check(
	"a thousand is written compactly",
	[own.compactOf(3154), own.compactOf(128000), own.compactOf(7)],
	["3.15K", "128K", "7"],
);

const written: { readonly verb: string; readonly [field: string]: unknown }[] = [];
let minted = 0;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

function commandOver(verb: string, verbs: readonly string[]) {
	const send = (input: unknown) => {
		written.push({ verb, ...(isRecord(input) ? input : {}) });
		return { ok: true };
	};
	if (verbs.includes(verb)) return send;
	return Object.assign(send, { can: () => ({ can: false, reason: `${verb} is switched off` }) });
}

function gatewayOver(rows: readonly MetricRow[]): ReturnType<typeof mapCollection> {
	const held = recordsOver(rows).map((row) => ({ ref: row.ref, value: row }));
	minted += 1;
	const base = collectionGateway({
		id: `metric-test/${minted}`,
		handlers: {
			list: () => ({ rows: held, total: held.length }),
			get: (ref: RecordRef) => held.find((row) => row.ref === ref) ?? null,
		},
	});
	return mapCollection(base, { needs: needsOf(RECORDS_PROP) });
}

const PERIODS = [
	{ id: "p7", label: "Past 7 days", days: 7 },
	{ id: "p30", label: "Past 30 days", days: 30 },
];

function periodsGateway(): ReturnType<typeof collectionGateway> {
	minted += 1;
	const held = PERIODS.map((row) => ({ ref: row.id, value: row }));
	return collectionGateway({
		id: `metric-test/periods/${minted}`,
		settlesNow: true,
		handlers: {
			list: () => ({ rows: held, total: held.length }),
			get: (ref: RecordRef) => held.find((row) => row.ref === ref) ?? null,
		},
	});
}

const host = byId(document, "host");
const settled = async (): Promise<void> => {
	for (let tick = 0; tick < 5; tick += 1) await new Promise((done) => setTimeout(done, 0));
};

interface DrawAsk {
	readonly verbs?: readonly string[];
	readonly view?: string;
	readonly rising?: string;
}

async function draw(
	rows: readonly MetricRow[],
	{ verbs = ["create", "update", "remove"], view = "curve", rising = "good" }: DrawAsk = {},
): Promise<HTMLElement> {
	written.length = 0;
	render(null, host);
	minted += 1;
	render(
		h(Metric, {
			getRecords: gatewayOver(rows),
			createRecord: commandOver("create", verbs),
			updateRecord: commandOver("update", verbs),
			removeRecord: commandOver("remove", verbs),
			getTitle: soloGateway("Total orders", {}, `metric-test/title/${minted}`),
			getUnit: soloGateway("orders", {}, `metric-test/unit/${minted}`),
			getRising: soloGateway(rising, {}, `metric-test/rising/${minted}`),
			getPeriods: periodsGateway(),
			getPeriodPick: soloGateway("Past 7 days", {}, `metric-test/pick/${minted}`),
			getPeriod: soloGateway(PERIODS[0], {}, `metric-test/period/${minted}`),
			getView: soloGateway(view, {}, `metric-test/view/${minted}`),
		}),
		host,
	);
	await settled();
	return host;
}

const textIn = (selector: string): string => host.querySelector(selector)?.textContent ?? "";
const platesShown = (): string[] =>
	[...host.querySelectorAll(".mt-plate")].map(
		(plate) =>
			`${String(plate.querySelector(".mt-plate-value")?.textContent)} ${String(plate.querySelector(".mt-plate-label")?.textContent)}`,
	);
const pressed = (label: string): HTMLButtonElement | undefined =>
	[...host.querySelectorAll("button")].find(
		(button) => (button.getAttribute("aria-label") ?? button.textContent) === label,
	);

await draw(STEADY);
check("the headline is the window's own sum", textIn(".mt-total"), "30");
check("the four numbers stand beside it", platesShown(), ["+10 today", "20 peak", "10 low", "4 avg"]);
check(
	"the tone reaches the root, where the sheet reads it",
	host.querySelector(".wg-metric")?.getAttribute("data-tone"),
	"up",
);
check("the curve is drawn from the points", host.querySelectorAll(".mt-chart path").length, 2);

await draw(STEADY, { view: "bars" });
check("bars draw one rectangle per day of the window", host.querySelectorAll(".mt-chart rect[rx]").length, 7);

await draw(STEADY, { rising: "bad" });
check(
	"a metric where rising is bad turns the other way",
	host.querySelector(".wg-metric")?.getAttribute("data-tone"),
	"down",
);

await draw([]);
check("an empty folder says what to do instead of showing a confident zero", textIn(".mt-empty-note").length > 0, true);

await draw(STEADY, { verbs: [] });
check("a folder nothing can write to offers no add button", pressed("Add record"), undefined);

await draw(STEADY);
present(pressed("All records"), "the All records button").click();
await settled();
check("the list window holds a row per record", document.querySelectorAll(".mt-row").length, 3);

const removable = present(
	present([...document.querySelectorAll(".mt-row")][0], "the first row").querySelector("button"),
	"the row's delete button",
);
removable.click();
await settled();
check(
	"pressing delete asks the gateway to remove that very row",
	written.map((entry) => entry.verb),
	["remove"],
);

console.log(failed === 0 ? "metric gate: all checks pass" : `metric gate: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
