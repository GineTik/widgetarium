import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { boardOfNote } from "./board-note.mjs";
import { lintOfNote } from "./lint-command.mjs";
import { surfacesOfNote } from "./surfaces-command.mjs";
import { columnsOf, keptAt, layRegion, sideOf } from "@widgetarium/core/tree.js";
import { cardIn } from "./entries.mjs";
import { filesIn, foldersIn, readJson, widgetFilesIn } from "./vault-files.mjs";
import { installWidget } from "./install-command.mjs";
import { BASE_NAMES, baseNamed, cardLayoutNamed, everyBase } from "./shape-command.mjs";
import { offeredBySource } from "./offered.mjs";
import { surfaceNamesIn } from "./widget-surface.mjs";
import { rankWidgets, refuseReading } from "./find-command.mjs";
import { checkWidget, saidWidgetCheck } from "@widgetarium/core/widget-check.js";
import { HELP } from "./widgets-cli-help.mjs";
import { drawnNode } from "./drawn-node.mjs";
import { GRID, LOCK_PATH } from "@widgetarium/core/paths.js";
import { SOURCE_FILES, isWidgetModule, javascriptSourceRefusal } from "@widgetarium/core/engine/widget-build.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const VAULT = resolve(HERE, "..", "..");
const WIDGETS_DIR = join(VAULT, ".widgetarium", "widgets");
const INDEX_PATH = join(VAULT, ".widgetarium", "catalogue.json");
const PLUGIN_DATA = join(VAULT, ".obsidian", "plugins", "widgetarium", "data.json");
const DEFAULT_BOARD_WIDTH = 1400;

// TODO: import idOfFolder, readRegistry and mergeCatalogue from the engine too, now that this script is bundled
const STYLE_FILES = ["widget.css"];
const STEPS_OUT_OF_THE_REPOSITORY = /^\/|(^|\/)\.\.(\/|$)/;
const WIDGET_ID = /^@[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/;
const NOT_AN_ID = "{id} is not a widget id. Name it @scope/name, in lowercase words joined by hyphens.";
const STARTED_NEW = "Building {id}, a new widget. Write its files in {folder}.";
const STARTED_EDIT = "Building {id}, which is already here. Edit its files in {folder}.";
const STARTED_PUBLISHED =
	"{id} was installed from a repository, so the next update replaces whatever you change in {folder}.";

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
		role: typeof raw?.role === "string" ? raw.role : null,
		...extra,
	};
}

function sayJavascriptRefused(files, folder) {
	const refusal = javascriptSourceRefusal(files, folder);
	if (refusal) console.error(refusal);
}

async function installedWidgets() {
	const found = [];
	for (const scope of await foldersIn(WIDGETS_DIR)) {
		for (const folder of await foldersIn(scope)) {
			const files = await widgetFilesIn(folder);
			sayJavascriptRefused(files, folder);
			if (!files.some((name) => SOURCE_FILES.includes(name))) continue;
			const manifest = (await cardIn(folder)) ?? {};
			const id = typeof manifest.id === "string" && manifest.id !== "" ? manifest.id : idOfFolder(folder);
			found.push(cardFrom(manifest, id, { installed: true, folder, files }));
		}
	}
	return found;
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
	for (const source of await configuredSources()) fetched.push(...(await offeredBySource(source, cardFrom)));
	return [...listed, ...fetched];
}

function mergeEntries(installed, offered) {
	const held = new Map();
	for (const entry of [...offered, ...installed]) {
		if (!entry.id) continue;
		held.set(entry.id, { ...(held.get(entry.id) ?? {}), ...entry });
	}
	return [...held.values()].sort((one, other) => one.id.localeCompare(other.id));
}

function say(options, value, lines) {
	console.log(options.text ? lines : JSON.stringify(value, null, "\t"));
}

function tell(options, answer) {
	if (answer.refusal) {
		console.error(answer.refusal);
		return 1;
	}
	say(options, answer.value, answer.text);
	return 0;
}

