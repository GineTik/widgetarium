import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import esbuild from "esbuild";
import { findBrowser } from "./harness.mjs";
import { THEMES, HOST_FONTS } from "./host-themes.mjs";
import { TEXT_LOADERS } from "../build.mjs";

const OUT = "docs/reference/metric-total";
const SHEETS = ["styles.css", "widgets/@default/tokens.css", "widgets/@default/metric-total/widget.css"];

const FRAMES = [
	{ file: "Main", title: "Card — curve", theme: "light", view: "curve", tile: [840, 480], frame: [900, 560] },
	{ file: "Bars", title: "Card — bars, dark", theme: "dark", view: "bars", tile: [840, 480], frame: [900, 560] },
	{
		file: "ToneUp",
		title: "Tone — rising",
		theme: "light",
		view: "curve",
		rising: "good",
		tile: [520, 360],
		frame: [600, 440],
	},
	{
		file: "ToneFlat",
		title: "Tone — steady",
		theme: "light",
		view: "curve",
		sample: "steady",
		tile: [520, 360],
		frame: [600, 440],
	},
	{
		file: "ToneDown",
		title: "Tone — falling",
		theme: "light",
		view: "curve",
		rising: "bad",
		tile: [520, 360],
		frame: [600, 440],
	},
	{
		file: "WideRung",
		title: "Ladder — four plates",
		theme: "light",
		view: "curve",
		tile: [700, 420],
		frame: [780, 500],
	},
	{ file: "Medium", title: "Ladder — two plates", theme: "light", view: "curve", tile: [500, 360], frame: [580, 440] },
	{ file: "Compact", title: "Ladder — no toggle", theme: "light", view: "curve", tile: [360, 340], frame: [440, 420] },
	{ file: "Tiny", title: "Ladder — plates gone", theme: "light", view: "curve", tile: [270, 300], frame: [350, 380] },
	{
		file: "Empty",
		title: "Nothing bound yet",
		theme: "light",
		view: "curve",
		sample: "none",
		tile: [520, 360],
		frame: [600, 440],
	},
	{
		file: "AddRecord",
		title: "Add a record",
		theme: "light",
		view: "curve",
		tile: [840, 480],
		frame: [700, 560],
		opens: "add",
	},
	{
		file: "RecordList",
		title: "All records",
		theme: "dark",
		view: "curve",
		tile: [840, 480],
		frame: [700, 640],
		opens: "list",
	},
];

const PROBE = `
import { createElement as h } from "react";
import { render } from "./src/engine/render.js";
import Widget from "./widgets/@default/metric-total/widget.tsx";
import { collectionGateway, soloGateway } from "./src/gateway/create";

const asked = window.__FRAME__;
const DAY = 86400000;
const isoOf = (back) => new Date(Date.now() - back * DAY).toISOString().slice(0, 10);
const SHAPE = [100, 115, 120, 110, 178, 180, 205, 185, 180, 183, 185, 185, 166, 181, 168, 195, 188, 162, 166, 174];
const NOTES = ["Evening batch", "", "Wholesale", "", "Market stall", ""];
const BEFORE_THE_WINDOW = 30;

const sample = asked.sample ?? "full";
const recordRows = [];
if (sample !== "none") {
	for (let back = 59; back >= 0; back -= 1) {
		const at = recordRows.length;
		const shaped = SHAPE[at % SHAPE.length];
		const steady = sample === "steady";
		const amount = steady ? 150 : back >= BEFORE_THE_WINDOW ? Math.round(shaped * 0.6) : shaped;
		recordRows.push({
			ref: "Metrics/r" + at + ".md",
			value: { path: "Metrics/r" + at + ".md", name: "r" + at, date: isoOf(back), amount, note: NOTES[at % NOTES.length] },
		});
	}
}
const periodRows = [
	{ ref: "p30", value: { label: "Past 30 days", days: 30 } },
	{ ref: "p7", value: { label: "Past 7 days", days: 7 } },
];

const listing = (rows, id) => collectionGateway({
	id,
	settlesNow: true,
	handlers: {
		list: () => ({ rows, total: rows.length }),
		get: (ref) => rows.find((row) => row.ref === ref) ?? null,
		create: () => null,
		update: () => null,
		remove: () => undefined,
	},
});

const host = document.getElementById("host");
const tile = document.createElement("div");
tile.className = "wg-tile-body";
tile.style.width = asked.tile[0] + "px";
tile.style.height = asked.tile[1] + "px";
tile.style.display = "grid";
host.appendChild(tile);

render(
	h(Widget, {
		records: listing(recordRows, "canvas/records"),
		title: soloGateway("Total orders", {}, "canvas/title"),
		unit: soloGateway("orders", {}, "canvas/unit"),
		rising: soloGateway(asked.rising ?? "good", {}, "canvas/rising"),
		periods: listing(periodRows, "canvas/periods"),
		periodPick: soloGateway("Past 30 days", {}, "canvas/pick"),
		period: soloGateway({ label: "Past 30 days", days: 30 }, {}, "canvas/period"),
		view: soloGateway(asked.view, {}, "canvas/view"),
	}),
	tile,
);

if (asked.opens) {
	setTimeout(() => {
		const buttons = [...document.querySelectorAll(".mt-foot button")];
		const opener = asked.opens === "add" ? buttons[0] : buttons[buttons.length - 1];
		opener?.click();
	}, 300);
}
`;

const sheetsNow = () => SHEETS.map((at) => fs.readFileSync(at, "utf8")).join("\n");

