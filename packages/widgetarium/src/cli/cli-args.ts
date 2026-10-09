import path from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";
import { CliRefusal } from "./cli-output.js";

const PACKAGE_NAME = /^[a-z0-9][a-z0-9._-]*$/;
const NAME_RULE = "must be a lowercase npm package name (letters, digits, '.', '_', '-'); pass --name <app>";
const NO_DIR = "create needs the folder to create the app in: widgetarium create <dir>";

const CREATE_OPTIONS = {
	name: { type: "string" },
	engine: { type: "string" },
	"no-git": { type: "boolean" },
	"no-install": { type: "boolean" },
} as const;

const CreateArgsSchema = z.object({
	dir: z.string().min(1, NO_DIR),
	name: z.string().regex(PACKAGE_NAME, `the app name ${NAME_RULE}`),
	engine: z.string().min(1).optional(),
	git: z.boolean(),
	install: z.boolean(),
});

const CheckArgsSchema = z.object({ dir: z.string().min(1) });

const CATALOGUE_OPTIONS = {
	registry: { type: "string" },
	json: { type: "boolean" },
} as const;

const ADD_OPTIONS = {
	as: { type: "string" },
	registry: { type: "string" },
} as const;

const WIDGET_ID = /^@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/;
const WIDGET_NAME = /^[a-z0-9][a-z0-9-]*$/;
const ID_RULE = "a widget id is @scope/name, as widgetarium catalogue list prints it";

const CatalogueShared = { registry: z.string().min(1).optional(), json: z.boolean() };

const CatalogueArgsSchema = z.discriminatedUnion("action", [
	z.object({ action: z.literal("list"), ...CatalogueShared }),
	z.object({
		action: z.literal("search"),
		words: z.array(z.string()).min(1, "search needs words: widgetarium catalogue search <words>"),
		...CatalogueShared,
	}),
	z.object({ action: z.literal("show"), id: z.string().regex(WIDGET_ID, ID_RULE), ...CatalogueShared }),
]);

const AddArgsSchema = z.object({
	id: z.string().regex(WIDGET_ID, ID_RULE),
	as: z.string().regex(WIDGET_NAME, "--as must be a folder name: lowercase letters, digits and '-'").optional(),
	registry: z.string().min(1).optional(),
});

const POSITIONALS_OF_ACTION: ReadonlyMap<string, number> = new Map([
	["list", 0],
	["search", Number.POSITIVE_INFINITY],
	["show", 1],
]);

const CATALOGUE_ACTIONS = "widgetarium catalogue list | search <words> | show <id>";

export type CreateArgs = z.output<typeof CreateArgsSchema>;
export type CheckArgs = z.output<typeof CheckArgsSchema>;
export type CatalogueArgs = z.output<typeof CatalogueArgsSchema>;
export type AddArgs = z.output<typeof AddArgsSchema>;

export function parseCreateArgs(argv: readonly string[]): CreateArgs {
	const { values, positionals } = parsedArgs(() =>
		parseArgs({ args: [...argv], options: CREATE_OPTIONS, allowPositionals: true }),
	);
	refuseExtraPositionals(positionals, 1);
	const dir = positionals[0] ?? "";
	return parsedWith(CreateArgsSchema, {
		dir,
		name: values.name ?? path.basename(path.resolve(dir)),
		engine: values.engine,
		git: values["no-git"] !== true,
		install: values["no-install"] !== true,
	});
}

export function parseCheckArgs(argv: readonly string[]): CheckArgs {
	const { positionals } = parsedArgs(() => parseArgs({ args: [...argv], options: {}, allowPositionals: true }));
	refuseExtraPositionals(positionals, 1);
	return parsedWith(CheckArgsSchema, { dir: positionals[0] ?? "." });
}

export function parseCatalogueArgs(argv: readonly string[]): CatalogueArgs {
	const { values, positionals } = parsedArgs(() =>
		parseArgs({ args: [...argv], options: CATALOGUE_OPTIONS, allowPositionals: true }),
	);
	const [action, ...rest] = positionals;
	const shared = { registry: values.registry, json: values.json === true };
	const allowed = action === undefined ? undefined : POSITIONALS_OF_ACTION.get(action);
	if (allowed === undefined) throw new CliRefusal(`catalogue takes list, search or show: ${CATALOGUE_ACTIONS}`);
	refuseExtraPositionals(rest, allowed);
	return parsedWith(CatalogueArgsSchema, { action, words: rest, id: rest[0] ?? "", ...shared });
}

export function parseAddArgs(argv: readonly string[]): AddArgs {
	const { values, positionals } = parsedArgs(() =>
		parseArgs({ args: [...argv], options: ADD_OPTIONS, allowPositionals: true }),
	);
	refuseExtraPositionals(positionals, 1);
	return parsedWith(AddArgsSchema, { id: positionals[0] ?? "", as: values.as, registry: values.registry });
}

function parsedArgs<T>(parse: () => T): T {
	try {
		return parse();
	} catch (error) {
		throw new CliRefusal(error instanceof Error ? error.message : String(error));
	}
}

function refuseExtraPositionals(positionals: readonly string[], allowed: number): void {
	if (positionals.length <= allowed) return;
	throw new CliRefusal(`unexpected arguments: ${positionals.slice(allowed).join(" ")}`);
}

function parsedWith<T>(schema: z.ZodType<T>, input: unknown): T {
	const parsed = schema.safeParse(input);
	if (parsed.success) return parsed.data;
	throw new CliRefusal(parsed.error.issues.map(({ message }) => message).join("; "));
}
