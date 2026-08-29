// ONE LAW, ONE SPELLING.
//
// Turning a set of places into a layout was written by hand at six call sites, in five
// different ways — and two of them left the fitting step out, so a row that no longer fitted
// dropped a tile on those paths and narrowed on the others. Nobody chose that; it is simply
// what happens when the same arithmetic is retyped wherever it is needed. Every new path
// added one more place to remember, and the memory is what failed.
//
// So the pieces are private to layout.js and the rest of the plugin has one way in.
import fs from "node:fs";
import path from "node:path";

// Everything that moves the map. One of these was public once, and eight became public over a
// week — each for a good local reason, and together they were the bug.
const PRIVATE = [
	"packPlaces",
	"fitRows",
	"reflowRows",
	"pushAside",
	"settlePlaces",
	"stackPlaces",
	"generatePlaces",
	"autofillFreedSpan",
	"layOutBand",
	"fitBands",
];
const HOME = "layout.js";

const root = process.argv[2] ?? "src";
const offences = [];

function sources(dir) {
	const found = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) found.push(...sources(full));
		else if (entry.name.endsWith(".js")) found.push(full);
	}
	return found;
}

for (const file of sources(root)) {
	if (path.basename(file) === HOME) continue;
	const text = fs.readFileSync(file, "utf8").replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
	for (const name of PRIVATE) {
		if (new RegExp(`\\b${name}\\s*\\(`).test(text)) {
			offences.push(`${file} — calls ${name}(); where a tile goes is decided by arrange()`);
		}
	}
}

if (offences.length > 0) {
	console.error("one-law gate: one owner decides where a tile goes");
	for (const line of offences) console.error(`  ${line}`);
	process.exit(1);
}

console.log(`one-law gate: clean (${root})`);
