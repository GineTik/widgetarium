// CONTEXT: a substring filter had nothing to get wrong; a score has an order, and an order is a claim
import fs from "node:fs";
import { buildMirror } from "./mirror.mjs";

buildMirror();
const { fold, rankSearch, DEFAULT_FIELDS } = await import("./.mjs-cache/engine/search.mjs");

let failed = 0;
function check(name, got, want) {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
}

// CONTEXT: the shipped manifests themselves, so the shop window is what this gate reads
function shippedWidgets() {
	const found = [];
	for (const scope of fs.readdirSync("widgets")) {
		const folder = `widgets/${scope}`;
		if (!fs.statSync(folder).isDirectory()) continue;
		for (const name of fs.readdirSync(folder)) {
			const file = `${folder}/${name}/manifest.json`;
			if (!fs.existsSync(file)) continue;
			const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
			found.push({ id: manifest.id, title: manifest.title, keywords: manifest.keywords, description: manifest.description });
		}
	}
	return found;
}

const SHIPPED = shippedWidgets();
const firstFor = (query) => rankSearch(query, SHIPPED)[0]?.record.id ?? null;
const reaches = (query, id) => rankSearch(query, SHIPPED).some((hit) => hit.record.id === id);

check("every shipped widget carries a description", SHIPPED.filter((one) => !one.description).map((one) => one.id), []);
check("every shipped widget carries keywords", SHIPPED.filter((one) => !(one.keywords?.length > 0)).map((one) => one.id), []);
check("the fields are searched in one declared order", DEFAULT_FIELDS.map((field) => field.key), ["title", "id", "keywords", "description"]);

check("an id folds into the words it is made of", fold("@Task/Task-Card"), "task task card");
check("case folds", fold("KANBAN Board"), "kanban board");
check("accents fold", fold("Café Ünicode!"), "cafe unicode");
check("nothing but punctuation folds to nothing", fold("  --/-- "), "");
check("two words find the widget whose id spells them", firstFor("task card"), "@task/task-card");
check("and shouting it with a slash finds the same one", firstFor("  TASK/CARD  "), "@task/task-card");

check("the kanban board is what 'kanban' means", firstFor("kanban"), "@task/kanban-board");
check("a keyword nobody wrote into a title still finds its widget", firstFor("swimlane"), "@task/kanban-board");
check("a word in no manifest at all finds nothing", rankSearch("zzqq", SHIPPED).length, 0);

// CONTEXT: one word planted in three fields — the only way a field weight can be read alone
const PLANTED = [
	{ id: "in-title", title: "Reminder", keywords: [], description: "Nothing here about clocks." },
	{ id: "in-keywords", title: "Note", keywords: ["reminder"], description: "Nothing here about clocks." },
	{ id: "in-description", title: "Chip", keywords: [], description: "A reminder pinned in the text." },
];
check(
	"a title match outranks a keyword match outranks a description match",
	rankSearch("reminder", PLANTED).map((hit) => hit.record.id),
	["in-title", "in-keywords", "in-description"],
);
check("and the description one is still found, not dropped", rankSearch("reminder", PLANTED).length, 3);

// CONTEXT: one field, four match shapes — contiguity, word start and position, with nothing else moving
const SAME_FIELD = [
	{ id: "scattered", title: "Kind and neat, bare and nice" },
	{ id: "late", title: "The archived kanban" },
	{ id: "start", title: "Kanban board" },
	{ id: "whole", title: "Kanban" },
];
check(
	"a whole field beats a leading run beats a late run beats a scattered subsequence",
	rankSearch("kanban", SAME_FIELD).map((hit) => hit.record.id),
	["whole", "start", "late", "scattered"],
);

check("a dropped letter finds the board", firstFor("knbn"), "@task/kanban-board");
check("a wrong letter finds the board", firstFor("kanbam"), "@task/kanban-board");
check("a transposed pair finds the board", firstFor("kabnan"), "@task/kanban-board");
check("a wrong letter finds the reminder", firstFor("reminber"), "@inline/reminder");
check("two stray letters do not reach the board at all", reaches("kanbanxy", "@task/kanban-board"), false);

