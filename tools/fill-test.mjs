// A WIDGET OCCUPIES THE TILE IT WAS GIVEN, and only a layout engine can prove it. jsdom lays
// nothing out, so every earlier width check here was a guess about CSS rather than a
// measurement of one — which is how three of them passed against broken code. This renders the
// SHIPPING widgets, with the SHIPPING stylesheet, in headless Chrome, and reads the boxes back.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import esbuild from "esbuild";
import { buildMirror } from "./mirror.mjs";

buildMirror();
const { GRID } = await import("./.mjs-cache/paths.mjs");
const { spanToPixels } = await import("./.mjs-cache/layout.mjs");

const BROWSERS = [
	process.env.WG_CHROME,
	"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
	"/Applications/Chromium.app/Contents/MacOS/Chromium",
	"/usr/bin/google-chrome",
	"/usr/bin/chromium",
].filter(Boolean);

function browser() {
	for (const candidate of BROWSERS) {
		try {
			execFileSync(candidate, ["--version"], { stdio: "ignore" });
			return candidate;
		} catch {}
	}
	console.error("fill gate: no Chrome found — set WG_CHROME to a Chromium binary");
	process.exit(1);
}

const work = mkdtempSync(path.join(tmpdir(), "wg-fill-"));

const bundle = await esbuild.build({
	entryPoints: ["tools/fill-page.jsx"],
	bundle: true,
	write: false,
	format: "iife",
	platform: "browser",
	target: "es2020",
	jsxFactory: "h",
	jsxFragment: "Fragment",
	inject: ["tools/fill-inject.js"],
	alias: { widgetarium: "./tools/fill-shim.js", "widgetarium/kit": "./src/kit.js" },
	logLevel: "warning",
});

const page = `<!doctype html><html><head><meta charset="utf-8">
<style>${readFileSync("styles.css", "utf8")}</style>
<style>${readFileSync("widgets/@task/tokens.css", "utf8")}</style>
<style>body { margin: 0; font-family: -apple-system, "Segoe UI", sans-serif; }</style>
</head><body><div class="wg-root"></div><script id="wg-measure" type="application/json"></script>
<script>${bundle.outputFiles[0].text}</script></body></html>`;

const file = path.join(work, "fill.html");
writeFileSync(file, page);

