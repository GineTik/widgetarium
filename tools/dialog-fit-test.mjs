// CONTEXT: jsdom lays nothing out, so where the plate SITS can only be measured in a browser
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
	console.error("dialog fit gate: no Chrome found — set WG_CHROME to a Chromium binary");
	process.exit(1);
}

const work = mkdtempSync(path.join(tmpdir(), "wg-dialog-"));

const bundle = await esbuild.build({
	entryPoints: ["tools/dialog-fit-page.jsx"],
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
<style>${readFileSync("widgets/@orbitask/tokens.css", "utf8")}</style>
<style>body { margin: 0; font-family: -apple-system, "Segoe UI", sans-serif; }</style>
</head><body><div class="wg-root"></div><script id="wg-measure" type="application/json"></script>
<script>${bundle.outputFiles[0].text}</script></body></html>`;

const file = path.join(work, "dialog.html");
writeFileSync(file, page);

function measureAt(width, height) {
	const dom = execFileSync(
		browser(),
		["--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", `--window-size=${width},${height}`, "--virtual-time-budget=4000", "--dump-dom", `file://${file}`],
		{ encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", process.env.WG_DEBUG ? "inherit" : "ignore"] },
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

let failed = 0;
function check(label, got, want) {
	const ok = String(got) === String(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${label}${ok ? "" : `  got ${got}, want ${want}`}`);
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

console.log(`\n— narrow: a ${narrow.dialog.width}px dialog, the plate under it —`);
check("the plate has dropped below the note", narrow.plate.top >= narrow.left.bottom, true);
check("and it is not beside anything any more", narrow.plate.left < narrow.left.right, true);
check("it now spans the note's own width", Math.abs(narrow.plate.width - narrow.left.width) <= 1, true);

console.log("\n— it MOVES, it does not change —");
check("the same corner", narrow.plateRadius, wide.plateRadius);
check("the same fill", narrow.plateFill, wide.plateFill);
check("the corner is the plate's 22px, not the dialog's own", wide.plateRadius, "22px");

console.log("\n— the rows do not reflow: name left, value right, at either width —");
for (const [where, seen] of [["wide", wide], ["narrow", narrow]]) {
	check(`${where}: the name and the value are on one line`, Math.abs(seen.rowName.top - seen.rowValue.top) <= 8, true);
	check(`${where}: the name is hard left`, seen.rowName.left - seen.row.left <= 10, true);
	check(`${where}: the value is hard right`, seen.row.right - seen.rowValue.right <= 10, true);
}

console.log("\n— and nothing overflows the page sideways —");
for (const [where, seen] of [["wide", wide], ["narrow", narrow]]) {
	check(`${where}: the page does not scroll sideways`, seen.pageScrollWidth <= seen.pageClientWidth, true);
	check(`${where}: the dialog is inside the window`, seen.dialog.right <= seen.window, true);
}

console.log(failed ? `\n${failed} measurements the design did not ask for` : "\nthe plate sits beside the note, and drops below it");
process.exit(failed ? 1 : 0);
