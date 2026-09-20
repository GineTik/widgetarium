// CONTEXT: jsdom lays nothing out, so where the plate SITS can only be measured in a browser
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
	console.error("dialog fit gate: no Chrome found — set WG_CHROME to a Chromium binary");
	process.exit(1);
}

const work = mkdtempSync(path.join(tmpdir(), "wg-dialog-"));

const bundle = await esbuild.build({
	entryPoints: ["tools/dialog-fit-page.jsx"],
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
		"@default/lib": "./widgets/@default/lib.js",
	},
	logLevel: "warning",
});

const page = `<!doctype html><html><head><meta charset="utf-8">
<style>${readFileSync("styles.css", "utf8")}</style>
<style>${readFileSync("widgets/@default/tokens.css", "utf8")}</style>
<style>body {
	margin: 0;
	/* CONTEXT: the host's colour tokens, undefined here until a colour was measured — every fill
	   in the sheet resolved to transparent and only the geometry looked right */
	--background-primary: #ffffff; --background-secondary: #f6f6f6; --background-modifier-border: #e4e4e4;
	--background-modifier-hover: rgba(0,0,0,0.05); --text-normal: #222222; --text-muted: #707070;
	--text-faint: #a0a0a0; --text-on-accent: #ffffff; --text-error: #c0392b; --text-success: #1f8a4c;
	--interactive-accent: #6d4ee0;
	/* CONTEXT: our sheet asks for the host's tokens by name; undefined, the page falls back to
	   the browser default and measures a typeface Obsidian never uses */
	--font-interface: "Helvetica Neue", Helvetica, Arial, sans-serif;
	--font-text: "Helvetica Neue", Helvetica, Arial, sans-serif;
	--font-monospace: "SF Mono", Menlo, Consolas, monospace;
	font-family: var(--font-interface);
}</style>
</head><body><div class="wg-root"></div><script id="wg-measure" type="application/json"></script>
<script>${bundle.outputFiles[0].text}</script></body></html>`;

const file = path.join(work, "dialog.html");
writeFileSync(file, page);

