import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import esbuild from "esbuild";
import { parse } from "yaml";
import { findBrowser, widgetFiles } from "./harness.mjs";
import { buildMirror } from "./mirror.mjs";

buildMirror();
const { aimedAt, columnsOf, GAP_PX, innerOf, MAIN_FLOOR_PX, moved, partedBy, resized, SIDEBAR_PX } = await import("./.mjs-cache/tree.mjs");

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
.wg-tree { display: flex; flex-direction: column; gap: ${GAP_PX}px; overflow: hidden; }
.wg-tree-row { display: flex; gap: ${GAP_PX}px; align-items: stretch; }
.wg-tree-cell { position: relative; min-width: 0; }
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
	check("and no row is wider than the board it sits in", seen.widest <= seen.boardWidth + 0.5, true);
	check("one grip stands between the two that share a row", seen.across, 1);
	check("and it is invisible until its own gap is pointed at", seen.gripShown, 0);
	check("one strip under each row, not one under each tile", seen.along, 3);
	check("and it runs the whole line", seen.alongWidth, seen.boardWidth);
	check("no row is left without a strip, capped widgets or not", seen.capped, 0);
	check("the gap the grip fills is the gap the layout counted", seen.sharedRow[0] + seen.sharedRow[1] + GAP_PX, seen.boardWidth);
}

console.log("\n— and dragging that grip writes the board once —");
{
	const before = measured.surface;
	const after = measured.dragged;
	check("the filter stops on the floor its manifest names, not where the pointer went", after.sharedRow[1], 320);
	check("the tabs took exactly what the filter could give", after.sharedRow[0] - before.sharedRow[0], before.sharedRow[1] - 320);
	check("the row is still as wide as it was", after.sharedRow[0] + after.sharedRow[1] + GAP_PX, before.boardWidth);
	check("the board was written once, on release", after.writes, 1);
	check("the ratios in the file changed with it", after.ratios[0] > before.ratios[0], true);
	check("and the row still weighs what it weighed", Math.round(after.ratios.reduce((sum, one) => sum + one, 0) * 100), Math.round(before.ratios.reduce((sum, one) => sum + one, 0) * 100));
}

console.log("\n— and pulling the strip down makes the row taller, not the widget —");
{
	const before = measured.dragged;
	const after = measured.stretched;
	check("the row took the whole pull", after.firstRowHeight - before.firstRowHeight, 200);
	check("the widget inside stayed on its ceiling", after.firstCellHeight, 96);
	check("before the pull it sat at its own natural height", before.firstCellHeight, 46);
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
	check("and the row still weighs what it weighed", Math.round(moved.reduce((sum, cell) => sum + cell.ratio, 0) * 1000), 3000);
}

console.log("\n— in reading mode a press on a tile carries nothing —");
{
	const seen = measured.whileReading;
	check("no line was drawn", seen.aimed, 0);
	check("nothing was dimmed", seen.dimmed, 0);
	check("and no grip was showing either", seen.gripShown, 0);
	check("and nothing parted", seen.parted + seen.partedCells, 0);
	check("and the rows are exactly as they were", seen.after, seen.before);
}

console.log("\n— and carrying the kanban onto the first row moves it there —");
{
	const seen = measured.carried;
	check("the probe found the kanban", seen.failed ?? null, null);
	check("editing shows every grip at once", seen.gripShown, 0.55);
	check("before the carry it stood alone on the last row", seen.before.at(-1), ["board"]);
	check("a line was drawn where it would land", seen.aimed, 1);
	check("the tile being carried was marked as lifted", seen.dimmed, 1);
	check("and it had actually left its slot", seen.lifted !== "none", true);
	check("the tile it landed beside stepped aside", seen.partedCells, 1);
	check("and no whole row had to move for it", seen.parted, 0);
	check("after the drop it stands on the first row", seen.after[0].includes("board"), true);
	check("and it left no empty row behind", seen.after.length, seen.before.length - 1);
	check("the board was written a third time", seen.writes, 3);
}

console.log("\n— a board of three regions stands side by side while there is room —");
{
	const rows = [[{ id: "x", ratio: 1 }]];
	const three = { left: rows, main: rows, right: rows };
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

	check("a board with no sidebars is one column", names(columnsOf({ main: rows }, 900, 8)), ["main"]);
	check("and a board with no main stands nothing beside anything", columnsOf({ left: rows }, 1600, 8), { beside: [], stacked: ["left"] });
	check("below the floor everything stacks", columnsOf(three, 300, 8).beside, []);
}

