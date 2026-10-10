import fs from "node:fs";
import * as fileSystem from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { nodeProjectFiles, projectConfigJsonSchema, readProjectConfig } from "../packages/core/src/project/index.js";
import { runCli } from "../packages/widgetarium/src/cli/run-cli.js";
import { HANDBOOK_PAGES } from "../packages/widgetarium/src/cli/handbook-copy.js";
import type { CliOutput } from "../packages/widgetarium/src/cli/cli-output.js";
import { z } from "zod";
import { fieldOf } from "./export-source.mts";
import { fakeEngine } from "./fake-engine.ts";
import {
	COMPONENTS,
	KIT_FOLDER,
	collidingPartsRefusal,
	componentNamesIn,
	filesIn,
	kitBytesIn,
	kitFilesIn,
	kitModulesInRepo,
	missingFromMerged,
	exportsInRepoOf,
} from "./merged-kit-probe.ts";

interface CliRun {
	readonly code: number;
	readonly said: string;
}

const REPO = path.resolve(import.meta.dirname, "..");
const SCHEMA_FILE = path.join(REPO, "packages/widgetarium/widgetarium.schema.json");
const TEMPLATE_MANIFEST = path.join(REPO, "packages/widgetarium/templates/project/package.json");
const WRITE_SCHEMA = process.argv.includes("--write-schema");
const HANDBOOK_FOLDER = "docs/widgetarium";
const UNFILLED = /\{(?:name|handbook|paths\.[a-z]+)\}/;
const RecordSchema = z.record(z.string(), z.unknown()).catch({});
const ICON = "public/icon.svg";
const DUPLICATE_WIDGET = 'widget id "tasks" is declared 2 times';

const EXPECTED_FILES = [
	".gitignore",
	"AGENTS.md",
	"CLAUDE.md",
	"docs/references/.gitkeep",
	"index.html",
	"package.json",
	ICON,
	"src/app/routes/board.json",
	"src/logic/.gitkeep",
	"src/main.tsx",
	"src/shared/libs/.gitkeep",
	"src/shared/schemas/.gitkeep",
	"src/shared/sources/.gitkeep",
	"src/styles.css",
	"src/widgets/.gitkeep",
	"tsconfig.json",
	"tsconfig.node.json",
	"vendor/engine/widgetarium-0.1.0.tgz",
	"vendor/engine/widgetarium-core-0.1.0.tgz",
	"vendor/engine/widgetarium-kit-0.1.0.tgz",
	"vite.config.ts",
	"widgetarium.json",
];

let failures = 0;

function check(name: string, held: unknown, wanted: unknown): void {
	const same = JSON.stringify(held) === JSON.stringify(wanted);
	if (!same) failures += 1;
	console.log(
		`${same ? "ok  " : "not ok"} ${name}${same ? "" : `\n      held   ${JSON.stringify(held)}\n      wanted ${JSON.stringify(wanted)}`}`,
	);
}

async function cli(argv: readonly string[]): Promise<CliRun> {
	const lines: string[] = [];
	const output: CliOutput = { out: (text) => lines.push(text), err: (text) => lines.push(text) };
	const code = await runCli(argv, output);
	return { code, said: lines.join("\n") };
}

function jsonAt(at: string): unknown {
	return JSON.parse(fs.readFileSync(at, "utf8"));
}

function versionInRepo(name: string): string {
	return String(fieldOf(jsonAt(path.join(REPO, "node_modules", name, "package.json")), "version"));
}

function templateDriftFrom(): string[] {
	const template = jsonAt(TEMPLATE_MANIFEST);
	const runtime = fieldOf(template, "dependencies");
	const tools = fieldOf(template, "devDependencies");
	const declared = {
		...RecordSchema.parse(fieldOf(jsonAt(path.join(REPO, "packages/kit/package.json")), "dependencies")),
		...RecordSchema.parse(fieldOf(jsonAt(path.join(REPO, "packages/widgetarium/package.json")), "peerDependencies")),
	};
	const runtimeDrift = Object.entries(declared).filter(([name, range]) => fieldOf(runtime, name) !== range);
	const toolDrift = ["typescript", "@types/react", "@types/react-dom", "@types/node"].filter(
		(name) => fieldOf(tools, name) !== `^${versionInRepo(name)}`,
	);
	return [...runtimeDrift.map(([name]) => name), ...toolDrift];
}

function schemaText(): string {
	return `${JSON.stringify(projectConfigJsonSchema(), null, "\t")}\n`;
}

