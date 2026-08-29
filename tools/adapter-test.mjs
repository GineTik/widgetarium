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
// the note text, so a body read and a body write have something to work on that is not the
// user's own vault
const texts = new Map(files.map((file) => [file.path, fs.readFileSync(path.join(VAULT, FOLDER, file.name ?? file.path.split("/").pop()), "utf8")]));

const app = {
	vault: {
		getAbstractFileByPath: (target) => (target === FOLDER ? folder : files.find((file) => file.path === target) ?? null),
		create: async (target, body) => { written.push({ target, body }); return files[0]; },
		cachedRead: async (file) => texts.get(file.path) ?? "",
		// Vault.process is the queued read-modify-write the app ships; the stand-in keeps the
		// same contract — the callback sees the text and its return value becomes the file.
		process: async (file, edit) => {
			const next = edit(texts.get(file.path) ?? "");
			texts.set(file.path, next);
			written.push({ target: file.path, text: next });
			return next;
		},
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


// A RECORD CARRIES NO BODY, so a widget could see a note's properties and never its text.
// Lazily: listing twenty cards must not cost twenty file reads, and opening one costs one.
check("a listed record carries no body", everything.rows[0].body, undefined);
check("and listing never reads a file", texts.size > 0 && written.filter((entry) => entry.text).length, 0);

// a note nothing above has written to, so the two sides of the comparison are the same note
const untouched = files[2].path;
const fetched = await slot.get({ path: untouched });
check("fetching one record carries its body", typeof fetched.body, "string");
check("and it is the text UNDER the frontmatter, not the file", fetched.body.includes("title:"), false);
check("the properties still come with it", fetched.props, everything.rows.find((row) => row.path === untouched).props);
check("a path that is not a note fetches nothing", await slot.get({ path: "Orbitask/Tasks/nope.md" }), null);

{
	// ROUND-TRIP: the half that was not written comes back untouched. A body write that
	// reformats the frontmatter loses properties nobody edited.
	const target = { path: files[1].path };
	const before = texts.get(target.path);
	const head = before.split("\n").slice(0, before.split("\n").indexOf("---", 1) + 1).join("\n");

	const saved = await slot.update(target, { body: "Rewritten by a widget.\n" });
	check("a body write reaches the vault", texts.get(target.path).includes("Rewritten by a widget."), true);
	check("and the frontmatter is byte-identical", texts.get(target.path).startsWith(head), true);
	// LOAD-BEARING ONLY ONCE THE ABOVE IS GREEN: with an empty body at both ends it compares nothing
	check("the record it hands back carries what was written", saved.body, "Rewritten by a widget.\n");
	check("and reading it again finds the same body", (await slot.get(target)).body, "Rewritten by a widget.\n");

	const propsOnly = await slot.update(target, { props: { status: "Done" } });
	check("a properties-only write leaves the body alone", (await slot.get(target)).body, "Rewritten by a widget.\n");
	check("and does not pretend to carry one", propsOnly.body, undefined);

	// A NOTE WITH NO PROPERTIES given a body that opens with a rule: writing it would hand the
	// note frontmatter it never had, and the next read would take the first paragraph for
	// properties. Refuse, and do not report a body the file does not hold.
	texts.set(target.path, "No properties here.\n");
	const refusedWrite = await slot.update(target, { body: "---\nnot: properties\n---\nbody" });
	check("a body that would become frontmatter is refused", texts.get(target.path), "No properties here.\n");
	check("and the record does not claim the body that was asked for", refusedWrite.body, undefined);
}

console.log(failed ? `\n${failed} failed` : "\nthe shipped adapter answers");
process.exit(failed ? 1 : 0);
