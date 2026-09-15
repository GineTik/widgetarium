import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { normalizeBoard } from "../model.js";
import { columnsOf, isBox, keptAt, laid, sideOf, GAP_PX, REGION_PAD_PX } from "../tree.js";
import { GRID } from "../paths.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const VAULT = resolve(HERE, "..", "..");
const WIDGETS_DIR = join(VAULT, ".widgetarium", "widgets");
const INDEX_PATH = join(VAULT, ".widgetarium", "catalogue.json");
const PLUGIN_DATA = join(VAULT, ".obsidian", "plugins", "widgetarium", "data.json");
const REGISTRY_FILE = "widgetarium-registry.json";
const FENCE = "```";
const BOARD_LANGUAGE = "widgetarium";
const DEFAULT_BOARD_WIDTH = 1400;

// TODO: import idOfFolder, readRegistry and mergeCatalogue from the engine too, now that this script is bundled
const SOURCE_FILES = ["widget.tsx", "widget.ts", "widget.jsx", "widget.js"];
const STEPS_OUT_OF_THE_REPOSITORY = /^\/|(^|\/)\.\.(\/|$)/;

const LARGEST_PAGE = 100;
const DEFAULT_PAGE = 20;

const HELP = `widgets — the Widgetarium catalogue, for the agent

  node widgets.mjs list [options]       every widget this vault can draw or install
  node widgets.mjs show <id>            one widget's manifest and the files it is made of
  node widgets.mjs source <id>          print a widget's component source
  node widgets.mjs packs                the packs, and how many widgets each holds
  node widgets.mjs sources              the catalogue sources this vault reads
  node widgets.mjs layout <note>        the measured layout of a board, region by region

Options for list:
  --search <words>    match id, title, description or keywords
  --tag <keyword>     keep only widgets carrying this keyword
  --pack <@pack>      keep only widgets in this pack
  --source <where>    installed | offered | all            (default: all)
  --offset <n>        skip this many                       (default: 0)
  --limit <n>         return at most this many, 1 to 100   (default: 20)
  --text              print a readable table instead of JSON
`;

function optionsIn(argv) {
	const held = { _: [] };
	for (let at = 0; at < argv.length; at += 1) {
		const token = argv[at];
		if (!token.startsWith("--")) {
			held._.push(token);
			continue;
		}
		const name = token.slice(2);
		const next = argv[at + 1];
		if (next === undefined || next.startsWith("--")) {
			held[name] = true;
			continue;
		}
		held[name] = next;
		at += 1;
	}
	return held;
}

async function readJson(at, fallback) {
	try {
		return JSON.parse(await readFile(at, "utf8"));
	} catch {
		return fallback;
	}
}

// TRADE-OFF: a Dirent describes the link, never its target, so a linked scope has to be stat-ed to be seen at all
async function pointsAt(at, kind) {
	try {
		const held = await stat(at);
		return kind === "folder" ? held.isDirectory() : held.isFile();
	} catch {
		return false;
	}
}

async function readdirOf(at) {
	try {
		return await readdir(at, { withFileTypes: true });
	} catch {
		return [];
	}
}

async function foldersIn(at) {
	const found = [];
	for (const entry of await readdirOf(at)) {
		const full = join(at, entry.name);
		if (entry.isDirectory() || (entry.isSymbolicLink() && (await pointsAt(full, "folder")))) found.push(full);
	}
	return found;
}

async function filesIn(at) {
	const found = [];
	for (const entry of await readdirOf(at)) {
		if (entry.isFile() || (entry.isSymbolicLink() && (await pointsAt(join(at, entry.name), "file"))))
			found.push(entry.name);
	}
	return found;
}

function idOfFolder(folder) {
	const parts = folder.split(/[\\/]/);
	const scope = parts[parts.length - 2] ?? "";
	return scope.startsWith("@") ? `${scope}/${parts[parts.length - 1]}` : "";
}

const pathInsideTheRepository = (path) =>
	typeof path === "string" && !STEPS_OUT_OF_THE_REPOSITORY.test(path) ? path : null;

function cardFrom(raw, id, extra) {
	return {
		id,
		pack: String(id).split("/")[0],
		title: typeof raw?.title === "string" && raw.title !== "" ? raw.title : id,
		description: typeof raw?.description === "string" ? raw.description : "",
		keywords: Array.isArray(raw?.keywords) ? raw.keywords.map(String) : [],
		defaultSize: raw?.defaultSize ?? null,
		api: Number.isInteger(raw?.api) ? raw.api : 1,
		...extra,
	};
}

