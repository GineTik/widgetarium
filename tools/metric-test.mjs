import fs from "node:fs";
import { JSDOM } from "jsdom";
import { runWidgetSource } from "./run-widget-source.mjs";

const dom = new JSDOM(`<!doctype html><body><div id="host"></div></body>`, { pretendToBeVisual: true });
for (const key of [
	"window",
	"document",
	"Node",
	"Element",
	"HTMLElement",
	"SVGElement",
	"getComputedStyle",
	"requestAnimationFrame",
	"cancelAnimationFrame",
	"MouseEvent",
	"Event",
	"MutationObserver",
]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}
globalThis.ResizeObserver = class {
	observe() {}
	disconnect() {}
};
globalThis.window.ResizeObserver = globalThis.ResizeObserver;

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
const DECLARED = JSON.parse(fs.readFileSync("registry/@default/metric-total/manifest.generated.json", "utf8")).props;

const libs = new Map();

function importing() {
	const modules = { widgetarium, "widgetarium/kit": kit, react, ...Object.fromEntries(libs) };
	return (name) => {
		const found = modules[name];
		if (!found) throw new Error(`cannot import "${name}"`);
		return found;
	};
}

function run(file) {
	return runWidgetSource(file, importing(), h, Fragment);
}

libs.set("@default/lib", run("registry/@default/lib.ts"));
const own = {
	...run("registry/@default/metric-total/summary.ts"),
	...run("registry/@default/metric-total/numbers.ts"),
};
const Metric = run(WIDGET).default;

let failed = 0;
function check(what, got, wanted) {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "ok  " : "FAIL"} ${what}${ok ? "" : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(wanted)}`}`,
	);
}

const TODAY = "2026-09-12";
const dayBefore = (back) => own.shiftBy(TODAY, -back);

const recordsOver = (rows) => rows.map((row, at) => ({ ref: `Metrics/r${at}.md`, name: `r${at}`, ...row }));

const summaryOf = (rows, days = 7, rising = "good") => own.summarize(recordsOver(rows), days, TODAY, rising);

const STEADY = [
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
check("the percent compares the window against the one before it", Math.round(steady.percent), 500);
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

const written = [];
let minted = 0;

function gatewayOver(rows, verbs = ["create", "update", "remove"]) {
	const held = recordsOver(rows).map((row) => ({ ref: row.ref, value: row }));
	minted += 1;
	const writes = {
		...(verbs.includes("create") ? { create: (draft) => (written.push({ verb: "create", ...draft }), null) } : {}),
		...(verbs.includes("update") ? { update: (input) => (written.push({ verb: "update", ...input }), null) } : {}),
		...(verbs.includes("remove") ? { remove: (ref) => void written.push({ verb: "remove", ref }) } : {}),
	};
	const base = collectionGateway({
		id: `metric-test/${minted}`,
		handlers: {
			list: () => ({ rows: held, total: held.length }),
			get: (ref) => held.find((row) => row.ref === ref) ?? null,
			...writes,
		},
	});
	return mapCollection(base, { needs: needsOf(DECLARED.records) });
}

const PERIODS = [
	{ id: "p7", label: "Past 7 days", days: 7 },
	{ id: "p30", label: "Past 30 days", days: 30 },
];

function periodsGateway() {
	minted += 1;
	const held = PERIODS.map((row) => ({ ref: row.id, value: row }));
	return collectionGateway({
		id: `metric-test/periods/${minted}`,
		settlesNow: true,
		handlers: {
			list: () => ({ rows: held, total: held.length }),
			get: (ref) => held.find((row) => row.ref === ref) ?? null,
		},
	});
}

const host = document.getElementById("host");
const settled = async () => {
	for (let tick = 0; tick < 5; tick += 1) await new Promise((done) => setTimeout(done, 0));
};

async function draw(rows, { verbs, view = "curve", rising = "good" } = {}) {
	written.length = 0;
	render(null, host);
	minted += 1;
	render(
		h(Metric, {
			records: gatewayOver(rows, verbs),
			title: soloGateway("Total orders", {}, `metric-test/title/${minted}`),
			unit: soloGateway("orders", {}, `metric-test/unit/${minted}`),
			rising: soloGateway(rising, {}, `metric-test/rising/${minted}`),
			periods: periodsGateway(),
			periodPick: soloGateway("Past 7 days", {}, `metric-test/pick/${minted}`),
			period: soloGateway(PERIODS[0], {}, `metric-test/period/${minted}`),
			view: soloGateway(view, {}, `metric-test/view/${minted}`),
		}),
		host,
	);
	await settled();
	return host;
}

const textIn = (selector) => host.querySelector(selector)?.textContent ?? "";
const platesShown = () =>
	[...host.querySelectorAll(".mt-plate")].map(
		(plate) =>
			`${plate.querySelector(".mt-plate-value").textContent} ${plate.querySelector(".mt-plate-label").textContent}`,
	);
const pressed = (label) =>
	[...host.querySelectorAll("button")].find(
		(button) => (button.getAttribute("aria-label") ?? button.textContent) === label,
	);

await draw(STEADY);
check("the headline is the window's own sum", textIn(".mt-total"), "30");
check("the four numbers stand beside it", platesShown(), ["+10 today", "20 peak", "10 low", "4 avg"]);
check(
	"the tone reaches the root, where the sheet reads it",
	host.querySelector(".wg-metric").getAttribute("data-tone"),
	"up",
);
check("the curve is drawn from the points", host.querySelectorAll(".mt-chart path").length, 2);

await draw(STEADY, { view: "bars" });
check("bars draw one rectangle per day of the window", host.querySelectorAll(".mt-chart rect[rx]").length, 7);

await draw(STEADY, { rising: "bad" });
check(
	"a metric where rising is bad turns the other way",
	host.querySelector(".wg-metric").getAttribute("data-tone"),
	"down",
);

await draw([]);
check("an empty folder says what to do instead of showing a confident zero", textIn(".mt-empty-note").length > 0, true);

await draw(STEADY, { verbs: [] });
check("a folder nothing can write to offers no add button", pressed("Add record"), undefined);

await draw(STEADY);
pressed("All records").click();
await settled();
check("the list window holds a row per record", document.querySelectorAll(".mt-row").length, 3);

const removable = [...document.querySelectorAll(".mt-row")][0].querySelector("button");
removable.click();
await settled();
check(
	"pressing delete asks the gateway to remove that very row",
	written.map((entry) => entry.verb),
	["remove"],
);

console.log(failed === 0 ? "metric gate: all checks pass" : `metric gate: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
