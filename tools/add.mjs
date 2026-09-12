import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildMirror } from "./mirror.mjs";
import { widgetDependenciesIn } from "./publish.mjs";
import { rangesAgree } from "./version-range.mjs";

buildMirror();
const { RECORD_FILE } = await import("./.mjs-cache/engine/catalogue-index.mjs");
const { createWidgetSource } = await import("./.mjs-cache/engine/widget-source.mjs");
const { scopedName } = await import("./.mjs-cache/engine/github.mjs");
const { declaredDependencies } = await import("./.mjs-cache/engine/modules.mjs");

const CONFIG_FILE = "widgetarium.json";

const refuse = (failure) => ({ ok: false, added: null, installed: null, failure });

export async function addWidget({ wanted, offers, filesOf, project, engine }) {
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

function widgetsBehind(record) {
	return Array.isArray(record?.widgetDependencies) ? record.widgetDependencies : widgetDependenciesIn(record);
}

async function closureFrom(wanted, offers, filesOf) {
	const widgets = [];
	const seen = new Set();
	const queue = [wanted];
	while (queue.length > 0) {
		const id = queue.shift();
		if (seen.has(id)) continue;
		seen.add(id);

		const offered = offers.find((offer) => offer?.manifest?.id === id);
		if (!offered) return { ok: false, widgets: null, failure: `the catalogue offers no widget called "${id}".` };

		const held = await filesOf(offered);
		if (!held.ok) return { ok: false, widgets: null, failure: held.failure };

		widgets.push({ id, files: held.files, scope: held.scope, record: held.record });
		queue.push(...widgetsBehind(held.record));
	}
	return { ok: true, widgets, failure: null };
}

function packagesFor(widgets, engine) {
	const packages = [];
	for (const widget of widgets) {
		for (const [name, range] of [[engine.name, engine.range], ...declaredDependencies(widget.record)]) {
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

function againstTheProject(packages, declares) {
	const missing = [];
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

function clashWithTheProject(held, declared) {
	return `this project holds ${held.name} at ${declared} and ${held.asked} needs ${held.range}, so nothing was added. Raise the project, keep the older widget, or rewrite the widget against what is installed.`;
}

function clashBetweenWidgets(name, held, other) {
	return `${held.asked} needs ${name} at ${held.range} and ${other.asked} needs it at ${other.range}, so nothing was added.`;
}

async function writeIntoProject(project, widget) {
	const folder = `${project.folder}/${scopedName(widget.id)}`;
	for (const [name, text] of Object.entries(widget.files)) {
		if (name !== RECORD_FILE) await project.write(`${folder}/${name}`, text);
	}
	const scope = widget.id.slice(0, widget.id.indexOf("/"));
	for (const [name, text] of Object.entries(widget.scope ?? {}))
		await project.write(`${project.folder}/${scope}/${name}`, text);
}

function specifierOf(held) {
	return `${held.name}@${held.range}`;
}

function configIn(root) {
	const at = path.join(root, CONFIG_FILE);
	if (!fs.existsSync(at)) return {};
	return JSON.parse(fs.readFileSync(at, "utf8"));
}

function widgetsFolderIn(root, config) {
	if (typeof config.widgets === "string") return config.widgets;
	return fs.existsSync(path.join(root, "src")) ? "src/widgets" : "widgets";
}

function sourceNamed(named, config) {
	if (!named) return config.catalogue ?? null;
	return named.startsWith("http") ? { repository: named, ref: "main", path: "widgets" } : { path: named };
}

function runNpm(root, packages) {
	if (packages.length === 0) return { ok: true, failure: null };
	const asked = ["install", "--save", ...packages.map(specifierOf)];
	const done = spawnSync("npm", asked, { cwd: root, stdio: "inherit" });
	if (done.status === 0) return { ok: true, failure: null };
	return { ok: false, failure: `npm install answered ${done.status}, so the widget was not written.` };
}

function projectAt(root, config) {
	const card = path.join(root, "package.json");
	const held = fs.existsSync(card) ? JSON.parse(fs.readFileSync(card, "utf8")) : null;
	return {
		folder: path.join(root, widgetsFolderIn(root, config)),
		declares: held && { ...held.dependencies, ...held.devDependencies, ...held.peerDependencies },
		write: async (at, text) => {
			fs.mkdirSync(path.dirname(at), { recursive: true });
			fs.writeFileSync(at, text);
		},
		install: async (packages) => runNpm(root, packages),
	};
}

function onThisMachine() {
	return {
		exists: async (at) => fs.existsSync(at),
		read: async (at) => fs.readFileSync(at, "utf8"),
		folders: async (at) =>
			fs
				.readdirSync(at, { withFileTypes: true })
				.filter((entry) => entry.isDirectory())
				.map((entry) => path.join(at, entry.name)),
	};
}

function engineOfThisPackage() {
	const at = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "package.json");
	const held = JSON.parse(fs.readFileSync(at, "utf8"));
	return { name: held.name, range: `^${held.version}` };
}

function flagIn(argv, named, fallback) {
	const at = argv.indexOf(named);
	return at < 0 ? fallback : argv[at + 1];
}

// TODO: ship as a bundle, so npx reaches this without the mirror the repo builds
async function runCli(argv) {
	const wanted = argv.filter((argument) => !argument.startsWith("--"))[0];
	if (!wanted) return refuse("name the widget to add, as @scope/name.");

	const root = path.resolve(flagIn(argv, "--into", process.cwd()));
	const config = configIn(root);
	const source = sourceNamed(flagIn(argv, "--from", null), config);
	if (!source)
		return refuse(
			`no catalogue is named. Write ${CONFIG_FILE} with a "catalogue" naming a folder or a repository, or pass --from.`,
		);

	const widgets = createWidgetSource({
		fetchJson: (url) => fetch(url).then((answer) => answer.json()),
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
