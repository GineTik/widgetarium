import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import esbuild from "esbuild";
import { TEXT_LOADERS } from "../build.mjs";

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
	loader: TEXT_LOADERS,
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
		[
			"--headless",
			"--disable-gpu",
			"--no-sandbox",
			"--hide-scrollbars",
			"--window-size=1440,960",
			"--virtual-time-budget=9000",
			"--dump-dom",
			`file://${file}${hash}`,
		],
		{
			encoding: "utf8",
			maxBuffer: 64 * 1024 * 1024,
			stdio: ["ignore", "pipe", process.env.WG_DEBUG ? "inherit" : "ignore"],
		},
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

const { arrival, panned, zoomed, floor, live, levels, wheel } = measured;

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
console.log(
	`   measured: window ${Math.round(arrival.windowBox.width)}x${Math.round(arrival.windowBox.height)}, widget ${Math.round(arrival.widgetBox.width)}x${Math.round(arrival.widgetBox.height)} at ${arrival.said}`,
);
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
for (const [when, seen] of [
	["at arrival", arrival],
	["after a pan", panned],
	["zoomed out", zoomed],
	["at the zoom floor", floor],
	["back at 1:1", live],
]) {
	const { grid, scale, cellPx, gapPx, span, widgetBox } = seen;
	const pitchPx = cellPx + gapPx;
	console.log(
		`\n   ${when}: scale ${round(scale)} · cell ${round(grid.cellPx)}px (want ${round(cellPx * scale)}) · pitch ${round(grid.pitchPx)}px (want ${round(pitchPx * scale)})`,
	);
	console.log(
		`   widget ${round(widgetBox.width)}x${round(widgetBox.height)} = ${round(grid.cellsAcross)} x ${round(grid.cellsDown)} cells, corner ${round(grid.offLatticeX)}/${round(grid.offLatticeY)}px off the lattice`,
	);
	near(`${when}: one cell measures cellPx x scale`, grid.cellPx, cellPx * scale);
	near(`${when}: one pitch measures (cell + gap) x scale`, grid.pitchPx, pitchPx * scale);
	near(
		`${when}: the widget measures spanToPixels(w) x scale`,
		widgetBox.width,
		(span.w * cellPx + (span.w - 1) * gapPx) * scale,
	);
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
	console.log(
		`\n   ${theme}: canvas ${round(canvas)} · grid ${round(ground)} (step ${round(gridStep)}) · control ${round(control)} (step ${round(controlStep)}) · card ${round(card)}`,
	);
	check(`${theme}: the grid is a third of a step, not a whole one`, gridStep * 2 < controlStep, true);
	check(`${theme}: so the canvas still reads as the ground`, gridStep < 6, true);
	check(
		`${theme}: and a card lifts clear of the control it stands on`,
		Math.abs(card - control) >= controlStep * 0.8,
		true,
	);
}
check("the window's own ground is the canvas colour", arrival.canvasFill, levels.light["--background-primary"]);

console.log("\n— the glass survives, because nothing above it is transformed —");
// THE LAW, NOT THE NUMBER. Pinning the exact blur meant the token could not be tuned without
// editing this line too — and a gate that has to be edited alongside the thing it guards is a
// second copy of that thing, not a check on it.
const blurPx = (value) => Number(/blur\((\d+(?:\.\d+)?)px\)/.exec(String(value))?.[1] ?? 0);
console.log(`   the panel is blurred by ${blurPx(arrival.panelBlur)}px`);
check("the panel is really blurred", blurPx(arrival.panelBlur) >= 24, true);
check("and it saturates what shows through", /saturate/.test(String(arrival.panelBlur)), true);

