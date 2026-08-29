// A RULE THAT CAN NEVER WIN. `.wg-chip` was already the board's own — the "Add widget"
// palette — and it sets its radius with !important. Reusing the name for the chip a narrow
// tile shows meant the new rule lost silently: 999px, and the chip drew as a lozenge. Nothing
// failed. The stylesheet simply contained a declaration that could not take effect.
//
// !important is what makes this invisible: without it, the later rule wins and the collision
// announces itself the first time you look.
import fs from "node:fs";

const files = process.argv.slice(2).filter((file) => fs.existsSync(file));
const offences = [];

function weigh(selector) {
	return (selector.match(/[.[:]/g) ?? []).length;
}

function targetOf(selector) {
	const classes = selector.trim().match(/\.[\w-]+/g);
	return classes ? classes[classes.length - 1] : null;
}

for (const file of files) {
	const text = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
	const locked = new Map();

	for (const [, selectors, body] of text.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
		for (const [, property, value] of body.matchAll(/([a-z-]+)\s*:\s*([^;]*);?/g)) {
			const important = /!important/.test(value);
			for (const selector of selectors.split(",")) {
				const target = targetOf(selector);
				if (!target) continue;
				const key = `${target}|${property}`;

				if (important) {
					locked.set(key, Math.max(locked.get(key) ?? 0, weigh(selector)));
					continue;
				}
				const wall = locked.get(key);
				if (wall !== undefined && weigh(selector) <= wall) {
					offences.push(
						`${file} — "${selector.trim()}" sets ${property}, but an earlier !important rule ` +
							`for ${target} already fixed it; this declaration can never take effect`,
					);
				}
			}
		}
	}
}

if (offences.length > 0) {
	console.error("override gate: a declaration that can never take effect");
	for (const line of offences) console.error(`  ${line}`);
	console.error("  fix: the name is already taken — give the new thing a name of its own");
	process.exit(1);
}

console.log(`override gate: clean (${files.length} sheet${files.length === 1 ? "" : "s"})`);