const ROWS = [{ id: "z", title: "Zebra" }, { id: "a", title: "Apple" }];
check("an empty query hands the list back in the order it came", rankSearch("", ROWS).map((hit) => hit.record.id), ["z", "a"]);
check("whitespace alone is the same", rankSearch("   ", ROWS).map((hit) => hit.record.id), ["z", "a"]);
check("with every score zero, so a caller sorting by it moves nothing", rankSearch("", ROWS).map((hit) => hit.score), [0, 0]);
check("and it drops nobody", rankSearch("", SHIPPED).length, SHIPPED.length);


// THE SIZE FILTER IS PART OF THE SAME SCREEN. Search narrows the catalogue by word, this narrows
// it by footprint, and both are pressed on the head of one dialog — so one gate holds them.
const { JSDOM } = await import("jsdom");
const page = new JSDOM(
	`<!doctype html><html><head><style>${fs.readFileSync("styles.css", "utf8")}</style></head>`
		+ `<body><div class="wg-root"><div id="host"></div></div></body></html>`,
	{ pretendToBeVisual: true },
);
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "MouseEvent", "KeyboardEvent", "Event"]) {
	globalThis[key] = key === "window" ? page.window : page.window[key];
}
globalThis.ResizeObserver = class {
	observe() {}
	disconnect() {}
};
// CONTEXT: reduced motion is the branch that measures nothing, which is all jsdom can lay out
page.window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });

const { h, render } = await import("preact");
const { useState } = await import("preact/hooks");
const { SizeFilter, NO_SIZE, sizeBounds, narrowsSize, withinSize } = await import("./.mjs-cache/catalogue.mjs");
const { START_CELLS, emptyPick, grownTo, pickCell, pickedSize, saidFor } = await import("./.mjs-cache/size-grid.mjs");

const at = (x, y) => ({ x, y });
const twice = (one, other) => pickedSize(pickCell(pickCell(emptyPick(), one), other));

// TWO CORNERS, NEITHER OF THEM THE START. Order-dependence is the bug this control is born with.
check("click A then B is the range click B then A makes", twice(at(5, 2), at(2, 6)), twice(at(2, 6), at(5, 2)));
check("and it is the two corners sorted per axis", twice(at(5, 2), at(2, 6)), { wFrom: 2, wTo: 5, hFrom: 2, hTo: 6 });
check("the same cell twice is a 1x1 range, not an empty one", twice(at(3, 4), at(3, 4)), { wFrom: 3, wTo: 3, hFrom: 4, hTo: 4 });

const third = pickCell(pickCell(pickCell(emptyPick(), at(2, 2)), at(4, 4)), at(7, 7));
check("a third click starts over instead of extending", third.corners, [{ x: 7, y: 7 }]);
check("so there is no range again until the fourth", pickedSize(third), null);

check("the grid opens at twelve cells across", START_CELLS, 12);
const grown = pickCell(pickCell(emptyPick(), at(1, 1)), at(11, 3));
check("reaching 90% of the grid grows it by two", grown.cells, START_CELLS + 2);
check("and the growth leaves the selection alone", pickedSize(grown), { wFrom: 1, wTo: 11, hFrom: 1, hTo: 3 });
check("short of 90% nothing grows", pickCell(emptyPick(), at(10, 10)).cells, START_CELLS);
check("and it keeps growing until the reach has room", grownTo(START_CELLS, [at(1, 1), at(30, 1)]), 34);

const nothing = emptyPick();
const planted = pickCell(nothing, at(2, 3));
const ranged = pickCell(planted, at(5, 7));
check("the help line differs in each of the three states", new Set([saidFor(nothing), saidFor(planted), saidFor(ranged)]).size, 3);
check("and the chosen one reads the range back", saidFor(ranged), "Filtering widgets 2 to 5 cells wide and 3 to 7 cells tall.");
check("a single cell reads back as one size", saidFor(pickCell(pickCell(nothing, at(4, 4)), at(4, 4))), "Filtering widgets exactly 4 by 4 cells.");

