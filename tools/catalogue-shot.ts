import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { WIDGETS_DIR } from "../packages/core/src/paths.js";
import { isObject } from "../packages/core/src/engine/is-object.js";
import { bundleOf, shoot, shotPage } from "./harness.ts";
import type { Theme } from "./harness.ts";
import { collectFiles } from "./registry-files.ts";

type Seen = Readonly<Record<string, unknown>>;
type CatalogueMode = "browse" | "place" | "fill";

const work = mkdtempSync(path.join(tmpdir(), "wg-cat-"));

const SOURCE = "registry";
const SIZE = { width: Number(process.env["WG_WIDTH"] ?? 1280), height: Number(process.env["WG_HEIGHT"] ?? 1240) };
const SLOT_TWO_SHIPPED_WIDGETS_SHARE = { parent: "@default/kanban-board", name: "card" };

const files = collectFiles(SOURCE, WIDGETS_DIR, /\.(json|tsx|ts|jsx|js|css)$/);

// TRADE-OFF: no shipped widget accepts more than the kanban's card slot gives, so a divider needs a probe
if (process.env["WG_MISFIT"]) {
	const folder = `${WIDGETS_DIR}/@task/estimate-card`;
	files[`${folder}/manifest.generated.json`] = JSON.stringify({
		id: "@task/estimate-card",
		title: "OrbiTask · Estimate card",
		defaultSize: { w: 4, h: 2 },
		preview: { size: { w: 4, h: 2 } },
		accepts: { task: { required: ["title", "estimate"] } },
	});
	files[`${folder}/widget.tsx`] = `import { createWidget } from "widgetarium";
export default createWidget({
	draw: function EstimateCard() {
		return <div className="orbi">3 days left</div>;
	},
});`;
}

if (process.env["WG_BREAK"]) {
	const folder = `${WIDGETS_DIR}/@task/throwing-probe`;
	files[`${folder}/manifest.generated.json`] = JSON.stringify({
		id: "@task/throwing-probe",
		title: "OrbiTask · Throwing probe",
		defaultSize: { w: 4, h: 2 },
		preview: { size: { w: 4, h: 2 } },
	});
	files[`${folder}/widget.tsx`] = `import { createWidget } from "widgetarium";
export default createWidget({
	draw: function Throwing() {
		throw new Error("this widget throws while drawing");
	},
});`;
}

const bundle = await bundleOf("tools/catalogue-page.tsx");

const SAID: Readonly<Record<CatalogueMode, readonly [string, string]>> = {
	browse: ["Widgets", "Every widget this vault can draw, shown as it really looks"],
	place: ["Add a widget", "Pick one and it lands on this board"],
	fill: ["Fill this slot", "Pick the widget this slot draws for every row"],
};

const isSaidMode = (mode: string): mode is CatalogueMode => Object.hasOwn(SAID, mode);

function pageFor(theme: Theme, mode: string): string {
	const [title, lead] = isSaidMode(mode) ? SAID[mode] : SAID.browse;
	return shotPage({
		theme,
		title,
		lead,
		body: `<script>window.__FILES__=${JSON.stringify(files)};window.__MODE__=${JSON.stringify(mode)};window.__SLOT__=${JSON.stringify(SLOT_TWO_SHIPPED_WIDGETS_SHARE)};window.__SHOTS_AT__=${JSON.stringify(`file://${path.resolve(SOURCE)}`)};window.__WIDGETS_DIR__=${JSON.stringify(WIDGETS_DIR)};</script>\n<script>${bundle}</script>`,
	});
}

function seenIn(dom: string): Seen {
	const counted = /<pre id="count"[^>]*>([\s\S]*?)<\/pre>/.exec(dom)?.[1] ?? "";
	const parsed: unknown = JSON.parse(counted.replace(/&quot;/g, '"') || "{}");
	return isObject(parsed) ? parsed : {};
}

const fieldOf = (value: unknown, field: string): unknown => (isObject(value) ? value[field] : undefined);

const listOf = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);

