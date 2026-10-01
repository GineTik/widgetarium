import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { WidgetRecord } from "../packages/core/src/engine/catalogue-index.js";
import type { WidgetFiles, WidgetOffer, WidgetSourcePlace } from "../packages/core/src/engine/widget-source.js";
import type { SourceDisk } from "../packages/core/src/engine/source-disk.js";
import { isRecord } from "./page-dom.ts";
import { widgetDependenciesIn } from "./publish.ts";
import { rangesAgree } from "./version-range.ts";

const { RECORD_FILES } = await import("../packages/core/src/engine/catalogue-index.js");
const { createWidgetSource } = await import("../packages/core/src/engine/widget-source.js");
const { scopedName } = await import("../packages/core/src/engine/github.js");
const { declaredDependencies } = await import("../packages/core/src/engine/modules.js");

const CONFIG_FILE = "widgetarium.json";

type Settled = { readonly ok: true; readonly failure: null } | { readonly ok: false; readonly failure: string };

export type Added =
	| { readonly ok: true; readonly added: string[]; readonly installed: string[]; readonly failure: null }
	| { readonly ok: false; readonly added: null; readonly installed: null; readonly failure: string };

export interface WantedPackage {
	readonly name: string;
	readonly range: string;
	readonly asked: string;
}

export interface AddProject {
	readonly folder: string;
	readonly declares: Readonly<Record<string, unknown>> | null;
	write(at: string, text: string): Promise<void>;
	install(packages: readonly WantedPackage[]): Promise<Settled>;
}

export interface AddEngine {
	readonly name: string;
	readonly range: string;
}

export interface AddAsk {
	readonly wanted: string;
	readonly offers: readonly WidgetOffer[];
	readonly filesOf: (offered: WidgetOffer) => Promise<WidgetFiles>;
	readonly project: AddProject;
	readonly engine: AddEngine;
}

interface ClosureWidget {
	readonly id: string;
	readonly files: Readonly<Record<string, string>>;
	readonly scope: Readonly<Record<string, string>> | null;
	readonly record: WidgetRecord;
}

type Closure =
	| { readonly ok: true; readonly widgets: ClosureWidget[]; readonly failure: null }
	| { readonly ok: false; readonly widgets: null; readonly failure: string };

type Packages =
	| { readonly ok: true; readonly packages: WantedPackage[]; readonly failure: null }
	| { readonly ok: false; readonly packages: null; readonly failure: string };

interface WidgetariumConfig {
	readonly widgets?: unknown;
	readonly catalogue?: unknown;
}

const refuse = (failure: string): Added => ({ ok: false, added: null, installed: null, failure });

export async function addWidget({ wanted, offers, filesOf, project, engine }: AddAsk): Promise<Added> {
	if (!project.declares)
		return refuse("this folder holds no package.json, and a widget's dependencies have nowhere to go without one.");

	const closure = await closureFrom(wanted, offers, filesOf);
	if (!closure.ok) return refuse(closure.failure);

	const needed = packagesFor(closure.widgets, engine);
	if (!needed.ok) return refuse(needed.failure);

	const missing = againstTheProject(needed.packages, project.declares);
	if (!missing.ok) return refuse(missing.failure);

	const installed = await project.install(missing.packages);
	if (!installed.ok) return refuse(installed.failure);

	for (const widget of closure.widgets) await writeIntoProject(project, widget);
	return {
		ok: true,
		added: closure.widgets.map((widget) => widget.id),
		installed: missing.packages.map(specifierOf),
		failure: null,
	};
}

function widgetsBehind(record: WidgetRecord): unknown[] {
	const listed = record["widgetDependencies"];
	if (Array.isArray(listed)) return listed;
	const found: unknown = widgetDependenciesIn(record);
	return Array.isArray(found) ? found : [];
}

