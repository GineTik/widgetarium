import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import esbuild from "esbuild";

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
	console.error("window gate: no Chrome found — set WG_CHROME to a Chromium binary");
	process.exit(1);
}

const work = mkdtempSync(path.join(tmpdir(), "wg-window-"));

const bundle = await esbuild.build({
	entryPoints: ["tools/window-page.jsx"],
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
<style>body { margin: 0; background: #ffffff; color: #222222; font-family: -apple-system, "Segoe UI", sans-serif;
	--background-primary: #ffffff; --background-secondary: #f6f6f6; --background-modifier-border: #e4e4e4;
	--background-modifier-hover: rgba(0,0,0,0.05); --text-normal: #222222; --text-muted: #707070; --text-faint: #ababab;
	--text-on-accent: #ffffff; --text-error: #c0392b; --text-success: #1f8a4c; --interactive-accent: #6d4ee0;
	--interactive-accent-hover: #5b3ecb; --color-orange: #d9822b; }
.wg-host { width: 1340px; }
/* the box is measured, not the motion: headless virtual time does not advance a transition */
.wg-tile, .wg-set-body, .wg-set-window, .wg-set-chrome { transition: none !important; animation: none !important; }</style>
</head><body><div class="wg-host"></div><script id="wg-measure" type="application/json"></script>
<script>${bundle.outputFiles[0].text}</script></body></html>`;

const file = path.join(work, "window.html");
writeFileSync(file, page);

function stage(hash) {
	const dom = execFileSync(
		browser(),
		["--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", "--window-size=1440,960", "--virtual-time-budget=9000", "--dump-dom", `file://${file}${hash}`],
		{ encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", process.env.WG_DEBUG ? "inherit" : "ignore"] },
	);
	const payload = dom.match(/<script id="wg-measure" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
	if (!payload) {
		console.error("window gate: the page never reported — the harness failed to render");
		console.error(`  page: file://${file}${hash}`);
		process.exit(1);
	}
	const measured = JSON.parse(payload.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
	if (measured.failure) {
		console.error(`window gate: the page threw — ${measured.failure}`);
		process.exit(1);
	}
	return measured;
}

const measured = stage("");
if (process.env.WG_DEBUG) console.log(JSON.stringify(measured, null, 1));

const { arrival, panned, zoomed, floor, live, levels } = measured;

let failed = 0;
function check(label, got, want) {
	const ok = String(got) === String(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${label}${ok ? "" : `  got ${got}, want ${want}`}`);
}

// a pixel is never exactly a pixel once a transform has been through it
function near(label, got, want, slack = 0.5) {
	const ok = Number.isFinite(got) && Math.abs(got - want) <= slack;
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${label}${ok ? "" : `  got ${round(got)}, want ${round(want)} ±${slack}`}`);
}

function round(value) {
	return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : String(value);
}

console.log("— the widget arrives whole, clear of both floating panels —\n");
console.log(`   measured: window ${Math.round(arrival.windowBox.width)}x${Math.round(arrival.windowBox.height)}, widget ${Math.round(arrival.widgetBox.width)}x${Math.round(arrival.widgetBox.height)} at ${arrival.said}`);
check("nothing of it is under the settings panel", arrival.widgetUnderPanel, false);
check("nothing of it is under the header", arrival.widgetUnderHead, false);
check("and the panel really is to the right of it", arrival.panelBox.left >= arrival.widgetBox.right, true);

console.log("\n— the grid is the window's, and it does not stop where a panel begins —");
check("cells run underneath the settings panel", arrival.gridRunsUnderThePanel, true);
check("the window clips what pans past its edge", arrival.panelOverflow, "hidden");

// THE GRID IS THE MEASURE OF THE WIDGET. At scale s a cell is cellPx * s wide, the widget is
// spanToPixels(w) * s wide, and its corner sits on a cell corner — so a widget said to be
// 12 x 8 covers twelve cells by eight, and a person can count them at any zoom.
console.log("\n— the grid is part of the canvas: it zooms, it pans, and the widget sits on it —");
for (const [when, seen] of [["at arrival", arrival], ["after a pan", panned], ["zoomed out", zoomed], ["at the zoom floor", floor], ["back at 1:1", live]]) {
	const { grid, scale, cellPx, gapPx, span, widgetBox } = seen;
	const pitchPx = cellPx + gapPx;
	console.log(`\n   ${when}: scale ${round(scale)} · cell ${round(grid.cellPx)}px (want ${round(cellPx * scale)}) · pitch ${round(grid.pitchPx)}px (want ${round(pitchPx * scale)})`);
	console.log(`   widget ${round(widgetBox.width)}x${round(widgetBox.height)} = ${round(grid.cellsAcross)} x ${round(grid.cellsDown)} cells, corner ${round(grid.offLatticeX)}/${round(grid.offLatticeY)}px off the lattice`);
	near(`${when}: one cell measures cellPx x scale`, grid.cellPx, cellPx * scale);
	near(`${when}: one pitch measures (cell + gap) x scale`, grid.pitchPx, pitchPx * scale);
	near(`${when}: the widget measures spanToPixels(w) x scale`, widgetBox.width, (span.w * cellPx + (span.w - 1) * gapPx) * scale);
	near(`${when}: its corner sits on a cell corner`, grid.offLatticeX, 0);
	near(`${when}: on both axes`, grid.offLatticeY, 0);
	near(`${when}: and it spans exactly ${span.w} cells across`, grid.cellsAcross, span.w, 0.02);
	near(`${when}: and ${span.h} down`, grid.cellsDown, span.h, 0.02);
}

// TRADE-OFF: real elements, so colour and radius stay tokens — which costs a cell count that
// grows as the square of the zoom-out, and the floor is where that has to be survivable
console.log(`\n   the grid is ${floor.grid.count} cells at the zoom floor, against ${arrival.grid.count} at 1:1`);
check("the grid does not run away at the floor zoom", floor.grid.count < 6000, true);

console.log("\n— three levels, and the top one is the canvas —");
for (const [theme, read] of Object.entries(levels)) {
	const canvas = level(read["--background-primary"], null);
	const ground = level(read["--wg-cell-fill"], canvas);
	const control = level(read["--wg-kit-fill"], canvas);
	const card = level(read["--wg-kit-raise"], canvas);
	const gridStep = Math.abs(canvas - ground);
	const controlStep = Math.abs(canvas - control);
	console.log(`\n   ${theme}: canvas ${round(canvas)} · grid ${round(ground)} (step ${round(gridStep)}) · control ${round(control)} (step ${round(controlStep)}) · card ${round(card)}`);
	check(`${theme}: the grid is a third of a step, not a whole one`, gridStep * 2 < controlStep, true);
	check(`${theme}: so the canvas still reads as the ground`, gridStep < 6, true);
	check(`${theme}: and a card lifts clear of the control it stands on`, Math.abs(card - control) >= controlStep * 0.8, true);
}
check("the window's own ground is the canvas colour", arrival.canvasFill, levels.light["--background-primary"]);

console.log("\n— the glass survives, because nothing above it is transformed —");
check("the panel is really blurred", arrival.panelBlur, "blur(24px) saturate(1.8)");
check("three floating surfaces carry the blur", arrival.blurred.length, 3);
check("and they are the header, the panel and the zoom bar", arrival.blurred.sort().join(" "), "aside.wg-set-panel.wg-kit-glass div.wg-set-bar.wg-kit-glass div.wg-set-head.wg-kit-glass");

console.log("\n— exactly one edge per floating panel, and no drop shadow anywhere —");
check("nothing inside the settings panel carries an edge", arrival.shadowed.filter((entry) => entry.inside).map((entry) => entry.name).join(" | ") || 0, 0);
check("every shadow in the window is an inset hairline", arrival.shadowed.every((entry) => entry.shadow.includes("inset")), true);

console.log("\n— a group on glass is a fill, and it is opaque —");
check("the group is not the panel's own colour", arrival.listFill !== arrival.panelFill, true);
check("and it is opaque, because it carries 11px text", /^(rgb\(|color\()/.test(arrival.listFill) && !arrival.listFill.includes("0)"), true);

console.log("\n— and 1:1 is the only place a transform does not exist —");
console.log(`   measured: arrival ${arrival.canvasTransform}, zoomed out ${zoomed.canvasTransform}, back at 1:1 ${live.canvasTransform}`);
check("zooming out puts a transform on the canvas", zoomed.canvasTransform.startsWith("matrix("), true);
check("so the canvas goes look-only behind a shield", zoomed.hasLookShield, true);
check("and the tile stops saying it is live", zoomed.liveAtOpen, false);
check("1:1 takes the transform back off", live.canvasTransform, "none");
check("the shield with it", live.hasLookShield, false);
check("the tile says it is live", live.liveAtOpen, true);
check("and the glass is still glass", live.panelBlur, "blur(24px) saturate(1.8)");

// THE WINDOW FITS THE SCREEN IT OPENS IN. The board is inside a note and can be far taller
// than the viewport, so the window's height is the room, never the board's own height.
const tall = stage("#tall").arrival;
console.log("\n— the window fits the screen, however tall the board under it is —");
console.log(`   measured: viewport ${tall.innerHeight}px · board tile ${tall.span.w}x${tall.span.h} · window ${Math.round(tall.windowBox.height)}px, bottom at ${Math.round(tall.windowBox.bottom)}`);
check("the window is no taller than the screen", tall.windowBox.height <= tall.innerHeight, true);
check("and its bottom edge is on the screen", tall.windowBox.bottom <= tall.innerHeight, true);

console.log("\n— and it reads as a window: an edge, the screen held, nothing scrolling behind —");
{
	const frame = arrival.frame;
	console.log(`   border ${frame.borderWidthPx}px ${frame.borderColour} · covers ${Math.round(frame.coverage * 100)}% of the screen · body overflow "${frame.bodyOverflow}"`);
	check("the window carries an edge of its own", frame.borderWidthPx >= 1, true);
	check("and the edge is painted, not transparent", /rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(frame.borderColour), false);
	check("it is not inside the board any more", frame.insideBoard, false);
	check("its backdrop covers the whole screen", frame.overlayCovers, true);
	check("the page behind it cannot scroll", frame.bodyOverflow, "hidden");
	check("and it takes most of the screen", frame.coverage > 0.8, true);
}

function level(colour, fallback) {
	const numbers = String(colour).match(/[\d.]+/g)?.map(Number) ?? [];
	if (numbers.length < 3) return NaN;
	const scale = String(colour).startsWith("color(") ? 255 : 1;
	const [red, green, blue] = numbers.slice(0, 3).map((value) => value * scale);
	const alpha = numbers.length > 3 ? numbers[3] : 1;
	const own = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
	// CONTEXT: a translucent fill is only ever seen over the canvas, so that is what it is measured on
	return fallback === null || alpha === 1 ? own : own * alpha + fallback * (1 - alpha);
}

console.log(failed ? `\n${failed} things the window does not do` : "\nthe window arrives clear, carries its grid through every zoom and fits the screen");
process.exit(failed ? 1 : 0);
