import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import esbuild from "esbuild";
import { parse } from "yaml";
import { findBrowser, widgetFiles } from "./harness.mjs";
import { buildMirror } from "./mirror.mjs";

buildMirror();
const { innerOf, resized } = await import("./.mjs-cache/tree.mjs");

const FIXTURE = "tools/fixture/Orbitask/Board.md";
const FENCE = String.fromCharCode(96, 96, 96);

function boardOf(at) {
	const note = readFileSync(at, "utf8");
	const block = note.split(`${FENCE}widgetarium`)[1]?.split(FENCE)[0];
	if (!block) {
		console.error(`tree gate: ${at} carries no widgetarium block`);
		process.exit(1);
	}
	return parse(block);
}

const ROWS = ["To Do", "Doing", "Done"].flatMap((status, at) =>
	[1, 2].map((nth) => ({
		path: `Orbitask/Tasks/${status}-${nth}.md`,
		ref: { path: `Orbitask/Tasks/${status}-${nth}.md` },
		name: `${status} ${nth}`,
		props: { title: `${status} ${nth}`, status, order: at * 2 + nth },
		meta: { created: 1, modified: 2 },
		attachments: 0,
	})),
);

// TODO: manifest field stackBelowPx — collapseBelowPx means chip, not own row
const TREE = [
	[{ id: "boards", ratio: 1, minPx: 220 }],
	[
		{ id: "views", ratio: 0.75, minPx: 260 },
		{ id: "wynttpz", ratio: 0.25, minPx: 320 },
	],
	[{ id: "board", ratio: 1, minPx: 420, height: 560 }],
];

const WIDTHS = [320, 390, 768, 1194, 1728];
const ORDER = ["boards", "views", "wynttpz", "board"];

const unmeasurable = TREE.flat().filter((cell) => !Number.isFinite(cell.ratio) || !Number.isFinite(cell.minPx));
if (unmeasurable.length > 0) {
	console.error(`tree gate: ${unmeasurable.map((cell) => cell.id).join(", ")} carry no ratio or no minPx`);
	process.exit(1);
}

const inertJson = (value) => JSON.stringify(value).replace(/<\/script/gi, "<\\/script");

const saved = boardOf(FIXTURE);
const board = { tiles: saved.tiles, layouts: {} };

const bundle = await esbuild.build({
	entryPoints: ["tools/tree-page.jsx"],
	bundle: true,
	write: false,
	format: "iife",
	platform: "browser",
	target: "es2020",
	jsxFactory: "h",
	jsxFragment: "Fragment",
	logLevel: "warning",
});

const page = `<!doctype html><html><head><meta charset="utf-8">
<style>${readFileSync("styles.css", "utf8")}</style>
<style>${readFileSync("widgets/@task/tokens.css", "utf8")}</style>
<style>body { margin: 0; background: #fff; color: #222; --background-primary: #fff; --background-secondary: #f6f6f6;
	--background-modifier-border: #e4e4e4; --text-normal: #222; --text-muted: #707070; --text-faint: #ababab;
	--text-on-accent: #fff; --interactive-accent: #6d4ee0; }
.wg-host { display: flex; flex-direction: column; gap: 64px; align-items: flex-start; }
.wg-tree { display: flex; flex-direction: column; gap: 12px; overflow: hidden; }
.wg-tree-row { display: flex; gap: 12px; align-items: stretch; }
.wg-tree-cell { position: relative; min-width: 0; }
.wg-host, .wg-host div { transition: none !important; animation: none !important; }</style>
</head><body><div class="wg-host"></div>
<script id="wg-widgets" type="application/json">${inertJson(widgetFiles())}</script>
<script id="wg-board" type="application/json">${JSON.stringify(board)}</script>
<script id="wg-rows" type="application/json">${JSON.stringify(ROWS)}</script>
<script id="wg-tree" type="application/json">${JSON.stringify(TREE)}</script>
<script id="wg-widths" type="application/json">${JSON.stringify(WIDTHS)}</script>
<script id="wg-measure" type="application/json"></script>
<script>${bundle.outputFiles[0].text}</script>
</body></html>`;

