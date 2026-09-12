import { readFileSync } from "node:fs";

const DECLARATION = "widgets/types/widgetarium.d.ts";
const HALVES = [
	["src/api-core.js", "coreSurface"],
	["src/widget-api.js", "reactSurface"],
];
const MODULE = HALVES.map(([path]) => path).join(" + ");

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

function surfaceLiteral(source, held, at) {
	const found = source.match(new RegExp(`const ${held} = \\{([\\s\\S]*?)\\n\\};`));
	if (!found) throw new Error(`${at}: the ${held} object literal was not found — this check reads it by shape`);
	return found[1];
}

function runtimeNames() {
	const names = new Set();
	for (const [at, held] of HALVES) {
		for (const entry of surfaceLiteral(readFileSync(at, "utf8"), held, at).split(",")) {
			const name = entry.trim().split(":")[0].trim();
			if (name) names.add(name);
		}
	}
	return names;
}

function driftBetween(runtime, declared) {
	const missing = [...runtime].filter((name) => !declared.has(name)).map((name) => `${name}: exported by ${MODULE}, absent from ${DECLARATION}`);
	const stale = [...declared].filter((name) => !runtime.has(name)).map((name) => `${name}: declared in ${DECLARATION}, absent from ${MODULE}`);
	return [...missing, ...stale];
}

const runtime = runtimeNames();
const drifted = driftBetween(runtime, declaredNames(readFileSync(DECLARATION, "utf8")));

for (const line of drifted) console.log(`fail  ${line}`);
console.log(drifted.length ? `api surface gate: ${drifted.length} name(s) drifted` : `api surface gate: clean, ${runtime.size} names match`);
if (drifted.length) process.exit(1);
