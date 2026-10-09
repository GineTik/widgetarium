import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { PROJECT_CONFIG_FILE, ProjectConfigSchema, type ProjectAliases } from "@widgetarium/core/project/index.js";
import { tsconfigPathsOf } from "../project-aliases.js";
import { kitAliasesOf } from "./kit-copy.js";
import { writeFile } from "./template-files.js";

export const CONFIG_SCHEMA_URL = "./node_modules/widgetarium/widgetarium.schema.json";

const PACKAGE_MANIFEST = "package.json";
const TSCONFIG = "tsconfig.json";
const JsonObjectSchema = z.record(z.string(), z.unknown());
const DependenciesSchema = z.record(z.string(), z.string());

export function writeProjectConfig(target: string, name: string, kitRoot: string): void {
	const { paths } = ProjectConfigSchema.parse({ name });
	const config = ProjectConfigSchema.parse({
		$schema: CONFIG_SCHEMA_URL,
		name,
		paths,
		aliases: kitAliasesOf(kitRoot, paths.kit),
	});
	writeJson(path.join(target, PROJECT_CONFIG_FILE), config);
}

export function addEngineDependencies(target: string, engine: Readonly<Record<string, string>>): void {
	const at = path.join(target, PACKAGE_MANIFEST);
	const manifest = jsonObjectAt(at);
	const dependencies = { ...DependenciesSchema.parse(manifest["dependencies"] ?? {}), ...engine };
	writeJson(at, { ...manifest, dependencies: sortedByKey(dependencies) });
}

export interface DependencyOutcome {
	readonly name: string;
	readonly range: string;
	readonly held: string | null;
}

export function addMissingDependencies(target: string, wanted: Readonly<Record<string, string>>): DependencyOutcome[] {
	const at = path.join(target, PACKAGE_MANIFEST);
	const manifest = jsonObjectAt(at);
	const dependencies = DependenciesSchema.parse(manifest["dependencies"] ?? {});
	const outcomes = Object.entries(wanted).map(([name, range]) => ({ name, range, held: dependencies[name] ?? null }));
	const added = outcomes.filter(({ held }) => held === null).map(({ name, range }) => [name, range]);
	if (added.length > 0)
		writeJson(at, { ...manifest, dependencies: sortedByKey({ ...dependencies, ...Object.fromEntries(added) }) });
	return outcomes;
}

export function addTsconfigPaths(target: string, aliases: ProjectAliases): void {
	const at = path.join(target, TSCONFIG);
	const tsconfig = jsonObjectAt(at);
	const options = JsonObjectSchema.parse(tsconfig["compilerOptions"] ?? {});
	writeJson(at, { ...tsconfig, compilerOptions: { ...options, paths: tsconfigPathsOf(aliases) } });
}

function jsonObjectAt(at: string): Record<string, unknown> {
	const json: unknown = JSON.parse(fs.readFileSync(at, "utf8"));
	return JsonObjectSchema.parse(json);
}

function writeJson(at: string, value: object): void {
	writeFile(at, `${JSON.stringify(value, null, "\t")}\n`);
}

function sortedByKey(record: Readonly<Record<string, string>>): Record<string, string> {
	return Object.fromEntries(Object.entries(record).sort(([left], [right]) => left.localeCompare(right)));
}
