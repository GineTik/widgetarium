import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { bundleOf, THEMES } from "./harness.mjs";

const out = path.resolve(process.argv[2] ?? path.join(tmpdir(), "widgetarium-kit-demo.html"));

const HOST = `--font-interface: Inter, -apple-system, "Segoe UI", system-ui, sans-serif;
	--font-text: var(--font-interface);
	--font-monospace: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
	--font-ui-smaller: 12px; --font-ui-small: 14px; --font-ui-medium: 16px;
	--font-normal: 400; --font-medium: 500; --font-semibold: 600; --font-bold: 700;`;

const DEMO_CHROME = `body { margin: 0; background: var(--wg-kit-page); color: var(--wg-kit-text); font-family: var(--font-interface); }
.demo-page { box-sizing: border-box; max-width: 1180px; margin: 0 auto; padding-block: 40px 72px; padding-inline: 16px;
	--wg-gap-cards: 24px; --wg-gap-items: 16px; --wg-gap-parts: 8px; }
.demo-head { flex-wrap: wrap; justify-content: space-between; }
.demo-note { margin: 0; font-size: var(--wg-kit-text-s); line-height: 1.5; color: var(--wg-kit-text-muted); }
.demo-code { font-family: var(--font-monospace); font-size: var(--wg-kit-text-xs); color: var(--wg-kit-text-muted); }
.demo-stack { display: flex; flex-direction: column; gap: var(--wg-gap-items); min-width: 0; }
.demo-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--wg-gap-parts); }
.demo-bottom { align-items: flex-end; }
.demo-named { display: flex; flex-direction: column; gap: var(--wg-gap-parts); min-width: 0; }
.demo-end { text-align: right; }
.demo-narrow { max-width: 340px; container: widget / inline-size; }`;

function themed(scheme) {
	return `${THEMES[scheme]} color-scheme: ${scheme};`;
}

const script = await bundleOf("tools/kit-demo-page.jsx");

const page = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Widgetarium Kit</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
<style>
:root { ${themed("light")} ${HOST} }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ${themed("dark")} } }
:root[data-theme="dark"] { ${themed("dark")} }
</style>
<style>${readFileSync("apps/obsidian/styles.css", "utf8")}</style>
<style>${DEMO_CHROME}</style>
</head><body class="wg-root"><div id="demo"></div>
<script>${script}</script>
</body></html>`;

writeFileSync(out, page);
console.log(`kit demo written to ${out}`);
