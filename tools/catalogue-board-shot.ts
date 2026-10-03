import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { bundleOf, shoot, THEMES } from "./harness.ts";
import { catalogueWidgetFiles } from "./catalogue-widget-files.mts";
import { CATALOGUE_BOARD } from "../apps/obsidian/src/catalogue-boards.ts";

interface Rect {
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
	readonly r: number;
	readonly pad: number;
}

interface Drawn {
	readonly rectOf: (selector: string, at?: number) => Rect;
	readonly countOf: (key: string) => number;
	readonly reported: string;
}

const SIDEBAR_PX = 342;
const ROW_PX = 900;
const WIDE_PX = 1400;
const MEASURED = [
	".wg-catalogue-head",
	".wg-catalogue-views",
	".wg-kit-field",
	".wg-catalogue-bar",
	".wg-catalogue-bar-filters",
	".wg-catalogue-bar-count",
	".wg-catalogue-card",
	".wg-catalogue-card-stage",
	".wg-catalogue-card-go",
];
const LABELLED = [
	".wg-catalogue-views",
	".wg-catalogue-search",
	".wg-catalogue-bar-filters",
	".wg-catalogue-card",
	".wg-catalogue-card-stage",
	".wg-catalogue-card-go",
];
const NOWHERE: Rect = { x: Number.NaN, y: Number.NaN, w: Number.NaN, h: Number.NaN, r: Number.NaN, pad: Number.NaN };
const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-catalogue-board"));
mkdirSync(shotsAt, { recursive: true });

const files = Object.fromEntries(
	Object.entries(catalogueWidgetFiles()).map(([name, text]) => [`.widgetarium/widgets/@catalogue/${name}`, text]),
);
const bundle = await bundleOf("tools/catalogue-board-page.tsx");

const MEASURE_SCRIPT = `
const boxOf = (element, base) => {
	const box = element.getBoundingClientRect();
	const style = getComputedStyle(element);
	return {
		x: Math.round(box.left - base.left), y: Math.round(box.top - base.top),
		w: Math.round(box.width), h: Math.round(box.height),
		r: Math.round(parseFloat(style.borderTopLeftRadius) || 0), pad: Math.round(parseFloat(style.paddingLeft) || 0),
	};
};
const labelAt = (text, left, top, tone) => {
	const label = document.createElement("span");
	label.textContent = text;
	label.style.cssText = "position:fixed;z-index:99;font:600 10px/1.2 Menlo,monospace;padding:1px 3px;border-radius:3px;color:#fff;background:" + tone + ";left:" + left + "px;top:" + top + "px;white-space:nowrap";
	document.body.append(label);
};
const outline = (element, tone, labelDown) => {
	const box = element.getBoundingClientRect();
	const frame = document.createElement("span");
	frame.style.cssText = "position:fixed;z-index:98;pointer-events:none;border:1px dashed " + tone + ";left:" + box.left + "px;top:" + box.top + "px;width:" + box.width + "px;height:" + box.height + "px;box-sizing:border-box";
	document.body.append(frame);
	const style = getComputedStyle(element);
	labelAt(Math.round(box.width) + "×" + Math.round(box.height) + " r" + Math.round(parseFloat(style.borderTopLeftRadius) || 0) + " p" + Math.round(parseFloat(style.paddingLeft) || 0), box.left + 2, box.top + 2 + labelDown, tone);
};
const gapLabel = (upper, lower) => {
	if (!upper || !lower) return;
	const above = upper.getBoundingClientRect();
	const below = lower.getBoundingClientRect();
	const sideBySide = Math.abs(above.top - below.top) < 2;
	if (sideBySide) labelAt("↔" + Math.round(below.left - above.right), above.right - 8, above.top + above.height / 2 - 6, "#c2410c");
	else labelAt("↕" + Math.round(below.top - above.bottom), above.left + above.width / 2, above.bottom - 4, "#c2410c");
};
const measureOnceDrawn = () => {
	if (document.querySelectorAll(".wg-catalogue-card").length < 2) return setTimeout(measureOnceDrawn, 100);
	const leaf = document.querySelector(".workspace-leaf-content");
	const base = leaf.getBoundingClientRect();
	const seen = Object.fromEntries(${JSON.stringify(MEASURED)}.map((selector) => [
		selector,
		[...document.querySelectorAll(selector)].slice(0, 2).map((element) => boxOf(element, base)),
	]));
	const cardsFirst = document.querySelectorAll(".wg-catalogue-card").length;
	const cardColumns = new Set([...document.querySelectorAll(".wg-catalogue-card")].map((one) => Math.round(one.getBoundingClientRect().left))).size;
	leaf.scrollTop = leaf.scrollHeight;
	setTimeout(() => {
		const cardsScrolled = document.querySelectorAll(".wg-catalogue-card").length;
		leaf.scrollTop = 0;
		document.getElementById("rects").textContent = JSON.stringify({ ...seen, cardsFirst, cardsScrolled, cardColumns });
		if (!window.__ANNOTATE__) return;
		labelAt("pane " + Math.round(base.width) + "px", base.right - 90, 4, "#111");
		${JSON.stringify(LABELLED)}.forEach((selector, at) => {
			const tone = ["#2563eb", "#7c3aed", "#0891b2", "#16a34a", "#db2777", "#ca8a04"][at];
			[...document.querySelectorAll(selector)].slice(0, 2).forEach((element) => outline(element, tone, selector === ".wg-catalogue-card-stage" ? 18 : 0));
		});
		const order = [".wg-catalogue-head", ".wg-catalogue-views", ".wg-kit-field", ".wg-catalogue-bar"].map((selector) => document.querySelector(selector));
		order.forEach((element, at) => gapLabel(element, order[at + 1]));
		const cards = [...document.querySelectorAll(".wg-catalogue-card")];
		gapLabel(document.querySelector(".wg-catalogue-bar"), cards[0]);
		gapLabel(cards[0], cards[1]);
		labelAt("side " + Math.round(cards[0].getBoundingClientRect().left - base.left), base.left + 2, cards[0].getBoundingClientRect().top + 40, "#111");
	}, 1500);
};
measureOnceDrawn();`;

