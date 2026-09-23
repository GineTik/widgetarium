import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { buildMirror } from "./mirror.mjs";

buildMirror();

const { readRegistry, REGISTRY_FILE } = await import("./.mjs-cache/engine/registry-file.mjs");

const SOURCE = "registry";
const at = path.join(SOURCE, REGISTRY_FILE);
const read = readRegistry(readFileSync(at, "utf8"), at);

if (read.refusal) {
	console.log(`\nREFUSED  ${read.refusal}\n`);
	process.exit(1);
}

const listed = new Set(read.rows.map((row) => row.id));

function foldersUnder(root) {
	const found = [];
	for (const scope of readdirSync(root)) {
		const scopeAt = path.join(root, scope);
		if (!scope.startsWith("@") || !statSync(scopeAt).isDirectory()) continue;
		for (const name of readdirSync(scopeAt)) {
			if (statSync(path.join(scopeAt, name)).isDirectory()) found.push(`${scope}/${name}`);
		}
	}
	return found;
}

const onDisk = foldersUnder(SOURCE);
const missing = onDisk.filter((id) => !listed.has(id));
const phantom = [...listed].filter((id) => !onDisk.includes(id));

console.log(`\n${read.rows.length} listed in ${at}`);
console.log(`${onDisk.length} widget folders on disk\n`);

for (const id of missing) console.log(`ON DISK, NOT LISTED   ${id}`);
for (const id of phantom) console.log(`LISTED, NOT ON DISK   ${id}`);
if (missing.length === 0 && phantom.length === 0) console.log("every folder is listed, and every listing is a folder");

const scopes = {};
for (const id of [...listed]) scopes[id.split("/")[0]] = (scopes[id.split("/")[0]] ?? 0) + 1;
console.log(
	`\nby scope: ${Object.entries(scopes)
		.map(([name, n]) => `${name} ${n}`)
		.join(" · ")}\n`,
);

process.exit(missing.length === 0 && phantom.length === 0 ? 0 : 1);
