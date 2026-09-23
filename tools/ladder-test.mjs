// THE GREY LADDER, IN NUMBERS. Measured once and it was flat: a card read 255 against a page of
// 255, and the only thing telling them apart was a column 7.7 away. One percentage was serving
// a container on the page AND a container inside a dialog, so raising it for the board darkened
// the dialog and lowering it for the dialog dissolved the board. This gate holds the roles apart.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildMirror } from "./mirror.mjs";

buildMirror();
const { TONE_NAMES, toneClass } = await import("./.mjs-cache/kit.mjs");

const CHROME = process.env.WG_CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const work = mkdtempSync(path.join(tmpdir(), "wg-ladder-"));

const THEMES = {
	light:
		"--background-primary:#ffffff;--background-secondary:#f6f6f6;--text-normal:#222222;--text-muted:#707070;--text-faint:#ababab;--interactive-accent:#6d4ee0;--background-modifier-border:#e4e4e4;--text-success:#1f8a4c;--text-error:#c0392b;--text-on-accent:#ffffff;",
	dark: "--background-primary:#1e1e1e;--background-secondary:#262626;--text-normal:#dadada;--text-muted:#999999;--text-faint:#666666;--interactive-accent:#8b6ef0;--background-modifier-border:#333333;--text-success:#4ec97f;--text-error:#e06c5f;--text-on-accent:#ffffff;",
};

// A TAG IS TOLD FROM ITS NEIGHBOUR BY ITS TONE, so the tones are read off the kit's own table:
// a tone added there is measured here without anybody remembering to add it.
const TONES = TONE_NAMES.map((name) => [name, toneClass(name)]);

const SURFACES = [
	["page", "var(--background-primary)"],
	["grid", "var(--wg-cell-fill)"],
	["column", "var(--wg-kit-fill)"],
	["card", "var(--wg-kit-raise)"],
	["cardEdge", "var(--wg-kit-card-edge)"],
	["inDialog", "var(--wg-kit-glass-group)"],
	["hover", "var(--wg-kit-fill-hover)"],
];

