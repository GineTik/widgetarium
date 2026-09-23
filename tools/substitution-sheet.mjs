import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import esbuild from "esbuild";
import { buildMirror } from "./mirror.mjs";
import { findBrowser, THEMES } from "./harness.mjs";
import { TEXT_LOADERS } from "../apps/obsidian/build.mjs";

buildMirror();
const { WIDGETS_DIR } = await import("./.mjs-cache/paths.mjs");

const work = mkdtempSync(path.join(tmpdir(), "wg-sub-sheet-"));

const FRAMES = [
	{
		title: "Live",
		lead: "saved and running, so there is nothing to save",
		query: "case=live",
		width: 980,
		height: 780,
	},
	{
		title: "Draft",
		lead: "edited and not yet saved, so Save is the one accent",
		query: "case=draft",
		width: 980,
		height: 780,
	},
	{
		title: "Off",
		lead: "switched off, and the row in the list dims with it",
		query: "case=off",
		width: 980,
		height: 780,
	},
	{
		title: "Not valid",
		lead: "an expression that cannot be read, named under the sentence",
		query: "case=invalid",
		width: 980,
		height: 780,
	},
	{
		title: "Nothing yet",
		lead: "no rule written, so the pane holds one press",
		query: "case=empty",
		width: 980,
		height: 420,
	},
	{
		title: "Phone",
		lead: "the list becomes a press, and the head stacks",
		query: "case=live",
		width: 390,
		height: 720,
	},
	{
		title: "Phone, the list",
		lead: "the same block, raised as a sheet",
		query: "case=live&open=list",
		width: 390,
		height: 720,
	},
];

const files = collect("registry", {}, WIDGETS_DIR);
const bundle = await esbuild.build({
	entryPoints: ["tools/substitution-page.jsx"],
	bundle: true,
	loader: TEXT_LOADERS,
	write: false,
	format: "iife",
	platform: "browser",
	target: "es2020",
	jsxFactory: "h",
	jsxFragment: "Fragment",
	inject: ["tools/fill-inject.js"],
	alias: {
		widgetarium: "./tools/fill-shim.js",
		"widgetarium/kit": "./packages/kit/src/index.ts",
		obsidian: "./tools/obsidian-shim.js",
	},
	logLevel: "warning",
});

const sheet = readFileSync("apps/obsidian/styles.css", "utf8");

for (const theme of ["light", "dark"]) {
	writeFileSync(path.join(work, `frame-${theme}.html`), framePage(theme));
	const page = path.join(work, `sheet-${theme}.html`);
	writeFileSync(page, sheetPage(theme));
	const out = path.resolve(`substitutions-states-${theme}.png`);
	execFileSync(
		findBrowser("substitution sheet"),
		[
			"--headless",
			"--disable-gpu",
			"--no-sandbox",
			"--hide-scrollbars",
			"--force-device-scale-factor=2",
			"--allow-file-access-from-files",
			"--window-size=2120,2760",
			"--virtual-time-budget=20000",
			`--screenshot=${out}`,
			`file://${page}`,
		],
		{ encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
	);
	console.log(`${theme} -> ${out}`);
}

function collect(from, into, prefix) {
	for (const entry of readdirSync(from)) {
		const full = path.join(from, entry);
		const key = `${prefix}/${entry}`;
		if (statSync(full).isDirectory()) collect(full, into, key);
		else if (/\.(json|tsx|ts|jsx|js|css|md)$/.test(entry)) into[key] = readFileSync(full, "utf8");
	}
	return into;
}

function framePage(theme) {
	return `<!doctype html><html><head><meta charset="utf-8">
<style>${sheet}</style>
<style>html, body { height: 100%; }
body { margin: 0; ${THEMES[theme]}
	--font-interface: "Helvetica Neue", Helvetica, Arial, sans-serif;
	--font-text: "Helvetica Neue", Helvetica, Arial, sans-serif;
	--font-monospace: "SF Mono", Menlo, Consolas, monospace;
	font-family: var(--font-interface); background: var(--background-secondary); }
.wg-dialog-overlay { padding: 16px; }
</style>
</head><body class="wg-root"><div id="host"></div>
<script>window.__FILES__=${JSON.stringify(files)};</script>
<script>${bundle.outputFiles[0].text}</script></body></html>`;
}

function sheetPage(theme) {
	const cards = FRAMES.map(
		(frame) => `<figure class="shot" style="width:${frame.width}px">
	<figcaption><b>${frame.title}</b><span>${frame.lead}</span></figcaption>
	<iframe src="frame-${theme}.html?${frame.query}" width="${frame.width}" height="${frame.height}" loading="eager"></iframe>
</figure>`,
	).join("\n");

	return `<!doctype html><html><head><meta charset="utf-8">
<style>body { margin: 0; padding: 28px; ${THEMES[theme]}
	background: var(--background-secondary); color: var(--text-normal);
	font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
h1 { margin: 0 0 4px; font-size: 22px; font-weight: 600; letter-spacing: -0.01em; }
p.lead { margin: 0 0 24px; color: var(--text-muted); font-size: 14px; }
.wall { display: flex; flex-wrap: wrap; gap: 28px; align-items: flex-start; }
.shot { margin: 0; display: flex; flex-direction: column; gap: 8px; }
figcaption { display: flex; flex-direction: column; gap: 2px; padding-left: 2px; }
figcaption b { font-size: 15px; }
figcaption span { font-size: 12px; color: var(--text-muted); }
iframe { border: none; border-radius: 18px; background: var(--background-secondary);
	box-shadow: 0 1px 2px rgba(0,0,0,0.08), 0 6px 18px rgba(0,0,0,0.08); }
</style></head><body>
<h1>Substitutions</h1>
<p class="lead">Every state of the window, at the two widths it is drawn at — ${theme}</p>
<div class="wall">${cards}</div>
</body></html>`;
}
