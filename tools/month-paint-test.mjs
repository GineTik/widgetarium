import { execFileSync } from "node:child_process";
import { mkdtempSync, openSync, readFileSync, writeFileSync } from "node:fs";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import esbuild from "esbuild";

const CHROME = process.env.WG_CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ROOT = process.cwd();
const work = mkdtempSync(path.join(tmpdir(), "wg-month-paint-"));

const CELL_PX = 54;
const GAP_PX = 12;
const tile = (cells) => cells * CELL_PX + (cells - 1) * GAP_PX;

const WIDTHS = [4, 5, 6, 8, 10, 13];
const HEIGHTS = [4, 5, 6, 8, 11];

const FOLDER = "widgets/@habit/month";

const PAGE = `
import { createElement as h } from "react";
import { render } from "./src/engine/render.js";
import { previewProps } from "./src/preview.js";
import Widget from "./${FOLDER}/widget.tsx";

const manifest = ${readFileSync(path.join(FOLDER, "manifest.json"), "utf8")};

for (const box of document.querySelectorAll(".wg-root")) {
	render(h(Widget, previewProps({ manifest, component: Widget }, {})), box);
}

function clearances(root) {
	const weekdays = [...root.querySelectorAll(".hm-weekday")];
	const days = [...root.querySelectorAll(".hm-day")];
	const numbers = days.map((day) => day.querySelector(".hm-number").getBoundingClientRect());
	const rings = days.map((day) => day.querySelector(".hm-ring").getBoundingClientRect());
	const room = root.querySelector(".hm-room").getBoundingClientRect();

	let underWeekday = Infinity;
	for (const [at, weekday] of weekdays.entries()) underWeekday = Math.min(underWeekday, numbers[at].top - weekday.getBoundingClientRect().bottom);

	let underNumber = Infinity;
	for (const [at, number] of numbers.entries()) underNumber = Math.min(underNumber, rings[at].top - number.bottom);

	let betweenRows = Infinity;
	for (let at = 7; at < days.length; at += 1) betweenRows = Math.min(betweenRows, numbers[at].top - rings[at - 7].bottom);

	const widest = days.reduce((held, day) => Math.max(held, day.getBoundingClientRect().right), 0);
	const style = getComputedStyle(root.querySelector(".habit-month"));
	return {
		name: root.dataset.name,
		days: days.length,
		ring: Math.round(parseFloat(style.getPropertyValue("--hm-ring")) * 100) / 100,
		underWeekday: Math.round(underWeekday * 100) / 100,
		underNumber: Math.round(underNumber * 100) / 100,
		betweenRows: Math.round(betweenRows * 100) / 100,
		belowLastRing: Math.round((room.bottom - rings[rings.length - 1].bottom) * 100) / 100,
		sideRoom: Math.round((room.right - widest) * 100) / 100,
	};
}

window.__measure = () => [...document.querySelectorAll(".wg-root")].map(clearances);
`;

const alias = { widgetarium: "./tools/fill-shim.js", "widgetarium/kit": "./src/kit.js", obsidian: "./tools/obsidian-shim.js" };
for (const scope of fs.readdirSync("widgets").filter((name) => name.startsWith("@"))) {
	const lib = path.join("widgets", scope, "lib.js");
	if (fs.existsSync(lib)) alias[`${scope}/lib`] = `./${lib}`;
}

const bundle = await esbuild.build({
	stdin: { contents: PAGE, resolveDir: ROOT, sourcefile: "month-paint.jsx", loader: "jsx" },
	bundle: true,
	write: false,
	format: "iife",
	platform: "browser",
	target: "es2020",
	jsxFactory: "h",
	jsxFragment: "Fragment",
	inject: ["tools/fill-inject.js"],
	alias,
	logLevel: "warning",
});

const THEME = `--background-primary:#ffffff;--background-secondary:#f6f6f6;--background-modifier-border:#e4e4e4;
	--background-modifier-hover:rgba(0,0,0,0.05);--text-normal:#222222;--text-muted:#707070;--text-faint:#a0a0a0;
	--text-on-accent:#ffffff;--interactive-accent:#6d4ee0;`;