async function installedWidgets() {
	const found = [];
	for (const scope of await foldersIn(WIDGETS_DIR)) {
		for (const folder of await foldersIn(scope)) {
			const files = await filesIn(folder);
			if (!files.some((name) => SOURCE_FILES.includes(name))) continue;
			const manifest = await readJson(join(folder, "manifest.json"), {});
			const id = typeof manifest.id === "string" && manifest.id !== "" ? manifest.id : idOfFolder(folder);
			found.push(cardFrom(manifest, id, { installed: true, folder, files }));
		}
	}
	return found;
}

function repositoryIn(url) {
	const found = String(url ?? "").match(/github\.com[/:]([^/]+)\/([^/.]+)/);
	return found ? { owner: found[1], repo: found[2] } : null;
}

async function configuredSources() {
	const index = await readJson(INDEX_PATH, null);
	const data = await readJson(PLUGIN_DATA, null);
	const listed = [
		...(Array.isArray(data?.registries) ? data.registries : []),
		...(Array.isArray(index?.sources) ? index.sources : []),
	];
	return listed.filter((source) => source?.repository || source?.path);
}

async function rowsFromRegistry(source) {
	const repository = repositoryIn(source.repository);
	if (!repository) return [];
	const url = `https://raw.githubusercontent.com/${repository.owner}/${repository.repo}/${source.ref ?? "HEAD"}/${REGISTRY_FILE}`;
	try {
		const answer = await fetch(url);
		if (!answer.ok) return [];
		const parsed = JSON.parse(await answer.text());
		return (Array.isArray(parsed.widgets) ? parsed.widgets : [])
			.filter((row) => typeof row?.id === "string" && row.id !== "")
			.map((row) =>
				cardFrom(row, row.id, { installed: false, origin: source.repository, path: pathInsideTheRepository(row.path) }),
			);
	} catch {
		return [];
	}
}

async function offeredWidgets() {
	const index = await readJson(INDEX_PATH, null);
	const listed = (Array.isArray(index?.widgets) ? index.widgets : [])
		.filter((row) => typeof row?.id === "string" && row.id !== "")
		.map((row) =>
			cardFrom(row, row.id, {
				installed: false,
				origin: row.repository ?? null,
				path: pathInsideTheRepository(row.path),
			}),
		);
	const fetched = [];
	for (const source of await configuredSources()) {
		if (source.repository) fetched.push(...(await rowsFromRegistry(source)));
	}
	return [...listed, ...fetched];
}

function merged(installed, offered) {
	const held = new Map();
	for (const entry of [...offered, ...installed]) {
		if (!entry.id) continue;
		held.set(entry.id, { ...(held.get(entry.id) ?? {}), ...entry });
	}
	return [...held.values()].sort((one, other) => one.id.localeCompare(other.id));
}

function matches(entry, asked) {
	const said = `${entry.id} ${entry.title} ${entry.description} ${(entry.keywords ?? []).join(" ")}`.toLowerCase();
	return asked
		.toLowerCase()
		.split(/\s+/)
		.filter(Boolean)
		.every((word) => said.includes(word));
}

function filtersAskedFor(options) {
	return [
		[options.source === "installed", (entry) => entry.installed],
		[options.source === "offered", (entry) => !entry.installed],
		[typeof options.pack === "string", (entry) => entry.pack === options.pack],
		[
			typeof options.tag === "string",
			(entry) => entry.keywords.some((word) => word.toLowerCase() === String(options.tag).toLowerCase()),
		],
		[typeof options.search === "string", (entry) => matches(entry, options.search)],
	]
		.filter(([asked]) => asked)
		.map(([, keep]) => keep);
}

function kept(entries, options) {
	return filtersAskedFor(options).reduce((held, keep) => held.filter(keep), entries);
}

function windowOf(options) {
	const offset = Math.max(0, Number(options.offset) || 0);
	const asked = Number(options.limit);
	const limit = Number.isFinite(asked) && asked > 0 ? Math.min(LARGEST_PAGE, Math.floor(asked)) : DEFAULT_PAGE;
	return { offset, limit };
}

function say(options, value, lines) {
	console.log(options.text ? lines : JSON.stringify(value, null, "\t"));
}

async function list(options) {
	const entries = kept(merged(await installedWidgets(), await offeredWidgets()), options);
	const { offset, limit } = windowOf(options);
	const page = entries.slice(offset, offset + limit);
	const value = { total: entries.length, offset, limit, widgets: page };
	const lines = [
		`${entries.length} widgets, showing ${page.length} from ${offset}`,
		...page.map((entry) => `${entry.installed ? "installed" : "offered  "}  ${entry.id.padEnd(30)} ${entry.title}`),
	].join("\n");
	say(options, value, lines);
}

async function find(id) {
	const all = merged(await installedWidgets(), await offeredWidgets());
	return all.find((entry) => entry.id === id) ?? null;
}

