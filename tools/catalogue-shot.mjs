// CONTEXT: a design is looked at, not read — this draws the real widgets and photographs them
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import esbuild from "esbuild";
import { buildMirror } from "./mirror.mjs";

buildMirror();
const { WIDGETS_DIR } = await import("./.mjs-cache/paths.mjs");

const CHROME = process.env.WG_CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const work = mkdtempSync(path.join(tmpdir(), "wg-cat-"));

const SOURCE = "widgets";
const WIDTH = Number(process.env.WG_WIDTH ?? 1280);
// the only slot two shipped widgets actually share, so fill mode is photographed against real data
const SLOT = { parent: "@task/kanban-board", name: "card" };
const HEIGHT = Number(process.env.WG_HEIGHT ?? 1240);

function collect(from, into, prefix) {
	for (const entry of readdirSync(from)) {
		const full = path.join(from, entry);
		const key = `${prefix}/${entry}`;
		if (statSync(full).isDirectory()) collect(full, into, key);
		else if (/\.(json|jsx|js|css)$/.test(entry)) into[key] = readFileSync(full, "utf8");
	}
	return into;
}

const files = collect(SOURCE, {}, WIDGETS_DIR);

// CONTEXT: a divider nobody crossed is a divider nobody has — no shipped widget declares an
// `accepts` the kanban's card slot cannot satisfy, so the ranked half of the picture needs a probe
if (process.env.WG_MISFIT) {
	const folder = `${WIDGETS_DIR}/@task/estimate-card`;
	files[`${folder}/manifest.json`] = JSON.stringify({
		id: "@task/estimate-card",
		title: "OrbiTask \u00b7 Estimate card",
		defaultSize: { w: 4, h: 2 },
		preview: { size: { w: 4, h: 2 } },
		accepts: { task: { required: ["title", "estimate"] } },
	});
	files[`${folder}/widget.jsx`] = `import { createWidget, WidgetRoot } from "widgetarium";
export default createWidget(function EstimateCard() {
	return <WidgetRoot className="orbi">3 days left</WidgetRoot>;
});`;
}

// CONTEXT: a containment nobody triggered is a containment nobody has
if (process.env.WG_BREAK) {
	const folder = `${WIDGETS_DIR}/@task/throwing-probe`;
	files[`${folder}/manifest.json`] = JSON.stringify({
		id: "@task/throwing-probe",
		title: "OrbiTask \u00b7 Throwing probe",
		defaultSize: { w: 4, h: 2 },
		preview: { size: { w: 4, h: 2 } },
	});
	files[`${folder}/widget.jsx`] = `import { createWidget } from "widgetarium";
export default createWidget(function Throwing() {
	throw new Error("this widget throws while drawing");
});`;
}

