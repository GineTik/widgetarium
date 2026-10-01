import fs from "node:fs";
import { widgetFiles } from "./widget-files.mts";

const roots = process.argv.slice(2).filter((root) => fs.existsSync(root));
const offences: string[] = [];

const WITHOUT_CSS_COMMENTS = /\/\*[\s\S]*?\*\//g;
const CONTAINER_BLOCKS = /@container([^{]*)\{([\s\S]*?)\n\}/g;
const WHOLE_CONTAINER_BLOCK = /@container[^{]*\{[\s\S]*?\n\}/g;
const RULES_OUTSIDE_AT_BLOCKS = /([^{}@]+)\{([^{}]*)\}/g;
const RULES = /([^{}]+)\{([^{}]*)\}/g;

for (const root of roots) {
	for (const file of widgetFiles(root)) offences.push(...containerRulesThatNeverWinIn(file));
}

if (offences.length > 0) {
	console.error("adaptive gate: a container rule must outweigh the base rule it overrides");
	for (const line of offences) console.error(`  ${line}`);
	console.error("  fix: carry the widget's root class, the same way the base rule does");
	process.exit(1);
}

console.log(`adaptive gate: clean (${roots.length} root${roots.length === 1 ? "" : "s"})`);

function containerRulesThatNeverWinIn(file: string): string[] {
	const text = fs.readFileSync(file, "utf8").replace(WITHOUT_CSS_COMMENTS, "");
	const heaviestBaseWeightOf = heaviestBaseWeights(text.replace(WHOLE_CONTAINER_BLOCK, ""));
	const found: string[] = [];
	for (const [, query = "", block = ""] of text.matchAll(CONTAINER_BLOCKS)) {
		for (const [, selectors = "", body = ""] of block.matchAll(RULES)) {
			for (const property of propertiesOf(body)) {
				for (const selector of selectorsIn(selectors)) {
					const trimmed = selector.trim();
					const target = lastClass(trimmed);
					if (!target) continue;
					const base = heaviestBaseWeightOf.get(`${target}|${property}`) ?? 0;
					if (weigh(trimmed) >= base) continue;
					found.push(
						`${file} — "@container${query.trim()}" sets ${property} on "${trimmed}" (weight ${weigh(trimmed)}), ` +
							`but a base rule sets the same property at weight ${base}; it will never win`,
					);
				}
			}
		}
	}
	return found;
}

function heaviestBaseWeights(withoutContainers: string): Map<string, number> {
	const heaviest = new Map<string, number>();
	for (const [, selectors = "", body = ""] of withoutContainers.matchAll(RULES_OUTSIDE_AT_BLOCKS)) {
		for (const property of propertiesOf(body)) {
			for (const selector of selectorsIn(selectors)) {
				const target = lastClass(selector.trim());
				if (!target) continue;
				const key = `${target}|${property}`;
				heaviest.set(key, Math.max(heaviest.get(key) ?? 0, weigh(selector)));
			}
		}
	}
	return heaviest;
}

function weigh(selector: string): number {
	return (selector.match(/[.[:]/g) ?? []).length;
}

function propertiesOf(body: string): string[] {
	return [...body.matchAll(/([a-z-]+)\s*:/g)].map(([, name = ""]) => name);
}

function selectorsIn(list: string): string[] {
	return list.split(/,(?![^(]*\))/);
}

function lastClass(selector: string): string | null {
	return selector.match(/\.[\w-]+/g)?.at(-1) ?? null;
}
