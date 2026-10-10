import fs from "node:fs";
import * as fileSystem from "node:fs/promises";
import path from "node:path";
import { nodeProjectFiles, readProjectConfig, type ProjectConfig } from "@widgetarium/core/project/index.js";
import type { CreateArgs } from "./cli-args.js";
import { CliRefusal, type CliOutput } from "./cli-output.js";
import { engineClosureIn, engineFolderFor, vendorEngine, type EngineTarball } from "./engine-tarballs.js";
import { HANDBOOK_FOLDER, copyHandbook } from "./handbook-copy.js";
import { copyKit } from "./kit-copy.js";
import { packageLocations, type PackageLocations } from "./package-locations.js";
import { addEngineDependencies, addTsconfigPaths, writeProjectConfig } from "./project-manifests.js";
import { runIn } from "./run-process.js";
import { writeTemplates, type TemplateValues } from "./template-files.js";

const CREATE_COMMIT = "chore: create app";

export async function runCreate(args: CreateArgs, output: CliOutput): Promise<number> {
	const target = path.resolve(args.dir);
	refuseOccupied(target);
	const locations = packageLocations();
	const closure = engineClosureIn(engineFolderFor(args.engine, locations.repo));
	await layProject({ target, name: args.name, locations, closure }).catch((error: unknown) => {
		fs.rmSync(target, { recursive: true, force: true });
		throw error;
	});
	if (args.install) runIn(target, "npm", ["install", "--no-audit", "--no-fund"]);
	if (args.git) commitCreatedApp(target);
	output.out(nextStepsOf(target, args));
	return 0;
}

interface ProjectToLay {
	readonly target: string;
	readonly name: string;
	readonly locations: PackageLocations;
	readonly closure: readonly EngineTarball[];
}

async function layProject({ target, name, locations, closure }: ProjectToLay): Promise<void> {
	writeProjectConfig(target, name, locations.kit);
	const config = await configWritten(target);
	const handbook = `${config.paths.docs}/${HANDBOOK_FOLDER}`;
	writeTemplates(locations.templates, target, templateValuesOf(config, handbook));
	addEngineDependencies(target, vendorEngine(closure, target));
	addTsconfigPaths(target, config.aliases);
	copyKit(locations.kit, path.join(target, config.paths.kit));
	copyHandbook(locations.handbook, path.join(target, handbook));
}

async function configWritten(target: string): Promise<ProjectConfig> {
	const reading = await readProjectConfig(nodeProjectFiles(target, fileSystem));
	if ("refusal" in reading) throw new Error(`the written widgetarium.json is refused: ${reading.refusal}`);
	return reading.config;
}

function templateValuesOf(config: ProjectConfig, handbook: string): TemplateValues {
	const paths = Object.entries(config.paths).map(([layer, at]) => [`paths.${layer}`, at]);
	return { name: config.app.name, handbook, ...Object.fromEntries(paths) };
}

function refuseOccupied(target: string): void {
	if (!fs.existsSync(target)) return;
	if (!fs.statSync(target).isDirectory()) throw new CliRefusal(`${target} is a file; name a new or empty folder`);
	if (fs.readdirSync(target).length > 0) throw new CliRefusal(`${target} is not empty; name a new or empty folder`);
}

function commitCreatedApp(target: string): void {
	runIn(target, "git", ["init", "--quiet"]);
	runIn(target, "git", ["add", "--all"]);
	runIn(target, "git", ["commit", "--quiet", "--message", CREATE_COMMIT]);
}

function nextStepsOf(target: string, args: CreateArgs): string {
	const install = args.install ? [] : ["  npm install"];
	return [`created ${args.name} in ${target}`, "next:", `  cd ${target}`, ...install, "  npm run dev"].join("\n");
}
