import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { boardOfNote } from "./board-note.mjs";
import { lintOfNote } from "./lint-command.mjs";
import { surfacesOfNote } from "./surfaces-command.mjs";
import { columnsOf, isBox, keptAt, laidRegion, sideOf } from "../tree.js";
import { cardIn } from "./entries.mjs";
import { filesIn, foldersIn, readJson } from "./vault-files.mjs";
import { installWidget } from "./install-command.mjs";
import { normalizeBoard, serializeBoard } from "../model.js";
import { CARD_NAMES, cardNamed, cardNode, PATTERN_NAMES, patternNamed, skeletonOf } from "../patterns.js";
import { offeredBySource } from "./offered.mjs";
import { surfaceNamesIn } from "./widget-surface.mjs";
import { rankedWidgets, refusedReading, READING_KINDS } from "./find-command.mjs";
import { checkWidget, saidWidgetCheck, WIDGET_CHECK_RULES } from "../widget-check.js";
import { GRID, LOCK_PATH } from "../paths.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const VAULT = resolve(HERE, "..", "..");
const WIDGETS_DIR = join(VAULT, ".widgetarium", "widgets");
const INDEX_PATH = join(VAULT, ".widgetarium", "catalogue.json");
const PLUGIN_DATA = join(VAULT, ".obsidian", "plugins", "widgetarium", "data.json");
const DEFAULT_BOARD_WIDTH = 1400;

// TODO: import idOfFolder, readRegistry and mergeCatalogue from the engine too, now that this script is bundled
const SOURCE_FILES = ["widget.tsx", "widget.ts", "widget.jsx", "widget.js"];
const STYLE_FILES = ["widget.css"];
const STEPS_OUT_OF_THE_REPOSITORY = /^\/|(^|\/)\.\.(\/|$)/;

