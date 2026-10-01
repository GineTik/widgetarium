import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import esbuild from "esbuild";
import { isObject } from "../packages/core/src/engine/is-object.js";
import { LIB_FILES } from "../packages/core/src/engine/widget-build.js";
import type { Theme } from "./harness.ts";
import { TEXT_LOADERS } from "./text-loaders.ts";

const CHROME = process.env["WG_CHROME"] ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ID = process.argv[2];
const WIDTH = Number(process.argv[3] ?? 900);
const HEIGHT = Number(process.argv[4] ?? 260);

if (!ID) {
	console.error("usage: node tools/widget-shot.ts @scope/name [width] [height]");
	process.exit(1);
}

const SOURCE_LADDER_THE_REGISTRY_WALKS = ["widget.tsx", "widget.ts", "widget.jsx", "widget.js"];
const widgetFile = (at: string): string | undefined =>
	SOURCE_LADDER_THE_REGISTRY_WALKS.map((name) => path.join(at, name)).find((file) => fs.existsSync(file));

function recordAt(value: unknown, key: string): Readonly<Record<string, unknown>> {
	const held = isObject(value) ? value[key] : undefined;
	return isObject(held) ? held : {};
}

function listAt(value: unknown, key: string): readonly unknown[] {
	const held = isObject(value) ? value[key] : undefined;
	return Array.isArray(held) ? held : [];
}

const folder = path.join("registry", ID);
const manifest: unknown = JSON.parse(fs.readFileSync(path.join(folder, "manifest.json"), "utf8"));

const settingDefaults: Record<string, unknown> = {};
for (const field of listAt(manifest, "settings")) {
	if (isObject(field) && field["default"] !== undefined) settingDefaults[String(field["key"])] = field["default"];
}

const previewRowsTheCardDraws: Record<string, { readonly rows: unknown; readonly isLoading: false }> = {};
for (const [name, given] of Object.entries(recordAt(recordAt(manifest, "preview"), "sources")))
	previewRowsTheCardDraws[name] = { rows: (isObject(given) ? given["rows"] : undefined) ?? [], isLoading: false };

const aliasEveryScopeLib: Record<string, string> = {
	widgetarium: "./tools/fill-shim.ts",
	"widgetarium/kit": "./packages/kit/src/index.ts",
};
for (const scope of fs.readdirSync("registry").filter((name) => name.startsWith("@"))) {
	const lib = LIB_FILES.map((name) => path.join("registry", scope, name)).find((at) => fs.existsSync(at));
	if (lib) aliasEveryScopeLib[`${scope}/lib`] = `./${lib}`;
}

const fedSlotsFromManifestDefaults = Object.entries(recordAt(manifest, "slots"));
const slotImports = fedSlotsFromManifestDefaults
	.map(
		([, spec], at) =>
			`import Slot${at} from "./${widgetFile(path.join("registry", String(isObject(spec) ? spec["default"] : undefined)))}";`,
	)
	.join("\n");
const slotMap = `{ ${fedSlotsFromManifestDefaults.map(([name], at) => `${name}: Slot${at}`).join(", ")} }`;

const PAGE = `
import { createElement as h } from "react";
import { render } from "./packages/core/src/engine/render.js";
import Widget from "./${widgetFile(folder)}";
${slotImports}

const settings = ${JSON.stringify(settingDefaults)};
const data = ${JSON.stringify(previewRowsTheCardDraws)};
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
	loader: TEXT_LOADERS,
	write: false,
	format: "iife",
	platform: "browser",
	target: "es2020",
	jsxFactory: "h",
	jsxFragment: "Fragment",
	inject: ["tools/fill-inject.ts"],
	alias: aliasEveryScopeLib,
	logLevel: "warning",
});

const THEMES: Readonly<Record<Theme, string>> = {
	light: `--background-primary:#ffffff;--background-secondary:#f6f6f6;--background-modifier-border:#e4e4e4;
		--background-modifier-hover:rgba(0,0,0,0.05);--text-normal:#222222;--text-muted:#707070;--text-faint:#a0a0a0;
		--text-on-accent:#ffffff;--text-error:#c0392b;--text-success:#1f8a4c;--interactive-accent:#6d4ee0;`,
	dark: `--background-primary:#1e1e1e;--background-secondary:#161616;--background-modifier-border:#333333;
		--background-modifier-hover:rgba(255,255,255,0.07);--text-normal:#dadada;--text-muted:#999999;--text-faint:#6b6b6b;
		--text-on-accent:#ffffff;--text-error:#e06c5f;--text-success:#4ec97f;--interactive-accent:#8b6cef;`,
};
const THEME_ORDER: readonly Theme[] = ["light", "dark"];

const scopeSheet = path.join("registry", ID.split("/")[0] ?? "", "tokens.css");
const work = mkdtempSync(path.join(tmpdir(), "wg-shot-"));
const slug = ID.replace("@", "").replace("/", "-");
const bundled = bundle.outputFiles[0]?.text ?? "";

for (const theme of THEME_ORDER) {
	const page = `<!doctype html><html><head><meta charset="utf-8">
<style>${fs.readFileSync("apps/obsidian/styles.css", "utf8")}</style>
${fs.existsSync(scopeSheet) ? `<style>${fs.readFileSync(scopeSheet, "utf8")}</style>` : ""}
<style>body { margin: 0; ${THEMES[theme]}
	--font-interface: "Helvetica Neue", Helvetica, Arial, sans-serif;
	--font-text: "Helvetica Neue", Helvetica, Arial, sans-serif;
	font-family: var(--font-interface); background: var(--background-primary); }
.wg-root { width: ${WIDTH}px; }</style>
</head><body><div class="wg-root"></div>
<script>window.__err = ""; addEventListener("error", (e) => { window.__err += e.message; });</script>
<script>${bundled}</script></body></html>`;

	const file = path.join(work, `${theme}.html`);
	fs.writeFileSync(file, page);
	const out = path.resolve("export", `${slug}-${theme}.png`);
	fs.mkdirSync(path.dirname(out), { recursive: true });
	execFileSync(
		CHROME,
		[
			"--headless",
			"--disable-gpu",
			"--no-sandbox",
			"--hide-scrollbars",
			"--force-device-scale-factor=2",
			`--window-size=${WIDTH + 48},${HEIGHT + 48}`,
			"--virtual-time-budget=4000",
			`--screenshot=${out}`,
			`file://${file}`,
		],
		{ encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
	);
	console.log(`${theme} -> ${out}`);
}