// TRADE-OFF: a stand-in for the host's own button and text rules, which this page cannot read from a running Obsidian
const HOST_RULES = `button { font-size: var(--font-ui-small, 14px); line-height: var(--line-height-tight, 1.3); min-height: var(--input-height, 30px); padding: var(--size-4-1, 4px) var(--size-4-3, 12px); }
	p, span { line-height: var(--line-height-normal, 1.5); }`;

const tiles = [];
for (const across of WIDTHS) for (const down of HEIGHTS) tiles.push([`${across}x${down}`, tile(across), tile(down)]);

const boxes = tiles
	.map(([name, width, height]) => `<div class="wg-root" data-name="${name}" style="width:${width}px;height:${height}px"></div>`)
	.join("");

const page = `<!doctype html><html><head><meta charset="utf-8">
<style>${readFileSync("styles.css", "utf8")}</style>
<style>${readFileSync("widgets/@habit/tokens.css", "utf8")}</style>
<style>${HOST_RULES}</style>
<style>body { margin: 0; padding: 8px; ${THEME}
	--font-interface: "Helvetica Neue", Helvetica, Arial, sans-serif;
	--font-text: "Helvetica Neue", Helvetica, Arial, sans-serif;
	font-family: var(--font-interface); background: var(--background-secondary);
	display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start; }</style>
</head><body>${boxes}
<script>window.__err = ""; addEventListener("error", (event) => { window.__err += event.message; });</script>
<script>${bundle.outputFiles[0].text}</script>
<script>setTimeout(() => { document.title = window.__err ? "!" + window.__err : JSON.stringify(window.__measure()); }, 700);</script>
</body></html>`;

const file = path.join(work, "month-paint.html");
writeFileSync(file, page);
const dumped = path.join(work, "dom.txt");
execFileSync(
	CHROME,
	["--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", "--window-size=1700,1500", "--virtual-time-budget=6000", "--dump-dom", `file://${file}`],
	{ encoding: "utf8", stdio: ["ignore", openSync(dumped, "w"), "ignore"] },
);

const said = /<title>([\s\S]*?)<\/title>/.exec(readFileSync(dumped, "utf8"));
if (!said) {
	console.error("the page never reported its measurements");
	process.exit(1);
}
const reported = said[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
if (reported.startsWith("!")) {
	console.error(`the page threw: ${reported.slice(1)}`);
	process.exit(1);
}

let failed = 0;
function check(what, got, wanted) {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK  " : "!!  "}${what}${ok ? "" : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(wanted)}`}`);
}

const measured = JSON.parse(reported);
check("every tile drew a month", measured.length, tiles.length);
check("and every one drew whole weeks of it", measured.every((tile) => tile.days % 7 === 0 && tile.days >= 28), true);
check("a taller tile draws a bigger ring than a short one", measured.find((tile) => tile.name === "4x11").ring > measured.find((tile) => tile.name === "4x4").ring, true);

const tightest = (of) => measured.reduce((held, tile) => (tile[of] < held[of] ? tile : held));

for (const [what, of] of [
	["the weekday it sits under", "underWeekday"],
	["the ring it sits over", "underNumber"],
	["the ring in the week above", "betweenRows"],
]) {
	const worst = tightest(of);
	check(`no date ever touches ${what}`, worst[of] > 0, true);
	console.log(`    tightest at ${worst.name}: ${worst[of]}px`);
}

{
	const worst = tightest("belowLastRing");
	check("and the last week stays inside the tile", worst.belowLastRing > -0.5, true);
	console.log(`    tightest at ${worst.name}: ${worst.belowLastRing}px`);
}

{
	const worst = measured.reduce((held, tile) => (tile.sideRoom > held.sideRoom ? tile : held));
	check("the days fill the tile's width, leaving no gutter", worst.sideRoom < 1, true);
	console.log(`    widest gutter at ${worst.name}: ${worst.sideRoom}px`);
}

console.log(failed ? `\n${failed} failed` : "\nthe month keeps its distances");
process.exit(failed ? 1 : 0);
