import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { lintOfNote } from "./lint-command.js";
import { surfacesOfNote } from "./surfaces-command.js";
import { layoutOfNote } from "./layout-command.js";
import { cardIn } from "./entries.js";
import { filesIn, readJson } from "./vault-files.js";
import { installWidget } from "./install-command.js";
import type { Installed } from "./install-command.js";
import { BASE_NAMES, baseNamed, cardLayoutNamed, everyBase } from "./shape-command.js";
import type { Told } from "./shape-command.js";
import { surfaceNamesIn } from "./widget-surface.js";
import { rankWidgets, refuseReading } from "./find-command.js";
import type { FindOptions } from "./find-command.js";
import { checkWidget, saidWidgetCheck } from "@widgetarium/core/widget-check.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { HELP } from "./widgets-cli-help.js";
import { LOCK_PATH } from "@widgetarium/core/paths.js";
import { SOURCE_FILES, isWidgetModule } from "@widgetarium/core/engine/widget-build.js";
import { VAULT, WIDGETS_DIR } from "./cli-paths.js";
import { configuredSources, entryById, everyWidget, installedWidgets } from "./catalogue-entries.js";
import type { WidgetEntry } from "./widget-entry.js";

type Options = FindOptions & { readonly _: string[]; readonly [flag: string]: unknown };

type Ran = number | undefined;

interface Command {
	readonly asks?: "note" | "base" | "widget";
	run(argument: string | undefined, options: Options): Ran | Promise<Ran>;
}

