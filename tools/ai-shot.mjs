import { readFileSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import esbuild from "esbuild";
import { shoot, THEMES } from "./harness.mjs";
import { OBSIDIAN_STUB } from "./mirror.mjs";

const obsidianStub = {
	name: "obsidian-stub",
	setup(build) {
		build.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "obsidian-stub" }));
		build.onLoad({ filter: /.*/, namespace: "obsidian-stub" }, () => ({
			contents: OBSIDIAN_STUB,
			loader: "js",
			resolveDir: process.cwd(),
		}));
	},
};

const work = mkdtempSync(path.join(tmpdir(), "wg-ai-shot-"));
const built = await esbuild.build({
	entryPoints: ["tools/ai-shot-page.jsx"],
	bundle: true,
	loader: { ".md": "text", ".tsx": "text" },
	write: false,
	format: "iife",
	platform: "browser",
	target: "es2020",
	jsxFactory: "h",
	jsxFragment: "Fragment",
	logLevel: "warning",
	plugins: [obsidianStub],
});
const script = built.outputFiles[0].text;
const sheet = readFileSync("apps/obsidian/styles.css", "utf8");

const HOST_TOKENS = `--font-ui-small: 14px; --font-ui-smaller: 12px; --font-ui-large: 18px; --font-semibold: 600;
	--font-monospace: ui-monospace, monospace; font-family: -apple-system, system-ui, sans-serif;`;

const PANEL_SIZE = ["#host", ".wg-ai-shot"].join(", ") + " { height: 640px; width: 400px; }";

const STATES = ["empty", "talking", "broken", "building", "built"];

for (const theme of ["light", "dark"]) {
	for (const state of STATES) {
		const page = `<!doctype html><html><head><meta charset="utf-8">
<style>${sheet}</style>
<style>html, body { margin: 0; padding: 0; } body { ${THEMES[theme]} ${HOST_TOKENS}
	background: var(--background-secondary); color: var(--text-normal); }
${PANEL_SIZE}</style></head>
<body class="wg-root theme-${theme}" data-state="${state}">
<div id="host"></div>
<script>${script}</script></body></html>`;
		const at = path.join(work, `${theme}-${state}.html`);
		writeFileSync(at, page);
		const shot = `assistant-${theme}-${state}.png`;
		shoot(at, [`--screenshot=${shot}`], { width: 400, height: 780 });
		console.log(`shot ${shot}`);
	}
}
