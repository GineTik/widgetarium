import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import esbuild from "esbuild";
import { parse } from "yaml";
import { findBrowser, widgetFiles } from "./harness.mjs";
import { buildMirror } from "./mirror.mjs";
import { TEXT_LOADERS } from "../build.mjs";

buildMirror();
const {
	aimedAt,
	carriedInto,
	columnsOf,
	foldableIn,
	isFolded,
	toggledFold,
	GAP_PX,
	innerOf,
	MAIN_FLOOR_PX,
	MIN_HEIGHT_PX,
	MIN_SIDEBAR_PX,
	moved,
	rowIndexesAfterLeaving,
	resized,
	restacked,
	SIDEBAR_PX,
	widenedRegion,
	withoutCell,
} = await import("./.mjs-cache/tree.mjs");
const { GIVE_PX } = await import("./.mjs-cache/give.mjs");
const { millisecondsAcross } = await import("./.mjs-cache/flip.mjs");

const FIXTURE = "tools/fixture/Orbitask/Board.md";
const TABS_CEILING_PX = JSON.parse(readFileSync("widgets/@core/editable-tabs/manifest.json", "utf8")).tallestPx;
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
	loader: TEXT_LOADERS,
	write: false,
	format: "iife",
	platform: "browser",
	target: "es2020",
	jsxFactory: "h",
	jsxFragment: "Fragment",
	logLevel: "warning",
});

const HOST_BUTTON_PAINT_COPIED_VERBATIM = `button:not(.clickable-icon) {
	color: var(--text-color);
	background-color: var(--interactive-normal);
	box-shadow: var(--input-shadow);
}
@media (hover: hover) {
	button:hover {
		background-color: var(--interactive-hover);
		box-shadow: var(--input-shadow-hover);
	}
}`;

