import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { buildMirror } from "./mirror.mjs";

buildMirror();

const { GRID } = await import("./.mjs-cache/paths.mjs");

const ROOT = "widgets";
const widthOf = (cells) => cells * GRID.cellPx + (cells - 1) * GRID.gapPx;

function sourcesUnder(at, into = []) {
	for (const name of readdirSync(at)) {
		const full = path.join(at, name);
		if (!statSync(full).isDirectory()) continue;
		const held = readdirSync(full);
		if (held.includes("widget.tsx")) into.push(path.join(full, "widget.tsx"));
		else sourcesUnder(full, into);
	}
	return into;
}

const STACKS_AT = /@container widget \(width < (\d+)px\)/g;
const PREVIEW_W = /preview:\s*\{[^}]*size:\s*\{\s*w:\s*(\d+)/s;

const tight = [];
let looked = 0;

for (const at of sourcesUnder(ROOT)) {
	const source = readFileSync(at, "utf8");
	const declared = source.match(PREVIEW_W);
	if (!declared) continue;
	const cells = Number(declared[1]);
	const drawnAt = widthOf(cells);
	const thresholds = [...source.matchAll(STACKS_AT)].map((found) => Number(found[1]));
	if (thresholds.length === 0) continue;
	looked += 1;
	const highest = Math.max(...thresholds);
	if (drawnAt < highest)
		tight.push({ at: path.dirname(at).replace(`${ROOT}/`, ""), cells, drawnAt, highest, thresholds });
}

console.log(
	`\ncell ${GRID.cellPx}px, gap ${GRID.gapPx}px — a preview of w cells is drawn at w*${GRID.cellPx} + (w-1)*${GRID.gapPx}\n`,
);
console.log(`${looked} widgets declare both a preview width and a stacking threshold\n`);

for (const one of tight) {
	console.log(
		`STACKS  ${one.at.padEnd(26)} preview w:${one.cells} = ${one.drawnAt}px, stacks below ${one.highest}px  (${one.thresholds.join(", ")})`,
	);
}
if (tight.length === 0) console.log("every widget draws its normal form in the catalogue");
console.log(`\n${tight.length} show the catalogue their stacked form instead of their normal one\n`);

process.exit(tight.length === 0 ? 0 : 1);