async function findRanked(options) {
	const refusal = refuseReading(options.reading);
	if (refusal) {
		console.error(refusal);
		return 1;
	}
	const entries = mergeEntries(await installedWidgets(), await offeredWidgets());
	const { value, text } = await rankWidgets(entries, options);
	say(options, value, text);
	return 0;
}

async function runInstall(id, options) {
	const entry = await entryById(id);
	if (!entry) return missing(id);
	const done = await installWidget(entry, { widgetsDir: WIDGETS_DIR, lockPath: join(VAULT, LOCK_PATH) }).catch(
		(thrown) => ({
			failure: `${id} could not be installed: ${thrown?.message ?? thrown}. The lock says it was left unfinished, so installing it again is safe.`,
		}),
	);
	if (done.failure) {
		console.error(done.failure);
		return 1;
	}
	say(options, { widget: id, at: done.at, files: done.files }, `${id} installed: ${done.files.join(", ")}`);
	return 0;
}

async function runStart(id, options) {
	if (!WIDGET_ID.test(id)) {
		console.error(NOT_AN_ID.replace("{id}", id));
		return 1;
	}
	const folder = join(WIDGETS_DIR, ...id.split("/"));
	const isNew = (await filesIn(folder)).length === 0;
	const lock = await readJson(join(VAULT, LOCK_PATH), {});
	const isPublished = Boolean(lock?.widgets?.[id]);
	const title = typeof options.title === "string" ? options.title : null;
	const started = { widget: id, title, folder, isNew, isPublished };
	say(options, started, saidStart(started));
	return 0;
}

function saidStart({ widget, folder, isNew, isPublished }) {
	const said = [isNew ? STARTED_NEW : STARTED_EDIT, isPublished ? STARTED_PUBLISHED : null].filter(Boolean);
	return said.map((line) => line.replace("{id}", widget).replace("{folder}", folder)).join("\n");
}

async function runCheck(id, options) {
	const entry = await entryById(id);
	if (!entry) return missing(id);
	const surface = await surfaceNamesIn(join(WIDGETS_DIR, "types"));
	if (surface === null) {
		console.error(
			`${WIDGETS_DIR}/types holds no widgetarium.d.ts, so the rule that catches a crash at draw time cannot run and no widget can be called clean. Let the plugin load once; it lays the types beside the widgets.`,
		);
		return 1;
	}
	const found = checkWidget({
		id,
		source: await joinFiles(entry, isWidgetModule),
		styles: await joinFiles(entry, (name) => STYLE_FILES.includes(name)),
		card: await cardOf(entry),
		surface,
	});
	say(options, { widget: id, clean: found.length === 0, findings: found }, saidWidgetCheck(found));
	return found.length === 0 ? 0 : 1;
}

async function joinFiles(entry, isWanted) {
	const named = (entry.files ?? []).filter(isWanted);
	const texts = [];
	for (const name of named) texts.push(await readFile(join(entry.folder, name), "utf8").catch(() => ""));
	return texts.join("\n");
}

async function cardOf(entry) {
	return await cardIn(entry.folder);
}

async function entryById(id) {
	const all = mergeEntries(await installedWidgets(), await offeredWidgets());
	return all.find((entry) => entry.id === id) ?? null;
}

async function show(id, options) {
	const entry = await entryById(id);
	if (!entry) return missing(id);
	const manifest = await cardIn(entry.folder);
	const value = { ...entry, manifest };
	say(options, value, `${entry.id} — ${entry.title}\n${entry.description}\nfiles: ${(entry.files ?? []).join(", ")}`);
	return 0;
}