async function bundled() {
	const built = await esbuild.build({
		stdin: { contents: PROBE, resolveDir: process.cwd(), loader: "jsx", sourcefile: "probe.jsx" },
		bundle: true,
		loader: TEXT_LOADERS,
		write: false,
		format: "iife",
		platform: "browser",
		target: "es2020",
		jsxFactory: "h",
		jsxFragment: "Fragment",
		inject: ["tools/fill-inject.js"],
		alias: {
			widgetarium: "./tools/fill-shim.js",
			"widgetarium/kit": "./src/kit.js",
			"widgetarium/kit/emojis": "./src/emojis.js",
			"@default/lib": "./widgets/@default/lib.js",
			obsidian: "./tools/obsidian-shim.js",
		},
		logLevel: "warning",
	});
	return built.outputFiles[0].text;
}

function pageFor(frame, script, sheets, work) {
	const page = `<!doctype html><html><head><meta charset="utf-8">
<style>${sheets}</style>
<style>body { margin: 0; ${THEMES[frame.theme]} ${HOST_FONTS}
	font-family: var(--font-interface); background: var(--background-secondary); }</style>
</head><body class="wg-root"><div id="host"></div>
<script>window.__FRAME__=${JSON.stringify(frame)};</script>
<script>${script}</script></body></html>`;
	const at = path.join(work, `${frame.file}.html`);
	fs.writeFileSync(at, page);
	return at;
}

function drawnBodyIn(dumped) {
	const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(dumped)?.[1] ?? "";
	return body.replace(/<script[\s\S]*?<\/script>/g, "").trim();
}

function artboardFor(frame, markup, sheets) {
	return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>
${sheets}

body { margin: 0; }

.stage {
	box-sizing: border-box;
	width: ${frame.frame[0]}px;
	height: ${frame.frame[1]}px;
	display: grid;
	place-items: center;
	${THEMES[frame.theme].replace(/\n\t+/g, "\n\t")}
	${HOST_FONTS}
	font-family: var(--font-interface);
	background: var(--background-secondary);
	color: var(--text-normal);
}
  </style>
</helmet>
<div class="stage wg-root">
${markup}
</div>
</x-dc>

<script data-dc-script data-props='{"$preview": {"width": ${frame.frame[0]}, "height": ${frame.frame[1]}}}'>
class Component extends DCLogic {}
</script>
</body>
</html>
`;
}

const ASKED_TO_CHECK = process.argv.includes("--check");

function artboardsBehindTheWidget() {
	const worn = sheetsNow();
	const behind = [];
	for (const frame of FRAMES) {
		const at = path.join(OUT, `${frame.file}.dc.html`);
		if (!fs.existsSync(at)) {
			behind.push(`${frame.file}.dc.html is missing`);
			continue;
		}
		const held = fs.readFileSync(at, "utf8");
		if (!held.includes(worn)) behind.push(`${frame.file}.dc.html carries a sheet the widget no longer has`);
		if (!held.includes("wg-metric")) behind.push(`${frame.file}.dc.html holds no widget`);
	}
	return behind;
}

if (ASKED_TO_CHECK) {
	const behind = artboardsBehindTheWidget();
	for (const line of behind) console.error(`  ${line}`);
	console.log(
		behind.length === 0
			? "canvas gate: the artboards carry the widget as it stands"
			: `canvas gate: ${behind.length} artboard(s) behind the widget`,
	);
	process.exit(behind.length === 0 ? 0 : 1);
}

const browser = findBrowser("canvas");
const work = mkdtempSync(path.join(tmpdir(), "wg-canvas-"));
const script = await bundled();
const sheets = sheetsNow();
fs.mkdirSync(OUT, { recursive: true });
fs.copyFileSync(new URL("artboard-support.js", import.meta.url), path.join(OUT, "support.js"));

const artboards = [];
for (const frame of FRAMES) {
	const at = pageFor(frame, script, sheets, work);
	const dumped = execFileSync(
		browser,
		[
			"--headless",
			"--disable-gpu",
			"--no-sandbox",
			"--hide-scrollbars",
			`--window-size=${frame.frame[0]},${frame.frame[1]}`,
			"--virtual-time-budget=6000",
			"--dump-dom",
			`file://${at}`,
		],
		{
			encoding: "utf8",
			maxBuffer: 64 * 1024 * 1024,
			stdio: ["ignore", "pipe", process.env.WG_DEBUG ? "inherit" : "ignore"],
		},
	);
	const markup = drawnBodyIn(dumped);
	if (!markup.includes("wg-metric")) {
		console.error(`canvas: ${frame.file} drew nothing — file://${at}`);
		process.exit(1);
	}
	fs.writeFileSync(path.join(OUT, `${frame.file}.dc.html`), artboardFor(frame, markup, sheets));
	artboards.push(frame);
	console.log(
		`${frame.file.padEnd(11)} ${frame.frame[0]}x${frame.frame[1]} ${frame.theme}${frame.opens ? ` (${frame.opens} open)` : ""}`,
	);
}

let x = 0;
let y = 0;
let tallest = 0;
const laid = artboards.map((frame, at) => {
	if (at > 0 && at % 3 === 0) {
		x = 0;
		y += tallest + 160;
		tallest = 0;
	}
	const place = { file: `${frame.file}.dc.html`, x, y, w: frame.frame[0], h: frame.frame[1], title: frame.title };
	x += frame.frame[0] + 120;
	tallest = Math.max(tallest, frame.frame[1]);
	return place;
});

fs.writeFileSync(
	path.join(OUT, "canvas.json"),
	`${JSON.stringify({ artboards: laid, launch: { view: "canvas" } }, null, 2)}\n`,
);
console.log(`\ncanvas: ${artboards.length} artboards written from the widget itself into ${OUT}`);
