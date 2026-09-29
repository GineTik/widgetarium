import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import esbuild from "esbuild";
import { TEXT_LOADERS } from "../apps/obsidian/build.mjs";

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
	console.error("source list gate: no Chrome found — set WG_CHROME to a Chromium binary");
	process.exit(1);
}

const bundle = await esbuild.build({
	entryPoints: ["tools/source-list-page.jsx"],
	bundle: true,
	loader: TEXT_LOADERS,
	write: false,
	format: "iife",
	platform: "browser",
	target: "es2020",
	jsxFactory: "h",
	logLevel: "warning",
});

const page = `<!doctype html><html><head><meta charset="utf-8">
<style>${readFileSync("apps/obsidian/styles.css", "utf8")}</style>
<style>body { margin: 0; background: #ffffff; color: #222222; font-family: -apple-system, "Segoe UI", sans-serif;
	--background-primary: #ffffff; --background-secondary: #f6f6f6; --background-modifier-border: #e4e4e4;
	--background-modifier-hover: rgba(0,0,0,0.05); --text-normal: #222222; --text-muted: #707070; --text-faint: #ababab;
	--text-on-accent: #ffffff; --interactive-accent: #6d4ee0; --interactive-accent-hover: #5b3ecb; }
.wg-host { width: 1340px; } body *, body *::before { transition: none !important; animation: none !important; }</style>
</head><body><div class="wg-host"></div><textarea id="wg-measure"></textarea>
<script>${bundle.outputFiles[0].text}</script></body></html>`;

const file = path.join(mkdtempSync(path.join(tmpdir(), "wg-sources-")), "sources.html");
writeFileSync(file, page);
const dom = execFileSync(
	browser(),
	[
		"--headless",
		"--disable-gpu",
		"--no-sandbox",
		"--window-size=1440,960",
		"--virtual-time-budget=6000",
		"--dump-dom",
		`file://${file}`,
	],
	{ encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] },
);
const opening = '<textarea id="wg-measure">';
const from = dom.indexOf(opening) + opening.length;
const said = dom
	.slice(from, dom.indexOf("</textarea>", from))
	.replace(/&quot;/g, '"')
	.replace(/&amp;/g, "&");
const read = JSON.parse(said || "{}");

let failed = 0;
function check(what, got, wanted) {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${what}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(wanted)}`}`,
	);
}

const before = read.before;
check(
	"a number prop offers more than seven sources, so the list has to hold them",
	before ? before.rows > 7 : false,
	true,
);
check(
	"the list is shorter than what it holds and scrolls, rather than growing the popover",
	before ? [before.listHeight < before.listContent, before.overflowY] : null,
	[true, "auto"],
);
check("no row is squeezed below its own two lines", before?.squeezedRows, 0);
check("the popover ends inside the window", before ? before.popBottom <= before.viewport : false, true);
check("the list scrolls on its own", read.scrolledTo, 200);
check("and scrolling it leaves the popover where it was", read.popBottomAfterScroll, before?.popBottom);

console.log(`\n${failed === 0 ? "source list: clean" : `source list: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