const bundle = await esbuild.build({
	entryPoints: ["tools/catalogue-page.jsx"],
	bundle: true,
	write: false,
	format: "iife",
	platform: "browser",
	target: "es2020",
	jsxFactory: "h",
	jsxFragment: "Fragment",
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

// CONTEXT: the harness draws the dialog's own words so the photograph is of the real surface
const SAID = {
	browse: ["Widgets", "Every widget installed in this vault, drawn as it really looks"],
	place: ["Add a widget", "Pick one and it lands on this board"],
	fill: ["Fill this slot", "Pick the widget this slot draws for every row"],
};

function pageFor(theme, mode) {
	return `<!doctype html><html><head><meta charset="utf-8">
<style>${readFileSync("styles.css", "utf8")}</style>
<style>
body { margin: 0; padding: 28px 32px; ${THEMES[theme]}
	background: var(--background-primary); color: var(--text-normal);
	/* THE HOST'S TOKENS, because our own sheet asks for them by name. The wg-root class sets
	   font-family from var(--font-interface); undefined, that declaration is invalid, and a
	   class selector still outranks the element one here — so the page inherited the browser
	   default and photographed itself in Times. Obsidian defines these; a harness that does
	   not is a harness that lies. */
	--font-interface: "Helvetica Neue", Helvetica, Arial, sans-serif;
	--font-text: "Helvetica Neue", Helvetica, Arial, sans-serif;
	--font-monospace: "SF Mono", Menlo, Consolas, monospace;
	font-family: var(--font-interface);
	--font-ui-smaller: 12px; --font-ui-small: 14px; --font-ui-medium: 16px; --font-semibold: 600; }
/* CONTEXT: the board scrolls inside a dialog, but a photograph wants the whole of it */
.wg-cat-scroll { overflow: visible !important; }
.harness-top { display: flex; align-items: baseline; gap: 10px; margin: 0 0 18px; }
.harness-top h1 { margin: 0; font-size: 19px; font-weight: 600; letter-spacing: -0.01em; }
.harness-top span { color: var(--text-muted); font-size: 13px; }
.harness-boom { color: #e04040; font: 12px ui-monospace, monospace; white-space: pre-wrap; }
</style></head><body class="wg-root">
<div class="harness-top"><h1>${SAID[mode]?.[0] ?? SAID.browse[0]}</h1><span>${SAID[mode]?.[1] ?? SAID.browse[1]}</span></div>
<div id="host"></div><pre id="boom" class="harness-boom"></pre><pre id="count" hidden></pre>
<script>window.__FILES__=${JSON.stringify(files)};window.__MODE__=${JSON.stringify(mode)};window.__SLOT__=${JSON.stringify(SLOT)};</script>
<script>${bundle.outputFiles[0].text}</script>
</body></html>`;
}

function chrome(file, extra) {
	return execFileSync(
		CHROME,
		[
			"--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=2",
			`--window-size=${WIDTH},${HEIGHT}`, "--virtual-time-budget=12000", ...extra, `file://${file}`,
		],
		{ encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
	);
}

const asked = process.argv.slice(2).filter((word) => !word.startsWith("--"));
const mode = (process.argv.find((word) => word.startsWith("--mode=")) ?? "--mode=place").slice("--mode=".length);

let broken = 0;
for (const [index, theme] of ["light", "dark"].entries()) {
	const out = path.resolve(asked[index] ?? `catalogue-${theme}.png`);
	const file = path.join(work, `${theme}.html`);
	writeFileSync(file, pageFor(theme, mode));

	chrome(file, [`--screenshot=${out}`]);
	const dom = chrome(file, ["--dump-dom"]);
	const failures = /<pre id="boom"[^>]*>([\s\S]*?)<\/pre>/.exec(dom)?.[1]?.trim() ?? "";
	const counted = /<pre id="count"[^>]*>([\s\S]*?)<\/pre>/.exec(dom)?.[1] ?? "";
	const seen = JSON.parse(counted.replace(/&quot;/g, '"') || "{}");

	if (failures) {
		broken += 1;
		console.error(`${theme}: the page reported\n${failures}`);
	}
	if (!seen.tiles) {
		broken += 1;
		console.error(`${theme}: the board drew no tiles`);
	}
	// ONE FOOT AND ONE BUTTON PER CARD, and no badge anywhere: the installed/not distinction was
	// rejected, so a photograph showing one is the failure this catches.
	if (seen.tiles !== seen.captions || seen.tiles !== seen.feet || seen.tiles !== seen.buttons || seen.badges !== 0) {
		broken += 1;
		console.error(`${theme}: ${seen.tiles} tiles carry ${seen.captions} names, ${seen.feet} feet, ${seen.buttons} buttons and ${seen.badges} badges`);
	}
	if (seen.floating) {
		broken += 1;
		console.error(`${theme}: ${seen.floating} feet sit inside a stage, floating on the widget instead of below it`);
	}
	if (seen.shown !== 2) {
		broken += 1;
		console.error(`${theme}: the header offers ${seen.shown} lists to switch between, wants 2`);
	}
	if (seen.cells) {
		broken += 1;
		console.error(`${theme}: ${seen.cells} lattice cells are drawn, and none should be`);
	}
	if (seen.fogged !== seen.live) {
		broken += 1;
		console.error(`${theme}: ${seen.fogged} of ${seen.live} widgets fade out at the foot, and every one should`);
	}
	if (!seen.fog?.ends) {
		broken += 1;
		console.error(`${theme}: the fog ends in ${seen.fog?.said}, not in the stage's own ${seen.fog?.ground}`);
	}
	if (seen.round !== seen.buttons) {
		broken += 1;
		console.error(`${theme}: ${seen.round} of ${seen.buttons} buttons are round — ${seen.radius}`);
	}
	if (seen.serif) {
		broken += 1;
		console.error(`${theme}: the page is drawn in ${seen.serif}, which is not the interface face`);
	}
	for (const row of seen.offGrid ?? []) {
		broken += 1;
		console.error(`${theme}: ${row.name} spans ${row.drawn} of the lattice, wants ${row.declared}`);
	}
	console.log(
		`${theme}: ${seen.tiles ?? 0} tiles, ${seen.live ?? 0} drawn live, ` +
			`${seen.stands ?? 0} stand-ins, ${seen.contained ?? 0} contained, ${seen.buttons ?? 0} buttons, ` +
			`fog ${seen.fog?.tall ?? "-"} to ${seen.fog?.ground ?? "-"}, ` +
			`${seen.lacks ?? 0} short of the slot, ${seen.divides ?? 0} dividers  ->  ${out}`,
	);
	if (process.env.WG_FIT) for (const row of seen.over ?? []) console.log(`   ${row.name.padEnd(20)} span ${row.span} at ${row.at} box ${row.box} wants ${row.wants}`);
}

process.exit(broken ? 1 : 0);
