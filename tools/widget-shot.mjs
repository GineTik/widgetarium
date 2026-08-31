import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import esbuild from "esbuild";

const CHROME = process.env.WG_CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ID = process.argv[2];
const WIDTH = Number(process.argv[3] ?? 900);
const HEIGHT = Number(process.argv[4] ?? 260);

if (!ID) {
	console.error("usage: node tools/widget-shot.mjs @scope/name [width] [height]");
	process.exit(1);
}

const folder = path.join("widgets", ID);
const manifest = JSON.parse(fs.readFileSync(path.join(folder, "manifest.json"), "utf8"));

const settings = {};
for (const field of manifest.settings ?? []) if (field.default !== undefined) settings[field.key] = field.default;

// CONTEXT: the manifest's own preview rows — the same sample the catalogue card draws from
const data = {};
for (const [name, given] of Object.entries(manifest.preview?.sources ?? {})) data[name] = { rows: given.rows ?? [], isLoading: false };

// CONTEXT: the board paints nothing behind a tile — WidgetRoot's own fill is the whole surface
// CONTEXT: a lib is reached by its scope name, so every scope that has one becomes an alias
const alias = { widgetarium: "./tools/fill-shim.js", "widgetarium/kit": "./src/kit.js" };
for (const scope of fs.readdirSync("widgets").filter((name) => name.startsWith("@"))) {
	const lib = path.join("widgets", scope, "lib.js");
	if (fs.existsSync(lib)) alias[`${scope}/lib`] = `./${lib}`;
}

// CONTEXT: a fed slot is what the board fills from the manifest default — a shot without it draws a hole
const slots = Object.entries(manifest.slots ?? {});
const slotImports = slots.map(([name, spec], at) => `import Slot${at} from "./widgets/${spec.default}/widget.jsx";`).join("\n");
const slotMap = `{ ${slots.map(([name], at) => `${name}: Slot${at}`).join(", ")} }`;

const PAGE = `
import { createElement as h } from "react";
import { render } from "./src/engine/render.js";
import Widget from "./${folder}/widget.jsx";
${slotImports}

const settings = ${JSON.stringify(settings)};
const data = ${JSON.stringify(data)};
const navigator = { canNavigate: false, resolve: () => null, navigate: () => false };
const host = { platform: "shot", can: {}, ui: { notify() {}, renderMarkdown() {} } };

render(
	h(Widget, { settings, data, navigator, host, slots: ${slotMap}, actions: {}, size: { w: 13, h: 3, scale: 1 }, context: { get: () => undefined, set: () => {} } }),
	document.querySelector(".wg-root"),
);
`;

const bundle = await esbuild.build({
	stdin: { contents: PAGE, resolveDir: process.cwd(), sourcefile: "shot.jsx", loader: "jsx" },
	bundle: true,
	write: false,
	format: "iife",
	platform: "browser",
	target: "es2020",
	jsxFactory: "h",
	jsxFragment: "Fragment",
	inject: ["tools/fill-inject.js"],
	alias,
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

const scopeSheet = path.join("widgets", ID.split("/")[0], "tokens.css");
const work = mkdtempSync(path.join(tmpdir(), "wg-shot-"));
const slug = ID.replace("@", "").replace("/", "-");

for (const theme of ["light", "dark"]) {
	const page = `<!doctype html><html><head><meta charset="utf-8">
<style>${fs.readFileSync("styles.css", "utf8")}</style>
${fs.existsSync(scopeSheet) ? `<style>${fs.readFileSync(scopeSheet, "utf8")}</style>` : ""}
<style>body { margin: 0; ${THEMES[theme]}
	--font-interface: "Helvetica Neue", Helvetica, Arial, sans-serif;
	--font-text: "Helvetica Neue", Helvetica, Arial, sans-serif;
	font-family: var(--font-interface); background: var(--background-primary); }
.wg-root { width: ${WIDTH}px; }</style>
</head><body><div class="wg-root"></div>
<script>window.__err = ""; addEventListener("error", (e) => { window.__err += e.message; });</script>
<script>${bundle.outputFiles[0].text}</script></body></html>`;

	const file = path.join(work, `${theme}.html`);
	fs.writeFileSync(file, page);
	const out = path.resolve("export", `${slug}-${theme}.png`);
	fs.mkdirSync(path.dirname(out), { recursive: true });
	execFileSync(
		CHROME,
		["--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=2",
			`--window-size=${WIDTH + 48},${HEIGHT + 48}`, "--virtual-time-budget=4000", `--screenshot=${out}`, `file://${file}`],
		{ encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
	);
	console.log(`${theme} -> ${out}`);
}
