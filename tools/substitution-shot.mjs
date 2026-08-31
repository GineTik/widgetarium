// CONTEXT: the substitutions dialog draws its own preview from real widgets, so it is photographed
// the same way the catalogue is — compiled from what ships, not from a mock
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import esbuild from "esbuild";
import { buildMirror } from "./mirror.mjs";

buildMirror();
const { WIDGETS_DIR } = await import("./.mjs-cache/paths.mjs");

const CHROME = process.env.WG_CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const work = mkdtempSync(path.join(tmpdir(), "wg-sub-"));

function collect(from, into, prefix) {
	for (const entry of readdirSync(from)) {
		const full = path.join(from, entry);
		const key = `${prefix}/${entry}`;
		if (statSync(full).isDirectory()) collect(full, into, key);
		else if (/\.(json|jsx|js|css)$/.test(entry)) into[key] = readFileSync(full, "utf8");
	}
	return into;
}

const files = collect("widgets", {}, WIDGETS_DIR);

const bundle = await esbuild.build({
	entryPoints: ["tools/substitution-page.jsx"],
	bundle: true,
	write: false,
	format: "iife",
	platform: "browser",
	target: "es2020",
	jsxFactory: "h",
	jsxFragment: "Fragment",
	inject: ["tools/fill-inject.js"],
	alias: { widgetarium: "./tools/fill-shim.js", "widgetarium/kit": "./src/kit.js", obsidian: "./tools/obsidian-shim.js" },
	logLevel: "warning",
});

const THEMES = {
	light: `--background-primary:#ffffff;--background-secondary:#f6f6f6;--background-modifier-border:#e4e4e4;
		--background-modifier-hover:rgba(0,0,0,0.05);--text-normal:#222222;--text-muted:#707070;--text-faint:#a0a0a0;
		--text-on-accent:#ffffff;--text-error:#c0392b;--text-success:#1f8a4c;--interactive-accent:#6d4ee0;`,
	dark: `--background-primary:#1e1e1e;--background-secondary:#161616;--background-modifier-border:#333333;
		--background-modifier-hover:rgba(255,255,255,0.07);--text-normal:#dadada;--text-muted:#999999;--text-faint:#6b6b6b;
		--text-on-accent:#ffffff;--text-error:#e06c5f;--text-success:#4ec97f;--interactive-accent:#8b6cef;`,
};

for (const theme of ["light", "dark"]) {
	const page = `<!doctype html><html><head><meta charset="utf-8">
<style>${readFileSync("styles.css", "utf8")}</style>
<style>body { margin: 0; ${THEMES[theme]}
	--font-interface: "Helvetica Neue", Helvetica, Arial, sans-serif;
	--font-text: "Helvetica Neue", Helvetica, Arial, sans-serif;
	--font-monospace: "SF Mono", Menlo, Consolas, monospace;
	font-family: var(--font-interface); background: var(--background-secondary); }</style>
</head><body class="wg-root"><div id="host"></div>
<script>window.__FILES__=${JSON.stringify(files)};</script>
<script>${bundle.outputFiles[0].text}</script></body></html>`;

	const file = path.join(work, `${theme}.html`);
	writeFileSync(file, page);
	const out = path.resolve(`substitutions-${theme}.png`);
	execFileSync(
		CHROME,
		["--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=2",
			"--window-size=1280,820", "--virtual-time-budget=9000", `--screenshot=${out}`, `file://${file}`],
		{ encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
	);
	console.log(`${theme} -> ${out}`);
}
