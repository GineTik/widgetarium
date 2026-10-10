import { z } from "zod";
import { isProjectRelative, type ProjectFiles } from "./project-files.js";
import { parseJson } from "./project-json.js";

export const PROJECT_CONFIG_FILE = "widgetarium.json";

export const DEFAULT_APP_ICON = "public/icon.svg";

const MISSING_CONFIG = `missing at the project root; create ${PROJECT_CONFIG_FILE} holding {"app": {"name": "<app>"}}, every path has a default`;
const APP_NAME_MISSING = 'app.name: the app has no name; write {"app": {"name": "<app>"}}';
const APP_NAMED_TWICE = "name: moved to app.name; keep only app.name";
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

const AppSchema = z.strictObject({
	name: z.string().min(1).optional(),
	icon: ProjectPathSchema.default(DEFAULT_APP_ICON),
});

export const ProjectConfigSchema = z.strictObject({
	$schema: z.string().optional(),
	name: z.string().min(1).optional().meta({ deprecated: true, description: "moved to app.name" }),
	app: AppSchema.prefault({}),
	paths: ProjectPathsSchema.prefault({}),
	aliases: AliasesSchema.optional(),
	catalogue: CatalogueSchema.optional(),
});

// TRADE-OFF: editors are told app.name is required while the parser still reads a top-level name.
const REQUIRED_WHEN_WRITTEN = new Map<z.core.$ZodType, string[]>([
	[ProjectConfigSchema, ["app"]],
	[AppSchema, ["name"]],
]);

export type ProjectPaths = z.output<typeof ProjectPathsSchema>;
export type ProjectAliases = z.output<typeof AliasesSchema>;
export interface ProjectApp {
	readonly name: string;
	readonly icon: string;
}
export type ProjectConfig = Omit<z.output<typeof ProjectConfigSchema>, "name" | "app" | "aliases"> & {
	readonly app: ProjectApp;
	readonly aliases: ProjectAliases;
};
type AppReading = { readonly app: ProjectApp } | { readonly refusal: string };
export type ProjectConfigReading = { readonly config: ProjectConfig } | { readonly refusal: string };

export async function readProjectConfig(files: ProjectFiles): Promise<ProjectConfigReading> {
	const text = await files.read(PROJECT_CONFIG_FILE);
	if (text === null) return { refusal: MISSING_CONFIG };
	const json = parseJson(text);
	if ("error" in json) return { refusal: `is not valid JSON: ${json.error}` };
	const parsed = ProjectConfigSchema.safeParse(json.value);
	if (!parsed.success) return { refusal: refusalOf(parsed.error) };
	const { name: legacyName, app: declaredApp, aliases: declaredAliases, ...rest } = parsed.data;
	const app = appOf(declaredApp, legacyName);
	if ("refusal" in app) return app;
	return { config: { ...rest, app: app.app, aliases: { ...defaultAliasesOf(rest.paths), ...declaredAliases } } };
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
	return z.toJSONSchema(ProjectConfigSchema, {
		io: "input",
		override: ({ zodSchema, jsonSchema }) => {
			const required = REQUIRED_WHEN_WRITTEN.get(zodSchema);
			if (required !== undefined) jsonSchema.required = required;
		},
	});
}

function refusalOf(error: z.ZodError): string {
	return error.issues
		.map((issue) => `${issue.path.length > 0 ? issue.path.join(".") : ROOT_ISSUE_PATH}: ${issue.message}`)
		.join("; ");
}

function appOf(declared: z.output<typeof AppSchema>, legacyName: string | undefined): AppReading {
	if (declared.name !== undefined && legacyName !== undefined) return { refusal: APP_NAMED_TWICE };
	const name = declared.name ?? legacyName;
	if (name === undefined) return { refusal: APP_NAME_MISSING };
	return { app: { name, icon: declared.icon } };
}
