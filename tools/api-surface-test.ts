import { readFileSync } from "node:fs";

const DECLARATION = "packages/sdk/types/widgetarium.d.ts";
const HALVES: readonly (readonly [at: string, held: string])[] = [
	["packages/core/src/api-core.ts", "coreSurface"],
	["packages/core/src/widget-api.ts", "reactSurface"],
];
const MODULE = HALVES.map(([path]) => path).join(" + ");

function reExportedNames(source: string): Set<string> {
	const names = new Set<string>();
	for (const [, list = ""] of source.matchAll(/export\s+\{([^}]+)\}\s+from/g)) {
		for (const entry of list.split(",")) {
			const name = entry
				.trim()
				.split(/\s+as\s+/)
				.pop();
			if (name) names.add(name);
		}
	}
	return names;
}

function declaredNames(source: string): Set<string> {
	const names = reExportedNames(source);
	for (const [, name] of source.matchAll(/export\s+declare\s+(?:const|function)\s+(\w+)/g)) {
		if (name) names.add(name);
	}
	return names;
}

function surfaceLiteral(source: string, held: string, at: string): string {
	const found = source.match(new RegExp(`const ${held} = \\{([\\s\\S]*?)\\n\\};`));
	if (!found) throw new Error(`${at}: the ${held} object literal was not found — this check reads it by shape`);
	return found[1] ?? "";
}

function runtimeNames(): Set<string> {
	const names = new Set<string>();
	for (const [at, held] of HALVES) {
		for (const entry of surfaceLiteral(readFileSync(at, "utf8"), held, at).split(",")) {
			const name = entry.trim().split(":")[0]?.trim();
			if (name) names.add(name);
		}
	}
	return names;
}

function driftBetween(runtime: ReadonlySet<string>, declared: ReadonlySet<string>): string[] {
	const missing = [...runtime]
		.filter((name) => !declared.has(name))
		.map((name) => `${name}: exported by ${MODULE}, absent from ${DECLARATION}`);
	const stale = [...declared]
		.filter((name) => !runtime.has(name))
		.map((name) => `${name}: declared in ${DECLARATION}, absent from ${MODULE}`);
	return [...missing, ...stale];
}

const runtime = runtimeNames();
const drifted = driftBetween(runtime, declaredNames(readFileSync(DECLARATION, "utf8")));

for (const line of drifted) console.log(`fail  ${line}`);
console.log(
	drifted.length
		? `api surface gate: ${drifted.length} name(s) drifted`
		: `api surface gate: clean, ${runtime.size} names match`,
);
if (drifted.length) process.exit(1);
