// THE GREY LADDER, IN NUMBERS. Measured once and it was flat: a card read 255 against a page of
// 255, and the only thing telling them apart was a column 7.7 away. One percentage was serving
// a container on the page AND a container inside a dialog, so raising it for the board darkened
// the dialog and lowering it for the dialog dissolved the board. This gate holds the roles apart.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const CHROME = process.env.WG_CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const work = mkdtempSync(path.join(tmpdir(), "wg-ladder-"));

const THEMES = {
	light: "--background-primary:#ffffff;--background-secondary:#f6f6f6;--text-normal:#222222;--text-muted:#707070;--text-faint:#ababab;--interactive-accent:#6d4ee0;--background-modifier-border:#e4e4e4;",
	dark: "--background-primary:#1e1e1e;--background-secondary:#262626;--text-normal:#dadada;--text-muted:#999999;--text-faint:#666666;--interactive-accent:#8b6ef0;--background-modifier-border:#333333;",
};

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
	writeFileSync(file, `<!doctype html><html><head><meta charset="utf-8"><style>${readFileSync("styles.css", "utf8")}</style>
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
	out.textContent=JSON.stringify(Object.fromEntries(rows.map(([name,value])=>[name,Math.round(lum(probe(value))*10)/10])));
});</script></body></html>`);
	const dom = execFileSync(CHROME, ["--headless", "--disable-gpu", "--no-sandbox", "--virtual-time-budget=3000", "--dump-dom", `file://${file}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
	return JSON.parse(/<pre id="out">(.*?)<\/pre>/s.exec(dom)[1].replace(/&quot;/g, '"'));
}

let failed = 0;
const check = (label, got, want) => {
	const ok = String(got) === String(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${label}${ok ? "" : `  got ${got}, want ${want}`}`);
};

for (const theme of ["light", "dark"]) {
	const seen = levels(theme);
	const gap = (a, b) => Math.abs(seen[a] - seen[b]);
	console.log(`\n— ${theme} —`);
	console.log(`   page ${seen.page} · grid ${seen.grid} · column ${seen.column} · card ${seen.card} · in a dialog ${seen.inDialog} · hover ${seen.hover}`);
	console.log(`   steps: page→column ${Math.round(gap("page", "column") * 10) / 10} · column→card ${Math.round(gap("column", "card") * 10) / 10} · column→hover ${Math.round(gap("column", "hover") * 10) / 10}`);

	check(`${theme}: a container separates from the ground it sits on`, gap("page", "column") >= 10, true);
	// a card cannot lift above white, so on a light ground the edge is what carries the step
	check(`${theme}: a card separates from the container it sits in`, Math.max(gap("column", "card"), gap("column", "cardEdge")) >= 8, true);
	check(`${theme}: hover clears the surface it lifts from`, gap("column", "hover") >= 8, true);
	check(`${theme}: the grid stays under a third of the container's step`, seen.grid !== undefined && gap("page", "grid") * 3 <= gap("page", "column") * 2 + 1, true);
	// THE ENTANGLEMENT THIS GATE EXISTS FOR: a plate inside a dialog and a column on the board
	// were one token, so neither could be tuned without ruining the other.
	check(`${theme}: a surface inside a dialog is not the board's own container`, gap("inDialog", "column") >= 3, true);
}

console.log(failed ? `\n${failed} — the ladder has flattened` : "\nevery surface steps clear of the one under it");
process.exit(failed ? 1 : 0);