const page = `<!doctype html><html><head><meta charset="utf-8">
<style>${HOST_BUTTON_PAINT_COPIED_VERBATIM}</style>
<style>${readFileSync("styles.css", "utf8")}</style>
<style>${readFileSync("widgets/@task/tokens.css", "utf8")}</style>
<style>body { margin: 0; background: #fff; color: #222; --background-primary: #fff; --background-secondary: #f6f6f6;
	--background-modifier-border: #e4e4e4; --background-modifier-hover: #ededed; --text-normal: #222; --text-muted: #707070; --text-faint: #ababab;
	--text-on-accent: #fff; --interactive-accent: #6d4ee0; --text-color: #222; --interactive-normal: #e3e3e3;
	--interactive-hover: #d8d8d8; --input-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); --input-shadow-hover: 0 2px 4px rgba(0, 0, 0, 0.14); }
.wg-host { display: flex; flex-direction: column; gap: 64px; align-items: flex-start; }
.wg-host, .wg-host * { transition: none !important; animation: none !important; }</style>
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
	[
		"--headless",
		"--disable-gpu",
		"--no-sandbox",
		"--hide-scrollbars",
		"--window-size=2000,1200",
		"--virtual-time-budget=9000",
		"--dump-dom",
		`file://${file}`,
	],
	{
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
		stdio: ["ignore", "pipe", process.env.WG_DEBUG ? "inherit" : "ignore"],
	},
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
	console.log(
		`${ok ? "OK " : "!! "} ${label}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
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
	check(
		`${at}: none of them is an empty box`,
		seen.cells.filter((cell) => cell.painted === 0 || cell.missing).map((cell) => cell.id),
		[],
	);
	check(
		`${at}: none of them has zero area`,
		seen.cells.filter((cell) => cell.box.width < 1 || cell.box.height < 1).map((cell) => cell.id),
		[],
	);
	check(`${at}: the board does not scroll sideways`, seen.scrollWidth <= seen.clientWidth + 1, true);
	check(
		`${at}: no widget spills out of its own box`,
		seen.cells.filter((cell) => cell.scrollWidth > cell.clientWidth + 1).map((cell) => cell.id),
		[],
	);
	check(
		`${at}: nothing sticks out of the board`,
		seen.cells
			.filter((cell) => cell.box.left < seen.board.left - 0.5 || cell.box.right > seen.board.right + 0.5)
			.map((cell) => cell.id),
		[],
	);
	check(
		`${at}: nothing is drawn under its minimum unless it already has the whole width`,
		seen.cells
			.filter((cell) => cell.box.width + 0.5 < cell.minPx && cell.box.width + 0.5 < seen.board.width)
			.map((cell) => cell.id),
		[],
	);
	check(`${at}: reading order is unchanged`, seen.rows.flat(), ORDER);
}

console.log("\n— the row of two either stands or stacks, and nothing else changes —");
{
	const rowsAt = (width) => measured.widths.find((seen) => seen.width === width).rows;
	check("at 1728 the tabs and the filter share a row", rowsAt(1728)[1], ["views", "wynttpz"]);
	check("at 1194 the filter takes its own row, because a quarter of it is under 320px", rowsAt(1194).slice(1, 3), [
		["views"],
		["wynttpz"],
	]);
	check("at 768 it still does", rowsAt(768).slice(1, 3), [["views"], ["wynttpz"]]);
	check("at 390 it still does", rowsAt(390).slice(1, 3), [["views"], ["wynttpz"]]);
	check("at 320 it still does", rowsAt(320).slice(1, 3), [["views"], ["wynttpz"]]);
	check(
		"and the kanban is last at every width",
		measured.widths.map((seen) => seen.rows.at(-1)),
		WIDTHS.map(() => ["board"]),
	);
}

console.log("\n— the plugin's own surface draws a board that carries rows —");
{
	const seen = measured.surface;
	check("the surface drew a tree, not a grid", seen.drawn, true);
	check("the tabs and the filter share a row, the kanban keeps its own", seen.rows, [1, 2, 1]);
	check("every cell painted a widget, the unplaced one included", seen.painted, 5);
	check("a tile no row names is drawn without taking a row", seen.overlays, 1);
	check("and no row is wider than the board it sits in", seen.widest <= seen.boardWidth + 0.5, true);
	check("one grip stands between the two that share a row", seen.across, 1);
	check("and it is invisible until its own gap is pointed at", seen.gripShown, 0);
	check("one strip under each row, not one under each tile", seen.along, 3);
	check("and it runs the whole line", seen.alongWidth, seen.boardWidth);
	check("no row is left without a strip, capped widgets or not", seen.capped, 0);
	check(
		"the gap the grip fills is the gap the layout counted",
		seen.sharedRow[0] + seen.sharedRow[1] + GAP_PX,
		seen.boardWidth,
	);
	check(
		"a tile standing alone on a row takes the whole row",
		seen.loneRows,
		seen.loneRows.map(() => 0),
	);
}

console.log("\n— and dragging that grip writes the board once —");
{
	const before = measured.surface;
	const after = measured.dragged;
	check("the filter stops on the floor its manifest names, not where the pointer went", after.sharedRow[1], 320);
	check(
		"the tabs took exactly what the filter could give",
		after.sharedRow[0] - before.sharedRow[0],
		before.sharedRow[1] - 320,
	);
	check("the row is still as wide as it was", after.sharedRow[0] + after.sharedRow[1] + GAP_PX, before.boardWidth);
	check("the board was written once, on release", after.writes, 1);
	check("the ratios in the file changed with it", after.ratios[0] > before.ratios[0], true);
	check(
		"and the row still weighs what it weighed",
		Math.round(after.ratios.reduce((sum, one) => sum + one, 0) * 100),
		Math.round(before.ratios.reduce((sum, one) => sum + one, 0) * 100),
	);
}

console.log("\n— and pulling the strip down stops where the widget's own ceiling is —");
{
	const before = measured.dragged;
	const after = measured.stretched;
	check("a 200px pull moved the row nowhere", after.firstRowHeight - before.firstRowHeight, 0);
	check("because the row already stood on the tabs' ceiling", after.firstRowHeight, TABS_CEILING_PX);
	check("and the widget inside is still on it", after.firstCellHeight, TABS_CEILING_PX);
	check("as it was before the pull", before.firstCellHeight, TABS_CEILING_PX);
	check("the board was written a second time", after.writes, 2);
}

console.log("\n— and while the pointer is down the board is not written at all —");
{
	check("no write while the width was being dragged", measured.whileHeld.across, 0);
	check("nor while the height was", measured.whileHeld.along, 1);
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
	const inner = innerOf(2, 1200 + GAP_PX);
	const pxAt = (cells, at) => (inner * cells[at].ratio) / cells.reduce((sum, cell) => sum + cell.ratio, 0);

	check("the row is 1200 wide once the gap is taken", inner, 1200);
	check("even to start with", Math.round(pxAt(row, 0)), 600);

	const wider = resized(row, 0, { boundaryPx: 800, inner, isFree: true });
	check("dragged to 800 the left cell is 800", Math.round(pxAt(wider, 0)), 800);
	check("and the right one gives up exactly that", Math.round(pxAt(wider, 1)), 400);

	const floored = resized(row, 0, { boundaryPx: 60, inner, isFree: true });
	check("dragged past the left floor it stops at the floor", Math.round(pxAt(floored, 0)), 200);
	const ceiled = resized(row, 0, { boundaryPx: 1180, inner, isFree: true });
	check("and past the right floor it stops there too", Math.round(pxAt(ceiled, 1)), 200);

	const snapping = resized(row, 0, { boundaryPx: 640, inner, isFree: false });
	check("without shift it lands on a twelfth", Math.round(pxAt(snapping, 0)), 600);
	const free = resized(row, 0, { boundaryPx: 640, inner, isFree: true });
	check("with shift it lands where the pointer is", Math.round(pxAt(free, 0)), 640);

	const three = [
		{ id: "a", ratio: 1, minPx: 100 },
		{ id: "b", ratio: 1, minPx: 100 },
		{ id: "c", ratio: 1, minPx: 100 },
	];
	const moved = resized(three, 0, { boundaryPx: 500, inner: innerOf(3, 1200 + 2 * GAP_PX), isFree: true });
	check("a neighbour outside the pair does not move", moved[2].ratio, three[2].ratio);
	check(
		"and the row still weighs what it weighed",
		Math.round(moved.reduce((sum, cell) => sum + cell.ratio, 0) * 1000),
		3000,
	);
}

console.log("\n— past a limit the boundary keeps giving, less and less, and lands on the limit —");
{
	const row = [
		{ id: "left", ratio: 1, minPx: 200 },
		{ id: "right", ratio: 1, minPx: 200 },
	];
	const inner = innerOf(2, 1200 + GAP_PX);
	const pxAt = (cells, at) => (inner * cells[at].ratio) / cells.reduce((sum, cell) => sum + cell.ratio, 0);
	const heldAt = (px, give) => pxAt(resized(row, 0, { boundaryPx: px, inner, isFree: true, give }), 0);
	const givenBy = (past) => 200 - heldAt(200 - past, true);

	check("held 100 past its floor the cell is under it", heldAt(100, true) < 200, true);
	check("but never by more than the give", heldAt(100, true) > 200 - GIVE_PX, true);
	check(
		"the second hundred of the pull buys less than the first",
		givenBy(200) - givenBy(100) < givenBy(100) - givenBy(0),
		true,
	);
	check("and the fourth less than the second", givenBy(400) - givenBy(300) < givenBy(200) - givenBy(100), true);
	check("pulled to the end of the world it stops one give short of nowhere", Math.round(givenBy(100000)), GIVE_PX);
	check("released, the cell lands on the floor itself", Math.round(heldAt(100, false)), 200);

	check("pushed past the neighbour's floor it gives the other way", heldAt(1300, true) > 1000, true);
	check("by no more than the give either", heldAt(1300, true) < 1000 + GIVE_PX, true);
	check("and released it lands on the neighbour's floor", Math.round(heldAt(1300, false)), 1000);

	const nameless = [
		{ id: "left", ratio: 1, minPx: 0 },
		{ id: "right", ratio: 1, minPx: 0 },
	];
	const emptied = resized(nameless, 0, { boundaryPx: 1400, inner, isFree: true, give: true });
	check("a cell that names no floor is still never given away past nothing", pxAt(emptied, 1) >= 0, true);
}

console.log("\n— a row is as tall as the widgets in it allow, and no taller —");
{
	const capped = [{ id: "a", shortestPx: 84, tallestPx: 84 }];
	check("pulled past the ceiling it lands on the ceiling", restacked(capped, 900)[0].height, 84);
	check("squeezed under the floor it lands on the floor", restacked(capped, 10)[0].height, 84);
	check("held past the ceiling it still gives", restacked(capped, 900, true)[0].height > 84, true);
	check("by no more than the give", restacked(capped, 900, true)[0].height - 84 <= GIVE_PX, true);

	const open = [{ id: "a", tallestPx: 84 }, { id: "b" }];
	check("one widget that names no ceiling lifts the ceiling off the row", restacked(open, 900)[0].height, 900);

	const both = [
		{ id: "a", tallestPx: 84 },
		{ id: "b", tallestPx: 160 },
	];
	check("where every widget names one, the tallest of them is the row's", restacked(both, 900)[0].height, 160);

	const upside = [{ id: "a", shortestPx: 200, tallestPx: 84 }];
	check("a floor above a ceiling is still a floor", restacked(upside, 10)[0].height, 200);

	const streak = JSON.parse(readFileSync("widgets/@habit/streak/manifest.json", "utf8"));
	check("the habit streak pins itself to one height", [streak.shortestPx, streak.tallestPx], [110, 110]);
}

console.log("\n— and a row squeezed under its own floor answers the same way —");
{
	const row = [{ id: "one", ratio: 1 }];
	check("squeezed under the floor it goes under it", restacked(row, 10, true)[0].height < MIN_HEIGHT_PX, true);
	check("but never by more than the give", restacked(row, 10, true)[0].height > MIN_HEIGHT_PX - GIVE_PX, true);
	check("released it lands on the floor", restacked(row, 10, false)[0].height, MIN_HEIGHT_PX);
	check("and pulled taller it meets no ceiling at all", restacked(row, 900, true)[0].height, 900);
}

console.log("\n— and so does a sidebar at either end of its travel —");
{
	const rows = [[{ id: "x", ratio: 1 }]];
	const three = { left: { rows }, main: { rows }, right: { rows } };
	const widest = 1600 - 8 - SIDEBAR_PX - 8 - MAIN_FLOOR_PX;
	const heldAt = (px, give) => widenedRegion(three, "left", px, 1600, 8, give);

	check("dragged under its minimum it goes under it", heldAt(40, true) < MIN_SIDEBAR_PX, true);
	check("but never by more than the give", heldAt(40, true) > MIN_SIDEBAR_PX - GIVE_PX, true);
	check("dragged past where the main breaks it goes past it", heldAt(2000, true) > widest, true);
	check("by no more than the give either", heldAt(2000, true) - widest <= GIVE_PX, true);
	check("released, either end lands on the limit", [heldAt(40, false), heldAt(2000, false)], [MIN_SIDEBAR_PX, widest]);
	check("and between them the give changes nothing", heldAt(360, true), heldAt(360, false));
}

console.log("\n— and a row squeezed at the strip does the same on the real board —");
{
	const seen = measured.squashed;
	check("the probe found the strip", seen.first.failed ?? null, null);
	check("squeezed 800px under the floor the row is drawn under it", seen.first.held < MIN_HEIGHT_PX, true);
	check("but never by more than the give", seen.first.held > MIN_HEIGHT_PX - GIVE_PX, true);
	check("and on release it springs back to the floor", seen.first.settled, MIN_HEIGHT_PX);
	check("squeezed again from the floor it gives again", seen.again.held < MIN_HEIGHT_PX, true);
	check("and springs back a second time, with no new height to write", seen.again.settled, MIN_HEIGHT_PX);
}

console.log("\n— and the plugin's own sidebar squashes and springs back —");
{
	const seen = measured.pinched;
	check("the probe found the edge", seen.failed ?? null, null);
	check("dragged 400px under its minimum it is drawn under it", seen.held < MIN_SIDEBAR_PX, true);
	check("but never by more than the give", seen.held > MIN_SIDEBAR_PX - GIVE_PX, true);
	check("and on release it sits on the minimum exactly", seen.settled, MIN_SIDEBAR_PX);
}

console.log("\n— and the give is handed back with a transition, never during the drag —");
{
	const seen = measured.eases;
	check("a row eases its height", [seen.row.property, seen.row.loose], ["height", "0.2s"]);
	check(
		"a cell eases both the room it takes and the place it moves to",
		[seen.cell.property, seen.cell.loose],
		["transform, flex-grow", "0.22s, 0.2s"],
	);
	check("a region eases its width", [seen.region.property, seen.region.loose], ["flex-basis", "0.2s"]);
	check(
		"and none of the three eases while the pointer is down",
		[seen.row.held, seen.cell.held, seen.region.held],
		["0s", "0s", "0s"],
	);
}

console.log("\n— in reading mode a press on a tile carries nothing —");
{
	const seen = measured.whileReading;
	check("no stand-in was drawn", seen.standIns, 0);
	check("and nothing was carried under the pointer", seen.ghosts, 0);
	check("and no grip was showing either", seen.gripShown, 0);
	check("and the rows are exactly as they were", seen.after, seen.before);
}

console.log("\n— and carrying the kanban onto the first row moves it there —");
{
	const seen = measured.carried;
	check("the probe found the kanban", seen.failed ?? null, null);
	check("editing shows every grip at once", seen.gripShown, 0.55);
	check("before the carry it stood alone on the last row", seen.before.at(-1), ["board"]);
	check("the row it will land in holds its place for it", seen.standIns, 1);
	check("and one tile rides under the pointer", seen.ghosts, 1);
	check("the plate is under the pointer, not beside it", seen.underPointer, true);
	check("and it is a plate, not the whole widget", seen.plateSize?.[1] <= 96, true);
	check("after the drop it stands on the first row", seen.after[0].includes("board"), true);
	check("and it left no empty row behind", seen.after.length, seen.before.length - 1);
	check("the board was written a third time", seen.writes, 3);
}

console.log("\n— a sidebar answers the pointer everywhere, not only where its widgets reach —");
{
	const seen = measured.intoSlack;
	check("the probe found a sidebar with room to spare", seen.failed ?? null, null);
	check("and that room is real, not a rounding error", seen.slack > 100, true);
	check("aiming into the bare part of the column shows where the tile would land", seen.aimed, 1);
	check("and releasing it there puts the tile under the widget already standing there", seen.left, [
		["boards"],
		["board"],
	]);
	check("the region it came from is left empty", seen.main, []);
}

console.log("\n— and the place it held is the place it lands, to the pixel —");
{
	const seen = measured.carried;
	const off = seen.lie ?? {};
	check("the stand-in stands where the tile lands", [off.left, off.top], [0, 0]);
	check("and is exactly as wide and as tall", [off.width, off.height], [0, 0]);
	check("nothing was pushed outside the board while it was held", seen.spilled, []);
}

console.log("\n— and the plugin draws those three regions without a pixel spare —");
{
	const seen = measured.sides;
	check("the page drew its columns", seen.drawn, true);
	check(
		"three regions stand",
		seen.regions.map((one) => one.name),
		["left", "main", "right"],
	);
	check("with a handle in every gap between them", seen.edges, 2);
	check("the strip paints no fill of its own", seen.edgeFill, "rgba(0, 0, 0, 0)");
	check("and it can be grabbed the whole height of the column", seen.edgeReach, seen.regions[0].height);
	check(
		"none of them overlaps the next",
		seen.regions.slice(1).every((one, at) => one.left >= seen.regions[at].right),
		true,
	);
	check("together they span the row exactly", seen.spans, seen.rowWidth);
	check("and nothing overflows sideways", seen.scrollWidth <= seen.clientWidth + 1, true);
	check("every region starts at the same top", new Set(seen.regions.map((one) => one.top)).size, 1);
	check("and every one reaches the same bottom", new Set(seen.regions.map((one) => one.height)).size, 1);
}

console.log("\n— and while a sidebar is being dragged the rest keep up with it —");
{
	const before = measured.sides;
	const after = measured.widened;
	const wideOf = (seen, name) =>
		seen.regions.find((one) => one.name === name).right - seen.regions.find((one) => one.name === name).left;

	check("the sidebar took the whole pull, while still held", wideOf(after, "left") - wideOf(before, "left"), 100);
	check("the main gave up exactly that, while still held", wideOf(before, "main") - wideOf(after, "main"), 100);
	check("the other sidebar was not touched", wideOf(after, "right"), wideOf(before, "right"));
	check("and the three still span the row exactly", after.spans, after.rowWidth);
	check("so nothing ran off the side", after.scrollWidth <= after.clientWidth + 1, true);
}

console.log("\n— a board of three regions stands side by side while there is room —");
{
	const rows = [[{ id: "x", ratio: 1 }]];
	const three = { left: { rows }, main: { rows }, right: { rows } };
	const names = (given) => given.beside.map((column) => column.name);
	const wide = columnsOf(three, 1600, 8);

	check("all three stand", names(wide), ["left", "main", "right"]);
	check("a sidebar is the width its own constant names", wide.beside[0].width, SIDEBAR_PX);
	check("and the main takes everything the sidebars left", wide.beside[1].width, 1600 - (8 + SIDEBAR_PX) * 2);
	check("nothing had to be stacked", wide.stacked, []);

	const narrow = columnsOf(three, SIDEBAR_PX * 2 + MAIN_FLOOR_PX, 8);
	check("when the main would fall under its floor the right one goes first", names(narrow), ["left", "main"]);
	check("and the one that went is stacked, not lost", narrow.stacked, ["right"]);

	const tight = columnsOf(three, MAIN_FLOOR_PX + 100, 8);
	check("tighter still, only the main stands", names(tight), ["main"]);
	check("and both sidebars are stacked under it", tight.stacked, ["left", "right"]);

	check("a board with no sidebars is one column", names(columnsOf({ main: { rows } }, 900, 8)), ["main"]);
	check("and a board with no main stands nothing beside anything", columnsOf({ left: { rows } }, 1600, 8), {
		beside: [],
		stacked: ["left"],
	});
	check("below the floor everything stacks", columnsOf(three, 300, 8).beside, []);

	const widened = { left: { rows, width: 420 }, main: { rows }, right: { rows } };
	check("a sidebar drawn at the width it carries", columnsOf(widened, 1600, 8).beside[0].width, 420);
	check(
		"and the main gives up exactly that",
		columnsOf(widened, 1600, 8).beside[1].width,
		1600 - 8 - 420 - 8 - SIDEBAR_PX,
	);

	check(
		"dragging a sidebar narrower stops at its own minimum",
		widenedRegion(three, "left", 40, 1600, 8),
		MIN_SIDEBAR_PX,
	);
	check(
		"and wider stops where the main would fall under its floor",
		widenedRegion(three, "left", 2000, 1600, 8),
		1600 - 8 - SIDEBAR_PX - 8 - MAIN_FLOOR_PX,
	);
	check("between the two it lands where the pointer asked", widenedRegion(three, "left", 360, 1600, 8), 360);
	check(
		"the other sidebar is counted, not forgotten",
		widenedRegion({ left: { rows }, main: { rows } }, "left", 2000, 1600, 8),
		1600 - 8 - MAIN_FLOOR_PX,
	);

	const folded = { left: { rows, folded: true }, main: { rows }, right: { rows } };
	check(
		"the fold reads off the region that carries it",
		[isFolded(folded, "left"), isFolded(folded, "right")],
		[true, false],
	);
	check("and toggling one names the other unchanged", isFolded(toggledFold(folded, "left"), "left"), false);
	check("toggling an open one folds it", isFolded(toggledFold(three, "right"), "right"), true);
	check("and leaves every other region as it stood", toggledFold(three, "right").left, three.left);
	check("a folded sidebar does not stand", names(columnsOf(folded, 1600, 8)), ["main", "right"]);
	check("and it is not stacked under the board either — folded means gone", columnsOf(folded, 1600, 8).stacked, []);
	check(
		"the main takes back every pixel the folded one held",
		columnsOf(folded, 1600, 8).beside[0].width,
		1600 - 8 - SIDEBAR_PX,
	);
	check(
		"a folded sidebar is no longer counted against a drag",
		widenedRegion(folded, "right", 2000, 1600, 8),
		1600 - 8 - MAIN_FLOOR_PX,
	);
	check(
		"folding both leaves the main alone",
		names(columnsOf({ left: { rows, folded: true }, main: { rows }, right: { rows, folded: true } }, 1600, 8)),
		["main"],
	);
	check(
		"folding one is what keeps the other standing when the board is narrow",
		names(columnsOf(folded, SIDEBAR_PX + MAIN_FLOOR_PX + 8, 8)),
		["main", "right"],
	);
	check("both sidebars are toggleable, the main is not", foldableIn(three), ["left", "right"]);
	check("a folded sidebar still offers its toggle — nothing else would bring it back", foldableIn(folded), [
		"left",
		"right",
	]);
	check("a region that holds no rows offers none", foldableIn({ main: { rows } }), []);
	check("and a board with no tree at all offers none", foldableIn(undefined), []);

	const bare = { left: { rows: [] }, main: { rows: [] }, right: { rows: [] } };
	check(
		"an empty sidebar still stands, because nothing can be dropped where nothing is drawn",
		names(columnsOf(bare, 1600, 8)),
		["left", "main", "right"],
	);
	check("and it still offers its toggle", foldableIn(bare), ["left", "right"]);
}

function toggleChecks() {
	console.log("\n— the two toggles stand on the board's own bar and fold a sidebar away —");
	const { togglesOpen, openSides, foldedLeft, togglesFolded, unfoldedLeft, pressedEdit, soloBar } = measured;
	check("the board drew both toggles and nothing else", [togglesOpen.left, togglesOpen.right].map(Boolean), [
		true,
		true,
	]);
	if (!togglesOpen.left || !togglesOpen.right) return;
	check(
		"both stand on the board's own first line, not over a tile",
		[togglesOpen.left.fromTop, togglesOpen.right.fromTop],
		[0, 0],
	);
	check(
		"one sits at the left edge, the other at the right",
		[togglesOpen.left.nearestCorner, togglesOpen.right.nearestCorner],
		[0, 0],
	);
	check("the bar ends where the first row begins", togglesOpen.barBottom <= togglesOpen.firstRowTop, true);
	check(
		"each drew a real icon, not an empty box",
		[togglesOpen.left.painted > 8, togglesOpen.right.painted > 8],
		[true, true],
	);
	check(
		"both are the kit's own control, not a hand-rolled one",
		[togglesOpen.left.fromKit, togglesOpen.right.fromKit],
		[true, true],
	);
	check("each wears the raised face the kit reserves for white", togglesOpen.left.face, togglesOpen.right.face);
	check(
		"and that face carries a rim, which is what tells it from the page behind it",
		togglesOpen.left.rim.includes("inset"),
		true,
	);
	check("an open sidebar reads as pressed", [togglesOpen.left.pressed, togglesOpen.right.pressed], ["true", "true"]);
	check(
		"and both are visible with no pointer anywhere near them",
		[togglesOpen.left.shown, togglesOpen.right.shown],
		[1, 1],
	);
	check(
		"all three regions stand before the press",
		openSides.regions.map((one) => one.name),
		["left", "main", "right"],
	);
	check(
		"pressing the left toggle takes the left region off the board",
		foldedLeft.regions.map((one) => one.name),
		["main", "right"],
	);
	check(
		"the main grew by exactly what the sidebar held",
		foldedLeft.regions[0].right - foldedLeft.regions[0].left,
		openSides.regions[1].right - openSides.regions[1].left + (openSides.regions[1].left - openSides.regions[0].left),
	);
	check("the board still does not scroll sideways", foldedLeft.scrollWidth <= foldedLeft.clientWidth + 1, true);
	check("the folded toggle stays on screen", togglesFolded.left.shown, 1);
	check("it no longer reads as pressed", togglesFolded.left.pressed, "false");
	check("and it still stands at the same edge", togglesFolded.left.nearestCorner, 0);
	check("the other one was not touched", togglesFolded.right.pressed, "true");

	check("the bar carries the edit toggle beside the folds", Boolean(togglesOpen.edit), true);
	check("it stands on the board's own first line too", togglesOpen.edit.fromTop, 0);
	check(
		"and it is the kit's control, drawn with a real icon",
		[togglesOpen.edit.fromKit, togglesOpen.edit.painted > 8],
		[true, true],
	);
	check(
		"a reader is offered the way into edit mode",
		[pressedEdit.resting.board, pressedEdit.resting.pressed, pressedEdit.resting.label],
		[false, "false", "Widgetarium: enter edit mode"],
	);
	check(
		"pressing it puts the board in edit mode, and says so",
		[pressedEdit.on.board, pressedEdit.on.pressed, pressedEdit.on.label],
		[true, "true", "Widgetarium: leave edit mode"],
	);
	check(
		"and it is lit while it holds, not left looking like its neighbours",
		pressedEdit.on.face !== pressedEdit.resting.face,
		true,
	);
	check("pressing it again leaves edit mode", pressedEdit.off, pressedEdit.resting);
	check("a board with no sidebar at all still carries the toggle", soloBar, { drawn: true, toggles: ["edit"] });
	check(
		"a folded sidebar keeps its widgets mounted, or every ref they offer dies with them",
		measured.mountedFolded.tiles,
		measured.mountedOpen.tiles,
	);
	check("and they are still drawn, not emptied husks", measured.mountedFolded.painted, measured.mountedOpen.painted);
	check(
		"pressing it again brings the sidebar back",
		unfoldedLeft.regions.map((one) => one.name),
		["left", "main", "right"],
	);
	check(
		"at the width it had before it went",
		unfoldedLeft.regions[0].right - unfoldedLeft.regions[0].left,
		openSides.regions[0].right - openSides.regions[0].left,
	);
}

toggleChecks();

console.log("\n— carrying a tile puts it where it was aimed, and closes the row it left —");
{
	const rows = [
		[{ id: "a", ratio: 1 }],
		[
			{ id: "b", ratio: 1 },
			{ id: "c", ratio: 2 },
		],
	];
	const ids = (given) => given.map((row) => row.map((cell) => cell.id));

	check("dropped as a row of its own it lands there", ids(moved(rows, "c", { kind: "row", at: 0 })), [
		["c"],
		["a"],
		["b"],
	]);
	check("and the row it left keeps the rest", ids(moved(rows, "b", { kind: "row", at: 2 })), [["a"], ["c"], ["b"]]);
	check("dropped beside a tile it joins that row", ids(moved(rows, "a", { kind: "beside", row: 0, at: 1 })), [
		["b", "a", "c"],
	]);
	check("and the row it emptied is gone", moved(rows, "a", { kind: "beside", row: 0, at: 1 }).length, 1);
	check("it carries its own weight along", moved(rows, "c", { kind: "row", at: 0 })[0][0].ratio, 2);
	check("a tile nobody is holding moves nothing", ids(moved(rows, "nobody", { kind: "row", at: 0 })), ids(rows));
	check("and no target moves nothing either", ids(moved(rows, "a", null)), ids(rows));

	const layout = { left: { rows: [] }, main: { rows }, right: { rows: [] } };
	const across = carriedInto(layout, { id: "c", from: "main", to: "right", target: { kind: "row", at: 0 } });
	check("a tile carried into an empty sidebar arrives there", ids(across.right.rows), [["c"]]);
	check("and leaves the region it came from", ids(across.main.rows), [["a"], ["b"]]);
	check("it carries its weight across too", across.right.rows[0][0].ratio, 2);
	check(
		"carried back inside one region it is the same move as before",
		ids(carriedInto(layout, { id: "c", from: "main", to: "main", target: { kind: "row", at: 0 } }).main.rows),
		ids(moved(rows, "c", { kind: "row", at: 0 })),
	);
	check(
		"a tile the source region does not hold moves nothing",
		carriedInto(layout, { id: "nobody", from: "main", to: "right", target: { kind: "row", at: 0 } }),
		layout,
	);
	check(
		"and no target moves nothing either",
		carriedInto(layout, { id: "c", from: "main", to: "right", target: null }),
		layout,
	);
	check("a region with no rows still answers where a drop lands", aimedAt([], 40, 40), { kind: "row", at: 0 });
	check(
		"dropping beside nothing in an empty region opens the first row",
		ids(
			carriedInto(layout, { id: "c", from: "main", to: "left", target: { kind: "beside", row: 0, at: 0 } }).left.rows,
		),
		[["c"]],
	);
	check(
		"a target naming a row that is gone keeps the tile rather than losing it",
		ids(
			carriedInto(layout, { id: "c", from: "main", to: "left", target: { kind: "beside", row: 9, at: 0 } }).left.rows,
		),
		[["c"]],
	);
	check("and within one region it is kept too", ids(moved(rows, "c", { kind: "beside", row: 9, at: 0 })), [
		["a"],
		["b"],
		["c"],
	]);
	const doubled = { left: { rows: [[{ id: "c", ratio: 1 }]] }, main: { rows }, right: { rows: [] } };
	check(
		"a tile a hand-edited file put in two regions arrives once",
		ids(carriedInto(doubled, { id: "c", from: "main", to: "left", target: { kind: "row", at: 0 } }).left.rows),
		[["c"]],
	);
}

console.log("\n— a target names a row in the board the carried tile has already left —");
{
	const rows = [
		[{ id: "a", ratio: 1 }],
		[
			{ id: "b", ratio: 1 },
			{ id: "c", ratio: 2 },
		],
		[{ id: "d", ratio: 1 }],
	];
	const ids = (given) => given.map((row) => row.map((cell) => cell.id));

	check("the row a lone tile leaves is gone, and the ones under it move up", rowIndexesAfterLeaving(rows, "a"), [
		null,
		0,
		1,
	]);
	check("a row it shared with another keeps its place", rowIndexesAfterLeaving(rows, "c"), [0, 1, 2]);
	check("a tile no row holds renumbers nothing", rowIndexesAfterLeaving(rows, "nobody"), [0, 1, 2]);
	check("and the rows themselves say the same", ids(withoutCell(rows, "a")), [["b", "c"], ["d"]]);

	const layout = { left: { rows: [] }, main: { rows }, right: { rows: [] } };
	const inside = carriedInto(layout, { id: "a", from: "main", to: "main", target: { kind: "row", at: 1 } });
	const across = carriedInto(
		{ ...layout, left: { rows: [[{ id: "z", ratio: 1 }]] } },
		{ id: "a", from: "main", to: "left", target: { kind: "row", at: 1 } },
	);
	check("row 1 means the same place inside one region", ids(inside.main.rows), [["b", "c"], ["a"], ["d"]]);
	check("and across two", ids(across.left.rows), [["z"], ["a"]]);
}

console.log("\n— a tile travels at a speed, so a long move is not a teleport —");
{
	check("a step takes the floor, however short it is", millisecondsAcross(4, 0), millisecondsAcross(0, 0));
	check("twice as far takes longer", millisecondsAcross(800, 0) > millisecondsAcross(400, 0), true);
	check("and the far side of a board still lands inside half a second", millisecondsAcross(4000, 0) <= 500, true);
	check("a diagonal is measured as one distance, not two", millisecondsAcross(300, 400), millisecondsAcross(500, 0));
	check("and nothing crawls: even the floor is under a fifth of a second", millisecondsAcross(0, 0) <= 200, true);
}

console.log("\n— and the aim reads the pointer against the bands —");
{
	const bands = [
		{
			from: 0,
			top: 0,
			bottom: 112,
			rowBottom: 100,
			cells: [
				{ left: 0, right: 600 },
				{ left: 612, right: 1200 },
			],
		},
		{ from: 1, top: 112, bottom: 324, rowBottom: 312, cells: [{ left: 0, right: 1200 }] },
	];
	check("above everything it aims at the first row", aimedAt(bands, 300, -20), { kind: "row", at: 0 });
	check("below everything it aims past the last", aimedAt(bands, 300, 900), { kind: "row", at: 2 });
	check("in the strip under a row it makes a new row after it", aimedAt(bands, 300, 106), { kind: "row", at: 1 });
	check("near the top of a row it opens a row above it", aimedAt(bands, 300, 8), { kind: "row", at: 0 });
	check("near the bottom of a row it opens one below", aimedAt(bands, 300, 92), { kind: "row", at: 1 });
	check("and the two edges together never eat the whole row", aimedAt(bands, 300, 50).kind, "beside");
	check(
		"a tall row keeps its edges to a reachable band, not to a quarter of itself",
		aimedAt([{ from: 0, top: 0, bottom: 900, rowBottom: 880, cells: [{ left: 0, right: 1200 }] }], 300, 200).kind,
		"beside",
	);
	check("in a tile's left half it goes before that tile", aimedAt(bands, 100, 50).at, 0);
	check("in its right half it goes after", aimedAt(bands, 500, 50).at, 1);
	check("past the last tile it goes to the end of the row", aimedAt(bands, 1400, 50).at, 2);
}

console.log("\n— an empty sidebar is drawn as a zone, and a tile carried from the main lands in it —");
{
	const { emptyOpen, carriedAcross, emptyResting, addedIntoRight } = measured;

	check("the board draws at all", emptyOpen.drawn, true);
	check("all three regions stand while the board is being laid out", emptyOpen.regions, ["left", "main", "right"]);
	check("and each one names itself, so a carried tile can find it", emptyOpen.named, ["left", "main", "right"]);
	check("the empty left is a zone with real room in it", emptyOpen.left?.height > 0 && emptyOpen.left?.width > 0, true);
	check("and it says what pressing it does", emptyOpen.left?.text, "Add a widget");
	check("it is a control, not a caption", emptyOpen.left?.tag, "button");
	check(
		"while the board is being laid out it is a solid ring, not a hint",
		[emptyOpen.left?.line, emptyOpen.left?.ring === "none"],
		["none", false],
	);
	check("the empty right is a zone too", emptyOpen.right?.height > 0 && emptyOpen.right?.width > 0, true);
	check("a tile alone on a row fills it even while its share says half", emptyOpen.halfShare, 0);
	check("every region ends in one, so a widget can be added where the eye is", emptyOpen.adds, [
		"left",
		"main",
		"right",
	]);
	check("and in a region holding rows it is the last thing, not the first", emptyOpen.lastInRegion, "wg-tree-add");
	check("the board no longer carries a press that names no region", emptyOpen.palette, 0);

	check("aiming into the empty sidebar shows where the tile would land", carriedAcross.aimed, 1);
	check("and a tile carrying no height of its own is stood in for at the height it had", carriedAcross.lie, {
		left: 0,
		top: 0,
		width: 0,
		height: 0,
	});
	check("and releasing it puts the tile in that sidebar", carriedAcross.left, [["boards"]]);
	check("the region it came from lets it go", carriedAcross.main, [["board"]]);

	check("the sidebar that stayed empty still stands for a reader", emptyResting.regions, ["left", "main", "right"]);
	check("no palette is drawn to a reader", emptyResting.palette, 0);
	check("a region a reader finds empty says what it is waiting for", emptyResting.adds, emptyResting.bare);
	check("and it is exactly the regions holding nothing", emptyResting.bare, ["main", "right"]);
	check("a region holding rows offers a reader no press", emptyResting.left, null);
	check(
		"the reader's zone is a dashed hint, not the edit control's solid ring",
		[emptyResting.right?.line, emptyResting.right?.ring],
		["dashed", "none"],
	);
	check(
		"and it is see-through, so it reads as room rather than as a tile",
		emptyResting.right?.fill,
		"rgba(0, 0, 0, 0)",
	);
	check(
		"while the one offered to an editor keeps the fill the host paints on a button",
		emptyOpen.left?.fill,
		"rgb(227, 227, 227)",
	);
	check("a reader keeps the folds and the way into edit mode", emptyResting.toggles, ["left", "edit", "right"]);

	check("the probe reached the catalogue", addedIntoRight.failed ?? null, null);
	check("pressing a region's zone opens the catalogue", addedIntoRight.opened, 1);
	check("and the pick adds one tile", addedIntoRight.born, 1);
	check("on a row of its own in the region that was pressed", addedIntoRight.grew, 1);
	check("the other two regions are left exactly as they were", addedIntoRight.untouched, ["left", "main"]);
	check("and the catalogue closes behind the pick", addedIntoRight.dialogs, 0);
}

console.log("\n— a tile on a tree board carries the same two controls the grid tile has —");
{
	const { chromeEditing, chromeReading } = measured;
	check("every cell on the board draws a settings control", chromeEditing.settings, chromeEditing.cells);
	check("and a remove control beside it", chromeEditing.removes, chromeEditing.cells);
	check("the pill is a real box, not a collapsed one", chromeEditing.pill?.held, true);
	check("seated in the corner of the cell it belongs to", chromeEditing.pill?.within, true);
	check("because the cell is what it is measured against", chromeEditing.pill?.seat, "absolute");
	check("and it stands there without being pointed at", chromeEditing.pill?.shown, 1);
	check("a reader is offered neither", [chromeReading.settings, chromeReading.removes], [0, 0]);
	check("and the cells are all still there", chromeReading.cells, chromeEditing.cells);
}

console.log("\n— settings open the playground, and it offers nothing measured in cells —");
{
	const seen = measured.configured;
	check("the probe found the control", seen.failed ?? null, null);
	check("pressing it opens one window", seen.windows, 1);
	check("the window is drawn at the size the cell had, not at a count of cells", seen.canvas, seen.box);
	check("the widget is drawn there and not twice", seen.drawnInCell, 0);
	check("and the cell it left keeps the height it had", seen.heldBox, seen.box);
	check("closing the window takes it away", seen.closed, 0);
	check("and puts the widget back in its cell", seen.backInCell > 0, true);
	check("all three tabs are offered", seen.tabs, ["Settings", "Data", "Design"]);
	check("and the Design tab counts no cells", seen.cells, 0);
	check(
		"because a tree cell has no width in cells to write",
		seen.rows.filter((text) => text.startsWith("Width") || text.startsWith("Height")),
		[],
	);
	check(
		"nor a fold to one column",
		seen.rows.filter((text) => text.includes("Fold to one column")),
		[],
	);
}

console.log("\n— and removing one asks first —");
{
	const seen = measured.removal;
	check("the probe found the control", seen.failed ?? null, null);
	check("pressing remove puts one dialog up", seen.asked.dialogs, 1);
	check("it asks about the widget", seen.asked.title, "Remove this widget?");
	check("and names the verb on the button", seen.asked.confirmLabel, "Remove");
	check("nothing is gone while it is up", seen.asked.tiles.includes("views"), true);
	check("cancelling takes the dialog away", seen.cancelled.dialogs, 0);
	check("and leaves the tile where it was", seen.cancelled.tiles.includes("views"), true);
	check("and writes nothing at all", seen.cancelled.writes, seen.asked.writes);
	check("confirming drops the tile from the board", seen.gone.tiles.includes("views"), false);
	check("and out of the rows the board draws", seen.gone.rows.flat().includes("views"), false);
	check("and out of the rows the file holds", seen.gone.written.includes("views"), false);
	check(
		"while the ones it holds beside it stay written",
		seen.gone.written,
		seen.asked.written.filter((id) => id !== "views"),
	);
	check(
		"leaving every other tile standing",
		seen.gone.tiles,
		seen.asked.tiles.filter((id) => id !== "views"),
	);
	check("in one write", seen.gone.writes - seen.cancelled.writes, 1);
}

if (measured.failures.length > 0) {
	failed += measured.failures.length;
	for (const failure of measured.failures) console.log(`!! the page logged: ${failure}`);
}

console.log(failed ? `\n${failed} widths the tree got wrong` : "\nfour widgets, five widths, nothing vanished");
process.exit(failed ? 1 : 0);
