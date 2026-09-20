// A @container rule that LOSES to the widget's own base rule does nothing, and nothing fails:
// the widget simply never adapts, and the only way to notice is to make a window narrow and
// look. It has now happened three times in this codebase — Obsidian's button rules, the
// sidebar's button reset, and the sidebar's own narrow layout — always the same way: the base
// rule carries the root class and the adaptive one does not.
//
//   .orbi-sidebar .orbi-sidebar__add   (0,2,0)   base
//   .orbi-sidebar__add                 (0,1,0)   adaptive — never wins
import fs from "node:fs";
import path from "node:path";
import { widgetFiles } from "./widget-files.mjs";

const roots = process.argv.slice(2).filter((root) => fs.existsSync(root));
const offences = [];

// classes, attributes and pseudo-classes all weigh the same; elements are a tie-break we do
// not need, because widget CSS is written in classes
function weigh(selector) {
	return (selector.match(/[.[:]/g) ?? []).length;
}

function propertiesOf(body) {
	return [...String(body).matchAll(/([a-z-]+)\s*:/g)].map(([, name]) => name);
}

function lastClass(selector) {
	const classes = selector.match(/\.[\w-]+/g);
	return classes ? classes[classes.length - 1] : null;
}

for (const root of roots) {
	for (const file of widgetFiles(root)) {
		// comments hold braces and commas of their own, and a selector list runs across lines
		const text = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

		// Heaviest base rule per (class, PROPERTY). Comparing per class alone cried wolf: a
		// heavy rule setting `color` on an active item says nothing about a light rule setting
		// `display` on the same class, and the two never meet.
		const withoutContainers = text.replace(/@container[^{]*\{[\s\S]*?\n\}/g, "");
		const heaviest = new Map();
		for (const [, selectors, body] of withoutContainers.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
			for (const property of propertiesOf(body)) {
				for (const selector of selectors.split(",")) {
					const target = lastClass(selector.trim());
					if (!target) continue;
					const key = `${target}|${property}`;
					heaviest.set(key, Math.max(heaviest.get(key) ?? 0, weigh(selector)));
				}
			}
		}

		for (const [, query, block] of text.matchAll(/@container([^{]*)\{([\s\S]*?)\n\}/g)) {
			for (const [, selectors, body] of block.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
				for (const property of propertiesOf(body)) {
					for (const selector of selectors.split(",")) {
						const trimmed = selector.trim();
						const target = lastClass(trimmed);
						if (!target) continue;
						const base = heaviest.get(`${target}|${property}`) ?? 0;
						if (weigh(trimmed) < base) {
							offences.push(
								`${file} — "@container${query.trim()}" sets ${property} on "${trimmed}" (weight ${weigh(trimmed)}), ` +
									`but a base rule sets the same property at weight ${base}; it will never win`,
							);
						}
					}
				}
			}
		}
	}
}

if (offences.length > 0) {
	console.error("adaptive gate: a container rule must outweigh the base rule it overrides");
	for (const line of offences) console.error(`  ${line}`);
	console.error("  fix: carry the widget's root class, the same way the base rule does");
	process.exit(1);
}

console.log(`adaptive gate: clean (${roots.length} root${roots.length === 1 ? "" : "s"})`);
