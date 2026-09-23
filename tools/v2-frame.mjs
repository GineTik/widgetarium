import fs from "node:fs";
import path from "node:path";
import esbuild from "esbuild";
import { THEMES, fontsOf } from "./host-themes.mjs";
import { TEXT_LOADERS } from "../apps/obsidian/build.mjs";

export const FRAMES = {
	Main: { theme: "light", view: "curve", tile: [840, 480], window: [900, 560] },
	Bars: { theme: "dark", view: "bars", tile: [840, 480], window: [900, 560], hovers: "peak" },
	Medium: { theme: "light", view: "curve", tile: [460, 300], window: [540, 380] },
	Compact: { theme: "light", view: "curve", tile: [266.67, 320], window: [900, 420] },
	AddRecord: { theme: "light", view: "curve", tile: [840, 480], window: [660, 700], opens: "add" },
	RecordList: { theme: "dark", view: "curve", tile: [840, 480], window: [660, 700], opens: "list" },
};

export const SHEETS = ["apps/obsidian/styles.css", "registry/@default/tokens.css"];

export const SETTLED_AT = Date.parse("2026-09-13T09:00:00Z");

/* TRADE-OFF: the design's stack, not the harness's — a different typeface makes every text box differ
   for good, and a width gap should mean a layout gap. */
export const AS_THE_DESIGN_IS_DRAWN = `-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter var", sans-serif`;

export async function pageFor(frame, sheets, widget = WIDGET_BY_DEFAULT) {
	const asked = FRAMES[frame];
	if (!asked) throw new Error(`v2-frame: no frame named ${frame}; there are ${Object.keys(FRAMES).join(", ")}`);
	const script = await bundled(frame, widget);
	const worn = [...SHEETS, ...sheets].map((at) => fs.readFileSync(at, "utf8")).join("\n");
	return `<!doctype html><html><head><meta charset="utf-8">
<style>${worn}</style>
<style>${groundFor(asked)}</style>
<script>${COLLECTING}</script>
<script>window.__FRAME__ = ${JSON.stringify({ ...asked, name: frame, at: SETTLED_AT })};</script>
<script>${PINNED_CLOCK}</script>
</head><body class="wg-root"><div id="host"></div>
<script>${script}</script></body></html>`;
}

/* TRADE-OFF: the host's tokens go on :root, not body — styles.css builds --wg-widget-edge from
   --text-normal at :root, and one empty token voids the whole box-shadow it sits in. */
function groundFor(asked) {
	return `:root { ${THEMES[asked.theme]} ${fontsOf(AS_THE_DESIGN_IS_DRAWN)} }
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; font-family: var(--font-interface); background: var(--background-secondary); }`;
}

const COLLECTING = `
window.__err = "";
const noted = (why) => { window.__err += why + "\\n"; };
addEventListener("error", (event) => noted(event.message + " @ " + event.lineno + ":" + event.colno));
addEventListener("unhandledrejection", (event) => noted("a promise was rejected and nobody caught it: " + (event.reason && event.reason.message ? event.reason.message : String(event.reason))));
window.__noted = noted;
`;

const PINNED_CLOCK = `
(() => {
	const at = window.__FRAME__.at;
	const Real = Date;
	class Pinned extends Real {
		constructor(...given) { super(...(given.length > 0 ? given : [at])); }
		static now() { return at; }
	}
	window.Date = Pinned;
})();
`;

export const WIDGET_BY_DEFAULT = "registry/@default/metric-total";