async function source(id) {
	const entry = await entryById(id);
	if (!entry) return missing(id);
	if (!entry.folder) {
		console.error(`${id} is offered but not installed here, so it has no source on this machine.`);
		return 1;
	}
	if (!(entry.files ?? []).some((each) => SOURCE_FILES.includes(each))) {
		console.error(`${id} has no component file in ${entry.folder}.`);
		return 1;
	}
	const modules = (entry.files ?? []).filter(isWidgetModule);
	for (const name of modules) {
		if (modules.length > 1) console.log(`==> ${name} <==`);
		console.log(await readFile(join(entry.folder, name), "utf8"));
	}
	return 0;
}

async function packs(options) {
	const held = new Map();
	for (const entry of mergeEntries(await installedWidgets(), await offeredWidgets())) {
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

async function surfaces(at, options) {
	const found = await surfacesOfNote(VAULT, at, await installedWidgets());
	if (found === null) return 1;
	say(options, found.value, found.text);
	return 0;
}

async function lint(at, options) {
	const found = await lintOfNote(VAULT, at, await installedWidgets());
	if (found !== null) say(options, found.value, found.text);
	return found?.value.valid ? 0 : 1;
}

async function layout(at, options) {
	const board = await boardOfNote(VAULT, at);
	if (board === null) return 1;

	const width = Number(options.width) || DEFAULT_BOARD_WIDTH;
	const root = board.layout;
	const keep = keptAt(root);
	const where = columnsOf(root, width);
	const cards = await installedWidgets();
	const widgetOf = (id) => board.tiles.find((tile) => tile.id === id)?.widget;
	const ask = (id) => ({ widget: widgetOf(id), role: cards.find((card) => card.id === widgetOf(id))?.role });
	const nameOf = (index) => (index === keep ? "main" : sideOf(root, index));
	const named = (index) => `${nameOf(index)}[${index}]`;

	const tree = [];
	for (const column of where.beside) {
		tree.push(named(column.at));
		tree.push(drawnNode(layRegion(root, column.at, column.width, { ask }).node, 1));
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

function missingBase() {
	console.error(`Name the base to start from. The ones there are: ${BASE_NAMES.join(", ")}.`);
	return 1;
}

function missing(id) {
	console.error(`No widget is called ${id}. Run "find" to see what there is.`);
	return 1;
}

const COMMANDS = {
	find: { run: (argument, options) => findRanked(options) },
	list: { run: (argument, options) => findRanked(options) },
	packs: { run: (argument, options) => packs(options) },
	sources: { run: (argument, options) => sources(options) },
	bases: { run: (argument, options) => tell(options, everyBase()) },
	base: { asks: "base", run: (argument, options) => tell(options, baseNamed(argument)) },
	card: { run: (argument, options) => tell(options, cardLayoutNamed(argument)) },
	install: { asks: "widget", run: (argument, options) => runInstall(argument, options) },
	start: { asks: "widget", run: (argument, options) => runStart(argument, options) },
	check: { asks: "widget", run: (argument, options) => runCheck(argument, options) },
	show: { asks: "widget", run: (argument, options) => show(argument, options) },
	source: { asks: "widget", run: (argument) => source(argument) },
	layout: { asks: "note", run: (argument, options) => layout(argument, options) },
	surfaces: { asks: "note", run: (argument, options) => surfaces(argument, options) },
	lint: { asks: "note", run: (argument, options) => lint(argument, options) },
};

const MISSING_ARGUMENT = {
	note: () => missingNote(),
	base: () => missingBase(),
	widget: (argument) => missing(String(argument)),
};

function ranCommand(command, argument, options) {
	const named = Object.hasOwn(COMMANDS, String(command)) ? COMMANDS[command] : null;
	if (named === null) {
		console.log(HELP);
		return command === undefined || command === "help" ? 0 : 1;
	}
	if (named.asks === undefined || argument) return named.run(argument, options);
	return MISSING_ARGUMENT[named.asks](argument);
}

const options = optionsIn(process.argv.slice(2));
const [command, argument] = options._;

const ran = await ranCommand(command, argument, options);

process.exit(typeof ran === "number" ? ran : 0);
