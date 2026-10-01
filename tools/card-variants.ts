import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import esbuild from "esbuild";
import { WIDGETS_DIR } from "../packages/core/src/paths.js";
import { collectFiles } from "./registry-files.ts";
import { TEXT_LOADERS } from "./text-loaders.ts";

// TODO: delete with tools/card-variants.css once a card treatment is picked
const CHROME = process.env["WG_CHROME"] ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const work = mkdtempSync(path.join(tmpdir(), "wg-var-"));
const NOT_INSTALLED = ["@default/view-group", "@default/archived-columns"];
const VARIANTS: readonly (readonly [string, string, string])[] = [
	["bleed", "A · full bleed", "the picture is the tile, the name sits under it"],
	["framed", "B · framed", "a white card, the preview inset on its own ground"],
	["over", "C · label over", "the preview fills the tile, the name floats on glass"],
	["plate", "D · plate", "a raised card holding a sunken stage"],
];

const files = collectFiles("registry", WIDGETS_DIR, /\.(json|jsx|js|css)$/);
const built = await esbuild.build({
	entryPoints: ["tools/catalogue-page.tsx"],
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
const bundle = built.outputFiles[0]?.text ?? "";

const LIGHT = `--background-primary:#ffffff;--background-secondary:#f6f6f6;--background-modifier-border:#e4e4e4;
	--background-modifier-hover:rgba(0,0,0,0.05);--text-normal:#222222;--text-muted:#707070;--text-faint:#a0a0a0;
	--text-on-accent:#ffffff;--text-error:#c0392b;--text-success:#1f8a4c;--interactive-accent:#6d4ee0;`;

function pageFor(variant: string, title: string, said: string): string {
	return `<!doctype html><html><head><meta charset="utf-8">
<style>${readFileSync("apps/obsidian/styles.css", "utf8")}</style>
<style>${readFileSync("tools/card-variants.css", "utf8")}</style>
<style>
body { margin: 0; padding: 28px 32px; ${LIGHT}
	background: var(--background-primary); color: var(--text-normal);
	font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
	--font-ui-smaller: 12px; --font-ui-small: 14px; --font-ui-medium: 16px; --font-semibold: 600; }
.wg-cat-grid { overflow: visible !important; }
.harness-top { display: flex; align-items: baseline; gap: 10px; margin: 0 0 18px; }
.harness-top h1 { margin: 0; font-size: 19px; font-weight: 600; letter-spacing: -0.01em; }
.harness-top span { color: var(--text-muted); font-size: 13px; }
</style></head><body class="wg-root variant-${variant}">
<div class="harness-top"><h1>${title}</h1><span>${said}</span></div>
<div id="host"></div><pre id="boom" hidden></pre><pre id="count" hidden></pre>
<script>window.__FILES__=${JSON.stringify(files)};window.__NOT_INSTALLED__=${JSON.stringify(NOT_INSTALLED)};window.__MODE__="place";</script>
<script>${bundle}</script>
</body></html>`;
}

const into = process.argv[2] ?? ".";
for (const [variant, title, said] of VARIANTS) {
	const file = path.join(work, `${variant}.html`);
	writeFileSync(file, pageFor(variant, title, said));
	const out = path.resolve(into, `card-${variant}.png`);
	execFileSync(
		CHROME,
		[
			"--headless",
			"--disable-gpu",
			"--no-sandbox",
			"--hide-scrollbars",
			"--force-device-scale-factor=2",
			"--window-size=1280,1240",
			"--virtual-time-budget=12000",
			`--screenshot=${out}`,
			`file://${file}`,
		],
		{ stdio: ["ignore", "pipe", "ignore"] },
	);

	const dom = execFileSync(
		CHROME,
		[
			"--headless",
			"--disable-gpu",
			"--no-sandbox",
			"--window-size=1280,1240",
			"--virtual-time-budget=12000",
			"--dump-dom",
			`file://${file}`,
		],
		{ encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
	);
	const tiles = (dom.match(/wg-cat-tile/g) ?? []).length;
	if (tiles === 0) {
		console.error(`${variant}: the page drew no tiles`);
		process.exit(1);
	}
	console.log(`${variant.padEnd(7)} ${tiles} tiles → ${out}`);
}
