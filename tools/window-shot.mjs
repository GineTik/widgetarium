// a one-off: the same page the window gate measures, captured so a person can look at it
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import esbuild from "esbuild";
import { TEXT_LOADERS } from "../build.mjs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const work = mkdtempSync(path.join(tmpdir(), "wg-shot-"));
const bundle = await esbuild.build({
	entryPoints: ["tools/window-page.jsx"],
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
const source = readFileSync("tools/window-test.mjs", "utf8");
const head = source.slice(
	source.indexOf("const page = `") + "const page = `".length,
	source.indexOf("</html>`") + "</html>".length,
);
const html = head
	.replace('${readFileSync("styles.css", "utf8")}', readFileSync("styles.css", "utf8"))
	.replace("${bundle.outputFiles[0].text}", bundle.outputFiles[0].text);
// CONTEXT: the gate's own page is authored light, so dark is the same page with the tokens swapped
const DARK = `body { background: #1e1e1e; color: #dadada;
	--background-primary: #1e1e1e; --background-secondary: #161616; --background-modifier-border: #333333;
	--background-modifier-hover: rgba(255,255,255,0.07); --text-normal: #dadada; --text-muted: #999999; --text-faint: #6b6b6b;
	--text-on-accent: #ffffff; --text-error: #e06c5f; --text-success: #4ec97f; --interactive-accent: #8b6cef;
	--interactive-accent-hover: #7a5cdd; --color-orange: #d9822b; }`;

for (const theme of ["light", "dark"]) {
	const file = path.join(work, `${theme}.html`);
	writeFileSync(file, theme === "dark" ? html.replace("</head>", `<style>${DARK}</style></head>`) : html);
	const out = path.resolve(process.argv[2] ?? `window-${theme}.png`);
	execFileSync(
		CHROME,
		[
			"--headless",
			"--disable-gpu",
			"--no-sandbox",
			"--hide-scrollbars",
			"--window-size=1440,960",
			"--virtual-time-budget=9000",
			`--screenshot=${out}`,
			`file://${file}`,
		],
		{ stdio: "ignore" },
	);
	console.log(`${theme} -> ${out}`);
}
