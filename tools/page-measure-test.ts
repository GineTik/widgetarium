import { layJsdomGlobals } from "./jsdom-globals.ts";

layJsdomGlobals();
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const { act, createElement: h } = await import("react");
const { createRoot } = await import("react-dom/client");
const { measuredFindingsIn } = await import("../packages/core/src/page-measure.js");
const { Page, Section, Button, Hero } = await import("../packages/kit/src/index.js");

let failed = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${what}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(wanted)}`}`,
	);
}

function frameOf(name: string, inner: string): string {
	return `<div class="wg-design-frame"><div class="wg-design-top"><span class="wg-design-name">${name}</span></div><div class="wg-design-screen">${inner}</div></div>`;
}

const FINISH_RULE = /^FN\d/;

function rulesOn(html: string): string[] {
	const root = document.createElement("div");
	root.innerHTML = html;
	return measuredFindingsIn(root)
		.filter((one) => !FINISH_RULE.test(one.rule))
		.map((one) => `${one.rule}@${one.frame}`);
}

interface Box {
	readonly left: number;
	readonly top: number;
	readonly width: number;
	readonly height: number;
}

function laid(node: Element | null, { left, top, width, height }: Box): void {
	if (!node) throw new Error("laid: no node to lay");
	const rect = { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top };
	Object.assign(node, { getBoundingClientRect: () => ({ ...rect, toJSON: () => rect }) });
}

function finishRulesIn(root: Element): string[] {
	return measuredFindingsIn(root)
		.filter((one) => FINISH_RULE.test(one.rule))
		.map((one) => `${one.rule}: ${one.said}`);
}

function frameNode(inner: string): HTMLElement {
	const root = document.createElement("div");
	root.innerHTML = frameOf("Page", inner);
	document.body.append(root);
	return root;
}

const rows = (count: number, badge = ""): string =>
	Array.from(
		{ length: count },
		(_, at) => `<div class="wg-kit-row">Row ${at}${badge ? `<span class="wg-kit-pill">${badge}</span>` : ""}</div>`,
	).join("");
const list = (count: number, badge = ""): string => `<div class="wg-kit-list">${rows(count, badge)}</div>`;
const hero = '<section class="wg-kit-hero"><b>Hi</b></section>';

check("a page with a hero and one short list passes every measured rule", rulesOn(frameOf("Home", hero + list(3))), []);
check("a page of lists alone fails C1", rulesOn(frameOf("People", list(3))), ["C1@People"]);
check(
	"a button right after a list fails S2, one in a section header does not",
	rulesOn(
		frameOf(
			"Person",
			`${hero}<div><div class="wg-kit-list">${rows(2)}</div><button class="wg-kit-btn">Add step</button></div><header class="wg-kit-section-head"><div class="wg-kit-list"></div><button class="wg-kit-btn">Add</button></header>`,
		),
	),
	["S2@Person"],
);
check(
	"the same badge on more than a third of the rows fails R3",
	rulesOn(frameOf("People", hero + list(6, "Overdue"))),
	["R3@People"],
);
check(
	"six sections on one page fail PG5",
	rulesOn(frameOf("Home", hero + '<section data-wg-section=""></section>'.repeat(6))),
	["PG5@Home"],
);
check(
	"an overview section with more than five rows fails S4 on Home only",
	[
		rulesOn(frameOf("Home", `<div data-wg-page="home">${hero}<section data-wg-section="">${list(7)}</section></div>`)),
		rulesOn(
			frameOf("People", `<div data-wg-page="index">${hero}<section data-wg-section="">${list(7)}</section></div>`),
		),
	],
	[["S4@Home"], []],
);
check(
	"two empty states on one page fail C6",
	rulesOn(frameOf("Empty", '<div class="wg-kit-empty"></div><div class="wg-kit-empty"></div>')),
	["C6@Empty"],
);

const homeWithoutHero: Parameters<typeof Page>[0] = {
	kind: "index",
	title: "People",
};
// @ts-expect-error
const homeMissingHero: Parameters<typeof Page>[0] = { kind: "home", title: "Today" };
// @ts-expect-error
const indexWithHero: Parameters<typeof Page>[0] = { kind: "index", title: "People", hero: "x" };
check(
	"Home without a hero and an index with one do not compile",
	[homeWithoutHero.kind, homeMissingHero.kind, indexWithHero.kind],
	["index", "home", "index"],
);

