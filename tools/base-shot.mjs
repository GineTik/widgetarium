import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import esbuild from "esbuild";
import { findBrowser, widgetFiles } from "./harness.mjs";
import { buildMirror } from "./mirror.mjs";
import { TEXT_LOADERS } from "../apps/obsidian/build.mjs";

buildMirror();
const { LAYOUT_NAMES, skeletonOf } = await import("./.mjs-cache/layouts.mjs");
const { normalizeBoard, serializeBoard } = await import("./.mjs-cache/model.mjs");

const asked = process.argv.slice(2).filter((said) => !said.startsWith("--"));
const names = asked.length > 0 ? asked : LAYOUT_NAMES;
const into = process.cwd();

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

const files = widgetFiles();
const work = mkdtempSync(path.join(tmpdir(), "wg-base-"));

for (const name of names) {
	const board = skeletonOf(name, (raw) => serializeBoard(normalizeBoard(raw)));
	if (!board) {
		console.log(`${name} is not a base`);
		continue;
	}
	const page = `<!doctype html><html><head><meta charset="utf-8">
<style>${readFileSync("apps/obsidian/styles.css", "utf8")}</style>
<style>body { margin: 0; background: #fff; color: #222; --background-primary: #fff; --background-secondary: #f6f6f6;
	--background-modifier-border: #e4e4e4; --text-normal: #222; --text-muted: #707070; --text-faint: #ababab;
	--text-on-accent: #fff; --interactive-accent: #6d4ee0; --font-ui-small: 14px; --font-ui-medium: 15px;
	--font-ui-smaller: 12px; }
.wg-host { width: 1400px; padding: 20px; }
</style>
</head><body><div class="wg-host"></div>
<script id="wg-widgets" type="application/json">${JSON.stringify(files)}</script>
<script id="wg-board" type="application/json">${JSON.stringify(board)}</script>
<script id="wg-rows" type="application/json">[]</script>
<script id="wg-measure" type="application/json"></script>
<script>window.wgSteps = []; window.wgEditing = false;</script>
<script>${bundle.outputFiles[0].text}</script>
</body></html>`;

	const file = path.join(work, `${name}.html`);
	writeFileSync(file, page);
	const shot = path.join(into, `base-${name}.png`);
	execFileSync(
		findBrowser("base-shot"),
		[
			"--headless",
			"--disable-gpu",
			"--no-sandbox",
			"--hide-scrollbars",
			"--window-size=1440,1600",
			"--virtual-time-budget=9000",
			...(process.env.WG_DOM ? ["--dump-dom"] : [`--screenshot=${shot}`]),
			`file://${file}`,
		],
		{
			encoding: "utf8",
			maxBuffer: 64 * 1024 * 1024,
			stdio: ["ignore", process.env.WG_DOM ? "inherit" : "ignore", "ignore"],
		},
	);
	console.log(`${name} → ${shot}`);
}
