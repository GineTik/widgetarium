import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import esbuild from "esbuild";
import { TEXT_LOADERS } from "../apps/obsidian/build.mts";
import { GRID, spanToPixels } from "../packages/core/src/paths.js";
import { z } from "../packages/core/src/gateway/declared.ts";
import { present } from "./page-dom.ts";

const BoxSchema = z.object({ left: z.number(), right: z.number(), width: z.number(), height: z.number() });
const FillReadingSchema = z.object({
	name: z.string(),
	cells: z.number(),
	tileWidth: z.number(),
	tileBox: BoxSchema.nullable(),
	control: BoxSchema.nullable(),
	controlOverflow: z.number().nullable(),
	controlNatural: z.number().nullable(),
	label: BoxSchema.nullable(),
	labelText: z.string().nullable(),
	labelClipped: z.boolean().nullable(),
	labelEllipsis: z.string().nullable(),
	icon: BoxSchema.nullable(),
});
type FillReading = z.infer<typeof FillReadingSchema>;
const MeasuredSchema = z.union([z.object({ failure: z.string() }), z.array(FillReadingSchema)]);

const BROWSERS = [
	process.env["WG_CHROME"],
	"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
	"/Applications/Chromium.app/Contents/MacOS/Chromium",
	"/usr/bin/google-chrome",
	"/usr/bin/chromium",
].filter((candidate): candidate is string => Boolean(candidate));

function browser(): string {
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
	entryPoints: ["tools/fill-page.tsx"],
	bundle: true,
	loader: TEXT_LOADERS,
	write: false,
	format: "iife",
	platform: "browser",
	target: "es2020",
	jsxFactory: "h",
	jsxFragment: "Fragment",
	inject: ["tools/fill-inject.ts"],
	alias: { widgetarium: "./tools/fill-shim.ts", "widgetarium/kit": "./packages/kit/src/index.ts" },
	logLevel: "warning",
});

const page = `<!doctype html><html><head><meta charset="utf-8">
<style>${readFileSync("apps/obsidian/styles.css", "utf8")}</style>
<style>${readFileSync("registry/@default/tokens.css", "utf8")}</style>
<style>body { margin: 0; font-family: -apple-system, "Segoe UI", sans-serif; }</style>
</head><body><div class="wg-root"></div><script id="wg-measure" type="application/json"></script>
<script>${present(bundle.outputFiles[0], "the fill bundle").text}</script></body></html>`;

const file = path.join(work, "fill.html");
writeFileSync(file, page);

const dom = execFileSync(
	browser(),
	[
		"--headless",
		"--disable-gpu",
		"--no-sandbox",
		"--hide-scrollbars",
		"--virtual-time-budget=4000",
		"--dump-dom",
		`file://${file}`,
	],
	{
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
		stdio: ["ignore", "pipe", process.env["WG_DEBUG"] ? "inherit" : "ignore"],
	},
);

const payload = dom.match(/<script id="wg-measure" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
if (!payload) {
	console.error("fill gate: the page never reported — the harness failed to render");
	if (process.env["WG_DEBUG"]) console.error(dom.slice(0, 4000));
	console.error(`  page: file://${file}`);
	process.exit(1);
}

const measured = MeasuredSchema.parse(
	JSON.parse(payload.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")),
);
if (!Array.isArray(measured)) {
	console.error(`fill gate: the page threw — ${measured.failure}`);
	process.exit(1);
}
if (process.env["WG_DEBUG"]) console.log(JSON.stringify(measured, null, 1));
const byName = new Map(measured.map((entry) => [entry.name, entry]));

function same(got: unknown, want: unknown): boolean {
	if (Object.is(got, want)) return true;
	if (!plain(got) || !plain(want)) return false;
	return JSON.stringify(got) === JSON.stringify(want);
}
function plain(value: unknown): boolean {
	if (value === null || typeof value !== "object") return false;
	const proto = Object.getPrototypeOf(value);
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

const cellsWide = (cells: number): number => spanToPixels(cells, GRID.cellPx, GRID.gapPx);

console.log("— a control is as wide as the cells it was given —\n");

for (const name of [
	"view-tabs, 3 cells, short label",
	"view-tabs, 2 cells, over-long label",
	"view-tabs, 1 cell, over-long label",
	"view-tabs, 13 cells, over-long label",
	"filter, 3 cells",
	"filter, 2 cells",
	"filter, 1 cell",
]) {
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
const drawnCase = (name: string): FillReading => present(byName.get(name), name);

{
	const tight = drawnCase("view-tabs, 2 cells, over-long label");
	check("the label is clipped rather than the tile", tight.labelClipped, true);
	check("and clipped with an ellipsis", tight.labelEllipsis, "ellipsis");
	check("the chevron is still drawn", Boolean(tight.icon), true);
	const icon = present(tight.icon, "the chevron");
	const control = present(tight.control, "the control");
	check("and still inside the control", icon.right <= control.right + 0.5, true);
	check("and inside the TILE, which is what clips", icon.right <= present(tight.tileBox, "the tile").right + 0.5, true);
	check("at the END of it", icon.right >= control.right - 24, true);
}

console.log("\n— and at one cell, where nothing fits, the chevron is still on screen —");
{
	const tiny = drawnCase("view-tabs, 1 cell, over-long label");
	check("the chevron is drawn", Boolean(tiny.icon), true);
	check(
		"and has not been pushed off the tile",
		present(tiny.icon, "the chevron").right <= present(tiny.tileBox, "the tile").right + 0.5,
		true,
	);
	check("the label is what gave way", tiny.labelClipped, true);
}

console.log("\n— the same label, given room, is not clipped —");
{
	const roomy = drawnCase("view-tabs, 13 cells, over-long label");
	check("nothing is cut off", roomy.labelClipped, false);
	check("and the whole name is there", roomy.labelText, "Archived columns");
}

console.log("\n— the label goes only when the label does not fit —");
{
	const three = drawnCase("filter, 3 cells");
	const two = drawnCase("filter, 2 cells");
	const one = drawnCase("filter, 1 cell");
	console.log(
		`   measured: the whole control wants ${Math.round(Number(three.controlNatural))}px with its word, ${Math.round(Number(one.controlNatural))}px without`,
	);
	check("at 3 cells the word is drawn", Boolean(three.label), true);
	check("at 2 cells it still fits, so it stays", Boolean(two.label), true);
	check("at 1 cell it cannot, so it goes", Boolean(one.label), false);
	check("and the control is still one cell wide", Math.round(one.control?.width ?? -1), cellsWide(1));
}

console.log(failed ? `\n${failed} widths the person did not ask for` : "\nevery control fills the tile it was given");
process.exit(failed ? 1 : 0);