if (WRITE_SCHEMA) fs.writeFileSync(SCHEMA_FILE, schemaText());

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "wg-create-files-"));
const project = path.join(scratch, "shop");
const engine = fakeEngine(path.join(scratch, "engine"));
try {
	const created = await cli(["create", project, "--engine", engine, "--no-install", "--no-git"]);
	check(
		"create answers 0 and says where",
		[created.code, created.said.includes(`created shop in ${project}`)],
		[0, true],
	);

	const files = filesIn(project);
	const outsideCopies = files.filter((at) => !at.startsWith(`${KIT_FOLDER}/`) && !at.startsWith(`${HANDBOOK_FOLDER}/`));
	check("create writes exactly the expected files beside the kit and the handbook", outsideCopies, EXPECTED_FILES);
	const kitFiles = kitFilesIn(project);
	const components = componentNamesIn(kitFiles);
	const repoComponents = componentNamesIn(kitModulesInRepo());
	console.log(`     kit component files: ${repoComponents.length} in the repo, ${components.length} in the project`);
	check(
		"every kit module outside components/ is copied, and the theme, no dot-folder",
		kitFiles.filter((at) => !at.startsWith(COMPONENTS)),
		[...kitModulesInRepo().filter((at) => !at.startsWith(COMPONENTS)), "theme.css"].sort(),
	);
	check(
		"every component of the repo lands in the project file named for it or for a root it extends",
		repoComponents.filter((name) => !components.some((file) => file === name || name.startsWith(`${file}-`))),
		[],
	);
	check(
		"the calendar is one calendar.tsx exporting Calendar and every part, with no calendar-* file beside it",
		[
			components.filter((name) => name.startsWith("calendar")),
			missingFromMerged(project, "calendar.tsx", ["Calendar", ...exportsInRepoOf("calendar")]),
		],
		[["calendar"], []],
	);
	check(
		"button-group.tsx holds its separator and text, button.tsx its mark and skeleton",
		[
			missingFromMerged(project, "button-group.tsx", exportsInRepoOf("button-group")),
			missingFromMerged(project, "button.tsx", ["button-mark", "button-skeleton"].flatMap(exportsInRepoOf)),
			components.filter((name) => name.startsWith("button-group-")),
		],
		[[], [], []],
	);
	check(
		"the handbook holds the pages that apply to a project",
		files.filter((at) => at.startsWith(`${HANDBOOK_FOLDER}/`)).map((at) => path.basename(at)),
		[...HANDBOOK_PAGES].sort(),
	);
	check(
		"no placeholder is left unfilled outside the handbook",
		outsideCopies.filter(
			(at) => !at.endsWith(".tgz") && UNFILLED.test(fs.readFileSync(path.join(project, at), "utf8")),
		),
		[],
	);

	const manifest = jsonAt(path.join(project, "package.json"));
	check("package.json is named after the folder", fieldOf(manifest, "name"), "shop");
	check(
		"the engine is the vendored closure of widgetarium, and only it",
		Object.entries(RecordSchema.parse(fieldOf(manifest, "dependencies"))).filter(([, spec]) =>
			String(spec).startsWith("file:"),
		),
		[
			["@widgetarium/core", "file:vendor/engine/widgetarium-core-0.1.0.tgz"],
			["@widgetarium/kit", "file:vendor/engine/widgetarium-kit-0.1.0.tgz"],
			["widgetarium", "file:vendor/engine/widgetarium-0.1.0.tgz"],
		],
	);

	const reading = await readProjectConfig(nodeProjectFiles(project, fileSystem));
	const aliases = "config" in reading ? reading.config.aliases : {};
	check("widgetarium.json reads back and names the icon", "config" in reading && reading.config.app.icon, ICON);
	check(
		"every alias in widgetarium.json names a file or folder the project holds",
		Object.entries(aliases).filter(([, at]) => !fs.existsSync(path.join(project, at))),
		[],
	);
	const paths = fieldOf(fieldOf(jsonAt(path.join(project, "tsconfig.json")), "compilerOptions"), "paths");
	check(
		"tsconfig maps the kit and the layer aliases",
		[fieldOf(paths, "@widgetarium/kit"), fieldOf(paths, "@widgetarium/kit/surface"), fieldOf(paths, "@kit/*")],
		[["./src/shared/kit/index.ts"], ["./src/shared/kit/utils/surface.ts"], ["./src/shared/kit/*"]],
	);

	check("the template's versions are the repo's", templateDriftFrom(), []);
	check(
		"widgetarium.schema.json is projectConfigJsonSchema (regenerate with --write-schema)",
		JSON.stringify(jsonAt(SCHEMA_FILE)),
		JSON.stringify(projectConfigJsonSchema()),
	);

	const clean = await cli(["check", project]);
	check("check finds nothing in a created project", clean.code, 0);
	for (const feature of ["orders", "billing"]) {
		fs.mkdirSync(path.join(project, "src/widgets", feature, "tasks"), { recursive: true });
		fs.writeFileSync(path.join(project, "src/widgets", feature, "tasks/widget.tsx"), "export default 1;\n");
	}
	const planted = await cli(["check", project]);
	check(
		"and finds a duplicate widget planted in it",
		[planted.code, planted.said.includes(DUPLICATE_WIDGET)],
		[1, true],
	);

	check(
		"a name two parts of one component both declare is refused, not merged",
		collidingPartsRefusal(),
		"the kit cannot be merged into one file per component: components/dial.ts declares SIZE, which components/dial-face.ts declares too, in dial",
	);
	const twin = path.join(scratch, "twin");
	await cli(["create", twin, "--engine", engine, "--no-install", "--no-git"]);
	check("the merged kit is the same bytes on a second create", kitBytesIn(twin), kitBytesIn(project));

	const again = await cli(["create", project, "--engine", engine, "--no-install", "--no-git"]);
	check("create refuses a folder that is not empty", [again.code, again.said.includes("is not empty")], [1, true]);
	const coreless = await cli([
		"create",
		path.join(scratch, "coreless"),
		"--engine",
		fakeEngine(path.join(scratch, "coreless-engine"), "@widgetarium/core"),
		"--no-install",
		"--no-git",
	]);
	check(
		"create refuses an engine folder missing part of the closure",
		[coreless.code, coreless.said.includes("holds no tarball for @widgetarium/core")],
		[1, true],
	);
	const badName = await cli(["create", path.join(scratch, "My App"), "--engine", engine, "--no-install", "--no-git"]);
	check("create refuses a folder name npm would refuse", [badName.code, badName.said.includes("--name")], [1, true]);
	check("help answers 0", (await cli(["--help"])).code, 0);
} finally {
	fs.rmSync(scratch, { recursive: true, force: true });
}

console.log(failures === 0 ? "create files: every check passed" : `create files: ${failures} checks red`);
process.exit(failures === 0 ? 0 : 1);
