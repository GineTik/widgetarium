import fs from "node:fs";

const css = fs.readFileSync("styles.css", "utf8");
const source = fs.readFileSync("src/paths.js", "utf8");

function fail(message) {
	console.error(`\nshadow gate: BLOCKED — ${message}`);
	process.exit(1);
}

function toPx(value, label) {
	const match = /^(-?[\d.]+)(rem|px)?$/.exec(value.trim());
	if (!match) fail(`cannot measure ${label} ("${value}"). Keep it plain rem or px — a calc() or a var() cannot be checked here.`);
	const amount = parseFloat(match[1]);
	if (match[2] === "rem") return amount * 16;
	// a bare 0 is legal CSS and needs no unit; anything else must carry one
	if (!match[2] && amount !== 0) fail(`${label} ("${value}") needs a unit`);
	return amount;
}

const shadow = /--wg-widget-shadow:\s*([^;]+);/.exec(css)?.[1]?.trim();
const padDeclaration = /--wg-board-pad:\s*([^;]+);/.exec(css)?.[1]?.trim();
if (!shadow || !padDeclaration) fail("--wg-widget-shadow or --wg-board-pad is missing from styles.css");

const padFromCss = toPx(padDeclaration, "--wg-board-pad");
const legacyGridPad = Number(/padPx:\s*(\d+)/.exec(source)?.[1]);
if (!Number.isFinite(legacyGridPad)) fail("cannot read GRID.padPx from src/paths.js");

function layersOf(value) {
	const layers = [];
	let depth = 0;
	let from = 0;
	for (let at = 0; at < value.length; at += 1) {
		if (value[at] === "(") depth += 1;
		else if (value[at] === ")") depth -= 1;
		else if (value[at] === "," && depth === 0) {
			layers.push(value.slice(from, at).trim());
			from = at + 1;
		}
	}
	layers.push(value.slice(from).trim());
	return layers.filter(Boolean);
}

function reachOf(layer, at) {
	const parts = layer.split(/\s+/);
	// an inset layer is painted inside the box and reaches nothing
	if (parts[0] === "inset") return { left: 0, right: 0, top: 0, bottom: 0 };
	if (parts.length < 3) fail(`cannot read shadow layer ${at + 1} ("${layer}") — expected "<x> <y> <blur> <colour>"`);
	const [x, y, blur] = parts.slice(0, 3).map((value, index) => toPx(value, `layer ${at + 1} ${["x", "y", "blur"][index]}`));
	const half = blur / 2;
	return { left: half - x, right: half + x, top: half - y, bottom: half + y };
}

const layers = layersOf(shadow);
const reaches = layers.map(reachOf);
const worst = Math.max(...reaches.flatMap((reach) => Object.values(reach)));

console.log(`shadow ${shadow}`);
layers.forEach((layer, at) => {
	const reach = reaches[at];
	console.log(`layer ${at + 1}  ${layer}`);
	console.log(`  reach  left ${reach.left} · right ${reach.right} · top ${reach.top} · bottom ${reach.bottom}`);
});
console.log(`padding ${padFromCss}px on the tree board, ${legacyGridPad}px on the legacy grid`);

if (worst > padFromCss) {
	fail(
		`reach ${worst}px exceeds the ${padFromCss}px we own.\n` +
			"Past our own padding the shadow is painted inside Obsidian's box, where anything\n" +
			"may clip it. Soften the shadow or widen --wg-board-pad and GRID.padPx together.",
	);
}
console.log(`\nshadow gate: clean — ${worst}px of reach inside ${padFromCss}px of our own padding`);