const work = mkdtempSync(path.join(tmpdir(), "wg-tree-"));
const file = path.join(work, "tree.html");
writeFileSync(file, page);

const dom = execFileSync(
	findBrowser("tree"),
	["--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", "--window-size=2000,1200", "--virtual-time-budget=9000", "--dump-dom", `file://${file}`],
	{ encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", process.env.WG_DEBUG ? "inherit" : "ignore"] },
);

const payload = /<script id="wg-measure" type="application\/json">([\s\S]*?)<\/script>/.exec(dom)?.[1];
if (!payload) {
	console.error("tree gate: the page never reported");
	console.error(`  page: file://${file}`);
	process.exit(1);
}
const unescaped = payload.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
let measured;
try {
	measured = JSON.parse(unescaped);
} catch (broken) {
	console.error(`tree gate: the report did not survive the DOM — ${broken.message}`);
	console.error(unescaped.slice(0, 2000));
	process.exit(1);
}
if (measured.failure) {
	console.error(`tree gate: the page threw — ${measured.failure}`);
	process.exit(1);
}
if (process.env.WG_DEBUG) console.log(JSON.stringify(measured, null, 1));

let failed = 0;
function check(label, got, want) {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${label}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
}

console.log("— the live Orbitask board, drawn as a tree at five widths —\n");

for (const seen of measured.widths) {
	const at = `${seen.width}px`;
	if (seen.drawn === false) {
		failed += 1;
		console.log(`!! ${at}: the board never drew — the host held ${JSON.stringify(seen.host)}`);
		continue;
	}
	const byId = new Map(seen.cells.map((cell) => [cell.id, cell]));

	check(`${at}: every tile is drawn`, [...byId.keys()].sort(), [...ORDER].sort());
	check(`${at}: none of them is an empty box`, seen.cells.filter((cell) => cell.painted === 0 || cell.missing).map((cell) => cell.id), []);
	check(`${at}: none of them has zero area`, seen.cells.filter((cell) => cell.box.width < 1 || cell.box.height < 1).map((cell) => cell.id), []);
	check(`${at}: the board does not scroll sideways`, seen.scrollWidth <= seen.clientWidth + 1, true);
	check(`${at}: no widget spills out of its own box`, seen.cells.filter((cell) => cell.scrollWidth > cell.clientWidth + 1).map((cell) => cell.id), []);
	check(
		`${at}: nothing sticks out of the board`,
		seen.cells.filter((cell) => cell.box.left < seen.board.left - 0.5 || cell.box.right > seen.board.right + 0.5).map((cell) => cell.id),
		[],
	);
	check(
		`${at}: nothing is drawn under its minimum unless it already has the whole width`,
		seen.cells.filter((cell) => cell.box.width + 0.5 < cell.minPx && cell.box.width + 0.5 < seen.board.width).map((cell) => cell.id),
		[],
	);
	check(`${at}: reading order is unchanged`, seen.rows.flat(), ORDER);
}

console.log("\n— the row of two either stands or stacks, and nothing else changes —");
{
	const rowsAt = (width) => measured.widths.find((seen) => seen.width === width).rows;
	check("at 1728 the tabs and the filter share a row", rowsAt(1728)[1], ["views", "wynttpz"]);
	check("at 1194 the filter takes its own row, because a quarter of it is under 320px", rowsAt(1194).slice(1, 3), [["views"], ["wynttpz"]]);
	check("at 768 it still does", rowsAt(768).slice(1, 3), [["views"], ["wynttpz"]]);
	check("at 390 it still does", rowsAt(390).slice(1, 3), [["views"], ["wynttpz"]]);
	check("at 320 it still does", rowsAt(320).slice(1, 3), [["views"], ["wynttpz"]]);
	check("and the kanban is last at every width", measured.widths.map((seen) => seen.rows.at(-1)), WIDTHS.map(() => ["board"]));
}

console.log("\n— the plugin's own surface draws a board that carries rows —");
{
	const seen = measured.surface;
	check("the surface drew a tree, not a grid", seen.drawn, true);
	check("the tabs and the filter share a row, the kanban keeps its own", seen.rows, [1, 2, 1]);
	check("every cell painted a widget, the dialog included", seen.painted, 5);
	check("the dialog is drawn without taking a row", seen.overlays, 1);
	check("and no row is wider than the board it sits in", seen.widest <= 1600.5, true);
	check("one grip stands between the two that share a row", seen.across, 1);
	check("and every drawn cell can be dragged taller", seen.along, 4);
	check("the gap the grip fills is the gap the layout counted", seen.sharedRow[0] + seen.sharedRow[1] + 12, 1600);
}

console.log("\n— and dragging that grip writes the board once —");
{
	const before = measured.surface;
	const after = measured.dragged;
	check("the filter stops on the floor its manifest names, not where the pointer went", after.sharedRow[1], 320);
	check("the tabs took exactly what the filter could give", after.sharedRow[0] - before.sharedRow[0], before.sharedRow[1] - 320);
	check("the row is still as wide as it was", after.sharedRow[0] + after.sharedRow[1] + 12, 1600);
	check("the board was written once, on release", after.writes, 1);
	check("the ratios in the file changed with it", after.ratios[0] > before.ratios[0], true);
	check("and the row still weighs what it weighed", Math.round(after.ratios.reduce((sum, one) => sum + one, 0) * 100), Math.round(before.ratios.reduce((sum, one) => sum + one, 0) * 100));
}

console.log("\n— the ratio the person chose is the ratio drawn —");
{
	const wide = measured.widths.find((seen) => seen.width === 1728);
	const views = wide.cells.find((cell) => cell.id === "views").box.width;
	const filter = wide.cells.find((cell) => cell.id === "wynttpz").box.width;
	check("three to one, within a pixel", Math.abs(views / filter - 3) < 0.02, true);
}

console.log("\n— dragging the grip moves the boundary, and never past a floor —");
{
	const row = [
		{ id: "left", ratio: 1, minPx: 200 },
		{ id: "right", ratio: 1, minPx: 200 },
	];
	const inner = innerOf(2, 1212);
	const pxAt = (cells, at) => (inner * cells[at].ratio) / cells.reduce((sum, cell) => sum + cell.ratio, 0);

	check("the row is 1200 wide once the gap is taken", inner, 1200);
	check("even to start with", Math.round(pxAt(row, 0)), 600);

	const wider = resized(row, 0, 800, inner, true);
	check("dragged to 800 the left cell is 800", Math.round(pxAt(wider, 0)), 800);
	check("and the right one gives up exactly that", Math.round(pxAt(wider, 1)), 400);

	const floored = resized(row, 0, 60, inner, true);
	check("dragged past the left floor it stops at the floor", Math.round(pxAt(floored, 0)), 200);
	const ceiled = resized(row, 0, 1180, inner, true);
	check("and past the right floor it stops there too", Math.round(pxAt(ceiled, 1)), 200);

	const snapping = resized(row, 0, 640, inner, false);
	check("without shift it lands on a twelfth", Math.round(pxAt(snapping, 0)), 600);
	const free = resized(row, 0, 640, inner, true);
	check("with shift it lands where the pointer is", Math.round(pxAt(free, 0)), 640);

	const three = [
		{ id: "a", ratio: 1, minPx: 100 },
		{ id: "b", ratio: 1, minPx: 100 },
		{ id: "c", ratio: 1, minPx: 100 },
	];
	const moved = resized(three, 0, 500, innerOf(3, 1224), true);
	check("a neighbour outside the pair does not move", moved[2].ratio, three[2].ratio);
	check("and the row still weighs what it weighed", Math.round(moved.reduce((sum, cell) => sum + cell.ratio, 0) * 1000), 3000);
}

if (measured.failures.length > 0) {
	failed += measured.failures.length;
	for (const failure of measured.failures) console.log(`!! the page logged: ${failure}`);
}

console.log(failed ? `\n${failed} widths the tree got wrong` : "\nfour widgets, five widths, nothing vanished");
process.exit(failed ? 1 : 0);