async function closureFrom(
	wanted: string,
	offers: readonly WidgetOffer[],
	filesOf: (offered: WidgetOffer) => Promise<WidgetFiles>,
): Promise<Closure> {
	const widgets: ClosureWidget[] = [];
	const seen = new Set<unknown>();
	const queue: unknown[] = [wanted];
	while (queue.length > 0) {
		const id = queue.shift();
		if (seen.has(id)) continue;
		seen.add(id);

		const offered = offers.find((offer) => offer?.manifest?.["id"] === id);
		if (!offered)
			return { ok: false, widgets: null, failure: `the catalogue offers no widget called "${String(id)}".` };

		const held = await filesOf(offered);
		if (!held.ok) return { ok: false, widgets: null, failure: held.failure };

		widgets.push({ id: String(id), files: held.files, scope: held.scope, record: held.record });
		queue.push(...widgetsBehind(held.record));
	}
	return { ok: true, widgets, failure: null };
}

function packagesFor(widgets: readonly ClosureWidget[], engine: AddEngine): Packages {
	const packages: WantedPackage[] = [];
	for (const widget of widgets) {
		const asked: [string, string][] = [[engine.name, engine.range], ...declaredDependencies(widget.record)];
		for (const [name, range] of asked) {
			const held = packages.find((each) => each.name === name);
			if (!held) {
				packages.push({ name, range, asked: widget.id });
				continue;
			}
			if (!rangesAgree(held.range, range))
				return { ok: false, packages: null, failure: clashBetweenWidgets(name, held, { range, asked: widget.id }) };
		}
	}
	return { ok: true, packages, failure: null };
}

function againstTheProject(packages: readonly WantedPackage[], declares: Readonly<Record<string, unknown>>): Packages {
	const missing: WantedPackage[] = [];
	for (const held of packages) {
		const declared = declares[held.name];
		if (declared === undefined) {
			missing.push(held);
			continue;
		}
		if (!rangesAgree(declared, held.range))
			return { ok: false, packages: null, failure: clashWithTheProject(held, declared) };
	}
	return { ok: true, packages: missing, failure: null };
}

function clashWithTheProject(held: WantedPackage, declared: unknown): string {
	return `this project holds ${held.name} at ${String(declared)} and ${held.asked} needs ${held.range}, so nothing was added. Raise the project, keep the older widget, or rewrite the widget against what is installed.`;
}

function clashBetweenWidgets(name: string, held: WantedPackage, other: Pick<WantedPackage, "range" | "asked">): string {
	return `${held.asked} needs ${name} at ${held.range} and ${other.asked} needs it at ${other.range}, so nothing was added.`;
}

async function writeIntoProject(project: AddProject, widget: ClosureWidget): Promise<void> {
	const folder = `${project.folder}/${String(scopedName(widget.id))}`;
	for (const [name, text] of Object.entries(widget.files)) {
		if (!RECORD_FILES.includes(name)) await project.write(`${folder}/${name}`, text);
	}
	const scope = widget.id.slice(0, widget.id.indexOf("/"));
	for (const [name, text] of Object.entries(widget.scope ?? {}))
		await project.write(`${project.folder}/${scope}/${name}`, text);
}

function specifierOf(held: WantedPackage): string {
	return `${held.name}@${held.range}`;
}

function jsonAt(at: string): unknown {
	return JSON.parse(fs.readFileSync(at, "utf8"));
}

function configIn(root: string): WidgetariumConfig {
	const at = path.join(root, CONFIG_FILE);
	if (!fs.existsSync(at)) return {};
	const held = jsonAt(at);
	return isRecord(held) ? held : {};
}

function widgetsFolderIn(root: string, config: WidgetariumConfig): string {
	if (typeof config.widgets === "string") return config.widgets;
	return fs.existsSync(path.join(root, "src")) ? "src/widgets" : "widgets";
}

function isSourcePlace(value: unknown): value is WidgetSourcePlace {
	if (!isRecord(value)) return false;
	return ["path", "repository", "ref"].every((key) => {
		const held = value[key];
		return held === undefined || held === null || typeof held === "string";
	});
}

