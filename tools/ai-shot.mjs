import { readFileSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { bundleOf, shoot, THEMES } from "./harness.mjs";

const work = mkdtempSync(path.join(tmpdir(), "wg-ai-shot-"));
const script = await bundleOf("tools/ai-shot-page.jsx");
const sheet = readFileSync("styles.css", "utf8");

const HOST_TOKENS = `--font-ui-small: 14px; --font-ui-smaller: 12px; --font-ui-large: 18px; --font-semibold: 600;
	--font-monospace: ui-monospace, monospace; font-family: -apple-system, system-ui, sans-serif;`;

const PANEL_SIZE = ["#host", ".wg-ai-shot"].join(", ") + " { height: 640px; width: 400px; }";

const STATES = ["empty", "talking", "broken"];

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
