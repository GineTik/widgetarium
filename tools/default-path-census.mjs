import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = "registry";

function foldersUnder(at, into = []) {
	for (const name of readdirSync(at)) {
		const full = path.join(at, name);
		if (!statSync(full).isDirectory()) continue;
		if (readdirSync(full).includes("manifest.generated.json")) into.push(full);
		else foldersUnder(full, into);
	}
	return into;
}

function keysDeep(held, at = [], into = []) {
	if (Array.isArray(held)) {
		held.forEach((one, n) => keysDeep(one, [...at, `${n}`], into));
		return into;
	}
	if (typeof held !== "object" || held === null) return into;
	for (const [key, value] of Object.entries(held)) {
		into.push({ key, at: [...at, key].join("."), value });
		keysDeep(value, [...at, key], into);
	}
	return into;
}

const REFUSED_BY_THE_ENGINE = /^(path|ref)$/;
const SPELLS_A_PATH = /path$|^file$|^folder$|^at$/i;
const found = [];

for (const folder of foldersUnder(ROOT)) {
	const card = JSON.parse(readFileSync(path.join(folder, "manifest.generated.json"), "utf8"));
	for (const [name, spec] of Object.entries(card.props ?? {})) {
		if (spec.default === undefined) continue;
		for (const { key, at, value } of keysDeep(spec.default)) {
			if (REFUSED_BY_THE_ENGINE.test(key)) found.push({ folder, name, key, at, value, engine: true });
			else if (SPELLS_A_PATH.test(key) && looksLikeAPath(value))
				found.push({ folder, name, key, at, value, engine: false });
		}
	}
}

function looksLikeAPath(value) {
	return typeof value === "string" && /[/\\]|\.(md|js|ts|tsx|json|css|mjs|png|jpg|mp3)$/i.test(value);
}

console.log(`\nscanned ${foldersUnder(ROOT).length} widgets\n`);
if (found.length === 0) console.log("no default anywhere carries a path");
for (const one of found) {
	console.log(
		`${one.engine ? "REFUSED " : "renamed "} ${one.folder}  prop ${one.name}  ${one.key} = ${JSON.stringify(one.value)}`,
	);
}
const renamed = found.filter((one) => !one.engine).length;
console.log(`\n${found.length - renamed} the engine refuses, ${renamed} renamed around it\n`);