function sourceNamed(named: string | null, config: WidgetariumConfig): WidgetSourcePlace | null {
	if (!named) return isSourcePlace(config.catalogue) ? config.catalogue : null;
	return named.startsWith("http") ? { repository: named, ref: "main", path: "widgets" } : { path: named };
}

function runNpm(root: string, packages: readonly WantedPackage[]): Settled {
	if (packages.length === 0) return { ok: true, failure: null };
	const asked = ["install", "--save", ...packages.map(specifierOf)];
	const done = spawnSync("npm", asked, { cwd: root, stdio: "inherit" });
	if (done.status === 0) return { ok: true, failure: null };
	return { ok: false, failure: `npm install answered ${String(done.status)}, so the widget was not written.` };
}

function fieldsIn(value: unknown): Readonly<Record<string, unknown>> {
	return isRecord(value) ? value : {};
}

function declaredIn(card: unknown): Readonly<Record<string, unknown>> | null {
	if (!isRecord(card)) return null;
	return {
		...fieldsIn(card["dependencies"]),
		...fieldsIn(card["devDependencies"]),
		...fieldsIn(card["peerDependencies"]),
	};
}

function projectAt(root: string, config: WidgetariumConfig): AddProject {
	const card = path.join(root, "package.json");
	return {
		folder: path.join(root, widgetsFolderIn(root, config)),
		declares: fs.existsSync(card) ? declaredIn(jsonAt(card)) : null,
		write: async (at, text) => {
			fs.mkdirSync(path.dirname(at), { recursive: true });
			fs.writeFileSync(at, text);
		},
		install: async (packages) => runNpm(root, packages),
	};
}

function onThisMachine(): SourceDisk {
	return {
		exists: async (at) => fs.existsSync(at),
		read: async (at) => fs.readFileSync(at, "utf8"),
		folders: async (at) =>
			fs
				.readdirSync(at, { withFileTypes: true })
				.filter((entry) => entry.isDirectory())
				.map((entry) => path.join(at, entry.name)),
		files: async (at) =>
			fs
				.readdirSync(at, { withFileTypes: true })
				.filter((entry) => entry.isFile())
				.map((entry) => path.join(at, entry.name)),
	};
}

function engineOfThisPackage(): AddEngine {
	const at = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "package.json");
	const held = fieldsIn(jsonAt(at));
	return { name: String(held["name"]), range: `^${String(held["version"])}` };
}

function flagIn(argv: readonly string[], named: string): string | null {
	const at = argv.indexOf(named);
	return at < 0 ? null : (argv[at + 1] ?? null);
}

// TODO: ship as a bundle, so npx reaches this without the mirror the repo builds
async function runCli(argv: readonly string[]): Promise<Added> {
	const wanted = argv.filter((argument) => !argument.startsWith("--"))[0];
	if (!wanted) return refuse("name the widget to add, as @scope/name.");

	const root = path.resolve(flagIn(argv, "--into") ?? process.cwd());
	const config = configIn(root);
	const source = sourceNamed(flagIn(argv, "--from"), config);
	if (!source)
		return refuse(
			`no catalogue is named. Write ${CONFIG_FILE} with a "catalogue" naming a folder or a repository, or pass --from.`,
		);

	const widgets = createWidgetSource({
		fetchJson: (url) => fetch(url).then((answer): Promise<unknown> => answer.json()),
		fetchText: (url) => fetch(url).then((answer) => answer.text()),
		disk: onThisMachine(),
	});
	return addWidget({
		wanted,
		offers: await widgets.offersFrom(source),
		filesOf: (offered) => widgets.filesOf(offered),
		project: projectAt(root, config),
		engine: engineOfThisPackage(),
	});
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const done = await runCli(process.argv.slice(2).filter((argument) => argument !== "add"));
	if (!done.ok) {
		console.error(`!!  ${done.failure}`);
		process.exit(1);
	}
	console.log(`OK  added ${done.added.join(", ")}`);
	if (done.installed.length > 0) console.log(`OK  installed ${done.installed.join(", ")}`);
}
