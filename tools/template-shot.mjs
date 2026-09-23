import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { bundleOf, shoot, shotPage } from "./harness.mjs";
import { buildMirror } from "./mirror.mjs";

buildMirror();
const { TEMPLATES, templateWidgets } = await import("./.mjs-cache/templates.mjs");

const SIZE = { width: Number(process.env.WG_WIDTH ?? 1080), height: Number(process.env.WG_HEIGHT ?? 720) };
const work = mkdtempSync(path.join(tmpdir(), "wg-tpl-"));

const titles = {};
for (const template of TEMPLATES) {
	for (const id of templateWidgets(template)) {
		titles[id] = JSON.parse(readFileSync(`registry/${id}/manifest.json`, "utf8")).title;
	}
}

const bundle = await bundleOf("tools/template-page.jsx");

function pageFor(theme) {
	return shotPage({
		theme,
		title: "Widgets",
		lead: "Every widget installed in this vault, drawn as it really looks",
		body: `<script>window.__TITLES__=${JSON.stringify(titles)};</script>\n<script>${bundle}</script>`,
	});
}

function reportOn(theme, seen, failures) {
	const wrong = [];
	if (failures) wrong.push(`the page reported\n${failures}`);
	if (seen.cards !== TEMPLATES.length) wrong.push(`${seen.cards} cards drawn, wants ${TEMPLATES.length}`);
	if (seen.shelf?.join(",") !== "Widgets,Templates")
		wrong.push(`the head offers ${seen.shelf?.join(", ")} to switch between`);
	if (seen.narrowers !== 0) wrong.push(`${seen.narrowers} widget narrowers are still drawn over the templates`);
	if (seen.clipped?.length) wrong.push(`${seen.clipped.length} labels are cut off — ${seen.clipped.join(", ")}`);
	if (seen.rows?.some((tall) => tall < 22))
		wrong.push(`a row of the sketch is drawn ${Math.min(...seen.rows)}px tall, under its own floor`);
	if (seen.buttonGap === null || seen.buttonGap > 2)
		wrong.push(`the create button stops ${seen.buttonGap}px short of the card's edge, so it sits beside the name`);
	for (const said of wrong) console.error(`${theme}: ${said}`);
	return wrong.length;
}

const asked = process.argv.slice(2).filter((word) => !word.startsWith("--"));
let broken = 0;
for (const [index, theme] of ["light", "dark"].entries()) {
	const out = path.resolve(asked[index] ?? `templates-${theme}.png`);
	const file = path.join(work, `${theme}.html`);
	writeFileSync(file, pageFor(theme));

	shoot(file, [`--screenshot=${out}`], SIZE);
	const dom = shoot(file, ["--dump-dom"], SIZE);
	const failures = /<pre id="boom"[^>]*>([\s\S]*?)<\/pre>/.exec(dom)?.[1]?.trim() ?? "";
	const seen = JSON.parse(
		(/<pre id="count"[^>]*>([\s\S]*?)<\/pre>/.exec(dom)?.[1] ?? "").replace(/&quot;/g, '"') || "{}",
	);

	broken += reportOn(theme, seen, failures);
	console.log(
		`${theme}: ${seen.cards} cards, regions ${seen.regions?.join("/")}, rows ${seen.rows?.join("/")}, ${seen.buttonGap}px of foot right of the create button, labels ${seen.labels?.join(" | ")}  ->  ${out}`,
	);
}

process.exit(broken === 0 ? 0 : 1);