function pageAt(widthPx: number, isAnnotated: boolean): string {
	return `<!doctype html><html><head><meta charset="utf-8">
<style>${readFileSync("apps/obsidian/styles.css", "utf8")}</style>
<style>
body { margin: 0; ${THEMES.light} background: var(--background-secondary); color: var(--text-normal);
	--font-interface: "Helvetica Neue", Helvetica, Arial, sans-serif; font-family: var(--font-interface);
	--font-ui-smaller: 12px; --font-ui-small: 13px; --font-ui-medium: 15px; --font-semibold: 600;
	--size-4-1: 4px; --size-4-2: 8px; --size-4-3: 12px; }
.workspace-leaf-content { width: ${widthPx}px; height: 100vh; background: var(--background-primary); overflow: auto; }
</style></head><body>
<div class="workspace-leaf-content"><div class="view-content wg-sidebar-board"><div id="host" class="wg-mount"></div></div></div>
<pre id="boom"></pre><pre id="rects"></pre>
<script>window.__FILES__=${JSON.stringify(files)};window.__BOARD__=${JSON.stringify(CATALOGUE_BOARD)};window.__ANNOTATE__=${String(isAnnotated)};</script>
<script>${bundle}</script>
<script>${MEASURE_SCRIPT}</script>
</body></html>`;
}

function textOfPre(dom: string, id: string): string {
	const open = `<pre id="${id}">`;
	const from = dom.indexOf(open);
	if (from === -1) return "";
	const start = from + open.length;
	return dom.slice(start, dom.indexOf("</pre>", start)).replaceAll("&quot;", '"').trim();
}

const isRect = (value: unknown): value is Rect => value !== null && typeof value === "object" && "x" in value;

function drawnAt(widthPx: number): Drawn {
	const size = { width: widthPx + 40, height: 1100 };
	const annotated = path.join(shotsAt, `annotated-${widthPx}.html`);
	writeFileSync(annotated, pageAt(widthPx, true));
	shoot(annotated, [`--screenshot=${path.join(shotsAt, `catalogue-${widthPx}.png`)}`], size);
	const plain = path.join(shotsAt, `plain-${widthPx}.html`);
	writeFileSync(plain, pageAt(widthPx, false));
	const dom = shoot(plain, ["--dump-dom"], size);
	const parsed: unknown = JSON.parse(textOfPre(dom, "rects") || "{}");
	const seen: Readonly<Record<string, unknown>> =
		parsed !== null && typeof parsed === "object" ? Object.fromEntries(Object.entries(parsed)) : {};
	return {
		rectOf: (selector, at = 0) => {
			const rects = seen[selector];
			const rect: unknown = Array.isArray(rects) ? rects[at] : undefined;
			return isRect(rect) ? rect : NOWHERE;
		},
		countOf: (key) => Number(seen[key] ?? Number.NaN),
		reported: textOfPre(dom, "boom"),
	};
}

