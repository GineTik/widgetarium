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

function rulesOn(html: string): string[] {
	const root = document.createElement("div");
	root.innerHTML = html;
	return measuredFindingsIn(root).map((one) => `${one.rule}@${one.frame}`);
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

console.log(`\n${failed === 0 ? "page measure: clean" : `page measure: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