const probeFor = (widget) => `
import { createElement as h } from "react";
import { render } from "./packages/core/src/engine/render.js";
import Widget from "./${widget}/widget.tsx";
import { collectionGateway, soloGateway } from "./packages/core/src/gateway/create";

const asked = window.__FRAME__;
const DAY = 86400000;
const isoOf = (back) => new Date(asked.at - back * DAY).toISOString().slice(0, 10);
const SHAPE = [100, 115, 120, 110, 178, 180, 205, 185, 180, 183, 185, 185, 166, 181, 168, 195, 188, 162, 166, 174];
const NOTES = ["Evening batch", "", "Wholesale", "", "Market stall", ""];
const BEFORE_THE_WINDOW = 30;

const recordRows = [];
for (let back = 59; back >= 0; back -= 1) {
	const at = recordRows.length;
	const shaped = SHAPE[at % SHAPE.length];
	const amount = back >= BEFORE_THE_WINDOW ? Math.round(shaped * 0.6) : shaped;
	recordRows.push({
		ref: "Metrics/r" + at + ".md",
		value: { path: "Metrics/r" + at + ".md", name: "r" + at, date: isoOf(back), amount, note: NOTES[at % NOTES.length] },
	});
}
for (const at of [60, 61]) {
	recordRows.push({
		ref: "Metrics/r" + at + ".md",
		value: { path: "Metrics/r" + at + ".md", name: "r" + at, amount: 12, note: "No day on this one" },
	});
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
		records: listing(recordRows, "v2/records"),
		title: soloGateway("Total orders", {}, "v2/title"),
		unit: soloGateway("orders", {}, "v2/unit"),
		rising: soloGateway("good", {}, "v2/rising"),
		periods: listing(periodRows, "v2/periods"),
		periodPick: soloGateway("Past 30 days", {}, "v2/pick"),
		period: soloGateway({ label: "Past 30 days", days: 30 }, {}, "v2/period"),
		view: soloGateway(asked.view, {}, "v2/view"),
	}),
	tile,
);

const AWAITED = asked.opens ? ".wg-dialog" : "[data-part='root']";
const OPENERS = { add: "[data-part='add']", list: "[data-part='open-list']" };

const windowed = recordRows.filter((row) => row.value.date).slice(-30);
const peakAt = windowed.reduce((best, row, at) => (row.value.amount > windowed[best].value.amount ? at : best), 0);

const hovered = () => {
	if (asked.hovers !== "peak") return;
	const chart = document.querySelector("[data-part='chart'] svg");
	if (!chart) { window.__noted(asked.name + ": no chart to hover, so the tooltip was never shown"); return; }
	const room = chart.getBoundingClientRect();
	const at = room.left + (room.width * peakAt) / (windowed.length - 1);
	chart.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: at, clientY: room.top + room.height / 2 }));
};

const laidOut = () => {
	const node = document.querySelector(AWAITED);
	if (!node) return false;
	const box = node.getBoundingClientRect();
	return box.width > 0 && box.height > 0;
};

const opened = () => {
	if (!asked.opens) return true;
	const opener = document.querySelector(OPENERS[asked.opens]);
	if (!opener) return false;
	opener.click();
	return true;
};

const atRest = () => document.getAnimations().every((one) => one.playState !== "running");

const rested = (tries, quiet) => {
	if (quiet >= 3 || tries === 0) {
		requestAnimationFrame(() => { window.__READY__ = true; });
		return;
	}
	setTimeout(() => rested(tries - 1, atRest() ? quiet + 1 : 0), 60);
};

const settle = (tries) => {
	if (laidOut()) {
		hovered();
		rested(40, 0);
		return;
	}
	if (tries === 0) {
		window.__noted(asked.name + ": nothing ever matched " + AWAITED + (asked.opens ? ", after pressing " + OPENERS[asked.opens] : "") + " — the widget drew no box");
		return;
	}
	setTimeout(() => settle(tries - 1), 60);
};

setTimeout(() => {
	if (!opened()) window.__noted(asked.name + ": no " + OPENERS[asked.opens] + " to press, so the dialog was never opened");
	settle(60);
}, 60);
`;

const ALIASED = {
	widgetarium: "./tools/fill-shim.js",
	"widgetarium/kit": "./packages/kit/src/kit.js",
	"widgetarium/kit/emojis": "./packages/kit/src/emojis.js",
	"@default/lib": "./registry/@default/lib.js",
	obsidian: "./tools/obsidian-shim.js",
};

const BUNDLING = {
	bundle: true,
	loader: TEXT_LOADERS,
	write: false,
	format: "iife",
	platform: "browser",
	target: "es2020",
	jsxFactory: "h",
	jsxFragment: "Fragment",
	inject: ["tools/fill-inject.js"],
	alias: ALIASED,
	logLevel: "warning",
};

async function bundled(frame, widget) {
	const stdin = { contents: probeFor(widget), resolveDir: process.cwd(), loader: "jsx", sourcefile: `${frame}.jsx` };
	const built = await esbuild.build({ ...BUNDLING, stdin });
	return built.outputFiles[0].text;
}

if (process.argv[1]?.endsWith("v2-frame.mjs")) {
	const flag = (name, fallback = null) => {
		const at = process.argv.indexOf(`--${name}`);
		return at === -1 ? fallback : process.argv[at + 1];
	};
	const frame = flag("frame");
	const out = flag("out");
	if (!frame || !out) {
		console.error(
			"v2-frame: --frame <name> and --out <file.html> are required; --css <file> may be repeated, --widget <folder> names the widget",
		);
		process.exit(2);
	}
	const sheets = process.argv.reduce(
		(found, one, at) => (one === "--css" ? [...found, process.argv[at + 1]] : found),
		[],
	);
	const missing = sheets.filter((at) => !fs.existsSync(at));
	if (missing.length > 0) {
		console.error(`v2-frame: no such sheet: ${missing.join(", ")}`);
		process.exit(2);
	}
	fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
	const widget = flag("widget", WIDGET_BY_DEFAULT);
	if (!fs.existsSync(path.join(widget, "widget.tsx"))) {
		console.error(`v2-frame: no widget.tsx under ${widget}`);
		process.exit(2);
	}
	fs.writeFileSync(out, await pageFor(frame, sheets, widget));
	console.log(
		`v2-frame: ${widget} ${frame} at ${FRAMES[frame].tile.join("x")} in a ${FRAMES[frame].window.join("x")} window, ${sheets.length} sheet(s) of its own -> ${out}`,
	);
}
