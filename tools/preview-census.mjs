import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = "registry";

const SAYS_NOTHING =
	/no (projects|tracks|albums|files|commits|questions|rows|records|output|report|widget)|touched no files|has no widget|nothing (is|has|to)|is empty|yet\./i;

function cardsUnder(at, into = []) {
	for (const name of readdirSync(at)) {
		const full = path.join(at, name);
		if (!statSync(full).isDirectory()) continue;
		if (readdirSync(full).includes("manifest.generated.json")) into.push(full);
		else cardsUnder(full, into);
	}
	return into;
}

const reported = [];

for (const folder of cardsUnder(ROOT)) {
	const card = JSON.parse(readFileSync(path.join(folder, "manifest.generated.json"), "utf8"));
	const preview = card.preview ?? {};
	const seeded = preview.props ?? {};
	for (const [name, spec] of Object.entries(card.props ?? {})) {
		const seed = seeded[name];
		const isCollection = spec.kind === "collection";
		const hasRows = Array.isArray(seed?.rows) && seed.rows.length > 0;
		const hasValue = seed !== undefined && !isCollection;
		const narrowed = Array.isArray(spec.where) && spec.where.length > 0;
		const refInWhere = narrowed && JSON.stringify(spec.where).includes("wants");
		const defaultRows = Array.isArray(spec.default) && spec.default.length > 0;
		if (refInWhere) reported.push({ folder, name, why: "a where that waits on another widget's selection" });
		else if (isCollection && !hasRows && !defaultRows)
			reported.push({ folder, name, why: "a collection the catalogue has nothing to draw" });
	}
}

console.log(`\nscanned ${cardsUnder(ROOT).length} widget cards\n`);
if (reported.length === 0) console.log("every prop the catalogue draws is seeded");
for (const one of reported) console.log(`${one.folder.padEnd(38)} ${one.name.padEnd(14)} ${one.why}`);
console.log(`\n${reported.length} props would draw an empty sentence in the catalogue\n`);
