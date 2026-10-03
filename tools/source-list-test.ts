import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import esbuild from "esbuild";
import { TEXT_LOADERS } from "../apps/obsidian/build.mts";
import { isObject } from "../packages/core/src/engine/is-object.js";
import { findBrowser } from "./harness.ts";
import { RESOURCES } from "../packages/core/src/gateway/implementation-metadata.js";

const bundle = await esbuild.build({
	entryPoints: ["tools/source-list-page.tsx"],
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
<script>${bundledPage()}</script></body></html>`;

function bundledPage(): string {
	const first = bundle.outputFiles[0];
	if (!first) throw new Error("esbuild wrote no bundle of the source list page");
	return first.text;
}

const file = path.join(mkdtempSync(path.join(tmpdir(), "wg-sources-")), "sources.html");
writeFileSync(file, page);
const dom = execFileSync(
	findBrowser("source list"),
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
const read: unknown = JSON.parse(said || "{}");

let failed = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${what}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(wanted)}`}`,
	);
}

const fieldOf = (value: unknown, key: string): unknown => (isObject(value) ? value[key] : undefined);
const numberOf = (value: unknown, key: string): number => Number(fieldOf(value, key));
const inResourceOrderOf = (headings: readonly string[]): string[] =>
	RESOURCES.filter((resource) => headings.includes(resource));

const before = fieldOf(read, "before");
check(
	"a number prop offers more than seven sources, so the list has to hold them",
	before ? numberOf(before, "rows") > 7 : false,
	true,
);
check(
	"the list is shorter than what it holds and scrolls, rather than growing the popover",
	before ? [numberOf(before, "listHeight") < numberOf(before, "listContent"), fieldOf(before, "overflowY")] : null,
	[true, "auto"],
);
check("no row is squeezed below its own two lines", fieldOf(before, "squeezedRows"), 0);
check(
	"the popover ends inside the window",
	before ? numberOf(before, "popBottom") <= numberOf(before, "viewport") : false,
	true,
);
check("the list scrolls on its own", fieldOf(read, "scrolledTo"), 200);

const sections = Array.isArray(fieldOf(before, "sections")) ? (fieldOf(before, "sections") as unknown[]) : [];
const headings = sections.map((section) => String(fieldOf(section, "heading")));
const rowsUnder = (heading: string): unknown =>
	fieldOf(
		sections.find((section) => fieldOf(section, "heading") === heading),
		"rows",
	);
check(
	"the sources stand in one section per resource, each named once, in the fixed order",
	[
		headings.length > 2,
		new Set(headings).size === headings.length,
		headings.join() === inResourceOrderOf(headings).join(),
	],
	[true, true, true],
);
check(
	"and each source stands under the resource it acts on",
	[
		rowsUnder("This board"),
		Array.isArray(rowsUnder("Statistics")) && JSON.stringify(rowsUnder("Statistics")).includes("How many"),
	],
	[["Typed here", "This screen"], true],
);
check(
	"and scrolling it leaves the popover where it was",
	fieldOf(read, "popBottomAfterScroll"),
	fieldOf(before, "popBottom"),
);

console.log(`\n${failed === 0 ? "source list: clean" : `source list: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