async function show(id, options) {
	const entry = await find(id);
	if (!entry) return missing(id);
	const manifest = entry.folder ? await readJson(join(entry.folder, "manifest.json"), null) : null;
	const value = { ...entry, manifest };
	say(options, value, `${entry.id} — ${entry.title}\n${entry.description}\nfiles: ${(entry.files ?? []).join(", ")}`);
	return 0;
}

async function source(id) {
	const entry = await find(id);
	if (!entry) return missing(id);
	if (!entry.folder) {
		console.error(`${id} is offered but not installed here, so it has no source on this machine.`);
		return 1;
	}
	const name = (entry.files ?? []).find((each) => SOURCE_FILES.includes(each));
	if (!name) {
		console.error(`${id} has no component file in ${entry.folder}.`);
		return 1;
	}
	console.log(await readFile(join(entry.folder, name), "utf8"));
	return 0;
}

async function packs(options) {
	const held = new Map();
	for (const entry of merged(await installedWidgets(), await offeredWidgets())) {
		const seen = held.get(entry.pack) ?? { pack: entry.pack, widgets: 0, installed: 0 };
		seen.widgets += 1;
		if (entry.installed) seen.installed += 1;
		held.set(entry.pack, seen);
	}
	const value = [...held.values()].sort((one, other) => one.pack.localeCompare(other.pack));
	say(
		options,
		value,
		value.map((row) => `${row.pack.padEnd(16)} ${row.widgets} widgets, ${row.installed} installed`).join("\n"),
	);
}

async function sources(options) {
	const value = await configuredSources();
	say(
		options,
		value,
		value.map((row) => row.repository ?? row.path).join("\n") || "no sources are configured in this vault",
	);
}

function missingNote() {
	console.error("Name the note to measure, for example: layout Boards/Dashboard.md");
	return 1;
}

function boardIn(text) {
	const after = text.split(`${FENCE}${BOARD_LANGUAGE}`)[1];
	if (after === undefined) return null;
	try {
		return normalizeBoard(parse(after.split(FENCE)[0]));
	} catch {
		return null;
	}
}

function drawnNode(node, depth) {
	const pad = "  ".repeat(depth);
	if (!isBox(node)) {
		const tall = node.height ? ` ${node.height}px tall` : "";
		return `${pad}${node.id}${tall} \u00b7 ${Math.round(node.width)}px wide`;
	}
	const said = `${pad}${node.dir}${node.isStacked ? " (stacked)" : ""} \u00b7 ${Math.round(node.width)}px`;
	return [said, ...node.of.map((child) => drawnNode(child, depth + 1))].join("\n");
}

async function layout(at, options) {
	const note = await readFile(join(VAULT, at), "utf8").catch(() => null);
	if (note === null) {
		console.error(`There is no note at ${at}.`);
		return 1;
	}
	const board = boardIn(note);
	if (board === null) {
		console.error(`${at} holds no Widgetarium board that can be read.`);
		return 1;
	}

	const width = Number(options.width) || DEFAULT_BOARD_WIDTH;
	const root = board.layout;
	const keep = keptAt(root);
	const where = columnsOf(root, width);
	const nameOf = (index) => (index === keep ? "main" : sideOf(root, index));
	const named = (index) => `${nameOf(index)}[${index}]`;

	const tree = [];
	for (const column of where.beside) {
		tree.push(named(column.at));
		tree.push(
			drawnNode(
				laid(root.of[column.at], column.width - REGION_PAD_PX * 2, { ask: () => ({}), gap: GAP_PX, path: [column.at] }),
				1,
			),
		);
	}

	const head = [
		`${at} at ${width}px: ${board.tiles.length} tiles, ${root.of.length} regions, cell ${GRID.cellPx}px`,
		`beside: ${where.beside.map((one) => `${named(one.at)} ${Math.round(one.width)}px`).join(", ") || "none"}`,
		`floating: ${where.floating.map(named).join(", ") || "none"}`,
		`hidden: ${where.hidden.map(named).join(", ") || "none"}`,
	];
	say(
		options,
		{ note: at, width, tiles: board.tiles.length, regions: root.of.length, tree },
		[...head, ...tree].join("\n"),
	);
	return 0;
}

function missing(id) {
	console.error(`No widget is called ${id}. Run "list" to see what there is.`);
	return 1;
}

const options = optionsIn(process.argv.slice(2));
const [command, argument] = options._;

const ran = await (async () => {
	if (command === "list") return list(options);
	if (command === "show") return argument ? show(argument, options) : missing(String(argument));
	if (command === "source") return argument ? source(argument) : missing(String(argument));
	if (command === "packs") return packs(options);
	if (command === "sources") return sources(options);
	if (command === "layout") return argument ? layout(argument, options) : missingNote();
	console.log(HELP);
	return command === undefined || command === "help" ? 0 : 1;
})();

process.exit(typeof ran === "number" ? ran : 0);
