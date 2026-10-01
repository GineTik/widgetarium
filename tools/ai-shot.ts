import { readFileSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import esbuild from "esbuild";
import type { Plugin } from "esbuild";
import { shoot, THEMES } from "./harness.ts";
import type { Theme } from "./harness.ts";

const WIDGET_SOURCE_PREFIX = "widget-source:";

const obsidianStub: Plugin = {
	name: "obsidian-stub",
	setup(build) {
		build.onResolve({ filter: /^obsidian$/ }, () => ({ path: path.resolve("tools/loader/obsidian-stub.mts") }));
	},
};

const widgetSourceAsText: Plugin = {
	name: "widget-source-as-text",
	setup(build) {
		build.onResolve({ filter: /^widget-source:/ }, (asked) => ({
			path: path.resolve("registry", asked.path.slice(WIDGET_SOURCE_PREFIX.length)),
			namespace: "widget-source",
		}));
		build.onLoad({ filter: /.*/, namespace: "widget-source" }, (asked) => ({
			contents: readFileSync(asked.path, "utf8"),
			loader: "text",
		}));
	},
};

const work = mkdtempSync(path.join(tmpdir(), "wg-ai-shot-"));
const built = await esbuild.build({
	entryPoints: ["tools/ai-shot-page.tsx"],
	bundle: true,
	loader: { ".md": "text" },
	write: false,
	format: "iife",
	platform: "browser",
	target: "es2020",
	jsxFactory: "h",
	jsxFragment: "Fragment",
	logLevel: "warning",
	plugins: [obsidianStub, widgetSourceAsText],
});
const bundled = built.outputFiles[0];
if (!bundled) throw new Error("esbuild wrote no output");
const script = bundled.text;
const sheet = readFileSync("apps/obsidian/styles.css", "utf8");

const HOST_TOKENS = `--font-ui-small: 14px; --font-ui-smaller: 12px; --font-ui-large: 18px; --font-semibold: 600;
	--font-monospace: ui-monospace, monospace; font-family: -apple-system, system-ui, sans-serif;`;

const PANEL_SIZE = ["#host", ".wg-ai-shot"].join(", ") + " { height: 640px; width: 400px; }";

const STATES = ["empty", "talking", "broken", "building", "built"];
const SHOT_THEMES: readonly Theme[] = ["light", "dark"];

for (const theme of SHOT_THEMES) {
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
