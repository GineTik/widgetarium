import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { REPO, packEngine, type PackedPackage } from "./pack-engine.mts";
import { fieldOf } from "./export-source.mts";

const FROM_THE_REPO = ["react", "react-dom", "zod", "typescript", "@types/react", "@types/react-dom"];
const LIB_CHECK_ON = ["--skipLibCheck", "false"];
const SHIPPED_DECLARATION = "node_modules/widgetarium/dist/index.d.ts";
const SHIPPED_STUDIO = ["node_modules/widgetarium/dist/studio.js", "node_modules/widgetarium/dist/studio.css"];
const STUDIO_SHEET = "widgetarium/studio.css";
const UNRESOLVABLE_IMPORT =
	'import type { Missing } from "widgetarium-shipped-nowhere";\nexport type Broken = Missing;\n';

const WIDGET = `import { IQuery, PageInputSchema, PageOf, createWidget } from "widgetarium";
import { Card } from "widgetarium/kit";
import { z } from "zod";

const TaskSchema = z.object({ title: z.string() });

const Tasks = createWidget({
	inject: { getTasks: IQuery.input(PageInputSchema).output(PageOf(TaskSchema)) },
	draw: ({ getTasks }) => <Card tone="success">{typeof getTasks}</Card>,
});

export const firstLimit: number = PageInputSchema.parse({}).limit;

export default Tasks;
`;

const PROJECT_TSCONFIG = {
	compilerOptions: {
		target: "ES2022",
		module: "ESNext",
		moduleResolution: "bundler",
		lib: ["ES2022", "DOM"],
		jsx: "react-jsx",
		strict: true,
		noEmit: true,
		skipLibCheck: true,
		types: [],
	},
	include: ["src"],
};

let failures = 0;

function check(name: string, held: unknown, wanted: unknown): void {
	const same = held === wanted;
	if (!same) failures += 1;
	console.log(`${same ? "ok  " : "not ok"} ${name}${same ? "" : `\n      held ${String(held)}`}`);
}

function versionInRepo(name: string): string {
	const manifest: unknown = JSON.parse(fs.readFileSync(path.join(REPO, "node_modules", name, "package.json"), "utf8"));
	const version = fieldOf(manifest, "version");
	if (typeof version !== "string") throw new Error(`${name} in the repo names no version`);
	return version;
}

function scratchProject(packed: readonly PackedPackage[]): string {
	const project = fs.mkdtempSync(path.join(os.tmpdir(), "wg-engine-package-"));
	const engine = packed.map(({ name, tarball }) => [name, `file:${tarball}`]);
	const peers = FROM_THE_REPO.map((name) => [name, versionInRepo(name)]);
	const manifest = {
		name: "engine-package-probe",
		private: true,
		type: "module",
		dependencies: Object.fromEntries([...engine, ...peers]),
	};
	fs.writeFileSync(path.join(project, "package.json"), JSON.stringify(manifest, null, "\t"));
	fs.writeFileSync(path.join(project, "tsconfig.json"), JSON.stringify(PROJECT_TSCONFIG, null, "\t"));
	fs.mkdirSync(path.join(project, "src"));
	return project;
}

function npmInstall(project: string, ...options: string[]): void {
	execFileSync("npm", ["install", "--no-audit", "--no-fund", ...options], { cwd: project, stdio: "pipe" });
}

function install(project: string): void {
	try {
		npmInstall(project, "--offline");
		console.log(`installed offline into ${project}`);
	} catch (failure) {
		const said = String(fieldOf(failure, "stderr") ?? failure);
		console.log(`offline install refused: ${said.split("\n").find((line) => line.includes("ERR")) ?? said}`);
		npmInstall(project);
		console.log(`installed online into ${project}`);
	}
}

function resolvedIn(project: string, name: string): string {
	const lock: unknown = JSON.parse(fs.readFileSync(path.join(project, "package-lock.json"), "utf8"));
	const resolved = fieldOf(fieldOf(fieldOf(lock, "packages"), `node_modules/${name}`), "resolved");
	return typeof resolved === "string" ? resolved : "";
}

