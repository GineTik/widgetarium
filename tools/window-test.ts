import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import esbuild from "esbuild";
import { TEXT_LOADERS } from "../apps/obsidian/build.mts";
import { isObject } from "../packages/core/src/engine/is-object.js";
import { findBrowser } from "./harness.ts";

const work = mkdtempSync(path.join(tmpdir(), "wg-window-"));

const bundle = await esbuild.build({
	entryPoints: ["tools/window-page.tsx"],
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
<style>${readFileSync("apps/obsidian/styles.css", "utf8")}</style>
<style>body { margin: 0; background: #ffffff; color: #222222; font-family: -apple-system, "Segoe UI", sans-serif;
	--background-primary: #ffffff; --background-secondary: #f6f6f6; --background-modifier-border: #e4e4e4;
	--background-modifier-hover: rgba(0,0,0,0.05); --text-normal: #222222; --text-muted: #707070; --text-faint: #ababab;
	--text-on-accent: #ffffff; --text-error: #c0392b; --text-success: #1f8a4c; --interactive-accent: #6d4ee0;
	--interactive-accent-hover: #5b3ecb; --color-orange: #d9822b; }
.wg-host { width: 1340px; }
/* the box is measured, not the motion: headless virtual time does not advance a transition */
.wg-tile, .wg-set-body, .wg-set-window, .wg-set-chrome { transition: none !important; animation: none !important; }</style>
</head><body><div class="wg-host"></div><script id="wg-measure" type="application/json"></script>
<script>${bundledPage()}</script></body></html>`;

function bundledPage(): string {
	const first = bundle.outputFiles[0];
	if (!first) throw new Error("esbuild wrote no bundle of the window page");
	return first.text;
}

const file = path.join(work, "window.html");
writeFileSync(file, page);

function stage(hash: string): unknown {
	const dom = execFileSync(
		findBrowser("window"),
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
			stdio: ["ignore", "pipe", process.env["WG_DEBUG"] ? "inherit" : "ignore"],
		},
	);
	const payload = dom.match(/<script id="wg-measure" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
	if (!payload) {
		console.error("window gate: the page never reported — the harness failed to render");
		console.error(`  page: file://${file}${hash}`);
		process.exit(1);
	}
	const measured: unknown = JSON.parse(payload.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
	const failure = isObject(measured) ? measured["failure"] : undefined;
	if (failure) {
		console.error(`window gate: the page threw — ${String(failure)}`);
		process.exit(1);
	}
	return measured;
}

const measured = stage("");
if (process.env["WG_DEBUG"]) console.log(JSON.stringify(measured, null, 1));

const at = (value: unknown, dotted: string): unknown =>
	dotted.split(".").reduce<unknown>((held, key) => (isObject(held) ? held[key] : undefined), value);
const num = (value: unknown, dotted: string): number => Number(at(value, dotted));
const text = (value: unknown, dotted: string): string => String(at(value, dotted));
const listAt = (value: unknown, dotted: string): unknown[] => {
	const held = at(value, dotted);
	return Array.isArray(held) ? held : [];
};

const arrival = at(measured, "arrival");
const panned = at(measured, "panned");
const zoomed = at(measured, "zoomed");
const floor = at(measured, "floor");
const live = at(measured, "live");
const levels = at(measured, "levels");
const wheel = at(measured, "wheel");

function same(got: unknown, want: unknown): boolean {
	if (Object.is(got, want)) return true;
	if (!plain(got) || !plain(want)) return false;
	return JSON.stringify(got) === JSON.stringify(want);
}
function plain(value: unknown): boolean {
	if (value === null || typeof value !== "object") return false;
	const proto: unknown = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === Array.prototype || proto === null;
}
function show(value: unknown): string {
	return plain(value) ? JSON.stringify(value) : String(value);
}
let failed = 0;
function check(label: string, got: unknown, want: unknown): void {
	const ok = same(got, want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${label}${ok ? "" : `  got ${show(got)}, want ${show(want)}`}`);
}

function near(label: string, got: unknown, want: number, slack = 0.5): void {
	const ok = typeof got === "number" && Number.isFinite(got) && Math.abs(got - want) <= slack;
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${label}${ok ? "" : `  got ${round(got)}, want ${round(want)} ±${slack}`}`);
}

function round(value: unknown): number | string {
	return typeof value === "number" && Number.isFinite(value) ? Math.round(value * 1000) / 1000 : String(value);
}

console.log("— the widget arrives whole, clear of both floating panels —\n");
console.log(
	`   measured: window ${Math.round(num(arrival, "windowBox.width"))}x${Math.round(num(arrival, "windowBox.height"))}, widget ${Math.round(num(arrival, "widgetBox.width"))}x${Math.round(num(arrival, "widgetBox.height"))} at ${text(arrival, "said")}`,
);
check("nothing of it is under the settings panel", at(arrival, "widgetUnderPanel"), false);
check("nothing of it is under the header", at(arrival, "widgetUnderHead"), false);
check(
	"and the panel really is to the right of it",
	num(arrival, "panelBox.left") >= num(arrival, "widgetBox.right"),
	true,
);

console.log("\n— the grid is the window's, and it does not stop where a panel begins —");
check("cells run underneath the settings panel", at(arrival, "gridRunsUnderThePanel"), true);
check("the window clips what pans past its edge", at(arrival, "panelOverflow"), "hidden");

console.log("\n— the grid is part of the canvas: it zooms, it pans, and the widget sits on it —");
for (const [when, seen] of [
	["at arrival", arrival],
	["after a pan", panned],
	["zoomed out", zoomed],
	["at the zoom floor", floor],
	["back at 1:1", live],
] as const) {
	const scale = num(seen, "scale");
	const cellPx = num(seen, "cellPx");
	const pitchPx = cellPx + num(seen, "gapPx");
	console.log(
		`\n   ${when}: scale ${round(at(seen, "scale"))} · cell ${round(at(seen, "grid.cellPx"))}px (want ${round(cellPx * scale)}) · pitch ${round(at(seen, "grid.pitchPx"))}px (want ${round(pitchPx * scale)})`,
	);
	console.log(
		`   widget ${round(at(seen, "widgetBox.width"))}x${round(at(seen, "widgetBox.height"))} = ${round(at(seen, "grid.cellsAcross"))} x ${round(at(seen, "grid.cellsDown"))} cells, corner ${round(at(seen, "grid.offLatticeX"))}/${round(at(seen, "grid.offLatticeY"))}px off the lattice`,
	);
	near(`${when}: one cell measures cellPx x scale`, at(seen, "grid.cellPx"), cellPx * scale);
	near(`${when}: one pitch measures (cell + gap) x scale`, at(seen, "grid.pitchPx"), pitchPx * scale);
	near(
		`${when}: the widget measures the tile it came from x scale`,
		at(seen, "widgetBox.width"),
		num(seen, "tileBox.width") * scale,
	);
	near(`${when}: on both axes`, at(seen, "widgetBox.height"), num(seen, "tileBox.height") * scale);
}

// TRADE-OFF: real elements keep colour and radius tokens, at a cell count growing as the square of the zoom-out.
console.log(
	`\n   the grid is ${text(floor, "grid.count")} cells at the zoom floor, against ${text(arrival, "grid.count")} at 1:1`,
);
check("the grid does not run away at the floor zoom", num(floor, "grid.count") < 6000, true);

console.log("\n— three levels, and the top one is the canvas —");
for (const [theme, read] of Object.entries(isObject(levels) ? levels : {})) {
	const canvas = level(at(read, "--background-primary"), null);
	const ground = level(at(read, "--wg-cell-fill"), canvas);
	const control = level(at(read, "--wg-kit-fill"), canvas);
	const card = level(at(read, "--wg-kit-raise"), canvas);
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
check(
	"the window's own ground is the canvas colour",
	at(arrival, "canvasFill"),
	at(at(levels, "light"), "--background-primary"),
);

console.log("\n— the glass survives, because nothing above it is transformed —");
const blurPx = (value: unknown): number => Number(/blur\((\d+(?:\.\d+)?)px\)/.exec(String(value))?.[1] ?? 0);
console.log(`   the panel is blurred by ${blurPx(at(arrival, "panelBlur"))}px`);
check("the panel is really blurred", blurPx(at(arrival, "panelBlur")) >= 24, true);
check("and it saturates what shows through", /saturate/.test(text(arrival, "panelBlur")), true);

const alphaOf = (colour: unknown): number => Number(/\/\s*([\d.]+)\s*\)/.exec(String(colour))?.[1] ?? 1);
console.log(`   the panel's own fill is ${text(arrival, "panelFill")}`);
check("the panel is dense enough to read on", alphaOf(at(arrival, "panelFill")) >= 0.9, true);
check("three floating surfaces carry the blur", listAt(arrival, "blurred").length, 3);
check(
	"and they are the header, the panel and the zoom bar",
	listAt(arrival, "blurred").sort().join(" "),
	"aside.wg-kit-side.wg-kit-card.is-lifted.is-glass.wg-set-panel div.wg-set-bar.wg-kit-glass div.wg-set-head.wg-kit-glass",
);

console.log(
	`   the panel: sidebar ${text(arrival, "panelIsSidebar")} · padding ${text(arrival, "panelPad")} · corner ${text(arrival, "panelRadius")}`,
);
check("the panel is the kit's sidebar block", at(arrival, "panelIsSidebar"), true);
check("so its padding is the block's", at(arrival, "panelPad"), "8px");
check("and its corner is the block's", at(arrival, "panelRadius"), "14px");

console.log("\n— exactly one edge per floating panel, and the only cast shadow is the panel's lift —");
const shadowed = listAt(arrival, "shadowed");
const cast = shadowed.filter((entry) => listAt(entry, "cast").length > 0);
console.log(
	`   ${cast.length} element(s) cast beyond their own box: ${cast.map((entry) => `${text(entry, "name")} (${listAt(entry, "cast").length})`).join(" | ") || "none"}`,
);
check(
	"nothing inside the settings panel carries an edge",
	shadowed
		.filter((entry) => at(entry, "inside"))
		.map((entry) => at(entry, "name"))
		.join(" | ") || 0,
	0,
);
check(
	"the panel casts the lift the kit gives every sidebar",
	cast.some((entry) => at(entry, "isPanel")),
	true,
);
check(
	"and it is the only thing in the window that casts anything",
	cast
		.filter((entry) => !at(entry, "isPanel"))
		.map((entry) => at(entry, "name"))
		.join(" | ") || 0,
	0,
);

console.log("\n— a group on glass is a fill, and it is opaque —");
check("the group is not the panel's own colour", at(arrival, "listFill") !== at(arrival, "panelFill"), true);
check(
	"and it is opaque, because it carries 11px text",
	/^(rgb\(|color\()/.test(text(arrival, "listFill")) && !text(arrival, "listFill").includes("0)"),
	true,
);

console.log("\n— and 1:1 is the only place a transform does not exist —");
console.log(
	`   measured: arrival ${text(arrival, "canvasTransform")}, zoomed out ${text(zoomed, "canvasTransform")}, back at 1:1 ${text(live, "canvasTransform")}`,
);
check("zooming out puts a transform on the canvas", text(zoomed, "canvasTransform").startsWith("matrix("), true);
check("so the canvas goes look-only behind a shield", at(zoomed, "hasLookShield"), true);
check("and the tile stops saying it is live", at(zoomed, "liveAtOpen"), false);
check("1:1 takes the transform back off", at(live, "canvasTransform"), "none");
check("the shield with it", at(live, "hasLookShield"), false);
check("the tile says it is live", at(live, "liveAtOpen"), true);
check("and the glass is still glass", blurPx(at(live, "panelBlur")) >= 24, true);

const tall = at(stage("#tall"), "arrival");
console.log("\n— the window fits the screen, however tall the board under it is —");
console.log(
	`   measured: viewport ${text(tall, "innerHeight")}px · board tile ${text(tall, "span.w")}x${text(tall, "span.h")} · window ${Math.round(num(tall, "windowBox.height"))}px, bottom at ${Math.round(num(tall, "windowBox.bottom"))}`,
);
check("the window is no taller than the screen", num(tall, "windowBox.height") <= num(tall, "innerHeight"), true);
check("and its bottom edge is on the screen", num(tall, "windowBox.bottom") <= num(tall, "innerHeight"), true);

console.log("\n— and it reads as a window: an edge, the screen held, nothing scrolling behind —");
{
	const frame = at(arrival, "frame");
	console.log(
		`   border ${text(frame, "borderWidthPx")}px ${text(frame, "borderColour")} · covers ${Math.round(num(frame, "coverage") * 100)}% of the screen · body overflow "${text(frame, "bodyOverflow")}"`,
	);
	check("the window carries an edge of its own", num(frame, "borderWidthPx") >= 1, true);
	check(
		"and the edge is painted, not transparent",
		/rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(text(frame, "borderColour")),
		false,
	);
	check("it is not inside the board any more", at(frame, "insideBoard"), false);
	check("its backdrop covers the whole screen", at(frame, "overlayCovers"), true);
	check("the page behind it cannot scroll", at(frame, "bodyOverflow"), "hidden");
	check("and it takes most of the screen", num(frame, "coverage") > 0.8, true);
}

console.log("\n— the wheel drives the playground, and a pinch zooms about the pointer —");
{
	const beforeWheel = at(wheel, "beforeWheel");
	const wheelPanned = at(wheel, "wheelPanned");
	const pinchedOut = at(wheel, "pinchedOut");
	const pinchedIn = at(wheel, "pinchedIn");
	const before = at(wheel, "before");
	const overPanel = at(wheel, "overPanel");
	console.log(
		`   pan: corner ${round(at(beforeWheel, "corner.x"))},${round(at(beforeWheel, "corner.y"))} -> ${round(at(wheelPanned, "corner.x"))},${round(at(wheelPanned, "corner.y"))}`,
	);
	console.log(`   pinch: ${text(beforeWheel, "said")} -> ${text(pinchedOut, "said")} -> ${text(pinchedIn, "said")}`);

	check("a plain wheel moves the canvas left", num(wheelPanned, "corner.x") < num(beforeWheel, "corner.x"), true);
	check("and up, by the scroll it was given", num(wheelPanned, "corner.y") < num(beforeWheel, "corner.y"), true);
	check("it does not zoom while doing it", at(wheelPanned, "said"), at(beforeWheel, "said"));

	check(
		"a pinch out zooms the canvas down",
		parseFloat(text(pinchedOut, "said")) < parseFloat(text(beforeWheel, "said")),
		true,
	);
	check(
		"a pinch in zooms it back up",
		parseFloat(text(pinchedIn, "said")) > parseFloat(text(pinchedOut, "said")),
		true,
	);
	check("and it stops at 1:1, never past it", parseFloat(text(pinchedIn, "said")) <= 100, true);

	const held = (seen: unknown): { readonly x: number; readonly y: number } => ({
		x: (400 - num(seen, "corner.x")) / num(seen, "scale"),
		y: (300 - num(seen, "corner.y")) / num(seen, "scale"),
	});
	const was = held(beforeWheel === wheelPanned ? beforeWheel : wheelPanned);
	const now = held(pinchedOut);
	console.log(
		`   the point under the cursor: ${round(was.x)},${round(was.y)} -> ${round(now.x)},${round(now.y)} in canvas coordinates`,
	);
	near("the pinch keeps the point under the cursor still", now.x, was.x, 0.1);
	near("on both axes", now.y, was.y, 0.1);

	check("a wheel over the settings panel leaves the canvas alone", at(overPanel, "corner.x"), at(before, "corner.x"));
	check("and does not zoom it either", at(overPanel, "said"), at(before, "said"));
}

function level(colour: unknown, fallback: number | null): number {
	const numbers =
		String(colour)
			.match(/[\d.]+/g)
			?.map(Number) ?? [];
	if (numbers.length < 3) return NaN;
	const scale = String(colour).startsWith("color(") ? 255 : 1;
	const [red = NaN, green = NaN, blue = NaN] = numbers.slice(0, 3).map((value) => value * scale);
	const alpha = numbers.length > 3 ? (numbers[3] ?? NaN) : 1;
	const own = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
	return fallback === null || alpha === 1 ? own : own * alpha + fallback * (1 - alpha);
}

console.log(
	failed
		? `\n${failed} things the window does not do`
		: "\nthe window arrives clear, carries its grid through every zoom and fits the screen",
);
process.exit(failed ? 1 : 0);