// CONTEXT: virtual time advances the timers but not the animation clock, so a mid-enter box reports 0.9 of itself
function measureAt(width, height) {
	const dom = execFileSync(
		browser(),
		[
			"--headless",
			"--disable-gpu",
			"--no-sandbox",
			"--hide-scrollbars",
			"--force-prefers-reduced-motion",
			`--window-size=${width},${height}`,
			"--virtual-time-budget=4000",
			"--dump-dom",
			`file://${file}`,
		],
		{
			encoding: "utf8",
			maxBuffer: 64 * 1024 * 1024,
			stdio: ["ignore", "pipe", process.env.WG_DEBUG ? "inherit" : "ignore"],
		},
	);
	const payload = dom.match(/<script id="wg-measure" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
	if (!payload) {
		console.error(`dialog fit gate: the page never reported at ${width}px`);
		console.error(`  page: file://${file}`);
		process.exit(1);
	}
	const measured = JSON.parse(payload.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
	if (measured.failure) {
		console.error(`dialog fit gate: the page threw — ${measured.failure}`);
		process.exit(1);
	}
	return measured;
}

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

const wide = measureAt(1280, 900);
const narrow = measureAt(700, 900);
if (process.env.WG_DEBUG) console.log(JSON.stringify({ wide, narrow }, null, 1));

console.log(`— wide: a ${wide.dialog.width}px dialog, the plate beside the note —\n`);
check("the plate starts where the note ends", wide.plate.left >= wide.left.right, true);
check("and they share the same band", Math.abs(wide.plate.top - wide.left.top) <= 2, true);
check("the plate keeps the column width it was given", wide.plate.width, 316);
check("the note takes the rest", wide.left.width > wide.plate.width, true);
check("and the dialog is exactly as wide as it declares", wide.dialog.width, 980);

// CONTEXT: getBoundingClientRect reports the painted box, offsetWidth the laid-out one
console.log("\n— and every number here is layout, not a frame of the enter —");
for (const [where, seen] of [
	["wide", wide],
	["narrow", narrow],
]) {
	check(`${where}: the dialog's painted box is its laid-out box`, seen.dialog.width, seen.dialogLaidOut);
	check(`${where}: and so is the plate's`, seen.plate.width, seen.plateLaidOut);
	check(`${where}: with nothing of a gesture left on it`, seen.dialogPainted, "none none none 1");
}

console.log(`\n— narrow: a ${narrow.dialog.width}px dialog, the plate under it —`);
check("the plate has dropped below the note", narrow.plate.top >= narrow.left.bottom, true);
check("and it is not beside anything any more", narrow.plate.left < narrow.left.right, true);
check("it now spans the note's own width", Math.abs(narrow.plate.width - narrow.left.width) <= 1, true);

console.log("\n— it MOVES, it does not change —");
check("the same corner", narrow.plateRadius, wide.plateRadius);
check("the same fill", narrow.plateFill, wide.plateFill);
check("the corner is the plate's 14px, not the dialog's own", wide.plateRadius, "14px");

// CONTEXT: it was a Plate wrapping a frameless sidebar — the same block twice, so the lift never arrived
console.log(`\n— the properties block IS the kit's sidebar, and it lifts —`);
console.log(`   sidebar ${wide.plateIsSidebar} · nested block ${wide.plateWraps} · casts ${wide.plateCast.length}`);
check("the properties block is the kit's sidebar", wide.plateIsSidebar, true);
check("and it is the only block there — no frame around a frame", wide.plateWraps, false);
check("so it carries the lift every sidebar carries", wide.plateCast.length > 0, true);
check("at the narrow width too", narrow.plateCast.length, wide.plateCast.length);

// CONTEXT: the reach is read off the lift the block actually carries, never off a number typed
// here — a shadow that is retuned must move the room with it, not quietly outgrow it
function reach(shadow) {
	const layers = shadow
		.split(/,(?![^(]*\))/)
		.map((part) => part.trim())
		.filter((part) => !part.includes("inset"));
	const lengths = (layer) => [...layer.matchAll(/(-?[\d.]+)px/g)].map((found) => Number(found[1]));
	let down = 0;
	let up = 0;
	let side = 0;
	for (const layer of layers) {
		// the blur band straddles the shadow's edge, so half of it lies outside — the same
		// arithmetic tools/check-shadow.mjs gates the board's own shadow with
		const [across = 0, drop = 0, blur = 0, spread = 0] = lengths(layer);
		const half = blur / 2 + spread;
		down = Math.max(down, half + drop);
		up = Math.max(up, half - drop);
		side = Math.max(side, half + Math.abs(across));
	}
	return { down: Math.ceil(down), up: Math.ceil(up), side: Math.ceil(side) };
}

const room = reach(wide.plateLift);
console.log(
	`\n— and it is not cut off: the lift reaches ${room.side}px aside, ${room.down}px below, ${room.up}px above —`,
);
for (const [where, seen] of [
	["wide", wide],
	["narrow", narrow],
]) {
	for (const clip of seen.plateClips) {
		// the box that holds the block owes it the reach; the ones outside it owe only a whole box
		const owed = clip.holds === "the block" ? room : { down: 0, up: 0, side: 0 };
		console.log(
			`   ${where}: .${clip.name} holds ${clip.holds} with ${clip.left}/${clip.right} aside, ${clip.top} above, ${clip.bottom} below`,
		);
		check(`${where}: .${clip.name} leaves ${clip.holds} room below`, clip.bottom >= owed.down, true);
		check(`${where}: .${clip.name} leaves it room to the right`, clip.right >= owed.side, true);
		check(`${where}: .${clip.name} leaves it room to the left`, clip.left >= owed.side, true);
		check(`${where}: .${clip.name} leaves it room above`, clip.top >= owed.up, true);
	}
}
check("the box the block stands in is the scrolling one", wide.plateClips[0].name, "otd-body");
check(
	"and the body is one of the boxes that clips it",
	wide.plateClips.some((clip) => clip.name === "otd-body"),
	true,
);
check(
	"as is the dialog, which is what keeps the corner",
	wide.plateClips.some((clip) => clip.name.includes("dialog")),
	true,
);

console.log("\n— the rows do not reflow: name left, value right, at either width —");
for (const [where, seen] of [
	["wide", wide],
	["narrow", narrow],
]) {
	check(`${where}: the name and the value are on one line`, Math.abs(seen.rowName.top - seen.rowValue.top) <= 8, true);
	// CONTEXT: 12 is the kit row's own gutter, measured — the old blob started at the padding
	check(`${where}: the row starts hard left, with its icon`, seen.rowLead.left - seen.row.left <= 14, true);
	check(
		`${where}: and the name follows the icon`,
		seen.rowName.left > seen.rowLead.left && seen.rowName.left - seen.rowLead.right <= 14,
		true,
	);
	check(`${where}: the value is hard right`, seen.row.right - seen.rowValue.right <= 14, true);
	check(
		`${where}: a pressed row carries an edge, since it cannot be lighter than the panel`,
		seen.openRow.edge.includes("inset"),
		true,
	);
}

console.log("\n— wide content is cut where the column ends, and scrolls to show the rest —");
for (const [where, seen] of [
	["wide", wide],
	["narrow", narrow],
]) {
	for (const kind of ["code", "table", "diagram"]) {
		check(
			`${where}: the ${kind} is cut at the column, never drawn over what stands beside it`,
			seen[kind].right <= seen.md.right,
			true,
		);
		check(`${where}: and the ${kind} scrolls sideways to show the rest`, seen[kind].scrolls, true);
	}
}
check("wide: the column ends exactly where the plate begins", wide.md.right <= wide.plate.left, true);
check("wide: so a block is cut a whole sidebar short of the dialog", wide.dialog.right - wide.md.right >= 300, true);
check(
	"narrow: nothing stands beside it, so it carries on to the dialog's own edge",
	narrow.dialog.right - narrow.md.right <= 24,
	true,
);

console.log("\n— the copy button stands in the block's own corner —");
check(
	"inside the block it copies",
	wide.copy.right <= wide.codeBlock.right && wide.copy.top >= wide.codeBlock.top,
	true,
);
check(
	"with the code padded clear of it, so no line ever runs underneath",
	wide.copy.left >= wide.code.right - wide.codePadRight,
	true,
);

console.log("\n— and nothing overflows the page sideways —");
for (const [where, seen] of [
	["wide", wide],
	["narrow", narrow],
]) {
	check(`${where}: the page does not scroll sideways`, seen.pageScrollWidth <= seen.pageClientWidth, true);
	check(`${where}: the dialog is inside the window`, seen.dialog.right <= seen.window, true);
}

console.log(
	failed
		? `\n${failed} measurements the design did not ask for`
		: "\nthe plate sits beside the note, and drops below it",
);
process.exit(failed ? 1 : 0);
