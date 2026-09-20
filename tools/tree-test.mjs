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
	columnsOf,
	drawerWidth,
	DRAWER_MAX_PX,
	heldHeight,
	isFolded,
	keptAt,
	insertedAt,
	laid,
	leavesOf,
	movedInto,
	nodeAt,
	sameTarget,
	toggledFold,
	GAP_PX,
	STEP_PX,
	innerOf,
	MAIN_FLOOR_PX,
	MIN_HEIGHT_PX,
	MIN_SIDEBAR_PX,
	resized,
	SIDEBAR_PX,
	widenedBox,
	withHeight,
	withoutLeaf,
} = await import("./.mjs-cache/tree.mjs");

const ONE_CELL = [{ id: "x", ratio: 1 }];
const rootOf = (of) => ({ dir: "row", of });
const side = (of = ONE_CELL, flags = {}) => ({
	dir: "column",
	collapse: { into: "drawer", toggle: "always" },
	...(Array.isArray(of) ? {} : of),
	of: Array.isArray(of) ? of : ONE_CELL,
	...flags,
});
const kept = (of = ONE_CELL) => ({ dir: "column", keep: true, of });
const THREE = rootOf([side(), kept(), side()]);
const sideName = (at) => (at === 1 ? "main" : at === 0 ? "left" : "right");
const { GIVE_PX } = await import("./.mjs-cache/give.mjs");
const { millisecondsAcross } = await import("./.mjs-cache/flip.mjs");