const dom = execFileSync(
	browser(),
	["--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", "--virtual-time-budget=4000", "--dump-dom", `file://${file}`],
	{ encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", process.env.WG_DEBUG ? "inherit" : "ignore"] },
);

const payload = dom.match(/<script id="wg-measure" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
if (!payload) {
	console.error("fill gate: the page never reported — the harness failed to render");
	if (process.env.WG_DEBUG) console.error(dom.slice(0, 4000));
	console.error(`  page: file://${file}`);
	process.exit(1);
}

const measured = JSON.parse(payload.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
if (measured.failure) {
	console.error(`fill gate: the page threw — ${measured.failure}`);
	process.exit(1);
}
if (process.env.WG_DEBUG) console.log(JSON.stringify(measured, null, 1));
const byName = new Map(measured.map((entry) => [entry.name, entry]));

// CONTEXT: String() made every object equal to every other, and "1" equal to 1
function same(got, want) {
	if (Object.is(got, want)) return true;
	if (!plain(got) || !plain(want)) return false;
	return JSON.stringify(got) === JSON.stringify(want);
}
function plain(value) {
	if (value === null || typeof value !== "object") return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === Array.prototype || proto === null;
}
function show(value) {
	return plain(value) ? JSON.stringify(value) : String(value);
}
let failed = 0;
function check(label, got, want) {
	const ok = same(got, want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${label}${ok ? "" : `  got ${show(got)}, want ${show(want)}`}`);
}

const cellsWide = (cells) => spanToPixels(cells, GRID.cellPx, GRID.gapPx);

console.log("— a control is as wide as the cells it was given —\n");

for (const name of ["view-tabs, 3 cells, short label", "view-tabs, 2 cells, over-long label", "view-tabs, 1 cell, over-long label", "view-tabs, 13 cells, over-long label", "filter, 3 cells", "filter, 2 cells", "filter, 1 cell"]) {
	const entry = byName.get(name);
	if (!entry) {
		failed += 1;
		console.log(`!! ${name} — never rendered`);
		continue;
	}
	check(`${name}: tile is ${entry.cells} cells`, entry.tileWidth, cellsWide(entry.cells));
	check(`${name}: the control fills it`, Math.round(entry.control?.width ?? -1), cellsWide(entry.cells));
}

console.log("\n— an over-long label ends in an ellipsis, and the icon stays —");
{
	const tight = byName.get("view-tabs, 2 cells, over-long label");
	check("the label is clipped rather than the tile", tight.labelClipped, true);
	check("and clipped with an ellipsis", tight.labelEllipsis, "ellipsis");
	check("the chevron is still drawn", Boolean(tight.icon), true);
	// CONTEXT: overflow: hidden on the widget root hides an icon pushed past the edge
	check("and still inside the control", tight.icon.right <= tight.control.right + 0.5, true);
	// CONTEXT: the widget root clips at the tile edge, so an icon past it is simply gone
	check("and inside the TILE, which is what clips", tight.icon.right <= tight.tileBox.right + 0.5, true);
	check("at the END of it", tight.icon.right >= tight.control.right - 24, true);
}

console.log("\n— and at one cell, where nothing fits, the chevron is still on screen —");
{
	const tiny = byName.get("view-tabs, 1 cell, over-long label");
	check("the chevron is drawn", Boolean(tiny.icon), true);
	check("and has not been pushed off the tile", tiny.icon.right <= tiny.tileBox.right + 0.5, true);
	check("the label is what gave way", tiny.labelClipped, true);
}

console.log("\n— the same label, given room, is not clipped —");
{
	const roomy = byName.get("view-tabs, 13 cells, over-long label");
	check("nothing is cut off", roomy.labelClipped, false);
	check("and the whole name is there", roomy.labelText, "Archived columns");
}

console.log("\n— the label goes only when the label does not fit —");
{
	const three = byName.get("filter, 3 cells");
	const two = byName.get("filter, 2 cells");
	const one = byName.get("filter, 1 cell");
	console.log(`   measured: the whole control wants ${Math.round(three.controlNatural)}px with its word, ${Math.round(one.controlNatural)}px without`);
	check("at 3 cells the word is drawn", Boolean(three.label), true);
	check("at 2 cells it still fits, so it stays", Boolean(two.label), true);
	check("at 1 cell it cannot, so it goes", Boolean(one.label), false);
	check("and the control is still one cell wide", Math.round(one.control?.width ?? -1), cellsWide(1));
}

console.log("\n— a widget that cannot use the height says so, and the grip stops —");
{
	const { clampPlace } = await import("./.mjs-cache/layout.mjs");
	const control = JSON.parse(readFileSync("widgets/@task/view-tabs/manifest.json", "utf8"));
	const dragged = { id: "tabs", x: 0, y: 0, w: 6, h: 5 };

	check("the manifest declares a maximum height", control.maxSize?.h, 1);
	check("a drag past it is refused", clampPlace(dragged, 20, undefined, control.maxSize).h, 1);
	check("and the width it says nothing about is untouched", clampPlace(dragged, 20, undefined, control.maxSize).w, 6);
	check("a widget declaring nothing is stretched as far as asked", clampPlace(dragged, 20).h, 5);
	check("a place already inside its bound is the same object", clampPlace({ id: "a", x: 0, y: 0, w: 2, h: 1 }, 20, undefined, { h: 1 }).h, 1);
}

console.log(failed ? `\n${failed} widths the person did not ask for` : "\nevery control fills the tile it was given");
process.exit(failed ? 1 : 0);
