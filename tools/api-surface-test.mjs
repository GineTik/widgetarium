import { readFileSync } from "node:fs";

const DECLARATION = "widgets/types/widgetarium.d.ts";
const MODULE = "src/api.js";

function reExportedNames(source) {
	const names = new Set();
	for (const [, list] of source.matchAll(/export\s+\{([^}]+)\}\s+from/g)) {
		for (const entry of list.split(",")) {
			const name = entry.trim().split(/\s+as\s+/).pop();
			if (name) names.add(name);
		}
	}
	return names;
}

function declaredNames(source) {
	const names = reExportedNames(source);
	for (const [, name] of source.matchAll(/export\s+declare\s+(?:const|function)\s+(\w+)/g)) names.add(name);
	return names;
}

function coreLiteral(source) {
	const found = source.match(/const core = \{([\s\S]*?)\n\};/);
	if (!found) throw new Error(`${MODULE}: the core object literal was not found — this check reads it by shape`);
	return found[1];
}

function runtimeNames(source) {
	const names = new Set(
		coreLiteral(source)
			.split(",")
			.map((entry) => entry.trim())
			.filter(Boolean),
	);
	if (/export const widgetarium = \{ \.\.\.core, Kit \}/.test(source)) names.add("Kit");
	return names;
}

function driftBetween(runtime, declared) {
	const missing = [...runtime].filter((name) => !declared.has(name)).map((name) => `${name}: exported by ${MODULE}, absent from ${DECLARATION}`);
	const stale = [...declared].filter((name) => !runtime.has(name)).map((name) => `${name}: declared in ${DECLARATION}, absent from ${MODULE}`);
	return [...missing, ...stale];
}

const runtime = runtimeNames(readFileSync(MODULE, "utf8"));
const drifted = driftBetween(runtime, declaredNames(readFileSync(DECLARATION, "utf8")));

for (const line of drifted) console.log(`fail  ${line}`);
console.log(drifted.length ? `api surface gate: ${drifted.length} name(s) drifted` : `api surface gate: clean, ${runtime.size} names match`);
if (drifted.length) process.exit(1);
