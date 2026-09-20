// CONTEXT: a design is looked at, not read — this draws the real widgets and photographs them
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { bundleOf, shoot, shotPage } from "./harness.mjs";
import { buildMirror } from "./mirror.mjs";

buildMirror();
const { WIDGETS_DIR } = await import("./.mjs-cache/paths.mjs");

const work = mkdtempSync(path.join(tmpdir(), "wg-cat-"));

const SOURCE = "widgets";
const SIZE = { width: Number(process.env.WG_WIDTH ?? 1280), height: Number(process.env.WG_HEIGHT ?? 1240) };
// the only slot two shipped widgets actually share, so fill mode is photographed against real data
const SLOT = { parent: "@default/kanban-board", name: "card" };

function collect(from, into, prefix) {
	for (const entry of readdirSync(from)) {
		const full = path.join(from, entry);
		const key = `${prefix}/${entry}`;
		if (statSync(full).isDirectory()) collect(full, into, key);
		else if (/\.(json|tsx|ts|jsx|js|css)$/.test(entry)) into[key] = readFileSync(full, "utf8");
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

const bundle = await bundleOf("tools/catalogue-page.jsx");

const SAID = {
	browse: ["Widgets", "Every widget this vault can draw, shown as it really looks"],
	place: ["Add a widget", "Pick one and it lands on this board"],
	fill: ["Fill this slot", "Pick the widget this slot draws for every row"],
};

function pageFor(theme, mode) {
	const [title, lead] = SAID[mode] ?? SAID.browse;
	return shotPage({
		theme,
		title,
		lead,
		body: `<script>window.__FILES__=${JSON.stringify(files)};window.__MODE__=${JSON.stringify(mode)};window.__SLOT__=${JSON.stringify(SLOT)};window.__SHOTS_AT__=${JSON.stringify(`file://${path.resolve(SOURCE)}`)};window.__WIDGETS_DIR__=${JSON.stringify(WIDGETS_DIR)};</script>\n<script>${bundle}</script>`,
	});
}

const asked = process.argv.slice(2).filter((word) => !word.startsWith("--"));
const mode = (process.argv.find((word) => word.startsWith("--mode=")) ?? "--mode=place").slice("--mode=".length);

let broken = 0;
for (const [index, theme] of ["light", "dark"].entries()) {
	const out = path.resolve(asked[index] ?? `catalogue-${theme}.png`);
	const file = path.join(work, `${theme}.html`);
	writeFileSync(file, pageFor(theme, mode));

	shoot(file, [`--screenshot=${out}`], SIZE);
	const dom = shoot(file, ["--dump-dom"], SIZE);
	const failures = /<pre id="boom"[^>]*>([\s\S]*?)<\/pre>/.exec(dom)?.[1]?.trim() ?? "";
	const counted = /<pre id="count"[^>]*>([\s\S]*?)<\/pre>/.exec(dom)?.[1] ?? "";
	const seen = JSON.parse(counted.replace(/&quot;/g, '"') || "{}");

	if (failures) {
		broken += 1;
		console.error(`${theme}: the page reported\n${failures}`);
	}
	if (seen.shotsLoaded !== seen.tiles || seen.shotsAsked !== seen.tiles) {
		broken += 1;
		console.error(`${theme}: ${seen.shotsLoaded} of ${seen.shotsAsked} shots loaded across ${seen.tiles} tiles`);
	}
	if (seen.shotThemes?.length !== 1 || seen.shotThemes[0] !== `shot-${theme}.png`) {
		broken += 1;
		console.error(`${theme}: the cards drew ${JSON.stringify(seen.shotThemes)}, wants only shot-${theme}.png`);
	}
	if (!seen.tiles) {
		broken += 1;
		console.error(`${theme}: the board drew no tiles`);
	}
	// ONE FOOT AND ONE BUTTON PER CARD, and no badge anywhere: the installed/not distinction was
	// rejected, so a photograph showing one is the failure this catches.
	if (seen.tiles !== seen.captions || seen.tiles !== seen.feet || seen.tiles !== seen.buttons || seen.badges !== 0) {
		broken += 1;
		console.error(
			`${theme}: ${seen.tiles} tiles carry ${seen.captions} names, ${seen.feet} feet, ${seen.buttons} buttons and ${seen.badges} badges`,
		);
	}
	if (seen.floating) {
		broken += 1;
		console.error(`${theme}: ${seen.floating} feet sit inside a stage, floating on the widget instead of below it`);
	}
	if (seen.shown !== 3) {
		broken += 1;
		console.error(`${theme}: the sidebar offers ${seen.shown} lists to narrow by, wants 3`);
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
	if (process.env.WG_FIT)
		for (const row of seen.over ?? [])
			console.log(`   ${row.name.padEnd(20)} span ${row.span} at ${row.at} box ${row.box} wants ${row.wants}`);
}

process.exit(broken ? 1 : 0);