let failed = 0;
function check(what: string, got: number, wanted: number): void {
	const ok = Math.abs(got - wanted) <= 1;
	if (!ok) failed += 1;
	console.log(`${ok ? "ok  " : "FAIL"} ${what} — ${got}${ok ? "" : `, wanted ${wanted}`}`);
}
function checkAtLeast(what: string, got: number, floor: number): void {
	const ok = got >= floor;
	if (!ok) failed += 1;
	console.log(`${ok ? "ok  " : "FAIL"} ${what} — ${got}${ok ? "" : `, wanted at least ${floor}`}`);
}
function checkReported({ reported }: Drawn): void {
	if (!reported) return;
	failed += 1;
	console.log(`FAIL the page reported ${reported}`);
}
function printSizes(drawn: Drawn): void {
	for (const selector of MEASURED) {
		const { x, y, w, h, r, pad } = drawn.rectOf(selector);
		console.log(`     ${selector} x${x} y${y} ${w}×${h} radius ${r} padding ${pad}`);
	}
}

console.log(`— a ${SIDEBAR_PX}px sidebar —`);
const narrow = drawnAt(SIDEBAR_PX);
checkReported(narrow);
printSizes(narrow);
const views = narrow.rectOf(".wg-catalogue-views");
const search = narrow.rectOf(".wg-kit-field");
const filters = narrow.rectOf(".wg-catalogue-bar-filters");
const count = narrow.rectOf(".wg-catalogue-bar-count");
const card = narrow.rectOf(".wg-catalogue-card");
const nextCard = narrow.rectOf(".wg-catalogue-card", 1);
const stage = narrow.rectOf(".wg-catalogue-card-stage");
check("the sidebar keeps 12px at its side", views.x, 12);
check("the view switch spans the sidebar", views.w, SIDEBAR_PX - 24);
check("and stands 39px tall", views.h, 39);
check("the search stands 8px under it, one box down", search.y - (views.y + views.h), 8);
check("and is 37px tall", search.h, 37);
check("the Filters line stands 8px under the search", narrow.rectOf(".wg-catalogue-bar").y - (search.y + search.h), 8);
check("the count shares the Filters line", count.y + count.h / 2, filters.y + filters.h / 2);
check("a card's plate holds its stage 5px in", stage.x - card.x, 5);
check("the card keeps its 14px corner", card.r, 14);
check("and its stage its 6px one", stage.r, 6);
check("cards stand in one column", narrow.countOf("cardColumns"), 1);
check("8px apart", nextCard.y - (card.y + card.h), 8);
check("as wide as the sidebar allows", card.w, SIDEBAR_PX - 24);
check("the first page draws twelve cards", narrow.countOf("cardsFirst"), 12);
check("scrolling to the end draws the next twelve", narrow.countOf("cardsScrolled"), 24);

console.log(`\n— a ${ROW_PX}px pane —`);
const middle = drawnAt(ROW_PX);
checkReported(middle);
printSizes(middle);
const rowViews = middle.rectOf(".wg-catalogue-views");
const rowSearch = middle.rectOf(".wg-kit-field");
const rowBar = middle.rectOf(".wg-catalogue-bar");
check("the search stands on the switch's line", rowSearch.y + rowSearch.h / 2, rowViews.y + rowViews.h / 2);
check("and Filters on it too", rowBar.y + rowBar.h / 2, rowViews.y + rowViews.h / 2);
check("cards flow into two columns", middle.countOf("cardColumns"), 2);

console.log(`\n— a ${WIDE_PX}px pane —`);
const wide = drawnAt(WIDE_PX);
checkReported(wide);
printSizes(wide);
const wideCard = wide.rectOf(".wg-catalogue-card");
const wideNext = wide.rectOf(".wg-catalogue-card", 1);
check("cards flow into four columns", wide.countOf("cardColumns"), 4);
check("a card follows the one above it in its column 8px down", wideNext.y - (wideCard.y + wideCard.h), 8);
checkAtLeast("each at least 300px wide", wideCard.w, 300);
console.log(
	failed === 0
		? `\nthe catalogue is laid out as asked at every width — shots in ${shotsAt}`
		: `\n${failed} geometry checks failed`,
);
process.exit(failed === 0 ? 0 : 1);
