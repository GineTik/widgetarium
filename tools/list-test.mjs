import fs from "node:fs";
import { JSDOM } from "jsdom";
import { transform } from "sucrase";
import { buildMirror } from "./mirror.mjs";

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

buildMirror();
const react = await import("react");
const { createElement: h, Fragment } = react;
const { render } = await import("./.mjs-cache/engine/render.mjs");
const { ENGINE_SCOPE } = await import("./.mjs-cache/registry.mjs");
const { api: widgetarium } = ENGINE_SCOPE;
const kit = await import("./.mjs-cache/kit.mjs");
const { collectionGateway, soloGateway, valueGateway } = await import("./.mjs-cache/gateway/create.mjs");
const { surfacedSlot } = await import("./.mjs-cache/widget-root.mjs");

const WIDGET = "registry/@default/list/widget.tsx";
const modules = { widgetarium, "widgetarium/kit": kit, react };
const code = transform(fs.readFileSync(WIDGET, "utf8"), {
	transforms: ["typescript", "jsx", "imports"],
	jsxPragma: "h",
	jsxFragmentPragma: "Fragment",
	production: true,
	filePath: WIDGET,
}).code;
const shell = { exports: {} };
new Function("require", "module", "exports", "h", "Fragment", code)(
	(name) => modules[name],
	shell,
	shell.exports,
	h,
	Fragment,
);
const List = shell.exports.default;

let failed = 0;
let checks = 0;
function check(what, got, wanted) {
	checks += 1;
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "ok  " : "FAIL"} ${what}${ok ? "" : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(wanted)}`}`,
	);
}

const settled = async () => {
	for (let turn = 0; turn < 6; turn += 1) await new Promise((done) => setTimeout(done, 10));
};

const host = document.getElementById("host");
const click = async (node) => {
	node.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
	await settled();
};

const TASKS = Array.from({ length: 25 }, (_, at) => ({
	path: `Tasks/${String(at + 1).padStart(2, "0")}.md`,
	title: `Ship the board ${at + 1}`,
	priority: at % 3 === 0 ? "P1" : "P3",
}));

const asked = [];

function holds(row, where) {
	return where.every((one) =>
		String(row[one.prop] ?? "")
			.toLowerCase()
			.includes(String(one.value ?? "").toLowerCase()),
	);
}

function tasksIn(held, id) {
	return collectionGateway({
		id,
		handlers: {
			list: (query) => {
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

function cell(start, id) {
	const held = { value: start };
	const gateway = valueGateway({
		id,
		handlers: { get: () => held.value, update: (next) => void (held.value = next) },
		settlesNow: true,
	});
	return { gateway, read: () => held.value };
}

function Probe({ task }) {
	const held = widgetarium.useData(task.get).data ?? {};
	return h("p", { className: "probe" }, `${held.title ?? ""} @ ${held.path ?? ""}`);
}

function Commit({ commit }) {
	const held = widgetarium.useData(commit.get).data ?? {};
	return h("p", { className: "probe" }, String(held.title ?? ""));
}

const slotOf = (draw) => surfacedSlot(draw, { surface: "group", isCard: true });

const shown = () => [...host.querySelectorAll(".probe")].map((node) => node.textContent);
const said = () => host.querySelector(".wg-list-said")?.textContent?.trim() ?? null;
const foot = () => host.querySelector(".wg-list-foot span")?.textContent?.trim() ?? null;
const picks = () => [...host.querySelectorAll(".wg-list-pick")];

const draw = async (props) => {
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

const afresh = async (props) => {
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

await click(host.querySelector(".wg-list-foot button"));
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
await click(host.querySelector(".wg-list-said button"));
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
await click(picks()[2]);
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
