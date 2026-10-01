import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { TEMPLATES, templateWidgets } from "../packages/core/src/templates.js";
import { isObject } from "../packages/core/src/engine/is-object.js";
import { bundleOf, shoot, shotPage } from "./harness.ts";
import type { Theme } from "./harness.ts";

type Seen = Readonly<Record<string, unknown>>;

const SIZE = { width: Number(process.env["WG_WIDTH"] ?? 1080), height: Number(process.env["WG_HEIGHT"] ?? 720) };
const work = mkdtempSync(path.join(tmpdir(), "wg-tpl-"));
const THEME_ORDER: readonly Theme[] = ["light", "dark"];
const ROW_FLOOR_PX = 22;

function titleOf(id: string): unknown {
	const card: unknown = JSON.parse(readFileSync(`registry/${id}/manifest.generated.json`, "utf8"));
	return isObject(card) ? card["title"] : undefined;
}

const titles: Record<string, unknown> = {};
for (const template of TEMPLATES) {
	for (const id of templateWidgets(template)) titles[id] = titleOf(id);
}

const bundle = await bundleOf("tools/template-page.tsx");

function pageFor(theme: Theme): string {
	return shotPage({
		theme,
		title: "Widgets",
		lead: "Every widget installed in this vault, drawn as it really looks",
		body: `<script>window.__TITLES__=${JSON.stringify(titles)};</script>\n<script>${bundle}</script>`,
	});
}

function seenIn(dom: string): Seen {
	const counted = /<pre id="count"[^>]*>([\s\S]*?)<\/pre>/.exec(dom)?.[1] ?? "";
	const parsed: unknown = JSON.parse(counted.replace(/&quot;/g, '"') || "{}");
	return isObject(parsed) ? parsed : {};
}

const numbersIn = (value: unknown): number[] =>
	Array.isArray(value) ? value.filter((item): item is number => typeof item === "number") : [];

const joined = (value: unknown, by: string): string | undefined => (Array.isArray(value) ? value.join(by) : undefined);

function reportOn(theme: Theme, seen: Seen, failures: string): number {
	const wrong: string[] = [];
	const clipped = seen["clipped"];
	const rows = numbersIn(seen["rows"]);
	const buttonGap = seen["buttonGap"];
	if (failures) wrong.push(`the page reported\n${failures}`);
	if (seen["cards"] !== TEMPLATES.length) wrong.push(`${String(seen["cards"])} cards drawn, wants ${TEMPLATES.length}`);
	if (joined(seen["shelf"], ",") !== "Widgets,Templates")
		wrong.push(`the head offers ${String(joined(seen["shelf"], ", "))} to switch between`);
	if (seen["narrowers"] !== 0)
		wrong.push(`${String(seen["narrowers"])} widget narrowers are still drawn over the templates`);
	if (Array.isArray(clipped) && clipped.length)
		wrong.push(`${clipped.length} labels are cut off — ${clipped.join(", ")}`);
	if (rows.some((tall) => tall < ROW_FLOOR_PX))
		wrong.push(`a row of the sketch is drawn ${Math.min(...rows)}px tall, under its own floor`);
	if (buttonGap === null || (typeof buttonGap === "number" && buttonGap > 2))
		wrong.push(`the create button stops ${String(buttonGap)}px short of the card's edge, so it sits beside the name`);
	for (const said of wrong) console.error(`${theme}: ${said}`);
	return wrong.length;
}

const asked = process.argv.slice(2).filter((word) => !word.startsWith("--"));
let broken = 0;
for (const [index, theme] of THEME_ORDER.entries()) {
	const out = path.resolve(asked[index] ?? `templates-${theme}.png`);
	const file = path.join(work, `${theme}.html`);
	writeFileSync(file, pageFor(theme));

	shoot(file, [`--screenshot=${out}`], SIZE);
	const dom = shoot(file, ["--dump-dom"], SIZE);
	const failures = /<pre id="boom"[^>]*>([\s\S]*?)<\/pre>/.exec(dom)?.[1]?.trim() ?? "";
	const seen = seenIn(dom);

	broken += reportOn(theme, seen, failures);
	console.log(
		`${theme}: ${String(seen["cards"])} cards, regions ${String(joined(seen["regions"], "/"))}, rows ${String(joined(seen["rows"], "/"))}, ${String(seen["buttonGap"])}px of foot right of the create button, labels ${String(joined(seen["labels"], " | "))}  ->  ${out}`,
	);
}

process.exit(broken === 0 ? 0 : 1);
