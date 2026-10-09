import * as fileSystem from "node:fs/promises";
import {
	PROJECT_CONFIG_FILE,
	nodeProjectFiles,
	readProjectConfig,
	type ProjectConfig,
	type ProjectFiles,
} from "@widgetarium/core/project/index.js";
import { CliRefusal } from "./cli-output.js";
import { ancestorHolding } from "./package-locations.js";

export interface FoundProject {
	readonly root: string;
	readonly config: ProjectConfig;
	readonly files: ProjectFiles;
}

export async function projectAbove(start: string): Promise<FoundProject | null> {
	const root = ancestorHolding(start, PROJECT_CONFIG_FILE);
	if (root === null) return null;
	const files = nodeProjectFiles(root, fileSystem);
	const reading = await readProjectConfig(files);
	if ("refusal" in reading) throw new CliRefusal(`${root}/${PROJECT_CONFIG_FILE}: ${reading.refusal}`);
	return { root, config: reading.config, files };
}

export async function requiredProjectAbove(start: string): Promise<FoundProject> {
	const project = await projectAbove(start);
	if (project !== null) return project;
	throw new CliRefusal(
		`no ${PROJECT_CONFIG_FILE} in ${start} or above it; run this inside an app made by widgetarium create`,
	);
}
