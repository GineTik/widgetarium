import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { isRecord } from "./page-dom.ts";

interface KeyFound {
	readonly key: string;
	readonly at: string;
	readonly value: unknown;
}

interface DefaultFound extends KeyFound {
	readonly folder: string;
	readonly name: string;
	readonly engine: boolean;
}

const ROOT = "registry";

function foldersUnder(at: string, into: string[] = []): string[] {
	for (const name of readdirSync(at)) {
		const full = path.join(at, name);
		if (!statSync(full).isDirectory()) continue;
		if (readdirSync(full).includes("manifest.generated.json")) into.push(full);
		else foldersUnder(full, into);
	}
	return into;
}

function keysDeep(held: unknown, at: readonly string[] = [], into: KeyFound[] = []): KeyFound[] {
	if (Array.isArray(held)) {
		held.forEach((one: unknown, n) => keysDeep(one, [...at, `${n}`], into));
		return into;
	}
	if (typeof held !== "object" || held === null) return into;
	for (const [key, value] of Object.entries(held)) {
		into.push({ key, at: [...at, key].join("."), value });
		keysDeep(value, [...at, key], into);
	}
	return into;
}

function propsOnCard(card: unknown): [string, unknown][] {
	if (!isRecord(card)) return [];
	const props = card["props"] ?? {};
	return isRecord(props) ? Object.entries(props) : [];
}

const REFUSED_BY_THE_ENGINE = /^(path|ref)$/;
const SPELLS_A_PATH = /path$|^file$|^folder$|^at$/i;
const found: DefaultFound[] = [];

for (const folder of foldersUnder(ROOT)) {
	const card: unknown = JSON.parse(readFileSync(path.join(folder, "manifest.generated.json"), "utf8"));
	for (const [name, spec] of propsOnCard(card)) {
		const given = isRecord(spec) ? spec["default"] : undefined;
		if (given === undefined) continue;
		for (const { key, at, value } of keysDeep(given)) {
			if (REFUSED_BY_THE_ENGINE.test(key)) found.push({ folder, name, key, at, value, engine: true });
			else if (SPELLS_A_PATH.test(key) && looksLikeAPath(value))
				found.push({ folder, name, key, at, value, engine: false });
		}
	}
}

function looksLikeAPath(value: unknown): boolean {
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