function typeErrorsIn(project: string, widget: string, options: readonly string[] = []): string {
	fs.writeFileSync(path.join(project, "src/widget.tsx"), widget);
	try {
		const tsc = path.join(project, "node_modules/.bin/tsc");
		execFileSync(tsc, ["-p", project, ...options], { encoding: "utf8", stdio: "pipe" });
		return "";
	} catch (failure) {
		return String(fieldOf(failure, "stdout") ?? failure);
	}
}

function missingIn(project: string, files: readonly string[]): string {
	return files.filter((file) => !fs.existsSync(path.join(project, file))).join(", ");
}

function resolvedSheetIn(project: string, specifier: string): string {
	try {
		const resolved = createRequire(path.join(project, "package.json")).resolve(specifier);
		return path.relative(fs.realpathSync(project), resolved);
	} catch (failure) {
		return `unresolved: ${String(fieldOf(failure, "message") ?? failure)}`;
	}
}

function withShippedDeclarationBroken<T>(project: string, run: () => T): T {
	const declaration = path.join(project, SHIPPED_DECLARATION);
	const shipped = fs.readFileSync(declaration, "utf8");
	fs.writeFileSync(declaration, `${UNRESOLVABLE_IMPORT}${shipped}`);
	try {
		return run();
	} finally {
		fs.writeFileSync(declaration, shipped);
	}
}

const packed = await packEngine();

const project = scratchProject(packed);
try {
	install(project);
	check(
		"every engine package came from its tarball, none from a registry",
		packed
			.filter(({ name }) => !resolvedIn(project, name).startsWith("file:"))
			.map(({ name }) => name)
			.join(", "),
		"",
	);
	check("the widgetarium tarball ships the studio's code and sheet", missingIn(project, SHIPPED_STUDIO), "");
	check(
		`a created app's import of ${STUDIO_SHEET} resolves to the shipped sheet`,
		resolvedSheetIn(project, STUDIO_SHEET),
		"node_modules/widgetarium/dist/studio.css",
	);
	check("a widget importing the engine, the kit and zod by name typechecks", typeErrorsIn(project, WIDGET).trim(), "");
	check(
		"and a name the engine does not export is refused",
		typeErrorsIn(project, WIDGET.replace("PageInputSchema, PageOf,", "PageInputSchema, PageOff,")).includes("PageOff"),
		true,
	);
	check(
		"and the engine is typed, not any: a page limit is a number",
		typeErrorsIn(project, WIDGET.replace("firstLimit: number", "firstLimit: string")).includes("error TS2322"),
		true,
	);
	check(
		"and the kit is typed, not any: a tone it has no word for is refused",
		typeErrorsIn(project, WIDGET.replace('tone="success"', 'tone="loud"')).includes("error TS2322"),
		true,
	);
	check("and the widget restored typechecks again", typeErrorsIn(project, WIDGET).trim(), "");
	check(
		"and every shipped declaration typechecks with skipLibCheck off",
		typeErrorsIn(project, WIDGET, LIB_CHECK_ON).trim(),
		"",
	);
	check(
		"and with skipLibCheck off a shipped declaration naming a module nobody ships is refused",
		withShippedDeclarationBroken(project, () => typeErrorsIn(project, WIDGET, LIB_CHECK_ON)).includes("error TS2307"),
		true,
	);
	check(
		"while skipLibCheck on lets that same broken declaration pass, which is why the strict run exists",
		withShippedDeclarationBroken(project, () => typeErrorsIn(project, WIDGET)).trim(),
		"",
	);
} finally {
	fs.rmSync(project, { recursive: true, force: true });
}

console.log(failures === 0 ? "engine package: every check passed" : `engine package: ${failures} checks red`);
process.exit(failures === 0 ? 0 : 1);