function levels(theme) {
	const file = path.join(work, `${theme}.html`);
	writeFileSync(
		file,
		`<!doctype html><html><head><meta charset="utf-8"><style>${readFileSync("apps/obsidian/styles.css", "utf8")}</style>
<style>body{margin:0;${THEMES[theme]}}</style></head><body class="wg-root"><pre id="out"></pre><script>
window.addEventListener('load',()=>{
	const probe=(value)=>{const node=document.createElement('div');node.style.cssText='width:10px;height:10px;background:'+value;
		document.body.appendChild(node);const seen=getComputedStyle(node).backgroundColor;node.remove();return seen;};
	const lum=(colour)=>{const parts=String(colour).match(/[\\d.]+/g).map(Number);
		const scale=String(colour).startsWith('color(')?255:1;
		const [red,green,blue]=parts.slice(0,3).map((v)=>v*scale);
		const alpha=parts.length>3?parts[3]:1;
		const own=0.2126*red+0.7152*green+0.0722*blue;
		const ground=${theme === "light" ? 255 : 30};
		return alpha===1?own:own*alpha+ground*(1-alpha);};
	const rows=${JSON.stringify(SURFACES)};
	const pill=(cls)=>{const node=document.createElement('span');node.className=('wg-kit-pill '+cls).trim();node.textContent='tag';
		document.body.appendChild(node);const style=getComputedStyle(node);const seen=[style.backgroundColor,style.color];node.remove();return seen;};
	const tones=${JSON.stringify(TONES)};
	out.textContent=JSON.stringify(Object.assign(
		Object.fromEntries(rows.map(([name,value])=>[name,Math.round(lum(probe(value))*10)/10])),
		{tones:Object.fromEntries(tones.map(([name,cls])=>[name,pill(cls)]))}));
});</script></body></html>`,
	);
	const dom = execFileSync(
		CHROME,
		["--headless", "--disable-gpu", "--no-sandbox", "--virtual-time-budget=3000", "--dump-dom", `file://${file}`],
		{ encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
	);
	return JSON.parse(/<pre id="out">(.*?)<\/pre>/s.exec(dom)[1].replace(/&quot;/g, '"'));
}

// MEASURED, not eyeballed: a reading is composited on its own ground, because a wash may
// arrive with alpha and an unpainted alpha reads as whatever is behind it.
const GROUND = { light: 255, dark: 30 };

function paint(colour, ground) {
	const parts = String(colour)
		.match(/[\d.]+/g)
		.map(Number);
	const scale = String(colour).startsWith("color(") ? 255 : 1;
	const alpha = parts.length > 3 ? parts[3] : 1;
	return parts.slice(0, 3).map((channel) => channel * scale * alpha + ground * (1 - alpha));
}

function relativeLuminance([red, green, blue]) {
	const straighten = (value) => (value / 255 <= 0.03928 ? value / 255 / 12.92 : ((value / 255 + 0.055) / 1.055) ** 2.4);
	return 0.2126 * straighten(red) + 0.7152 * straighten(green) + 0.0722 * straighten(blue);
}

function contrast(one, other) {
	const [high, low] = [relativeLuminance(one), relativeLuminance(other)].sort((a, b) => b - a);
	return (high + 0.05) / (low + 0.05);
}

function apart(one, other) {
	return Math.sqrt(one.reduce((sum, channel, at) => sum + (channel - other[at]) ** 2, 0));
}

function pairs(names) {
	return names.flatMap((one, at) => names.slice(at + 1).map((other) => [one, other]));
}

// MEASURED FLOORS, both set by what already ships: the closest pair of the eight is 50 apart
// and the faintest label is warning at 2.5, so a new tone may not be worse than the worst one.
const TONES_APART = 40;
const TONE_LEGIBLE = 2.4;

// CONTEXT: String() made every object equal to every other, and "1" equal to 1
function same(got, want) {
	if (Object.is(got, want)) return true;
	if (!plain(got) || !plain(want)) return false;
	return JSON.stringify(got) === JSON.stringify(want);
}
function plain(value) {
	if (value === null || typeof value !== "object") return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === Array.prototype || proto === null;
}
function show(value) {
	return plain(value) ? JSON.stringify(value) : String(value);
}
let failed = 0;
const check = (label, got, want) => {
	const ok = same(got, want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${label}${ok ? "" : `  got ${show(got)}, want ${show(want)}`}`);
};

for (const theme of ["light", "dark"]) {
	const seen = levels(theme);
	const gap = (a, b) => Math.abs(seen[a] - seen[b]);
	console.log(`\n— ${theme} —`);
	console.log(
		`   page ${seen.page} · grid ${seen.grid} · column ${seen.column} · card ${seen.card} · in a dialog ${seen.inDialog} · hover ${seen.hover}`,
	);
	console.log(
		`   steps: page→column ${Math.round(gap("page", "column") * 10) / 10} · column→card ${Math.round(gap("column", "card") * 10) / 10} · column→hover ${Math.round(gap("column", "hover") * 10) / 10}`,
	);

	check(`${theme}: a container separates from the ground it sits on`, gap("page", "column") >= 10, true);
	// a card cannot lift above white, so on a light ground the edge is what carries the step
	check(
		`${theme}: a card separates from the container it sits in`,
		Math.max(gap("column", "card"), gap("column", "cardEdge")) >= 8,
		true,
	);
	check(`${theme}: hover clears the surface it lifts from`, gap("column", "hover") >= 8, true);
	check(
		`${theme}: the grid stays under a third of the container's step`,
		seen.grid !== undefined && gap("page", "grid") * 3 <= gap("page", "column") * 2 + 1,
		true,
	);
	// THE ENTANGLEMENT THIS GATE EXISTS FOR: a plate inside a dialog and a column on the board
	// were one token, so neither could be tuned without ruining the other.
	check(`${theme}: a surface inside a dialog is not the board's own container`, gap("inDialog", "column") >= 3, true);

	// SIX TAGS ON ONE CARD IS THE JOB. Two washes can be near-identical and still read apart,
	// because the INK is what carries the hue — so a pair counts as told apart when either end is.
	const painted = Object.fromEntries(
		Object.entries(seen.tones).map(([name, [fill, ink]]) => [
			name,
			{ fill: paint(fill, GROUND[theme]), ink: paint(ink, GROUND[theme]) },
		]),
	);
	const closest = pairs(Object.keys(painted))
		.map(([one, other]) => ({
			pair: `${one}/${other}`,
			gap: Math.round(
				Math.max(apart(painted[one].fill, painted[other].fill), apart(painted[one].ink, painted[other].ink)),
			),
		}))
		.sort((a, b) => a.gap - b.gap)[0];
	const faintest = Object.entries(painted)
		.map(([name, { fill, ink }]) => ({ tone: name, ratio: Math.round(contrast(ink, fill) * 100) / 100 }))
		.sort((a, b) => a.ratio - b.ratio)[0];

	console.log(
		`   tones: ${Object.keys(painted).length} · closest ${closest.pair} ${closest.gap} · faintest ${faintest.tone} ${faintest.ratio}`,
	);
	check(
		`${theme}: no two tones read alike — ${closest.pair} is ${closest.gap} apart`,
		closest.gap >= TONES_APART,
		true,
	);
	check(
		`${theme}: a tone's own label stays legible on it — ${faintest.tone} at ${faintest.ratio}`,
		faintest.ratio >= TONE_LEGIBLE,
		true,
	);
}

console.log(failed ? `\n${failed} — the ladder has flattened` : "\nevery surface steps clear of the one under it");
process.exit(failed ? 1 : 0);