// A SURFACE SOMEBODY READS IS NOT A SURFACE SOMEBODY GLANCES AT. The panel took the thin tint
// meant for small floating chrome, so the board showed through every row of it and the blur had
// almost nothing to hide. Measured at 0.82 before; a panel has to be denser than that.
const alphaOf = (colour) => Number(/\/\s*([\d.]+)\s*\)/.exec(String(colour))?.[1] ?? 1);
console.log(`   the panel's own fill is ${arrival.panelFill}`);
check("the panel is dense enough to read on", alphaOf(arrival.panelFill) >= 0.9, true);
check("three floating surfaces carry the blur", arrival.blurred.length, 3);
check(
	"and they are the header, the panel and the zoom bar",
	arrival.blurred.sort().join(" "),
	"aside.wg-kit-side.wg-kit-card.is-lifted.is-glass.wg-set-panel div.wg-set-bar.wg-kit-glass div.wg-set-head.wg-kit-glass",
);

// CONTEXT: the panel wrote its own padding, corner and fill, so it missed what the block gained
console.log(
	`   the panel: sidebar ${arrival.panelIsSidebar} · padding ${arrival.panelPad} · corner ${arrival.panelRadius}`,
);
check("the panel is the kit's sidebar block", arrival.panelIsSidebar, true);
check("so its padding is the block's", arrival.panelPad, "8px");
check("and its corner is the block's", arrival.panelRadius, "14px");

// CONTEXT: read part by part — a comma list whose first part is inset used to pass while casting whatever came after
console.log("\n— exactly one edge per floating panel, and the only cast shadow is the panel's lift —");
const cast = arrival.shadowed.filter((entry) => entry.cast.length > 0);
console.log(
	`   ${cast.length} element(s) cast beyond their own box: ${cast.map((entry) => `${entry.name} (${entry.cast.length})`).join(" | ") || "none"}`,
);
check(
	"nothing inside the settings panel carries an edge",
	arrival.shadowed
		.filter((entry) => entry.inside)
		.map((entry) => entry.name)
		.join(" | ") || 0,
	0,
);
check(
	"the panel casts the lift the kit gives every sidebar",
	cast.some((entry) => entry.isPanel),
	true,
);
check(
	"and it is the only thing in the window that casts anything",
	cast
		.filter((entry) => !entry.isPanel)
		.map((entry) => entry.name)
		.join(" | ") || 0,
	0,
);

