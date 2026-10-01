import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import esbuild from "esbuild";
import { WIDGETS_DIR } from "../packages/core/src/paths.js";
import { THEMES } from "./harness.ts";
import type { Theme } from "./harness.ts";
import { collectFiles } from "./registry-files.ts";
import { TEXT_LOADERS } from "./text-loaders.ts";

const CHROME = process.env["WG_CHROME"] ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const work = mkdtempSync(path.join(tmpdir(), "wg-sub-"));
const THEME_ORDER: readonly Theme[] = ["light", "dark"];

const files = collectFiles("registry", WIDGETS_DIR, /\.(json|tsx|ts|jsx|js|css|md)$/);

const built = await esbuild.build({
	entryPoints: ["tools/substitution-page.tsx"],
	bundle: true,
	loader: TEXT_LOADERS,
	write: false,
	format: "iife",
	platform: "browser",
	target: "es2020",
	jsxFactory: "h",
	jsxFragment: "Fragment",
	inject: ["tools/fill-inject.ts"],
	alias: {
		widgetarium: "./tools/fill-shim.ts",
		"widgetarium/kit": "./packages/kit/src/index.ts",
		obsidian: "./tools/obsidian-shim.ts",
	},
	logLevel: "warning",
});
const bundle = built.outputFiles[0]?.text ?? "";

for (const theme of THEME_ORDER) {
	const page = `<!doctype html><html><head><meta charset="utf-8">
<style>${readFileSync("apps/obsidian/styles.css", "utf8")}</style>
<style>body { margin: 0; ${THEMES[theme]}
	--font-interface: "Helvetica Neue", Helvetica, Arial, sans-serif;
	--font-text: "Helvetica Neue", Helvetica, Arial, sans-serif;
	--font-monospace: "SF Mono", Menlo, Consolas, monospace;
	font-family: var(--font-interface); background: var(--background-secondary); }</style>
</head><body class="wg-root"><div id="host"></div>
<script>window.__FILES__=${JSON.stringify(files)};</script>
<script>${bundle}</script></body></html>`;

	const file = path.join(work, `${theme}.html`);
	writeFileSync(file, page);
	const out = path.resolve(`substitutions-${theme}.png`);
	execFileSync(
		CHROME,
		[
			"--headless",
			"--disable-gpu",
			"--no-sandbox",
			"--hide-scrollbars",
			"--force-device-scale-factor=2",
			"--window-size=1280,820",
			"--virtual-time-budget=9000",
			`--screenshot=${out}`,
			`file://${file}`,
		],
		{ encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
	);
	console.log(`${theme} -> ${out}`);
}
