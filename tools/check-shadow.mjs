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

// the host writes the padding inline from GRID.padPx, so the two must agree
const padFromCss = toPx(padDeclaration, "--wg-board-pad");
const padFromHost = Number(/padPx:\s*(\d+)/.exec(source)?.[1]);
if (!Number.isFinite(padFromHost)) fail("cannot read GRID.padPx from src/paths.js");
if (padFromCss !== padFromHost) {
	fail(`padding disagrees: styles.css says ${padFromCss}px, src/paths.js says ${padFromHost}px. The host writes the inline value, so CSS would be lying.`);
}

const parts = shadow.split(/\s+/);
if (parts.length < 3) fail(`cannot read the shadow ("${shadow}") — expected "<x> <y> <blur> <colour>"`);
const [x, y, blur] = parts.slice(0, 3).map((value, index) => toPx(value, ["x", "y", "blur"][index]));

const half = blur / 2;
const reach = { left: half - x, right: half + x, top: half - y, bottom: half + y };
const worst = Math.max(...Object.values(reach));

console.log(`shadow ${shadow}`);
console.log(`reach  left ${reach.left} · right ${reach.right} · top ${reach.top} · bottom ${reach.bottom}`);
console.log(`padding ${padFromCss}px (css and host agree)`);

if (worst > padFromCss) {
	fail(
		`reach ${worst}px exceeds the ${padFromCss}px we own.\n` +
			"Past our own padding the shadow is painted inside Obsidian's box, where anything\n" +
			"may clip it. Soften the shadow or widen --wg-board-pad and GRID.padPx together.",
	);
}
console.log(`\nshadow gate: clean — ${worst}px of reach inside ${padFromCss}px of our own padding`);