console.log("\n— a group on glass is a fill, and it is opaque —");
check("the group is not the panel's own colour", arrival.listFill !== arrival.panelFill, true);
check(
	"and it is opaque, because it carries 11px text",
	/^(rgb\(|color\()/.test(arrival.listFill) && !arrival.listFill.includes("0)"),
	true,
);

console.log("\n— and 1:1 is the only place a transform does not exist —");
console.log(
	`   measured: arrival ${arrival.canvasTransform}, zoomed out ${zoomed.canvasTransform}, back at 1:1 ${live.canvasTransform}`,
);
check("zooming out puts a transform on the canvas", zoomed.canvasTransform.startsWith("matrix("), true);
check("so the canvas goes look-only behind a shield", zoomed.hasLookShield, true);
check("and the tile stops saying it is live", zoomed.liveAtOpen, false);
check("1:1 takes the transform back off", live.canvasTransform, "none");
check("the shield with it", live.hasLookShield, false);
check("the tile says it is live", live.liveAtOpen, true);
check("and the glass is still glass", blurPx(live.panelBlur) >= 24, true);

// THE WINDOW FITS THE SCREEN IT OPENS IN. The board is inside a note and can be far taller
// than the viewport, so the window's height is the room, never the board's own height.
const tall = stage("#tall").arrival;
console.log("\n— the window fits the screen, however tall the board under it is —");
console.log(
	`   measured: viewport ${tall.innerHeight}px · board tile ${tall.span.w}x${tall.span.h} · window ${Math.round(tall.windowBox.height)}px, bottom at ${Math.round(tall.windowBox.bottom)}`,
);
check("the window is no taller than the screen", tall.windowBox.height <= tall.innerHeight, true);
check("and its bottom edge is on the screen", tall.windowBox.bottom <= tall.innerHeight, true);

console.log("\n— and it reads as a window: an edge, the screen held, nothing scrolling behind —");
{
	const frame = arrival.frame;
	console.log(
		`   border ${frame.borderWidthPx}px ${frame.borderColour} · covers ${Math.round(frame.coverage * 100)}% of the screen · body overflow "${frame.bodyOverflow}"`,
	);
	check("the window carries an edge of its own", frame.borderWidthPx >= 1, true);
	check("and the edge is painted, not transparent", /rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(frame.borderColour), false);
	check("it is not inside the board any more", frame.insideBoard, false);
	check("its backdrop covers the whole screen", frame.overlayCovers, true);
	check("the page behind it cannot scroll", frame.bodyOverflow, "hidden");
	check("and it takes most of the screen", frame.coverage > 0.8, true);
}

console.log("\n— the wheel drives the playground, and a pinch zooms about the pointer —");
{
	const { beforeWheel, wheelPanned, pinchedOut, pinchedIn, before, overPanel } = wheel;
	console.log(
		`   pan: corner ${round(beforeWheel.corner.x)},${round(beforeWheel.corner.y)} -> ${round(wheelPanned.corner.x)},${round(wheelPanned.corner.y)}`,
	);
	console.log(`   pinch: ${beforeWheel.said} -> ${pinchedOut.said} -> ${pinchedIn.said}`);

	check("a plain wheel moves the canvas left", wheelPanned.corner.x < beforeWheel.corner.x, true);
	check("and up, by the scroll it was given", wheelPanned.corner.y < beforeWheel.corner.y, true);
	check("it does not zoom while doing it", wheelPanned.said, beforeWheel.said);

	check("a pinch out zooms the canvas down", parseFloat(pinchedOut.said) < parseFloat(beforeWheel.said), true);
	check("a pinch in zooms it back up", parseFloat(pinchedIn.said) > parseFloat(pinchedOut.said), true);
	check("and it stops at 1:1, never past it", parseFloat(pinchedIn.said) <= 100, true);

	// THE POINT UNDER THE POINTER IS THE ONE THAT MUST NOT MOVE. Zooming about the corner
	// instead slides the whole picture out from under the cursor, which is what reads as broken.
	// seen.scale, NOT the percentage on the bar: the bar rounds to a whole percent, and 0.34%
	// of a 250px reach is the 1px that made this assertion look like a bug in the zoom
	const held = (seen) => ({ x: (400 - seen.corner.x) / seen.scale, y: (300 - seen.corner.y) / seen.scale });
	const was = held(beforeWheel === wheelPanned ? beforeWheel : wheelPanned);
	const now = held(pinchedOut);
	console.log(
		`   the point under the cursor: ${round(was.x)},${round(was.y)} -> ${round(now.x)},${round(now.y)} in canvas coordinates`,
	);
	near("the pinch keeps the point under the cursor still", now.x, was.x, 0.1);
	near("on both axes", now.y, was.y, 0.1);

	check("a wheel over the settings panel leaves the canvas alone", overPanel.corner.x, before.corner.x);
	check("and does not zoom it either", overPanel.said, before.said);
}

function level(colour, fallback) {
	const numbers =
		String(colour)
			.match(/[\d.]+/g)
			?.map(Number) ?? [];
	if (numbers.length < 3) return NaN;
	const scale = String(colour).startsWith("color(") ? 255 : 1;
	const [red, green, blue] = numbers.slice(0, 3).map((value) => value * scale);
	const alpha = numbers.length > 3 ? numbers[3] : 1;
	const own = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
	// CONTEXT: a translucent fill is only ever seen over the canvas, so that is what it is measured on
	return fallback === null || alpha === 1 ? own : own * alpha + fallback * (1 - alpha);
}

console.log(
	failed
		? `\n${failed} things the window does not do`
		: "\nthe window arrives clear, carries its grid through every zoom and fits the screen",
);
process.exit(failed ? 1 : 0);