// TRADE-OFF: the installed/not badge was rejected, so one per card of name, foot and button and no badge anywhere
function wrongIn(theme: Theme, seen: Seen, failures: string): string[] {
	const { tiles, buttons } = seen;
	const shotThemes = listOf(seen["shotThemes"]);
	const fog = seen["fog"];
	const wrong: string[] = [];
	if (failures) wrong.push(`the page reported\n${failures}`);
	if (seen["shotsLoaded"] !== tiles || seen["shotsAsked"] !== tiles)
		wrong.push(
			`${String(seen["shotsLoaded"])} of ${String(seen["shotsAsked"])} shots loaded across ${String(tiles)} tiles`,
		);
	if (shotThemes.length !== 1 || shotThemes[0] !== `shot-${theme}.png`)
		wrong.push(`the cards drew ${JSON.stringify(seen["shotThemes"])}, wants only shot-${theme}.png`);
	if (!tiles) wrong.push("the board drew no tiles");
	if (tiles !== seen["captions"] || tiles !== seen["feet"] || tiles !== buttons || seen["badges"] !== 0)
		wrong.push(
			`${String(tiles)} tiles carry ${String(seen["captions"])} names, ${String(seen["feet"])} feet, ${String(buttons)} buttons and ${String(seen["badges"])} badges`,
		);
	if (seen["feetInsideAStage"])
		wrong.push(
			`${String(seen["feetInsideAStage"])} feet sit inside a stage, floating on the widget instead of below it`,
		);
	if (seen["shown"] !== 3) wrong.push(`the sidebar offers ${String(seen["shown"])} lists to narrow by, wants 3`);
	if (seen["cells"]) wrong.push(`${String(seen["cells"])} lattice cells are drawn, and none should be`);
	if (seen["fogged"] !== seen["live"])
		wrong.push(
			`${String(seen["fogged"])} of ${String(seen["live"])} widgets fade out at the foot, and every one should`,
		);
	if (!fieldOf(fog, "ends"))
		wrong.push(
			`the fog ends in ${String(fieldOf(fog, "said"))}, not in the stage's own ${String(fieldOf(fog, "ground"))}`,
		);
	if (seen["round"] !== buttons)
		wrong.push(`${String(seen["round"])} of ${String(buttons)} buttons are round — ${String(seen["radius"])}`);
	if (seen["serif"]) wrong.push(`the page is drawn in ${String(seen["serif"])}, which is not the interface face`);
	for (const row of listOf(seen["offGrid"]))
		wrong.push(
			`${String(fieldOf(row, "name"))} spans ${String(fieldOf(row, "drawn"))} of the lattice, wants ${String(fieldOf(row, "declared"))}`,
		);
	return wrong;
}

const asked = process.argv.slice(2).filter((word) => !word.startsWith("--"));
const mode = (process.argv.find((word) => word.startsWith("--mode=")) ?? "--mode=place").slice("--mode=".length);
const THEME_ORDER: readonly Theme[] = ["light", "dark"];

let broken = 0;
for (const [index, theme] of THEME_ORDER.entries()) {
	const out = path.resolve(asked[index] ?? `catalogue-${theme}.png`);
	const file = path.join(work, `${theme}.html`);
	writeFileSync(file, pageFor(theme, mode));

	shoot(file, [`--screenshot=${out}`], SIZE);
	const dom = shoot(file, ["--dump-dom"], SIZE);
	const failures = /<pre id="boom"[^>]*>([\s\S]*?)<\/pre>/.exec(dom)?.[1]?.trim() ?? "";
	const seen = seenIn(dom);
	const fog = seen["fog"];

	for (const wrong of wrongIn(theme, seen, failures)) {
		broken += 1;
		console.error(`${theme}: ${wrong}`);
	}
	console.log(
		`${theme}: ${String(seen["tiles"] ?? 0)} tiles, ${String(seen["live"] ?? 0)} drawn live, ` +
			`${String(seen["stands"] ?? 0)} stand-ins, ${String(seen["contained"] ?? 0)} contained, ${String(seen["buttons"] ?? 0)} buttons, ` +
			`fog ${String(fieldOf(fog, "tall") ?? "-")} to ${String(fieldOf(fog, "ground") ?? "-")}, ` +
			`${String(seen["lacks"] ?? 0)} short of the slot, ${String(seen["divides"] ?? 0)} dividers  ->  ${out}`,
	);
	if (process.env["WG_FIT"])
		for (const row of listOf(seen["over"]))
			console.log(
				`   ${String(fieldOf(row, "name")).padEnd(20)} span ${String(fieldOf(row, "span"))} at ${String(fieldOf(row, "at"))} box ${String(fieldOf(row, "box"))} wants ${String(fieldOf(row, "wants"))}`,
			);
}

process.exit(broken ? 1 : 0);
