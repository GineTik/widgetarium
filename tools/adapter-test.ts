import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import type { App } from "obsidian";
import type { HostPlugin } from "../apps/obsidian/src/host.js";
import type { RenderCall } from "./loader/obsidian-stub.mts";
import { fieldIn } from "./held-fields.ts";
import { isRecord, present } from "./page-dom.ts";
import { standIn } from "./stand-in.ts";

Object.assign(globalThis, { window: { setTimeout, clearTimeout } });

const { TFile, TFolder, MarkdownRenderer, MarkdownRenderChild } = await import("./loader/obsidian-stub.mts");
const { createHost, bindNote } = await import("../apps/obsidian/src/host.js");

type Props = Record<string, unknown>;

interface FakeNote {
	readonly path: string;
	readonly basename: string;
	readonly extension: string;
	readonly stat: { readonly ctime: number; readonly mtime: number };
	readonly name?: string;
	props: Props;
}

interface Written {
	readonly target: string;
	readonly body?: string;
	readonly text?: string;
	readonly props?: Props;
}

interface Child {
	loaded?: boolean;
}

const VAULT = process.env["WG_VAULT"] ?? "tools/fixture";
const FOLDER = "Orbitask/Tasks";

function frontmatter(text: string): Props {
	const found = /^---\n([\s\S]*?)\n---/.exec(text);
	const parsed: unknown = found ? (parseYaml(found[1] ?? "") ?? {}) : {};
	return isRecord(parsed) ? { ...parsed } : {};
}

const files = fs
	.readdirSync(path.join(VAULT, FOLDER))
	.filter((name) => name.endsWith(".md"))
	.map((name): FakeNote => {
		const file = Object.assign(new TFile(), {
			path: `${FOLDER}/${name}`,
			basename: name.replace(/\.md$/, ""),
			extension: "md",
			stat: { ctime: 1, mtime: 2 },
			props: {},
		});
		file.props = frontmatter(fs.readFileSync(path.join(VAULT, FOLDER, name), "utf8"));
		return file;
	});
function atMost(before: unknown, after: unknown): boolean {
	if (typeof before === "string" && typeof after === "string") return before <= after;
	return Number(before) <= Number(after);
}

const fileAt = (at: number): FakeNote => present(files[at], `note ${at}`);

const folder = Object.assign(new TFolder(), { path: FOLDER, children: files });
const written: Written[] = [];
const texts = new Map(
	files.map((file) => [
		file.path,
		fs.readFileSync(path.join(VAULT, FOLDER, file.name ?? file.path.split("/").pop() ?? ""), "utf8"),
	]),
);

const appFake = {
	vault: {
		getAbstractFileByPath: (target: string) =>
			target === FOLDER ? folder : (files.find((file) => file.path === target) ?? null),
		create: async (target: string, body: string) => {
			written.push({ target, body });
			return files[0];
		},
		cachedRead: async (file: FakeNote) => texts.get(file.path) ?? "",
		process: async (file: FakeNote, edit: (text: string) => string) => {
			const next = edit(texts.get(file.path) ?? "");
			texts.set(file.path, next);
			written.push({ target: file.path, text: next });
			return next;
		},
		on: () => ({}),
		off: () => {},
	},
	metadataCache: {
		getFileCache: (file: FakeNote) => ({ frontmatter: file.props }),
		on: () => {},
		off: () => {},
	},
	fileManager: {
		processFrontMatter: async (file: FakeNote, edit: (props: Props) => void) => {
			edit(file.props);
			written.push({ target: file.path, props: { ...file.props } });
		},
	},
	workspace: { getLeaf: () => ({ openFile: async () => {} }) },
};

const app = standIn<App>(appFake, ["vault", "metadataCache", "fileManager", "workspace"], "app");

const children: Child[] = [];
const pluginFake = {
	registerEvent: () => {},
	addChild: <C extends Child>(child: C): C => {
		children.push(child);
		child.loaded = true;
		return child;
	},
	removeChild: <C extends Child>(child: C): C => {
		if (!children.includes(child)) throw new Error("removeChild called for a child the plugin does not hold");
		children.splice(children.indexOf(child), 1);
		child.loaded = false;
		return child;
	},
};
const host = createHost(app, standIn<HostPlugin>(pluginFake, ["addChild", "removeChild"], "plugin"));
const slot = host.slot({ path: FOLDER });
const update = present(slot.update, "the folder's update");
const elementLike = (fake: { textContent: string }): HTMLElement =>
	standIn<HTMLElement>(fake, ["textContent"], "element");
const lastRender = (): RenderCall => present(MarkdownRenderer.calls.at(-1), "a render call");

let failed = 0;
const check = (label: string, got: unknown, want: unknown): void => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK " : "!! "} ${label}${ok ? ` — ${JSON.stringify(got)}` : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`}`,
	);
};

const everything = await slot.list({});
check("the adapter lists the folder at all", everything.rows.length, files.length);

check("a record carries its own path", typeof everything.rows[0]?.path, "string");