const FIXTURE = "tools/fixture/Orbitask/Board.md";
const TABS_CEILING_PX = JSON.parse(readFileSync("widgets/@default/editable-tabs/manifest.generated.json", "utf8")).size
	.tallestPx;
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
const board = { tiles: saved.tiles };

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
<style>${readFileSync("widgets/@default/tokens.css", "utf8")}</style>
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
		seen.sharedRow[0] + seen.sharedRow[1] + STEP_PX[1],
		seen.boardWidth,
	);
	check(
		"a tile standing alone on a row takes the whole row",
		seen.loneRows,
		seen.loneRows.map(() => 0),
	);
	check(
		"and a height the file declares is the height drawn",
		seen.declaredHeights.filter((held) => held.drawn !== held.wanted),
		[],
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
	check("the row is still as wide as it was", after.sharedRow[0] + after.sharedRow[1] + STEP_PX[1], before.boardWidth);
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

console.log("\n— a node is as tall as the widgets in it allow, and no taller —");
{
	const asking = (held) => (id) => held[id] ?? {};
	const capped = asking({ a: { shortestPx: 84, tallestPx: 84 } });
	const cell = { id: "a", ratio: 1 };
	check("pulled past the ceiling it lands on the ceiling", heldHeight(cell, { wantedPx: 900, ask: capped }), 84);
	check("squeezed under the floor it lands on the floor", heldHeight(cell, { wantedPx: 10, ask: capped }), 84);
	check(
		"held past the ceiling it still gives",
		heldHeight(cell, { wantedPx: 900, ask: capped, give: true }) > 84,
		true,
	);
	check("by no more than the give", heldHeight(cell, { wantedPx: 900, ask: capped, give: true }) - 84 <= GIVE_PX, true);

	const row = { dir: "row", of: [{ id: "a" }, { id: "b" }] };
	const open = asking({ a: { tallestPx: 84 } });
	check(
		"one widget that names no ceiling lifts the ceiling off the row",
		heldHeight(row, { wantedPx: 900, ask: open }),
		900,
	);

	const both = asking({ a: { tallestPx: 84 }, b: { tallestPx: 160 } });
	check(
		"where every widget names one, the tallest of them is the row's",
		heldHeight(row, { wantedPx: 900, ask: both }),
		160,
	);

	const upside = asking({ a: { shortestPx: 200, tallestPx: 84 } });
	check("a floor above a ceiling is still a floor", heldHeight(cell, { wantedPx: 10, ask: upside }), 200);

	const deep = { dir: "column", of: [{ id: "a" }, { dir: "row", of: [{ id: "b" }] }] };
	check("a ceiling is read through every level of the tree", heldHeight(deep, { wantedPx: 900, ask: both }), 160);

	const streak = JSON.parse(readFileSync("widgets/@default/streak/manifest.generated.json", "utf8"));
	check("the habit streak pins itself to one height", [streak.size.shortestPx, streak.size.tallestPx], [110, 110]);
}

console.log("\n— a height belongs to the widgets, never to the box around them —");
{
	const ask = () => ({ minPx: 260 });
	const four = { dir: "row", of: ["a", "b", "c", "d"].map((id) => ({ id, height: 86 })) };
	const narrow = laid(four, 700, { ask });
	check("a row too narrow for four is drawn as a column", [narrow.dir, narrow.isStacked], ["column", true]);
	check("with no height to squeeze them into", narrow.height ?? null, null);
	check(
		"and every widget keeps the height it was given",
		narrow.of.map((one) => one.height),
		[86, 86, 86, 86],
	);
	check("wide, the row draws no height of its own either", laid(four, 1400, { ask }).height ?? null, null);
}

console.log("\n— resizing a box resizes the widgets in it —");
{
	const nothing = () => ({});
	const nest = {
		dir: "row",
		of: [
			{ id: "a", height: 100 },
			{
				dir: "column",
				of: [
					{ id: "b", height: 40 },
					{ id: "c", height: 52 },
				],
			},
		],
	};
	const nestDrawn = {
		"": { heightPx: 100, dir: "row" },
		0: { heightPx: 100 },
		1: { heightPx: 100, dir: "column" },
		"1/0": { heightPx: 40 },
		"1/1": { heightPx: 52 },
	};
	const grown = withHeight(nest, [], 200, { drawnAs: nestDrawn, ask: nothing });
	check("a row gives every widget in it the same new height", grown.of[0].height, 200);
	check(
		"and a column inside it shares its growth by the heights it had",
		grown.of[1].of.map((one) => one.height),
		[83, 109],
	);
	check("a box keeps no height of its own", [grown.height, grown.of[1].height], [undefined, undefined]);

	const column = {
		dir: "column",
		of: [
			{ id: "a", height: 100 },
			{ id: "b", height: 300 },
		],
	};
	const columnDrawn = { "": { heightPx: 408, dir: "column" }, 0: { heightPx: 100 }, 1: { heightPx: 300 } };
	const shrunk = withHeight({ dir: "row", of: [column] }, [0], 208, {
		drawnAs: { 0: columnDrawn[""], "0/0": columnDrawn[0], "0/1": columnDrawn[1] },
		ask: nothing,
	});
	check(
		"a column shrinks every widget in the same proportion",
		shrunk.of[0].of.map((one) => one.height),
		[50, 150],
	);

	const floored = withHeight(column, [], 100, { drawnAs: columnDrawn, ask: nothing });
	check("and no widget goes under its floor to pay for it", floored.of[0].height, MIN_HEIGHT_PX);

	const pair = {
		dir: "row",
		of: [
			{ id: "a", height: 100 },
			{ id: "b", height: 100 },
		],
	};
	const stackedDrawn = {
		"": { heightPx: 208, dir: "column" },
		0: { heightPx: 100, across: "1" },
		1: { heightPx: 100, across: "1" },
	};
	const tallStack = withHeight(pair, [], 308, { drawnAs: stackedDrawn, ask: nothing });
	check(
		"a row drawn stacked still gives every widget one height, kept for one across",
		tallStack.of.map((one) => one.heights),
		[{ 1: 150 }, { 1: 150 }],
	);

	const uneven = {
		dir: "row",
		of: [
			{ id: "a", height: 100 },
			{ id: "b", height: 300 },
		],
	};
	const unevenDrawn = { "": { heightPx: 300, dir: "row" }, 0: { heightPx: 100 }, 1: { heightPx: 300 } };
	check(
		"a row of uneven widgets gives them all one height when it is resized",
		withHeight(uneven, [], 200, { drawnAs: unevenDrawn, ask: nothing }).of.map((one) => one.height),
		[200, 200],
	);

	const views = {
		dir: "swap",
		id: "v",
		of: [
			{ id: "shown", height: 200 },
			{ id: "away", height: 250, hidden: true },
		],
	};
	const viewsDrawn = { "": { heightPx: 240, dir: "swap" }, 0: { heightPx: 200 }, 1: { heightPx: 0 } };
	const pulled = withHeight(views, [], 340, { drawnAs: viewsDrawn, ask: nothing });
	check(
		"a swap grows the view on screen and leaves the others as they were",
		pulled.of.map((one) => one.height),
		[300, 250],
	);

	check(
		"a row squeezed past nothing still lands every widget on its floor",
		withHeight(pair, [], -600, {
			drawnAs: { "": { heightPx: 100, dir: "row" }, 0: { heightPx: 100 }, 1: { heightPx: 100 } },
			ask: nothing,
		}).of.map((one) => one.height),
		[MIN_HEIGHT_PX, MIN_HEIGHT_PX],
	);
	check(
		"a widget resized alone takes the height asked",
		withHeight(column, [1], 250, { drawnAs: {}, ask: nothing }).of[1].height,
		250,
	);
}

console.log("\n— a widget keeps one height for each arrangement its row is drawn in —");
{
	const ask = () => ({ minPx: 260 });
	const nothing = () => ({});
	const four = {
		dir: "row",
		of: [
			{ id: "a", height: 86, heights: { 1: 180 } },
			{ id: "b", height: 86, heights: { 2: 140 } },
			{ id: "c", height: 86 },
			{ id: "d", height: 86 },
		],
	};
	check(
		"a row standing whole reads height",
		laid(four, 1400, { ask }).of.map((one) => one.height),
		[86, 86, 86, 86],
	);
	check(
		"stacked, each reads its height for one across, else the nearest wider, else height",
		laid(four, 700, { ask }).of.map((one) => one.height),
		[180, 140, 86, 86],
	);
	check(
		"and says how many stand across",
		laid(four, 700, { ask }).of.map((one) => one.across),
		[1, 1, 1, 1],
	);

	const whileStacked = withHeight(four, [0], 240, { drawnAs: { 0: { heightPx: 180, across: "1" } }, ask: nothing })
		.of[0];
	check(
		"resized while stacked it writes that arrangement and leaves height alone",
		[whileStacked.height, whileStacked.heights],
		[86, { 1: 240 }],
	);
	const whileWhole = withHeight(four, [0], 120, { drawnAs: { 0: { heightPx: 86 } }, ask: nothing }).of[0];
	check(
		"resized in the whole row it writes height and keeps the others",
		[whileWhole.height, whileWhole.heights],
		[120, { 1: 180 }],
	);

	const board = {
		dir: "row",
		of: [
			{ dir: "column", of: [{ id: "a", height: 90, heights: { 1: 200 } }, { id: "x" }] },
			{ dir: "column", of: [{ id: "b" }] },
		],
	};
	const elsewhere = movedInto(board, "a", { kind: "sibling", box: [1], at: 1 });
	check(
		"carried into another box it keeps height and drops the arrangements that box never had",
		nodeAt(elsewhere, [1, 1]),
		{ id: "a", height: 90 },
	);
	const reordered = movedInto(board, "a", { kind: "sibling", box: [0], at: 2 });
	check("moved within its own box it keeps them", nodeAt(reordered, [0, 1]).heights, { 1: 200 });
}

console.log("\n— a gap stands between two siblings, never after the last —");
{
	const ask = () => ({ minPx: 260 });
	const narrow = laid({ dir: "column", of: [{ dir: "row", of: [{ id: "a" }, { id: "b" }] }, { id: "c" }] }, 400, {
		ask,
	});
	check(
		"inside a stacked row only the widget with a sibling below leaves a gap",
		narrow.of[0].of.map((one) => one.gapAfter > 0),
		[true, false],
	);
	check("and a column's own last child leaves none", narrow.of[1].gapAfter, 0);
}

console.log("\n— and a node squeezed under its own floor answers the same way —");
{
	const nothing = () => ({});
	const cell = { id: "one", ratio: 1 };
	check(
		"squeezed under the floor it goes under it",
		heldHeight(cell, { wantedPx: 10, ask: nothing, give: true }) < MIN_HEIGHT_PX,
		true,
	);
	check(
		"but never by more than the give",
		heldHeight(cell, { wantedPx: 10, ask: nothing, give: true }) > MIN_HEIGHT_PX - GIVE_PX,
		true,
	);
	check("released it lands on the floor", heldHeight(cell, { wantedPx: 10, ask: nothing, give: false }), MIN_HEIGHT_PX);
	check(
		"and pulled taller it meets no ceiling at all",
		heldHeight(cell, { wantedPx: 900, ask: nothing, give: true }),
		900,
	);
}

console.log("\n— and so does a sidebar at either end of its travel —");
{
	const widest = 1600 - 8 - SIDEBAR_PX - 8 - MAIN_FLOOR_PX;
	const heldAt = (px, give) => widenedBox(THREE, 0, { wantedPx: px, width: 1600, gap: 8, give });

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
	check(
		"a cell eases the room it takes, the place it moves to and its height",
		[seen.cell.property, seen.cell.loose],
		["transform, flex-grow, height", "0.22s, 0.2s, 0.2s"],
	);
	check("a region eases its width", [seen.region.property, seen.region.loose], ["flex-basis", "0.2s"]);
	check("and neither eases while the pointer is down", [seen.cell.held, seen.region.held], ["0s", "0s"]);
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
	const sides = (given) => given.beside.map((column) => sideName(column.at));
	const wide = columnsOf(THREE, 1600, 8);

	check("all three stand", sides(wide), ["left", "main", "right"]);
	check("a sidebar is the width its own constant names", wide.beside[0].width, SIDEBAR_PX);
	check("and the main takes everything the sidebars left", wide.beside[1].width, 1600 - (8 + SIDEBAR_PX) * 2);
	check("nothing had to float", wide.floating, []);

	const narrow = columnsOf(THREE, SIDEBAR_PX * 2 + MAIN_FLOOR_PX, 8);
	check("when the main would fall under its floor the right one goes first", sides(narrow), ["left", "main"]);
	check("and the one that went floats over the app, it is not a row under it", narrow.floating, [2]);

	const tight = columnsOf(THREE, MAIN_FLOOR_PX + 100, 8);
	check("tighter still, only the main stands", sides(tight), ["main"]);
	check("and both sidebars float", tight.floating, [0, 2]);

	check("a board with no sidebars is one column", columnsOf(rootOf([kept()]), 900, 8).beside, [{ at: 0, width: 900 }]);
	check("and a board with no main stands nothing beside anything", columnsOf(rootOf([side()]), 1600, 8), {
		beside: [],
		floating: [],
		hidden: [],
		alone: [0],
	});
	check("under the floor the main still stands alone, at the whole width", columnsOf(THREE, 300, 8).beside, [
		{ at: 1, width: 300 },
	]);
	check("and both sidebars float over it", columnsOf(THREE, 300, 8).floating, [0, 2]);

	const widened = rootOf([side({ width: 420 }), kept(), side()]);
	check("a sidebar drawn at the width it carries", columnsOf(widened, 1600, 8).beside[0].width, 420);
	check(
		"and the main gives up exactly that",
		columnsOf(widened, 1600, 8).beside[1].width,
		1600 - 8 - 420 - 8 - SIDEBAR_PX,
	);

	check(
		"dragging a sidebar narrower stops at its own minimum",
		widenedBox(THREE, 0, { wantedPx: 40, width: 1600, gap: 8 }),
		MIN_SIDEBAR_PX,
	);
	check(
		"and wider stops where the main would fall under its floor",
		widenedBox(THREE, 0, { wantedPx: 2000, width: 1600, gap: 8 }),
		1600 - 8 - SIDEBAR_PX - 8 - MAIN_FLOOR_PX,
	);
	check(
		"between the two it lands where the pointer asked",
		widenedBox(THREE, 0, { wantedPx: 360, width: 1600, gap: 8 }),
		360,
	);
	check(
		"the other sidebar is counted, not forgotten",
		widenedBox(rootOf([side(), kept()]), 0, { wantedPx: 2000, width: 1600, gap: 8 }),
		1600 - 8 - MAIN_FLOOR_PX,
	);

	const folded = rootOf([side({ folded: true }), kept(), side()]);
	check("the fold reads off the region that carries it", [isFolded(folded, 0), isFolded(folded, 2)], [true, false]);
	check("and toggling one names the other unchanged", isFolded(toggledFold(folded, 0), 0), false);
	check("toggling an open one folds it", isFolded(toggledFold(THREE, 2), 2), true);
	check("and leaves every other region as it stood", toggledFold(THREE, 2).of[0], THREE.of[0]);
	check("a folded sidebar does not stand", sides(columnsOf(folded, 1600, 8)), ["main", "right"]);
	check("and on a board with room for it, folded means hidden, not floating", columnsOf(folded, 1600, 8), {
		beside: [
			{ at: 1, width: 1600 - 8 - SIDEBAR_PX },
			{ at: 2, width: SIDEBAR_PX },
		],
		floating: [],
		hidden: [0],
		alone: [],
	});
	check(
		"a drawer takes its width from the screen, not from the width the region was dragged to",
		drawerWidth(390),
		320,
	);
	check("a wider phone gets a wider drawer, still the same share", drawerWidth(430), 353);
	check("and a tablet stops at the ceiling instead of eating the screen", drawerWidth(834), DRAWER_MAX_PX);
	check("as does a desktop", drawerWidth(1728), DRAWER_MAX_PX);

	const foldedOnPhone = columnsOf(rootOf([side({ folded: true }), kept()]), MAIN_FLOOR_PX + 100, 8);
	check("on a board with no room for it, the same fold is a shut drawer", foldedOnPhone.floating, [0]);
	check("and nothing of it is hidden away twice", foldedOnPhone.hidden, []);
	check(
		"an open sidebar that cannot stand floats whatever the other one does",
		columnsOf(folded, MAIN_FLOOR_PX + 100, 8).floating,
		[0, 2],
	);
	check(
		"the main takes back every pixel the folded one held",
		columnsOf(folded, 1600, 8).beside[0].width,
		1600 - 8 - SIDEBAR_PX,
	);
	check(
		"a folded sidebar is no longer counted against a drag",
		widenedBox(folded, 2, { wantedPx: 2000, width: 1600, gap: 8 }),
		1600 - 8 - MAIN_FLOOR_PX,
	);
	check(
		"folding both leaves the main alone",
		sides(columnsOf(rootOf([side({ folded: true }), kept(), side({ folded: true })]), 1600, 8)),
		["main"],
	);
	check(
		"folding one is what keeps the other standing when the board is narrow",
		sides(columnsOf(folded, SIDEBAR_PX + MAIN_FLOOR_PX + 8, 8)),
		["main", "right"],
	);

	const bare = rootOf([side([]), kept([]), side([])]);
	check(
		"an empty sidebar still stands, because nothing can be dropped where nothing is drawn",
		sides(columnsOf(bare, 1600, 8)),
		["left", "main", "right"],
	);
	check("a box that keeps the board standing is the one the sides are measured from", keptAt(THREE), 1);
}

function chromeChecks() {
	console.log("\n— the board draws no bar of its own, and its regions toggled always are offered to the header —");
	const { chromeless, openSides, foldedLeft, unfoldedLeft, soloChrome } = measured;
	const HIDE_LEFT = { key: "box:collapse:0/open", isOn: true, title: "Hide the left panel" };
	const SHOW_LEFT = { key: "box:collapse:0/open", isOn: false, title: "Show the left panel" };
	const HIDE_RIGHT = { key: "box:collapse:2/open", isOn: true, title: "Hide the right panel" };
	check("the board with sidebars draws no bar and no toggle", chromeless.chrome, 0);
	check("so its first region starts at the top of the page", chromeless.regionFromTop, 0);
	check("a board with no sidebar draws none either", soloChrome, 0);
	check("while both sidebars stand, the header is offered each of them as on", chromeless.actions, [
		HIDE_LEFT,
		HIDE_RIGHT,
	]);
	check(
		"all three regions stand before the press",
		openSides.regions.map((one) => one.name),
		["left", "main", "right"],
	);
	check("pressing the left action writes it folded", foldedLeft.folded, true);
	check(
		"and takes the left region off the board",
		foldedLeft.regions?.map((one) => one.name),
		["main", "right"],
	);
	if (!foldedLeft.regions) return;
	check(
		"the main grew by exactly what the sidebar held",
		foldedLeft.regions[0].right - foldedLeft.regions[0].left,
		openSides.regions[1].right - openSides.regions[1].left + (openSides.regions[1].left - openSides.regions[0].left),
	);
	check("the board still does not scroll sideways", foldedLeft.scrollWidth <= foldedLeft.clientWidth + 1, true);
	check("the same action now reads off, and the right one is untouched", foldedLeft.actions, [SHOW_LEFT, HIDE_RIGHT]);
	check(
		"a folded sidebar keeps its widgets mounted, or every ref they offer dies with them",
		measured.mountedFolded.tiles,
		measured.mountedOpen.tiles,
	);
	check("and they are still drawn, not emptied husks", measured.mountedFolded.painted, measured.mountedOpen.painted);
	check("pressing it again writes the region unfolded", unfoldedLeft.folded, false);
	check(
		"and brings the sidebar back",
		unfoldedLeft.regions?.map((one) => one.name),
		["left", "main", "right"],
	);
	check(
		"at the width it had before it went",
		unfoldedLeft.regions ? unfoldedLeft.regions[0].right - unfoldedLeft.regions[0].left : null,
		openSides.regions[0].right - openSides.regions[0].left,
	);
	check("and the action reads on again", unfoldedLeft.actions, [HIDE_LEFT, HIDE_RIGHT]);
}

chromeChecks();

console.log("\n— carrying a tile puts it where it was aimed, and prunes what it left —");
{
	const board = {
		dir: "column",
		of: [
			{ id: "a", ratio: 1 },
			{
				dir: "row",
				of: [
					{ id: "b", ratio: 1 },
					{ id: "c", ratio: 2 },
				],
			},
		],
	};
	const at = (node) => leavesOf(node).map((leaf) => `${leaf.id}@${leaf.path.join("/")}`);

	check("dropped beside a tile it joins that row", at(movedInto(board, "a", { kind: "beside", box: [1], at: 1 })), [
		"b@0/0",
		"a@0/1",
		"c@0/2",
	]);
	check(
		"and the box it emptied is gone with it",
		nodeAt(movedInto(board, "a", { kind: "beside", box: [1], at: 1 }), [0]).dir,
		"row",
	);
	check("dropped at the head of a box it stands first", at(movedInto(board, "c", { kind: "beside", box: [], at: 0 })), [
		"c@0",
		"a@1",
		"b@2",
	]);
	check(
		"a box left holding one tile becomes that tile",
		nodeAt(movedInto(board, "c", { kind: "beside", box: [], at: 0 }), [2]).id,
		"b",
	);
	check(
		"it carries its own weight along",
		nodeAt(movedInto(board, "c", { kind: "beside", box: [], at: 0 }), [0]).ratio,
		2,
	);
	check(
		"a tile nobody is holding moves nothing",
		at(movedInto(board, "nobody", { kind: "beside", box: [], at: 0 })),
		at(board),
	);
	check("and no target moves nothing either", at(movedInto(board, "a", null)), at(board));

	const wrapped = movedInto(board, "a", { kind: "wrap", path: [1, 0], axis: "column", side: "after" });
	check("aimed across the grain it wraps the tile it landed on", at(wrapped), ["b@0/0/0", "a@0/0/1", "c@0/1"]);
	check("in a box of the direction it was aimed at", nodeAt(wrapped, [0, 0]).dir, "column");
	check("which takes over the slot's own share", nodeAt(wrapped, [0, 0]).ratio, 1);
	check(
		"and dropped before, it stands first",
		at(movedInto(board, "a", { kind: "wrap", path: [1, 0], axis: "column", side: "before" })),
		["a@0/0/0", "b@0/0/1", "c@0/1"],
	);
	check(
		"wrapping the very tile being carried moves nothing",
		at(movedInto(board, "a", { kind: "wrap", path: [0], axis: "row", side: "after" })),
		at(board),
	);

	const region = rootOf([
		side([]),
		kept([
			{ id: "a", ratio: 1 },
			{ id: "b", ratio: 1 },
		]),
		side([]),
	]);
	const across = movedInto(region, "a", { kind: "beside", box: [0], at: 0 });
	check("a tile carried into an empty sidebar arrives there", at(across), ["a@0/0", "b@1/0"]);
	check("and the region it came from keeps the rest", nodeAt(across, [1]).of.length, 1);
	check(
		"a region emptied by the carry is still a region",
		nodeAt(movedInto(region, "a", { kind: "beside", box: [2], at: 0 }), [1]).keep,
		true,
	);
	const leafAside = {
		dir: "row",
		of: [
			{ id: "a", ratio: 1 },
			{ dir: "column", keep: true, of: [{ id: "M", ratio: 1 }] },
		],
	};
	const ontoLeaf = movedInto(leafAside, "M", { kind: "beside", box: [0], at: 0 });
	check("a drop aimed at a path that holds no box keeps the tile it was carrying", at(ontoLeaf), at(leafAside));
	check("and the board comes back untouched, not half-emptied", JSON.stringify(ontoLeaf), JSON.stringify(leafAside));
	check(
		"a box that cannot take a tile says so rather than answering with the tree it was given",
		insertedAt(leafAside, [0], 0, { id: "x" }),
		null,
	);

	check("a tile taken off the board leaves no empty box behind", at(withoutLeaf(board, "a")), ["b@0/0", "c@0/1"]);
	check("and taking the last of a box takes the box", at(withoutLeaf(withoutLeaf(board, "b"), "c")), ["a@0"]);
	check("a tile the board does not hold is nothing to take off it", at(withoutLeaf(board, "nobody")), at(board));
}

console.log("\n— and the aim reads the pointer against the boxes it is over —");
{
	const spots = [
		{ path: [], kind: "box", dir: "column", box: { left: 0, top: 0, right: 1200, bottom: 324 } },
		{ path: [0], kind: "box", dir: "row", box: { left: 0, top: 0, right: 1200, bottom: 100 } },
		{ path: [0, 0], kind: "leaf", box: { left: 0, top: 0, right: 600, bottom: 100 } },
		{ path: [0, 1], kind: "leaf", box: { left: 612, top: 0, right: 1200, bottom: 100 } },
		{ path: [1], kind: "leaf", box: { left: 0, top: 112, right: 1200, bottom: 312 } },
	];

	check("in a tile's left half it goes before that tile", aimedAt(spots, 200, 50), { kind: "beside", box: [0], at: 0 });
	check("in its right half it goes after", aimedAt(spots, 400, 50), { kind: "beside", box: [0], at: 1 });
	check("in the second tile's right half it goes to the end of the row", aimedAt(spots, 1100, 50).at, 2);
	check("near the left edge of a tile in a row it still goes beside it", aimedAt(spots, 8, 50), {
		kind: "beside",
		box: [0],
		at: 0,
	});
	check("near the top of a tile in a row it wraps it in a column", aimedAt(spots, 300, 6), {
		kind: "wrap",
		path: [0, 0],
		axis: "column",
		side: "before",
	});
	check("and near the bottom, the same the other way round", aimedAt(spots, 300, 96).side, "after");
	check("over a tile in a column it goes beside it in that column", aimedAt(spots, 600, 300), {
		kind: "beside",
		box: [],
		at: 2,
	});
	check("and near its left edge it wraps it in a row", aimedAt(spots, 8, 212), {
		kind: "wrap",
		path: [1],
		axis: "row",
		side: "before",
	});
	check("in the gap between two rows it takes the slot between them", aimedAt(spots, 300, 106), {
		kind: "beside",
		box: [],
		at: 1,
	});
	check("the deepest box under the pointer is the one that answers", aimedAt(spots, 300, 50).box, [0]);
	check("an empty box answers with its only slot", aimedAt([spots[0]], 300, 50), { kind: "beside", box: [], at: 0 });
	check("and a pointer over nothing aims at nothing", aimedAt(spots, 300, 900), null);
	check(
		"two aims at the same slot are the same aim",
		sameTarget(aimedAt(spots, 200, 50), aimedAt(spots, 100, 50)),
		true,
	);
	check("and two at different slots are not", sameTarget(aimedAt(spots, 200, 50), aimedAt(spots, 400, 50)), false);
	check(
		"a wrap and a drop beside are never the same aim",
		sameTarget(aimedAt(spots, 300, 6), aimedAt(spots, 300, 50)),
		false,
	);
}

console.log("\n— a tile travels at a speed, so a long move is not a teleport —");
{
	check("a step takes the floor, however short it is", millisecondsAcross(4, 0), millisecondsAcross(0, 0));
	check("twice as far takes longer", millisecondsAcross(800, 0) > millisecondsAcross(400, 0), true);
	check("and the far side of a board still lands inside half a second", millisecondsAcross(4000, 0) <= 500, true);
	check("a diagonal is measured as one distance, not two", millisecondsAcross(300, 400), millisecondsAcross(500, 0));
	check("and nothing crawls: even the floor is under a fifth of a second", millisecondsAcross(0, 0) <= 200, true);
}

console.log("\n— an empty sidebar is drawn as a zone, and a tile carried from the main lands in it —");
{
	const { emptyOpen, carriedAcross, emptyResting, addedIntoRight } = measured;

	check("the board draws at all", emptyOpen.drawn, true);
	check("all three regions stand while the board is being laid out", emptyOpen.regions, ["left", "main", "right"]);
	check("and each one names itself, so a carried tile can find it", emptyOpen.named, ["0", "1", "2"]);
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
	check("a reader's board draws no chrome of its own either", emptyResting.chrome, 0);

	check("the probe reached the catalogue", addedIntoRight.failed ?? null, null);
	check("pressing a region's zone opens the catalogue", addedIntoRight.opened, 1);
	check("and the pick adds one tile", addedIntoRight.born, 1);
	check("on a row of its own in the region that was pressed", addedIntoRight.grew, 1);
	check("the other two regions are left exactly as they were", addedIntoRight.untouched, ["left", "main"]);
	check("and the catalogue closes behind the pick", addedIntoRight.dialogs, 0);
}

console.log("\n— a column inside a row: the thing the three regions could not say —");
{
	const stacked = measured.stacked;
	check("a row carrying an old height is drawn", stacked.drawn, true);
	check("too narrow for two, it is drawn as a column", stacked.dir, "column");
	check("each widget in it stands at the height the row had", stacked.heights, [86, 86]);
	check("the row ends where its last widget ends", stacked.rowBottom, stacked.lastBottom);
	check("a stacked row draws no grip of its own under it", stacked.rowGrips, 0);
	check("every widget in it says it stands one across, a divider's axis beside it included", stacked.standsAcross, [
		"1",
		"1",
	]);
	check("its last widget's grip is there, taking no room", stacked.lastGrip, [1, 0]);
	check(
		"and the widget below it starts under the last of them rather than over it",
		stacked.boardTop >= stacked.lastBottom,
		true,
	);

	const seen = measured.nested;
	const after = measured.unnested;
	check("the board drew at all", seen.drawn, true);
	check("the row holds a tile and a column of two", seen.rows, [["boards"], ["board", "views", "wynttpz"]]);
	check("and the tree says so, level by level", seen.dirs, ["0:column", "0/1:row", "0/1/1:column"]);
	check("every widget in it is drawn", seen.painted.filter((count) => count > 0).length, 4);
	check("the two inside the column stand one over the other", seen.stacked, [0, 1]);
	check("the wide tile stands beside them, not over them", seen.beside, 1);
	check("the column is inside the row it belongs to", seen.withinRow, true);
	check("two to one, within a pixel", Math.abs(seen.shares[0] / seen.shares[1] - 2) < 0.02, true);
	check("and the gap between them is the step of a row one box under its region", seen.spare, STEP_PX[1]);
	check("the nesting survives being written back", JSON.parse(seen.written), {
		dir: "row",
		of: [
			{
				dir: "column",
				keep: true,
				of: [
					{ id: "boards", height: 56 },
					{
						dir: "row",
						of: [
							{ id: "board", ratio: 2, height: 420 },
							{
								dir: "column",
								of: [
									{ id: "views", height: 180 },
									{ id: "wynttpz", height: 220 },
								],
							},
						],
					},
				],
			},
		],
	});

	const into = measured.intoNest;
	check("the probe found the tile to carry in", into.failed ?? null, null);
	check("a tile aimed inside the nested column is stood in for there", into.aimed, 1);
	check("and it lands between the two that were already in it", into.inNest, ["views", "boards", "wynttpz"]);
	check("at a path three levels down", into.leaves, [
		"board@0/0/0",
		"views@0/0/1/0",
		"boards@0/0/1/1",
		"wynttpz@0/0/1/2",
	]);

	check("the probe found the nested tile", after.failed ?? null, null);
	check("carrying one tile onto another's edge wraps the two, four levels deep", after.leaves, [
		"board@0/0/0",
		"views@0/0/1/0/0",
		"boards@0/0/1/0/1",
		"wynttpz@0/0/1/1",
	]);
	check("and every tile is still on the board", after.rows[0], ["board", "views", "boards", "wynttpz"]);
	check("with one write per press and not one more", after.writes, 4);

	const fill = measured.screenFill;
	check("a screen board is on the page at all", fill.failed ?? null, null);
	check("a screen board claims the window height less the host's chrome", fill.root, fill.viewport - 192);
	check("and the tree inside it claims the same, so the regions reach the bottom", fill.page, fill.root);

	const grips = measured.nestedGrips;
	check("the nested box carries grips of its own", grips.failed ?? null, null);
	check("dragging the grip inside the nested row moves the boundary while it is held", grips.heldWidth, 536);
	check("and it does not jump back on release", grips.after.board, grips.heldWidth);
	check("the ratios it wrote are the two it holds, and they still weigh three", grips.ratios, [1.46, 1.54]);
	check("the strip inside the nested column writes a height", grips.nestedHeight, 96);
	check("which is the ceiling the widget declares, not where the pointer went", grips.after.views, 96);
	check("and each grip wrote once", grips.after.writes - grips.before.writes, 2);
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

const heldToAMeasure = laid({ dir: "column", measure: 720, of: [{ id: "prose" }] }, 1400, { ask: () => ({}) });
const filling = laid({ dir: "column", of: [{ id: "prose" }] }, 1400, { ask: () => ({}) });
check("a box declaring a measure carries it into the laid node", heldToAMeasure.measure, 720);
check("a box declaring none carries none", filling.measure, undefined);
check("a measure never changes how wide the box is laid", [heldToAMeasure.width, filling.width], [1400, 1400]);

console.log(failed ? `\n${failed} widths the tree got wrong` : "\nfour widgets, five widths, nothing vanished");
process.exit(failed ? 1 : 0);
