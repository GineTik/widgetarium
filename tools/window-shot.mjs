// a one-off: the same page the window gate measures, captured so a person can look at it
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import esbuild from "esbuild";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const work = mkdtempSync(path.join(tmpdir(), "wg-shot-"));
const bundle = await esbuild.build({
	entryPoints: ["tools/window-page.jsx"],
	bundle: true, write: false, format: "iife", platform: "browser", target: "es2020",
	jsxFactory: "h", jsxFragment: "Fragment", logLevel: "warning",
});
const source = readFileSync("tools/window-test.mjs", "utf8");
const head = source.slice(source.indexOf("const page = `") + "const page = `".length, source.indexOf("</html>`") + "</html>".length);
const html = head
	.replace("${readFileSync(\"styles.css\", \"utf8\")}", readFileSync("styles.css", "utf8"))
	.replace("${bundle.outputFiles[0].text}", bundle.outputFiles[0].text);
const file = path.join(work, "page.html");
writeFileSync(file, html);
const out = process.argv[2] ?? "window-shot.png";
execFileSync(CHROME, ["--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
	"--window-size=1440,960", "--virtual-time-budget=9000", `--screenshot=${path.resolve(out)}`, `file://${file}`],
	{ stdio: "ignore" });
console.log(`shot: ${path.resolve(out)}`);