const sorted = await slot.list({ sort: [{ prop: "order", dir: "asc" }] });
check("sorting by a property does not throw", sorted.rows.length, files.length);
const orders = sorted.rows.map((row) => row.props["order"]);
const numbered = orders.filter((value) => value !== undefined);
check(
	"and it really is ascending",
	numbered.every((value, index) => index === 0 || atMost(numbered[index - 1], value)),
	true,
);
check(
	"a note missing the property sorts last",
	orders.slice(numbered.length).every((value) => value === undefined),
	true,
);

const marketing = await slot.list({ where: [{ prop: "board", op: "is", value: "Marketing Team" }] });
check(
	"filtering by a property narrows the list",
	marketing.rows.length > 0 && marketing.rows.length < files.length,
	true,
);
check(
	"and every row really carries it",
	marketing.rows.every((row) => row.props["board"] === "Marketing Team"),
	true,
);

const one = await slot.list({ where: [{ prop: "path", op: "is", value: fileAt(0).path }] });
check("filtering by path finds exactly one note", one.rows.length, 1);

check("the folder is writable", [slot.canCreate, slot.canUpdate], [true, true]);
await update({ path: fileAt(0).path }, { props: { status: "Done" } });
check(
	"an update reaches the vault",
	written.some((entry) => entry.props?.["status"] === "Done"),
	true,
);

const empty = host.slot({ path: "" });
check("an unbound slot is read-only", empty.canCreate, false);
check("and it lists nothing rather than throwing", (await empty.list({})).rows.length, 0);

check("a listed record carries no body", everything.rows[0]?.body, undefined);
check("and listing never reads a file", texts.size > 0 && written.filter((entry) => entry.text).length, 0);

const untouched = fileAt(2).path;
const fetched = present(await slot.get({ path: untouched }), "the fetched note");
check("fetching one record carries its body", typeof fetched.body, "string");
check("and it is the text UNDER the frontmatter, not the file", fetched.body?.includes("title:"), false);
check("the properties still come with it", fetched.props, everything.rows.find((row) => row.path === untouched)?.props);
check("a path that is not a note fetches nothing", await slot.get({ path: "Orbitask/Tasks/nope.md" }), null);

{
	const target = { path: fileAt(1).path };
	const before = present(texts.get(target.path), "the note text");
	const head = before
		.split("\n")
		.slice(0, before.split("\n").indexOf("---", 1) + 1)
		.join("\n");

	const saved = await update(target, { body: "Rewritten by a widget.\n" });
	check("a body write reaches the vault", (texts.get(target.path) ?? "").includes("Rewritten by a widget."), true);
	check("and the frontmatter is byte-identical", (texts.get(target.path) ?? "").startsWith(head), true);
	check("the record it hands back carries what was written", saved?.body, "Rewritten by a widget.\n");
	check("and reading it again finds the same body", (await slot.get(target))?.body, "Rewritten by a widget.\n");

	const propsOnly = await update(target, { props: { status: "Done" } });
	check("a properties-only write leaves the body alone", (await slot.get(target))?.body, "Rewritten by a widget.\n");
	check("and does not pretend to carry one", propsOnly?.body, undefined);

	texts.set(target.path, "No properties here.\n");
	const refusedWrite = await update(target, { body: "---\nnot: properties\n---\nbody" });
	check("a body that would become frontmatter is refused", texts.get(target.path), "No properties here.\n");
	check("and the record does not claim the body that was asked for", refusedWrite?.body, undefined);
}

check("the host declares it can render markdown", host.can.renderMarkdown, true);
{
	const element = elementLike({ textContent: "stale" });
	const stop = host.ui.renderMarkdown(element, "# Hello", "Orbitask/Tasks/a.md");
	const call = lastRender();
	check("what stood in the element before is gone", element.textContent, "# Hello");
	check(
		"the renderer is called with app, markdown, element, sourcePath",
		[call.app === app, call.markdown, call.el === element, call.sourcePath],
		[true, "# Hello", true, "Orbitask/Tasks/a.md"],
	);
	check(
		"and a component, or Obsidian leaks what it registered inside",
		call.component instanceof MarkdownRenderChild,
		true,
	);
	check(
		"the component is loaded by the plugin that owns it",
		children.some((child) => child === call.component),
		true,
	);
	check("and letting go unloads it", (stop(), children.some((child) => child === call.component)), false);
	check("a host that renders markdown says so through can, not by guessing", typeof host.ui.renderMarkdown, "function");
	check("letting go twice is letting go once", (stop(), children.length), 0);
	check("and the child stays unloaded", fieldIn(call.component, "loaded"), false);
}

{
	const bound = bindNote(host, "Orbitask/Board.md");
	const element = elementLike({ textContent: "" });
	bound.ui.renderMarkdown(element, "[[Task A]]");
	check("a bound host renders from its own note", lastRender().sourcePath, "Orbitask/Board.md");
	bound.ui.renderMarkdown(element, "[[Task A]]", "Other/Note.md");
	check("and a caller that names a path still wins", lastRender().sourcePath, "Other/Note.md");
	host.ui.renderMarkdown(element, "[[Task A]]");
	check("an unbound host has no note to resolve from", lastRender().sourcePath, "");
	check("binding nothing hands back the same host, not a wrapper", bindNote(host, "") === host, true);
}

console.log(failed ? `\n${failed} failed` : "\nthe shipped adapter answers");
process.exit(failed ? 1 : 0);