const STYLE_FILES = ["widget.css"];
const WIDGET_ID = /^@[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/;
const NOT_AN_ID = "{id} is not a widget id. Name it @scope/name, in lowercase words joined by hyphens.";
const STARTED_NEW = "Building {id}, a new widget. Write its files in {folder}.";
const STARTED_EDIT = "Building {id}, which is already here. Edit its files in {folder}.";
const STARTED_PUBLISHED =
	"{id} was installed from a repository, so the next update replaces whatever you change in {folder}.";

const COMMANDS: Readonly<Record<string, Command>> = {
	find: { run: (_argument, options) => findRanked(options) },
	list: { run: (_argument, options) => findRanked(options) },
	packs: { run: (_argument, options) => packs(options) },
	sources: { run: (_argument, options) => sources(options) },
	bases: { run: (_argument, options) => tell(options, everyBase()) },
	base: { asks: "base", run: (argument, options) => tell(options, baseNamed(argument, options["with"])) },
	card: { run: (argument, options) => tell(options, cardLayoutNamed(argument)) },
	install: { asks: "widget", run: (argument, options) => runInstall(String(argument), options) },
	start: { asks: "widget", run: (argument, options) => runStart(String(argument), options) },
	check: { asks: "widget", run: (argument, options) => runCheck(String(argument), options) },
	show: { asks: "widget", run: (argument, options) => show(String(argument), options) },
	source: { asks: "widget", run: (argument) => source(String(argument)) },
	layout: { asks: "note", run: (argument, options) => layout(String(argument), options) },
	surfaces: { asks: "note", run: (argument, options) => surfaces(String(argument), options) },
	lint: { asks: "note", run: (argument, options) => lint(String(argument), options) },
};

const MISSING_ARGUMENT: Readonly<Record<string, (argument: unknown) => number>> = {
	note: () => missingNote(),
	base: () => missingBase(),
	widget: (argument) => missing(String(argument)),
};

const options = optionsIn(process.argv.slice(2));
const [command, argument] = options._;

const ran = await ranCommand(command, argument, options);

process.exit(typeof ran === "number" ? ran : 0);

function optionsIn(argv: readonly string[]): Options {
	const held: Record<string, unknown> & { _: string[] } = { _: [] };
	for (let at = 0; at < argv.length; at += 1) {
		const token = argv[at] ?? "";
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

function ranCommand(named: string | undefined, given: string | undefined, asked: Options): Ran | Promise<Ran> {
	const found = named !== undefined && Object.hasOwn(COMMANDS, named) ? COMMANDS[named] : undefined;
	if (found === undefined) {
		console.log(HELP);
		return named === undefined || named === "help" ? 0 : 1;
	}
	if (found.asks === undefined || given) return found.run(given, asked);
	return MISSING_ARGUMENT[found.asks]?.(given);
}

function say(asked: Options, value: unknown, lines: string): void {
	console.log(asked["text"] ? lines : JSON.stringify(value, null, "\t"));
}

function tell<Value>(asked: Options, answer: Told<Value>): number {
	if (answer.refusal !== undefined) {
		console.error(answer.refusal);
		return 1;
	}
	say(asked, answer.value, answer.text);
	return 0;
}

async function findRanked(asked: Options): Promise<number> {
	const refusal = refuseReading(asked.reading);
	if (refusal) {
		console.error(refusal);
		return 1;
	}
	const { value, text } = await rankWidgets(await everyWidget(), asked);
	say(asked, value, text);
	return 0;
}

async function runInstall(id: string, asked: Options): Promise<number> {
	const entry = await entryById(id);
	if (!entry) return missing(id);
	const done: Installed = await installWidget(entry, {
		widgetsDir: WIDGETS_DIR,
		lockPath: join(VAULT, LOCK_PATH),
	}).catch((thrown: unknown) => ({
		failure: `${id} could not be installed: ${String(isObject(thrown) ? (thrown["message"] ?? thrown) : thrown)}. The lock says it was left unfinished, so installing it again is safe.`,
	}));
	if (done.failure !== null) {
		console.error(done.failure);
		return 1;
	}
	say(asked, { widget: id, at: done.at, files: done.files }, `${id} installed: ${done.files.join(", ")}`);
	return 0;
}

async function runStart(id: string, asked: Options): Promise<number> {
	if (!WIDGET_ID.test(id)) {
		console.error(NOT_AN_ID.replace("{id}", id));
		return 1;
	}
	const folder = join(WIDGETS_DIR, ...id.split("/"));
	const isNew = (await filesIn(folder)).length === 0;
	const lock = await readJson(join(VAULT, LOCK_PATH), {});
	const widgets = isObject(lock) ? lock["widgets"] : undefined;
	const isPublished = Boolean(isObject(widgets) && widgets[id]);
	const title = typeof asked["title"] === "string" ? asked["title"] : null;
	const started = { widget: id, title, folder, isNew, isPublished };
	say(asked, started, saidStart(started));
	return 0;
}

function saidStart({
	widget,
	folder,
	isNew,
	isPublished,
}: {
	widget: string;
	folder: string;
	isNew: boolean;
	isPublished: boolean;
}): string {
	const said = [isNew ? STARTED_NEW : STARTED_EDIT, isPublished ? STARTED_PUBLISHED : null].filter(
		(line): line is string => line !== null,
	);
	return said.map((line) => line.replace("{id}", widget).replace("{folder}", folder)).join("\n");
}

async function runCheck(id: string, asked: Options): Promise<number> {
	const entry = await entryById(id);
	if (!entry) return missing(id);
	const surface = await surfaceNamesIn(join(WIDGETS_DIR, "types"));
	if (surface === null) {
		console.error(
			`${WIDGETS_DIR}/types holds no widgetarium.d.ts, so the rule that catches a crash at draw time cannot run and no widget can be called clean. Let the plugin load once; it lays the types beside the widgets.`,
		);
		return 1;
	}
	const card = await cardIn(entry.folder);
	const found = checkWidget({
		id,
		source: await joinFiles(entry, isWidgetModule),
		styles: await joinFiles(entry, (name) => STYLE_FILES.includes(name)),
		card: isObject(card) ? card : null,
		surface,
	});
	say(asked, { widget: id, clean: found.length === 0, findings: found }, saidWidgetCheck(found));
	return found.length === 0 ? 0 : 1;
}

async function joinFiles(entry: WidgetEntry, isWanted: (name: string) => boolean): Promise<string> {
	const named = (entry.files ?? []).filter(isWanted);
	const texts: string[] = [];
	for (const name of named) texts.push(await readFile(join(entry.folder ?? "", name), "utf8").catch(() => ""));
	return texts.join("\n");
}

async function show(id: string, asked: Options): Promise<number> {
	const entry = await entryById(id);
	if (!entry) return missing(id);
	const manifest = await cardIn(entry.folder);
	const value = { ...entry, manifest };
	say(asked, value, `${entry.id} — ${entry.title}\n${entry.description}\nfiles: ${(entry.files ?? []).join(", ")}`);
	return 0;
}

async function source(id: string): Promise<number> {
	const entry = await entryById(id);
	if (!entry) return missing(id);
	const { folder } = entry;
	if (!folder) {
		console.error(`${id} is offered but not installed here, so it has no source on this machine.`);
		return 1;
	}
	if (!(entry.files ?? []).some((each) => SOURCE_FILES.includes(each))) {
		console.error(`${id} has no component file in ${folder}.`);
		return 1;
	}
	const modules = (entry.files ?? []).filter(isWidgetModule);
	for (const name of modules) {
		if (modules.length > 1) console.log(`==> ${name} <==`);
		console.log(await readFile(join(folder, name), "utf8"));
	}
	return 0;
}

async function packs(asked: Options): Promise<undefined> {
	const held = new Map<string, { pack: string; widgets: number; installed: number }>();
	for (const entry of await everyWidget()) {
		const seen = held.get(entry.pack) ?? { pack: entry.pack, widgets: 0, installed: 0 };
		seen.widgets += 1;
		if (entry.installed) seen.installed += 1;
		held.set(entry.pack, seen);
	}
	const value = [...held.values()].sort((one, other) => one.pack.localeCompare(other.pack));
	say(
		asked,
		value,
		value.map((row) => `${row.pack.padEnd(16)} ${row.widgets} widgets, ${row.installed} installed`).join("\n"),
	);
	return undefined;
}

async function sources(asked: Options): Promise<undefined> {
	const value = await configuredSources();
	say(
		asked,
		value,
		value.map((row) => row.repository ?? row.path).join("\n") || "no sources are configured in this vault",
	);
	return undefined;
}

function missingNote(): number {
	console.error("Name the note to measure, for example: layout Boards/Dashboard.md");
	return 1;
}

async function surfaces(at: string, asked: Options): Promise<number> {
	const found = await surfacesOfNote(VAULT, at, await installedWidgets());
	if (found === null) return 1;
	say(asked, found.value, found.text);
	return 0;
}

async function lint(at: string, asked: Options): Promise<number> {
	const found = await lintOfNote(VAULT, at, await installedWidgets());
	if (found !== null) say(asked, found.value, found.text);
	return found?.value.valid ? 0 : 1;
}

async function layout(at: string, asked: Options): Promise<number> {
	const found = await layoutOfNote(at, asked["width"]);
	if (found === null) return 1;
	say(asked, found.value, found.text);
	return 0;
}

function missingBase(): number {
	console.error(`Name the base to start from. The ones there are: ${BASE_NAMES.join(", ")}.`);
	return 1;
}

function missing(id: string): number {
	console.error(`No widget is called ${id}. Run "find" to see what there is.`);
	return 1;
}