const HELP = `widgets — the Widgetarium catalogue, for the agent

  node widgets.mjs find [options]       every widget, ranked against the data and the hole to fill
  node widgets.mjs install <id>         put an offered widget in this vault, so a board may use it
  node widgets.mjs pattern <name>       the skeleton a pattern cuts, regions and surfaces already on it
  node widgets.mjs card <name>          one card's parts and the plate it wears, ready to put in a region
  node widgets.mjs show <id>            one widget's manifest and the files it is made of
  node widgets.mjs check <id>           a widget's own colours, type, paging and manifest, rule by rule
  node widgets.mjs source <id>          print a widget's component source
  node widgets.mjs packs                the packs, and how many widgets each holds
  node widgets.mjs sources              the catalogue sources this vault reads
  node widgets.mjs layout <note>        the measured layout of a board, region by region
  node widgets.mjs surfaces <note>      which surface every group should wear, law by law, and why
  node widgets.mjs lint <note>          every value, field and nesting in the layout that is not valid

Options for find, none of them a filter — every widget comes back, ranked, with its reasons:
  --role <role>       the role the hole asks for
  --reading <kind>    ${READING_KINDS}

What check names: ${WIDGET_CHECK_RULES.join(", ")}
  --needs <types>     comma-separated field types the data holds, as describes names them
  --about <words>     the subject; this one only lifts a widget's score, it never hides one

  --search <words>    keep only widgets matching these words
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

async function installedWidgets() {
	const found = [];
	for (const scope of await foldersIn(WIDGETS_DIR)) {
		for (const folder of await foldersIn(scope)) {
			const files = await filesIn(folder);
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

function merged(installed, offered) {
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

async function findRanked(options) {
	const refusal = refusedReading(options.reading);
	if (refusal) {
		console.error(refusal);
		return 1;
	}
	const entries = merged(await installedWidgets(), await offeredWidgets());
	const { value, text } = await rankedWidgets(entries, options);
	say(options, value, text);
	return 0;
}

function runCard(name, options) {
	const card = cardNamed(name);
	if (!card) {
		console.error(`${name} is not a card layout. The ones there are: ${CARD_NAMES.join(", ")}.`);
		return 1;
	}
	const alone = cardNode(name);
	const amongPeers = cardNode(name, { amongPeers: true });
	const said = [
		`${name} — ${card.suits}`,
		`standing alone it wears ${alone.surface ?? "nothing"}, among peers of its kind ${amongPeers.surface ?? "nothing"}`,
		"every part stands bare on that one plate; a part that wears a plate of its own is what law N2 refuses",
		...card.parts.map((part) => `  ${part.place.padEnd(9)} asks for ${part.asks}`),
	].join("\n");
	say(options, { card: name, alone, amongPeers, parts: card.parts }, said);
	return 0;
}

function runPattern(name, options) {
	const pattern = patternNamed(name);
	if (!pattern) {
		console.error(`${name} is not a pattern that cuts a page. The ones that do: ${PATTERN_NAMES.join(", ")}.`);
		return 1;
	}
	const skeleton = skeletonOf(name, (raw) => serializeBoard(normalizeBoard(raw)));
	const said = [
		`${name} — ${pattern.suits}`,
		`${pattern.layout.of.length} columns, needs ${pattern.needsPx}px of board width`,
		...pattern.layout.of.map(
			(box, at) =>
				`  ${at}  ${box.role.padEnd(12)} ${box.keep ? "keep" : "side"}  ${box.surface ?? "none"}  ${box.purpose}`,
		),
	].join("\n");
	say(options, skeleton, said);
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
		source: await joinedFiles(entry, SOURCE_FILES),
		styles: await joinedFiles(entry, STYLE_FILES),
		card: await cardOf(entry),
		surface,
	});
	say(options, { widget: id, clean: found.length === 0, findings: found }, saidWidgetCheck(found));
	return found.length === 0 ? 0 : 1;
}

async function joinedFiles(entry, wanted) {
	const named = (entry.files ?? []).filter((name) => wanted.includes(name));
	const texts = [];
	for (const name of named) texts.push(await readFile(join(entry.folder, name), "utf8").catch(() => ""));
	return texts.join("\n");
}

async function cardOf(entry) {
	return await cardIn(entry.folder);
}

async function entryById(id) {
	const all = merged(await installedWidgets(), await offeredWidgets());
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

function drawnNode(node, depth) {
	const pad = "  ".repeat(depth);
	const worn = node.surface ? ` \u00b7 ${node.surface}` : "";
	if (!isBox(node)) {
		const tall = node.height ? ` ${node.height}px tall` : "";
		return `${pad}${node.id}${tall} \u00b7 ${Math.round(node.width)}px wide${worn}`;
	}
	const said = `${pad}${node.dir}${node.isStacked ? " (stacked)" : ""} \u00b7 ${Math.round(node.width)}px \u00b7 gaps drawn ${
		node.of
			.slice(0, -1)
			.map((child) => `${Math.round(child.gapAfter)}px`)
			.join(", ") || "none"
	}${worn}`;
	return [said, ...node.of.map((child) => drawnNode(child, depth + 1))].join("\n");
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
		tree.push(drawnNode(laidRegion(root, column.at, column.width, { ask }).node, 1));
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
	console.error(`No widget is called ${id}. Run "find" to see what there is.`);
	return 1;
}

const COMMANDS = {
	find: { run: (argument, options) => findRanked(options) },
	list: { run: (argument, options) => findRanked(options) },
	packs: { run: (argument, options) => packs(options) },
	sources: { run: (argument, options) => sources(options) },
	pattern: { run: (argument, options) => runPattern(argument, options) },
	card: { run: (argument, options) => runCard(argument, options) },
	install: { asks: "widget", run: (argument, options) => runInstall(argument, options) },
	check: { asks: "widget", run: (argument, options) => runCheck(argument, options) },
	show: { asks: "widget", run: (argument, options) => show(argument, options) },
	source: { asks: "widget", run: (argument) => source(argument) },
	layout: { asks: "note", run: (argument, options) => layout(argument, options) },
	surfaces: { asks: "note", run: (argument, options) => surfaces(argument, options) },
	lint: { asks: "note", run: (argument, options) => lint(argument, options) },
};

function ranCommand(command, argument, options) {
	const named = Object.hasOwn(COMMANDS, String(command)) ? COMMANDS[command] : null;
	if (named === null) {
		console.log(HELP);
		return command === undefined || command === "help" ? 0 : 1;
	}
	if (named.asks === undefined || argument) return named.run(argument, options);
	return named.asks === "note" ? missingNote() : missing(String(argument));
}

const options = optionsIn(process.argv.slice(2));
const [command, argument] = options._;

const ran = await ranCommand(command, argument, options);

process.exit(typeof ran === "number" ? ran : 0);
