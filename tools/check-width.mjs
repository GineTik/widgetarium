// The tile decides how wide a widget is. A widget root that sets its own width leaves the
// rest of its cells empty and refuses to grow when the tile does — the sidebar looked three
// columns wide while occupying four, and dragging it wider changed nothing.
//
// A widget that must not grow says so with maxSize in its manifest, which the board honours
// by giving it fewer cells. It never says so by declining the width it was given.
import fs from "node:fs";
import path from "node:path";

const roots = process.argv.slice(2).filter((root) => fs.existsSync(root));
const offences = [];

function widgetFiles(dir) {
	const found = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory() || (entry.isSymbolicLink() && fs.statSync(full).isDirectory())) found.push(...widgetFiles(full));
		else if (entry.name === "widget.jsx") found.push(full);
	}
	return found;
}

for (const root of roots) {
	for (const file of widgetFiles(root)) {
		const text = fs.readFileSync(file, "utf8");
		// only the ROOT rule matters: an inner element may size itself however it likes
		const blocks = text.matchAll(/\.wg-widget-root(?:\.[\w-]+)?\s*\{([^}]*)\}/g);
		for (const [, body] of blocks) {
			const FILLS = ["100%", "auto", "inherit", "unset", "revert"];
			for (const [, prop, raw] of body.matchAll(/(?:^|\n)\s*(width|min-width|max-width)\s*:([^;]+);/g)) {
				const value = raw.trim();
				if (FILLS.includes(value)) continue;
				offences.push(`${file} — widget root sets ${prop}: ${value}`);
			}
		}
	}
}

if (offences.length > 0) {
	console.error("width gate: a widget root must fill the tile it was given");
	for (const line of offences) console.error(`  ${line}`);
	console.error("  fix: width 100%, and declare maxSize in the manifest if it must stay small");
	process.exit(1);
}

console.log(`width gate: clean (${roots.length} root${roots.length === 1 ? "" : "s"})`);
