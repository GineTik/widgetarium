import fs from "node:fs";
import nodePath from "node:path";
import { buildMirror } from "./mirror.mjs";

globalThis.window = { setTimeout, clearTimeout, queueMicrotask };
globalThis.document = {
	head: { appendChild: () => {} },
	createElement: () => ({ dataset: {}, remove: () => {} }),
};

buildMirror();
const { WidgetRegistry } = await import("./.mjs-cache/registry.mjs");

const SOURCE = process.env.WG_WIDGETS ?? nodePath.resolve("widgets");
const FETCH_MS = Number(process.env.FETCH_MS ?? 60);
const WIDGETS_DIR = ".widgetarium/widgets";

const held = new Map();
const walk = (at, to) => {
	for (const name of fs.readdirSync(at)) {
		const here = nodePath.join(at, name);
		if (fs.statSync(here).isDirectory()) walk(here, `${to}/${name}`);
		else held.set(`${to}/${name}`, fs.readFileSync(here, "utf8"));
	}
};
walk(SOURCE, WIDGETS_DIR);

let reads = 0;
const fetched = () => new Promise((done) => setTimeout(done, FETCH_MS));

const foldersUnder = (at) =>
	[
		...new Set(
			[...held.keys()]
				.filter((path) => path.startsWith(`${at}/`))
				.map((path) => path.slice(at.length + 1).split("/")[0]),
		),
	]
		.map((name) => `${at}/${name}`)
		.filter((path) => [...held.keys()].some((known) => known.startsWith(`${path}/`)));

const adapter = {
	exists: async (path) => {
		reads += 1;
		await fetched();
		return held.has(path) || [...held.keys()].some((known) => known.startsWith(`${path}/`));
	},
	read: async (path) => {
		reads += 1;
		await fetched();
		return held.get(path) ?? "";
	},
	list: async (path) => {
		reads += 1;
		await fetched();
		return {
			folders: foldersUnder(path),
			files: [...held.keys()].filter(
				(known) => known.startsWith(`${path}/`) && !known.slice(path.length + 1).includes("/"),
			),
		};
	},
};

const registry = new WidgetRegistry({ vault: { adapter } });
const at = performance.now();
const loaded = await registry.load();
const spent = performance.now() - at;

console.log(`every vault read answers after ${FETCH_MS} ms, the way an evicted iCloud file does\n`);
console.log(`  widgets loaded        ${loaded.size}`);
console.log(`  reads asked for       ${reads}`);
console.log(`  registry.load() took  ${spent.toFixed(0)} ms`);
console.log(`  sequential would be   ${reads * FETCH_MS} ms`);
console.log(`  rounds deep           ${(spent / FETCH_MS).toFixed(1)}`);
process.exit(0);