console.log("\n— carrying a tile puts it where it was aimed, and closes the row it left —");
{
	const rows = [[{ id: "a", ratio: 1 }], [{ id: "b", ratio: 1 }, { id: "c", ratio: 2 }]];
	const ids = (given) => given.map((row) => row.map((cell) => cell.id));

	check("dropped as a row of its own it lands there", ids(moved(rows, "c", { kind: "row", at: 0 })), [["c"], ["a"], ["b"]]);
	check("and the row it left keeps the rest", ids(moved(rows, "b", { kind: "row", at: 2 })), [["a"], ["c"], ["b"]]);
	check("dropped beside a tile it joins that row", ids(moved(rows, "a", { kind: "beside", row: 1, at: 1 })), [["b", "a", "c"]]);
	check("and the row it emptied is gone", moved(rows, "a", { kind: "beside", row: 1, at: 1 }).length, 1);
	check("it carries its own weight along", moved(rows, "c", { kind: "row", at: 0 })[0][0].ratio, 2);
	check("a tile nobody is holding moves nothing", ids(moved(rows, "nobody", { kind: "row", at: 0 })), ids(rows));
	check("and no target moves nothing either", ids(moved(rows, "a", null)), ids(rows));
}

console.log("\n— and the rest step aside by exactly the room the carried tile needs —");
{
	const bands = [
		{ from: 0, left: 0, width: 1200, top: 0, bottom: 112, rowBottom: 100, cells: [{ id: "a", left: 0, right: 600 }, { id: "b", left: 612, right: 1200 }] },
		{ from: 1, left: 0, width: 1200, top: 112, bottom: 324, rowBottom: 312, cells: [{ id: "c", left: 0, right: 1200 }] },
	];
	const carried = { id: "c", width: 300, height: 200 };

	const beside = partedBy(bands, { kind: "beside", row: 0, at: 1 }, carried, 12);
	check("only the tile after the landing steps aside", beside.cells, { b: 312 });
	check("and it steps by the carried width plus the gap", beside.cells.b, 300 + 12);
	check("no row moves for a landing inside one", beside.bands, {});
	check("the slot sits on the edge it was aimed at", beside.slot.left, 612);
	check("and is as tall as the row it joins", beside.slot.height, 100);

	const asRow = partedBy(bands, { kind: "row", at: 1 }, carried, 12);
	check("landing as a row pushes the rows below it down", asRow.bands, { 1: 212 });
	check("and leaves the rows above alone", asRow.cells, {});
	check("the slot runs the width of the board", asRow.slot.width, 1200);
	check("and sits under the row it follows", asRow.slot.top, 112);

	check("the carried tile never steps aside from itself", partedBy(bands, { kind: "beside", row: 1, at: 0 }, carried, 12).cells, {});
	check("and with no target nothing moves at all", partedBy(bands, null, carried, 12), { cells: {}, bands: {}, slot: null });
}

console.log("\n— and the aim reads the pointer against the bands —");
{
	const bands = [
		{ from: 0, top: 0, bottom: 112, rowBottom: 100, cells: [{ left: 0, right: 600 }, { left: 612, right: 1200 }] },
		{ from: 1, top: 112, bottom: 324, rowBottom: 312, cells: [{ left: 0, right: 1200 }] },
	];
	check("above everything it aims at the first row", aimedAt(bands, 300, -20), { kind: "row", at: 0 });
	check("below everything it aims past the last", aimedAt(bands, 300, 900), { kind: "row", at: 2 });
	check("in the strip under a row it makes a new row after it", aimedAt(bands, 300, 106), { kind: "row", at: 1 });
	check("in a tile's left half it goes before that tile", aimedAt(bands, 100, 50).at, 0);
	check("in its right half it goes after", aimedAt(bands, 500, 50).at, 1);
	check("and the line is drawn on the edge it chose", aimedAt(bands, 500, 50).edge, 600);
	check("past the last tile it goes to the end of the row", aimedAt(bands, 1400, 50).at, 2);
}

if (measured.failures.length > 0) {
	failed += measured.failures.length;
	for (const failure of measured.failures) console.log(`!! the page logged: ${failure}`);
}

console.log(failed ? `\n${failed} widths the tree got wrong` : "\nfour widgets, five widths, nothing vanished");
process.exit(failed ? 1 : 0);
