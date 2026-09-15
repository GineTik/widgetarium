import fs from "node:fs/promises";
import path from "node:path";
import { buildMirror } from "./mirror.mjs";

buildMirror();
const { createInstaller } = await import("./.mjs-cache/installer.mjs");

const VAULT = process.env.WG_VAULT ?? `${process.env.HOME}/Documents/Obsidian/Personal/Personal`;

const at = (held) => path.join(VAULT, held);
const isThere = (held) => fs.access(at(held)).then(() => true, () => false);

const adapter = {
	exists: isThere,
	read: (held) => fs.readFile(at(held), "utf8"),
	write: (held, text) => fs.writeFile(at(held), text),
	mkdir: (held) => fs.mkdir(at(held), { recursive: true }),
	remove: (held) => fs.rm(at(held)),
	rmdir: (held) => fs.rm(at(held), { recursive: true, force: true }),
	async list(held) {
		const found = { files: [], folders: [] };
		for (const entry of await fs.readdir(at(held))) {
			const inside = `${held}/${entry}`;
			const stat = await fs.stat(at(inside)).catch(() => null);
			if (!stat) continue;
			if (stat.isDirectory()) found.folders.push(inside);
			else found.files.push(inside);
		}
		return found;
	},
};

if (!(await isThere(".widgetarium/widgets"))) {
	console.error(`!!  there is no .widgetarium/widgets under ${VAULT} — set WG_VAULT to the folder Obsidian opens`);
	process.exit(1);
}

const installer = createInstaller({
	adapter,
	fetchJson: (url) => fetch(url).then((answer) => answer.json()),
	fetchText: (url) => fetch(url).then((answer) => answer.text()),
	disk: null,
});

const started = Date.now();
const done = await installer.rebuildDrifted();
const lock = await installer.lock();

for (const id of done.rebuilt) {
	const record = lock.builds[id];
	console.log(`built  ${id}  from ${record.from}${record.compiler ? ` with ${record.compiler}` : ""}, ${Object.keys(record.inputs).length} input(s) hashed`);
}
for (const each of done.failures) console.log(`!!     ${each.id}: ${each.failure}`);

console.log(`\n${done.rebuilt.length} built, ${done.failures.length} refused, ${Object.keys(lock.builds).length} recorded in the lock — ${Date.now() - started}ms`);
process.exit(done.failures.length === 0 ? 0 : 1);
