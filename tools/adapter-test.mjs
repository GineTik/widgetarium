// Every earlier test built its OWN slot and proved that. This one drives src/host.js — the
// adapter that actually ships — over a stand-in vault, because the two bugs that made the
// board sit on "Loading..." forever both lived in the half no test ever touched.
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { buildMirror } from "./mirror.mjs";

globalThis.window = { setTimeout, clearTimeout };

buildMirror();
const { TFile, TFolder } = await import("./.mjs-cache/obsidian.mjs");
const { createHost } = await import("./.mjs-cache/host.mjs");

const VAULT = process.env.WG_VAULT ?? "/Users/denissevcuk/Documents/Obsidian/Personal/Personal";
const FOLDER = "Orbitask/Tasks";

function frontmatter(text) {
	const found = /^---\n([\s\S]*?)\n---/.exec(text);
	return found ? (parseYaml(found[1]) ?? {}) : {};
}

// A stand-in for the parts of the app the adapter actually asks for, no more.
const files = fs
	.readdirSync(path.join(VAULT, FOLDER))
	.filter((name) => name.endsWith(".md"))
	.map((name) => {
		const file = Object.assign(new TFile(), {
			path: `${FOLDER}/${name}`,
			basename: name.replace(/\.md$/, ""),
			extension: "md",
			stat: { ctime: 1, mtime: 2 },
		});
		file.props = frontmatter(fs.readFileSync(path.join(VAULT, FOLDER, name), "utf8"));
		return file;
	});

const folder = Object.assign(new TFolder(), { path: FOLDER, children: files });
const written = [];

const app = {
	vault: {
		getAbstractFileByPath: (target) => (target === FOLDER ? folder : files.find((file) => file.path === target) ?? null),
		create: async (target, body) => { written.push({ target, body }); return files[0]; },
		on: () => ({}), off: () => {},
	},
	metadataCache: {
		getFileCache: (file) => ({ frontmatter: file.props }),
		on: () => {}, off: () => {},
	},
	fileManager: {
		processFrontMatter: async (file, edit) => { edit(file.props); written.push({ target: file.path, props: { ...file.props } }); },
	},
	workspace: { getLeaf: () => ({ openFile: async () => {} }) },
};

const host = createHost(app, { registerEvent: () => {} });
const slot = host.slot({ kind: "folder", path: FOLDER });

let failed = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${label}${ok ? ` — ${JSON.stringify(got)}` : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`}`);
};

// REGRESSION: the adapter called matches() and valueOf() without importing either, so list()
// threw on its first call — every board, always. useSource had no catch, so the throw showed
// as an eternal "Loading tasks...".
const everything = await slot.list({});
check("the adapter lists the folder at all", everything.rows.length, files.length);

// REGRESSION: records carried only ref.path, so `path` filters matched nothing and a widget
// reading row.path got undefined — the popup could never resolve the opened task.
check("a record carries its own path", typeof everything.rows[0]?.path, "string");

const sorted = await slot.list({ sort: [{ prop: "order", dir: "asc" }] });
check("sorting by a property does not throw", sorted.rows.length, files.length);
const orders = sorted.rows.map((row) => row.props.order);
const numbered = orders.filter((value) => value !== undefined);
check("and it really is ascending", numbered.every((value, index) => index === 0 || numbered[index - 1] <= value), true);
// REGRESSION: a note created without the property used to land wherever the sort left it
check("a note missing the property sorts last", orders.slice(numbered.length).every((value) => value === undefined), true);

const marketing = await slot.list({ where: [{ prop: "board", op: "is", value: "Marketing Team" }] });
check("filtering by a property narrows the list", marketing.rows.length > 0 && marketing.rows.length < files.length, true);
check("and every row really carries it", marketing.rows.every((row) => row.props.board === "Marketing Team"), true);

const one = await slot.list({ where: [{ prop: "path", op: "is", value: files[0].path }] });
check("filtering by path finds exactly one note", one.rows.length, 1);

check("the folder is writable", [slot.canCreate, slot.canUpdate], [true, true]);
await slot.update({ path: files[0].path }, { props: { status: "Done" } });
check("an update reaches the vault", written.some((entry) => entry.props?.status === "Done"), true);

const empty = host.slot({ kind: "folder", path: "" });
check("an unbound slot is read-only", empty.canCreate, false);
check("and it lists nothing rather than throwing", (await empty.list({})).rows.length, 0);

console.log(failed ? `\n${failed} failed` : "\nthe shipped adapter answers");
process.exit(failed ? 1 : 0);
