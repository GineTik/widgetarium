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

export type CreateArgs = z.output<typeof CreateArgsSchema>;
export type CheckArgs = z.output<typeof CheckArgsSchema>;

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