const host = document.createElement("div");
document.body.append(host);
const root = createRoot(host);
await act(async () =>
	root.render(
		h(
			Page,
			{ kind: "home", title: "Today", hero: h(Hero, { title: "Good morning" }), action: h(Button, null, "Add") },
			h(Section, { title: "Follow up", count: 3, action: h(Button, null, "+"), more: { label: "See all" } }, list(0)),
		),
	),
);
const page = host.querySelector(".wg-kit-page");
check("Page names its archetype on the element", page?.getAttribute("data-wg-page"), "home");
check(
	"and draws the title as the page's h1 with its action in the header",
	[
		page?.querySelector(".wg-kit-page-head h1")?.textContent,
		page?.querySelector(".wg-kit-page-head .wg-kit-page-action")?.textContent,
	],
	["Today", "Add"],
);
check(
	"the hero stands under the header",
	Boolean(page?.querySelector(".wg-kit-page-head + .wg-kit-page-hero .wg-kit-hero")),
	true,
);
const section = host.querySelector("[data-wg-section]");
check(
	"Section owns its title, count and action in one header",
	[
		section?.querySelector(".wg-kit-section-head h2")?.textContent,
		section?.querySelector(".wg-kit-section-head .wg-kit-count")?.textContent,
		section?.querySelector(".wg-kit-section-head .wg-kit-section-actions")?.textContent,
	],
	["Follow up", "3", "+"],
);
check("and ends in See all", section?.querySelector(".wg-kit-section-more")?.textContent, "See all");
await act(async () => root.unmount());

const pressHost = frameNode('<div class="presses"></div>');
const pressRoot = createRoot(pressHost.querySelector(".presses") ?? pressHost);
await act(async () =>
	pressRoot.render(
		h("div", null, [h(Button, { key: "dead" }, "Open"), h(Button, { key: "live", onClick: () => undefined }, "Add")]),
	),
);
check(
	"FN1: a button nothing answers is named; one with a handler is not",
	finishRulesIn(pressHost).filter((said) => said.startsWith("FN1")),
	['FN1: "Open" looks pressable and nothing answers a press; make it work or stop it looking pressable'],
);
await act(async () => pressRoot.unmount());

const holes = frameNode(
	'<div class="column"><div class="a">Shoot days</div><div class="b">Planned</div><div class="c">Done</div></div>',
);
laid(holes.querySelector(".column"), { left: 0, top: 0, width: 800, height: 600 });
laid(holes.querySelector(".a"), { left: 0, top: 0, width: 800, height: 100 });
laid(holes.querySelector(".b"), { left: 0, top: 140, width: 800, height: 100 });
laid(holes.querySelector(".c"), { left: 0, top: 400, width: 800, height: 100 });
check("FN2: a 160px hole between stacked blocks is named; a 40px gap is not", finishRulesIn(holes), [
	'FN2: a 160px hole between "Planned" and "Done"; close it, or fill it with what belongs there',
]);

const row = frameNode('<div class="row"><div class="cover">Cover</div><div class="move">Move to Posted</div></div>');
laid(row.querySelector(".row"), { left: 0, top: 0, width: 1900, height: 300 });
laid(row.querySelector(".cover"), { left: 0, top: 0, width: 700, height: 300 });
laid(row.querySelector(".move"), { left: 1500, top: 100, width: 400, height: 80 });
check("FN2: a hole across a third of a row is named", finishRulesIn(row), [
	'FN2: a 800px hole between "Cover" and "Move to Posted"; close it, or fill it with what belongs there',
]);

const plate = frameNode(
	'<div class="wg-kit-list" style="background-color: rgb(240, 240, 240)"><div class="wg-kit-row is-selected" style="background-color: rgb(220, 220, 220)">I quit Notion</div><div class="wg-kit-row">You use Obsidian wrong</div></div>',
);
laid(plate.querySelector(".wg-kit-list"), { left: 0, top: 0, width: 1000, height: 200 });
const [lit, plain] = [...plate.querySelectorAll(".wg-kit-row")];
laid(lit ?? null, { left: 20, top: 20, width: 960, height: 80 });
laid(plain ?? null, { left: 0, top: 100, width: 1000, height: 80 });
check(
	"FN3: a highlighted row 20px short of its plate's edge is named",
	finishRulesIn(plate).filter((said) => said.startsWith("FN3")),
	['FN3: "I quit Notion" lights up 20px short of its plate\'s edge; let the highlight reach the edge'],
);

const edges = frameNode(
	'<div class="stack"><div class="title">Filming</div><div class="sub">Shoot days ahead</div><div class="list">Days</div></div>',
);
laid(edges.querySelector(".stack"), { left: 0, top: 0, width: 800, height: 300 });
laid(edges.querySelector(".title"), { left: 0, top: 0, width: 800, height: 60 });
laid(edges.querySelector(".sub"), { left: 4, top: 80, width: 796, height: 30 });
laid(edges.querySelector(".list"), { left: 4, top: 130, width: 796, height: 100 });
check("FN4: a block 4px off the edge of the one above is named once", finishRulesIn(edges), [
	'FN4: "Filming" and "Shoot days ahead" miss each other\'s edge by 4px; line them up',
]);

console.log(`\n${failed === 0 ? "page measure: clean" : `page measure: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
