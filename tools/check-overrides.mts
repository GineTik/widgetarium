import fs from "node:fs";

const files = process.argv.slice(2).filter((file) => fs.existsSync(file));
const offences: string[] = [];

const WITHOUT_CSS_COMMENTS = /\/\*[\s\S]*?\*\//g;
const RULES_OUTSIDE_AT_BLOCKS = /([^{}@]+)\{([^{}]*)\}/g;
const DECLARATIONS = /([a-z-]+)\s*:\s*([^;]*);?/g;

for (const file of files) offences.push(...declarationsThatCanNeverWinIn(file));

if (offences.length > 0) {
	console.error("override gate: a declaration that can never take effect");
	for (const line of offences) console.error(`  ${line}`);
	console.error("  fix: the name is already taken — give the new thing a name of its own");
	process.exit(1);
}

console.log(`override gate: clean (${files.length} sheet${files.length === 1 ? "" : "s"})`);

function declarationsThatCanNeverWinIn(file: string): string[] {
	const text = fs.readFileSync(file, "utf8").replace(WITHOUT_CSS_COMMENTS, "");
	const importantWeightOf = new Map<string, number>();
	const found: string[] = [];
	for (const [, selectors = "", body = ""] of text.matchAll(RULES_OUTSIDE_AT_BLOCKS)) {
		for (const [, property = "", value = ""] of body.matchAll(DECLARATIONS)) {
			const important = /!important/.test(value);
			for (const selector of selectors.split(",")) {
				const target = targetOf(selector);
				if (!target) continue;
				const key = `${target}|${property}`;
				if (important) {
					importantWeightOf.set(key, Math.max(importantWeightOf.get(key) ?? 0, weigh(selector)));
					continue;
				}
				const wall = importantWeightOf.get(key);
				if (wall === undefined || weigh(selector) > wall) continue;
				found.push(
					`${file} — "${selector.trim()}" sets ${property}, but an earlier !important rule ` +
						`for ${target} already fixed it; this declaration can never take effect`,
				);
			}
		}
	}
	return found;
}

function weigh(selector: string): number {
	return (selector.match(/[.[:]/g) ?? []).length;
}

function targetOf(selector: string): string | null {
	const classes = selector.trim().match(/\.[\w-]+/g);
	return classes?.at(-1) ?? null;
}
