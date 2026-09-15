import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import esbuild from "esbuild";
import { buildWidgets } from "./mirror.mjs";
import { TEXT_LOADERS } from "../build.mjs";

const BROWSERS = [
	process.env.WG_CHROME,
	"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
	"/Applications/Chromium.app/Contents/MacOS/Chromium",
	"/usr/bin/google-chrome",
	"/usr/bin/chromium",
].filter(Boolean);

export function findBrowser(gate) {
	for (const candidate of BROWSERS) {
		try {
			execFileSync(candidate, ["--version"], { stdio: "ignore" });
			return candidate;
		} catch {}
	}
	console.error(`${gate} gate: no Chrome found — set WG_CHROME to a Chromium binary`);
	process.exit(1);
}

export const WIDGETS_AT = ".widgetarium/widgets";

export function widgetFiles(from = buildWidgets()) {
	const found = {};
	const walk = (at, to) => {
		for (const entry of fs.readdirSync(at, { withFileTypes: true })) {
			if (entry.isDirectory()) walk(path.join(at, entry.name), `${to}/${entry.name}`);
			else found[`${to}/${entry.name}`] = fs.readFileSync(path.join(at, entry.name), "utf8");
		}
	};
	walk(from, WIDGETS_AT);
	return found;
}

export const TASK_ROWS = ["To Do", "Doing", "Done"].flatMap((status, at) =>
	[1, 2].map((nth) => ({
		path: `Orbitask/Tasks/${status}-${nth}.md`,
		ref: { path: `Orbitask/Tasks/${status}-${nth}.md` },
		name: `${status} ${nth}`,
		props: { title: `${status} ${nth}`, status, order: at * 2 + nth },
		meta: { created: 1, modified: 2 },
		attachments: 0,
	})),
);

const STILL = ":is(*) { transition: none !important; animation: none !important; }";

export const THEMES = {
	light: `--background-primary:#ffffff;--background-secondary:#f6f6f6;--background-modifier-border:#e4e4e4;
		--background-modifier-hover:rgba(0,0,0,0.05);--text-normal:#222222;--text-muted:#707070;--text-faint:#a0a0a0;
		--text-on-accent:#ffffff;--text-error:#c0392b;--text-success:#1f8a4c;--interactive-accent:#6d4ee0;`,
	dark: `--background-primary:#1e1e1e;--background-secondary:#161616;--background-modifier-border:#333333;
		--background-modifier-hover:rgba(255,255,255,0.07);--text-normal:#dadada;--text-muted:#999999;--text-faint:#6b6b6b;
		--text-on-accent:#ffffff;--text-error:#e06c5f;--text-success:#4ec97f;--interactive-accent:#8b6cef;`,
};

// TRADE-OFF: the interface face is spelled out here because our own sheet asks for --font-interface by name; undefined, a page photographs itself in Times and the picture lies about everything in it
const HOST_TOKENS = `--font-interface: "Helvetica Neue", Helvetica, Arial, sans-serif;
	--font-text: "Helvetica Neue", Helvetica, Arial, sans-serif;
	--font-monospace: "SF Mono", Menlo, Consolas, monospace;
	font-family: var(--font-interface);
	--font-ui-smaller: 12px; --font-ui-small: 14px; --font-ui-medium: 16px; --font-semibold: 600;`;

// TRADE-OFF: a dialog's list scrolls on screen, but a photograph wants the whole of it
const WHOLE_SCROLL = ".wg-cat-scroll { overflow: visible !important; }";

const HARNESS_CHROME = `.harness-top { display: flex; align-items: baseline; gap: 10px; margin: 0 0 18px; }
.harness-top h1 { margin: 0; font-size: 19px; font-weight: 600; letter-spacing: -0.01em; }
.harness-top span { color: var(--text-muted); font-size: 13px; }
.harness-boom { color: #e04040; font: 12px ui-monospace, monospace; white-space: pre-wrap; }`;

export function shotPage({ theme, title, lead, body }) {
	return `<!doctype html><html><head><meta charset="utf-8">
<style>${readFileSync("styles.css", "utf8")}</style>
<style>
body { margin: 0; padding: 28px 32px; ${THEMES[theme]}
	background: var(--background-primary); color: var(--text-normal);
	${HOST_TOKENS} }
${WHOLE_SCROLL}
${HARNESS_CHROME}
</style></head><body class="wg-root theme-${theme}">
<div class="harness-top"><h1>${title}</h1><span>${lead}</span></div>
<div id="host"></div><pre id="boom" class="harness-boom"></pre><pre id="count" hidden></pre>
${body}
</body></html>`;
}

export function shoot(file, extra, { width, height }) {
	return execFileSync(
		findBrowser("shot"),
		[
			"--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=2",
			`--window-size=${width},${height}`, "--virtual-time-budget=12000", ...extra, `file://${file}`,
		],
		{ encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 },
	);
}

export async function bundleOf(entry) {
	const built = await esbuild.build({
		entryPoints: [entry],
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
	return built.outputFiles[0].text;
}

export async function stage({ board, files, steps, editing, rows }) {
	const bundle = await esbuild.build({
		entryPoints: ["tools/view-page.jsx"],
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

	const page = `<!doctype html><html><head><meta charset="utf-8">
<style>${readFileSync("styles.css", "utf8")}</style>
<style>body { margin: 0; background: #fff; color: #222; --background-primary: #fff; --background-secondary: #f6f6f6;
	--background-modifier-border: #e4e4e4; --text-normal: #222; --text-muted: #707070; --text-faint: #ababab;
	--text-on-accent: #fff; --interactive-accent: #6d4ee0; }
.wg-host { width: 1340px; }
${STILL}</style>
</head><body><div class="wg-host"></div>
<script id="wg-widgets" type="application/json">${JSON.stringify(files ?? widgetFiles())}</script>
<script id="wg-board" type="application/json">${JSON.stringify(board)}</script>
<script id="wg-rows" type="application/json">${JSON.stringify(rows ?? TASK_ROWS)}</script>
<script id="wg-measure" type="application/json"></script>
<script>window.wgSteps = ${JSON.stringify(steps ?? [])}; window.wgEditing = ${JSON.stringify(Boolean(editing))};</script>
<script>${bundle.outputFiles[0].text}</script>
</body></html>`;

	const work = mkdtempSync(path.join(tmpdir(), "wg-view-"));
	const file = path.join(work, "view.html");
	writeFileSync(file, page);
	const dom = execFileSync(
		findBrowser("view"),
		["--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", "--window-size=1440,960", "--virtual-time-budget=9000", "--dump-dom", `file://${file}`],
		{ encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", process.env.WG_DEBUG ? "inherit" : "ignore"] },
	);
	const found = /<script id="wg-measure" type="application\/json">([\s\S]*?)<\/script>/.exec(dom);
	if (!found || !found[1]) return { failure: "the page reported nothing", file };
	return { ...JSON.parse(found[1]), file };
}
