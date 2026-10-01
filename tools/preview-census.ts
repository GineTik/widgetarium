import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { isObject } from "../packages/core/src/engine/is-object.js";

const ROOT = "registry";

interface Reported {
	readonly folder: string;
	readonly name: string;
	readonly why: string;
}

const fieldOf = (value: unknown, key: string): unknown => (isObject(value) ? value[key] : undefined);
const entriesOf = (value: unknown): [string, unknown][] => (isObject(value) ? Object.entries(value) : []);
const isFilledList = (value: unknown): boolean => Array.isArray(value) && value.length > 0;

function cardsUnder(at: string, into: string[] = []): string[] {
	for (const name of readdirSync(at)) {
		const full = path.join(at, name);
		if (!statSync(full).isDirectory()) continue;
		if (readdirSync(full).includes("manifest.generated.json")) into.push(full);
		else cardsUnder(full, into);
	}
	return into;
}

const reported: Reported[] = [];

for (const folder of cardsUnder(ROOT)) {
	const card: unknown = JSON.parse(readFileSync(path.join(folder, "manifest.generated.json"), "utf8"));
	const seeded = fieldOf(fieldOf(card, "preview"), "props");
	for (const [name, spec] of entriesOf(fieldOf(card, "props"))) {
		const seed = fieldOf(seeded, name);
		const isCollection = fieldOf(spec, "kind") === "collection";
		const hasRows = isFilledList(fieldOf(seed, "rows"));
		const narrowed = isFilledList(fieldOf(spec, "where"));
		const refInWhere = narrowed && JSON.stringify(fieldOf(spec, "where")).includes("wants");
		const defaultRows = isFilledList(fieldOf(spec, "default"));
		if (refInWhere) reported.push({ folder, name, why: "a where that waits on another widget's selection" });
		else if (isCollection && !hasRows && !defaultRows)
			reported.push({ folder, name, why: "a collection the catalogue has nothing to draw" });
	}
}

console.log(`\nscanned ${cardsUnder(ROOT).length} widget cards\n`);
if (reported.length === 0) console.log("every prop the catalogue draws is seeded");
for (const one of reported) console.log(`${one.folder.padEnd(38)} ${one.name.padEnd(14)} ${one.why}`);
console.log(`\n${reported.length} props would draw an empty sentence in the catalogue\n`);