const settle = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
let applied = NO_SIZE;
function Harness() {
	const [typed, setTyped] = useState(NO_SIZE);
	applied = typed;
	return h(SizeFilter, { typed, onTyped: setTyped });
}

const host = document.getElementById("host");
const press = (node) => node.dispatchEvent(new MouseEvent("click", { bubbles: true }));
const cellAt = (span) => host.querySelector(`.wg-size-cell[data-cell="${span}"]`);
const open = async () => {
	press(host.querySelector(".wg-cat-size"));
	await settle();
};

render(h(Harness), host);
await settle();
await open();

check("the grid is square and opens at its own size", host.querySelectorAll(".wg-size-cell").length, START_CELLS * START_CELLS);
check("with nothing selected", host.querySelectorAll(".wg-size-cell.is-on").length, 0);
check("and the trigger still says the filter is off", host.querySelector(".wg-cat-size").textContent, "Any size");

const clear = host.querySelector(".wg-size-clear");
const apply = host.querySelector(".wg-size-apply");
check("Apply cannot be pressed before a range exists", apply.disabled, true);

// THE FOOT IS THE KIT'S, MEASURED — a hand-rolled pair would paint the same colours off other rules
const paint = (node) => getComputedStyle(node);
check("Clear is the kit's quiet button", paint(clear).color, "var(--text-normal)");
check("Apply is the kit's accent one", paint(apply).color, "var(--text-on-accent)");
check("the two are not the same variant", paint(clear).color === paint(apply).color, false);
check("both are the kit's small size", `${paint(clear).height}/${paint(apply).height}`, "34px/34px");
check("and both grow to fill the foot", `${paint(clear).flexGrow}/${paint(apply).flexGrow}`, "1/1");

press(cellAt("3x2"));
await settle();
check("one corner planted lights that cell", host.querySelectorAll(".wg-size-cell.is-near").length, 1);
check("and nothing has reached the filter yet", narrowsSize(sizeBounds(applied)), false);

press(cellAt("5x4"));
await settle();
check("the second corner fills the rectangle", host.querySelectorAll(".wg-size-cell.is-on").length, 9);
check("the line under it reads the range back", host.querySelector(".wg-size-said").textContent, "Filtering widgets 3 to 5 cells wide and 2 to 4 cells tall.");
check("and STILL nothing has reached the filter", narrowsSize(sizeBounds(applied)), false);

press(host.querySelector(".wg-size-apply"));
await settle();
check("Apply hands the range over", applied, { wFrom: "3", wTo: "5", hFrom: "2", hTo: "4" });
check("as bounds the catalogue narrows by", narrowsSize(sizeBounds(applied)), true);
check("a 4x3 widget is inside it", withinSize({ w: 4, h: 3 }, sizeBounds(applied)), true);
check("a 13x8 widget is not", withinSize({ w: 13, h: 8 }, sizeBounds(applied)), false);
check("and the trigger says what is filtered", host.querySelector(".wg-cat-size").textContent, "3–5 × 2–4");

await open();
check("a reopened grid holds nothing selected", host.querySelectorAll(".wg-size-cell.is-on").length, 0);
check("and says so", host.querySelector(".wg-size-said").textContent, "Click any cell to set where the range starts.");

press(host.querySelector(".wg-size-clear"));
await settle();
check("Clear empties the filter", applied, NO_SIZE);
check("so nothing is narrowed", narrowsSize(sizeBounds(applied)), false);
check("and the 13x8 widget is back", withinSize({ w: 13, h: 8 }, sizeBounds(applied)), true);

console.log(failed === 0 ? `\nsearch: ${SHIPPED.length} shipped widgets, every check green` : `\nsearch: ${failed} check(s) failed`);
process.exit(failed === 0 ? 0 : 1);
