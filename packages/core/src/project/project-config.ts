import { z } from "zod";
import { isProjectRelative, type ProjectFiles } from "./project-files.js";
import { parseJson } from "./project-json.js";

export const PROJECT_CONFIG_FILE = "widgetarium.json";

const MISSING_CONFIG = `missing at the project root; create ${PROJECT_CONFIG_FILE} holding {"name": "<app>"}, every path has a default`;
const ROOT_ISSUE_PATH = "(root)";

const NOT_PROJECT_RELATIVE =
	'must be relative to the project root with "/" between folders: no leading or trailing "/", no "." or "..", no "\\"';

const ProjectPathSchema = z.string().refine(isProjectRelative, NOT_PROJECT_RELATIVE);

const ProjectPathsSchema = z.strictObject({
	routes: ProjectPathSchema.default("src/app/routes"),
	widgets: ProjectPathSchema.default("src/widgets"),
	logic: ProjectPathSchema.default("src/logic"),
	schemas: ProjectPathSchema.default("src/shared/schemas"),
	sources: ProjectPathSchema.default("src/shared/sources"),
	kit: ProjectPathSchema.default("src/shared/kit"),
	libs: ProjectPathSchema.default("src/shared/libs"),
	docs: ProjectPathSchema.default("docs"),
	references: ProjectPathSchema.default("docs/references"),
});

const AliasesSchema = z.record(z.string().regex(/^@/), ProjectPathSchema);

const CatalogueSchema = z.strictObject({
	registries: z.array(z.string().min(1)).default([]),
});

export const ProjectConfigSchema = z.strictObject({
	$schema: z.string().optional(),
	name: z.string().min(1),
	paths: ProjectPathsSchema.prefault({}),
	aliases: AliasesSchema.optional(),
	catalogue: CatalogueSchema.optional(),
});

export type ProjectPaths = z.output<typeof ProjectPathsSchema>;
export type ProjectAliases = z.output<typeof AliasesSchema>;
export type ProjectConfig = Omit<z.output<typeof ProjectConfigSchema>, "aliases"> & {
	readonly aliases: ProjectAliases;
};
export type ProjectConfigReading = { readonly config: ProjectConfig } | { readonly refusal: string };

export async function readProjectConfig(files: ProjectFiles): Promise<ProjectConfigReading> {
	const text = await files.read(PROJECT_CONFIG_FILE);
	if (text === null) return { refusal: MISSING_CONFIG };
	const json = parseJson(text);
	if ("error" in json) return { refusal: `is not valid JSON: ${json.error}` };
	const parsed = ProjectConfigSchema.safeParse(json.value);
	if (!parsed.success) return { refusal: refusalOf(parsed.error) };
	const aliases = { ...defaultAliasesOf(parsed.data.paths), ...parsed.data.aliases };
	return { config: { ...parsed.data, aliases } };
}

export function defaultAliasesOf(paths: ProjectPaths): ProjectAliases {
	return {
		"@kit": paths.kit,
		"@schemas": paths.schemas,
		"@libs": paths.libs,
		"@logic": paths.logic,
		"@widgets": paths.widgets,
	};
}

export function projectConfigJsonSchema(): z.core.JSONSchema.BaseSchema {
	return z.toJSONSchema(ProjectConfigSchema, { io: "input" });
}

function refusalOf(error: z.ZodError): string {
	return error.issues
		.map((issue) => `${issue.path.length > 0 ? issue.path.join(".") : ROOT_ISSUE_PATH}: ${issue.message}`)
		.join("; ");
}
