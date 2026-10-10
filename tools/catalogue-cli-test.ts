import fs from "node:fs";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { runCli } from "../packages/cli/src/run-cli.js";
import type { CliOutput } from "../packages/cli/src/cli-output.js";
import { MINI_DEPENDENCY, miniRegistry, servedFolder } from "./catalogue-registry-fixture.ts";
import { fakeEngine } from "./fake-engine.ts";

interface CliRun {
	readonly code: number;
	readonly said: string;
}

const REPO = path.resolve(import.meta.dirname, "..");
const REGISTRY = path.join(REPO, "registry");
const LOG_STAT = "@default/log-stat";
const WIDGETS = "src/widgets";
const LIBS = "src/shared/libs";
const COMMIT_OR_LOCAL = /^(?:[0-9a-f]{40}|local)$/;

const WidgetRowSchema = z.strictObject({
	id: z.string(),
	title: z.string(),
	role: z.string().nullable(),
	description: z.string(),
	keywords: z.array(z.string()),
	registry: z.string(),
	score: z.number().positive().optional(),
});

const ListJsonSchema = z.strictObject({
	registries: z.array(
		z.strictObject({
			at: z.string(),
			name: z.string().nullable(),
			refusal: z.string().nullable(),
			problems: z.array(z.string()),
		}),
	),
	widgets: z.array(WidgetRowSchema),
});

const ShowJsonSchema = WidgetRowSchema.extend({
	folder: z.string(),
	props: z.array(
		z.strictObject({
			name: z.string(),
			kind: z.string().nullable(),
			control: z.string().nullable(),
			type: z.string().nullable(),
			label: z.string().nullable(),
			verbs: z.array(z.string()),
			source: z.string().nullable(),
			fields: z.array(z.string()),
		}),
	),
	commands: z.array(z.strictObject({ name: z.string(), label: z.string().nullable(), source: z.string().nullable() })),
	slots: z.array(z.string()),
	files: z.array(z.string()),
	libs: z.array(z.string()),
	dependencies: z.record(z.string(), z.string()),
	widgetDependencies: z.array(z.string()),
});

const OriginSchema = z.strictObject({
	from: z.string(),
	registry: z.string(),
	commit: z.string(),
	installedAt: z.iso.datetime(),
});

const PackageSchema = z.object({ dependencies: z.record(z.string(), z.string()) });

let failures = 0;

function check(name: string, held: unknown, wanted: unknown): void {
	const same = JSON.stringify(held) === JSON.stringify(wanted);
	if (!same) failures += 1;
	console.log(
		`${same ? "ok  " : "not ok"} ${name}${same ? "" : `\n      held   ${JSON.stringify(held)}\n      wanted ${JSON.stringify(wanted)}`}`,
	);
}

async function cli(argv: readonly string[], cwd: string = REPO): Promise<CliRun> {
	const lines: string[] = [];
	const output: CliOutput = { out: (text) => lines.push(text), err: (text) => lines.push(text) };
	const code = await runCli(argv, output, cwd);
	return { code, said: lines.join("\n") };
}

function parsedOr<T>(schema: z.ZodType<T>, text: string): T | string {
	try {
		const parsed = schema.safeParse(JSON.parse(text));
		return parsed.success ? parsed.data : parsed.error.message;
	} catch (error) {
		return String(error);
	}
}

function read(root: string, at: string): string {
	const file = path.join(root, at);
	return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

async function checkCatalogueOverTheRepo(): Promise<void> {
	const listed = parsedOr(ListJsonSchema, (await cli(["catalogue", "list", "--json"])).said);
	const ids = typeof listed === "string" ? [listed] : listed.widgets.map(({ id }) => id);
	check(
		"list --json parses and offers @default/list and @default/log-stat",
		[ids.includes("@default/list"), ids.includes(LOG_STAT)],
		[true, true],
	);
	check(
		"list reads this repo's registry/ when run inside the repo",
		typeof listed === "string" ? listed : listed.registries.map(({ at, refusal }) => [at, refusal]),
		[[REGISTRY, null]],
	);
	const text = await cli(["catalogue", "list"]);
	check(
		"list prints a line per widget",
		[text.code, text.said.split("\n").some((line) => line.startsWith("@default/list "))],
		[0, true],
	);

	const searched = parsedOr(ListJsonSchema, (await cli(["catalogue", "search", "streak", "--json"])).said);
	const found = typeof searched === "string" ? [] : searched.widgets;
	check(
		"search ranks the widgets the words name and leaves out the rest",
		[found.some(({ id }) => id === LOG_STAT), found.some(({ id }) => id === "@default/list"), found.length > 0],
		[true, false, true],
	);
	const scores = found.map(({ score }) => score ?? 0);
	check(
		"search is ordered by score",
		scores,
		[...scores].sort((left, right) => right - left),
	);

	const shown = parsedOr(ShowJsonSchema, (await cli(["catalogue", "show", LOG_STAT, "--json"])).said);
	check(
		"show --json names the card's files, its lib and its props",
		typeof shown === "string"
			? shown
			: [shown.files, shown.libs, shown.props.find(({ name }) => name === "getHabits")?.kind],
		[["widget.tsx"], ["@default/lib.ts"], "collection"],
	);
	const shownText = await cli(["catalogue", "show", LOG_STAT]);
	check("show prints the libs line", shownText.said.includes("libs: @default/lib.ts"), true);
	const unknown = await cli(["catalogue", "show", "@default/nothing-here"]);
	check(
		"show refuses an id nobody offers and says how to search",
		[unknown.code, unknown.said.includes("catalogue search")],
		[1, true],
	);
	check("catalogue with no action is refused", (await cli(["catalogue"])).code, 1);
}

async function checkAddIntoAProject(project: string): Promise<void> {
	const added = await cli(["add", LOG_STAT], project);
	check(
		"add answers 0 and says where",
		[added.code, added.said.split("\n")[0]],
		[0, `added ${LOG_STAT} as log-stat in ${WIDGETS}/log-stat`],
	);
	const widget = read(project, `${WIDGETS}/log-stat/widget.tsx`);
	check(
		"the widget lands in the widgets folder with its lib import on the alias",
		[widget.includes('from "@libs/default/lib"'), widget.includes('"@default/lib"')],
		[true, false],
	);
	check(
		"the scope's lib lands in libs/<library>/ unchanged",
		read(project, `${LIBS}/default/lib.ts`),
		fs.readFileSync(path.join(REGISTRY, "@default/lib.ts"), "utf8"),
	);
	const origin = parsedOr(OriginSchema, read(project, `${WIDGETS}/log-stat/origin.json`));
	check(
		"origin.json names the id, the registry and a commit or local",
		typeof origin === "string" ? origin : [origin.from, origin.registry, COMMIT_OR_LOCAL.test(origin.commit)],
		[LOG_STAT, REGISTRY, true],
	);
	check("add prints the next steps", added.said.includes("npm run typecheck && npm run check"), true);

	const again = await cli(["add", LOG_STAT], project);
	check(
		"a second add of the same name is refused, suggesting --as",
		[again.code, again.said.includes("--as")],
		[1, true],
	);
	const renamed = await cli(["add", LOG_STAT, "--as", "log-stat-two"], project);
	check(
		"--as adds it under the new name and skips the unchanged lib",
		[
			renamed.code,
			fs.existsSync(path.join(project, WIDGETS, "log-stat-two/widget.tsx")),
			renamed.said.includes("unchanged, skipped"),
		],
		[0, true, true],
	);
	fs.mkdirSync(path.join(project, WIDGETS, "orders/tasks"), { recursive: true });
	fs.writeFileSync(path.join(project, WIDGETS, "orders/tasks/widget.tsx"), "export default 1;\n");
	const nested = await cli(["add", LOG_STAT, "--as", "tasks"], project);
	check(
		"a name held by a widget in a feature folder is refused too",
		[nested.code, nested.said.includes(`${WIDGETS}/orders/tasks`)],
		[1, true],
	);
	const checked = await cli(["check", project]);
	check("widgetarium check finds nothing after the adds", [checked.code, checked.said], [0, `${project}: no findings`]);
}

async function checkConfiguredAndServedRegistries(project: string, mini: string): Promise<void> {
	const configFile = path.join(project, "widgetarium.json");
	const config = z.record(z.string(), z.unknown()).parse(JSON.parse(fs.readFileSync(configFile, "utf8")));
	fs.writeFileSync(
		configFile,
		JSON.stringify({ ...config, catalogue: { registries: [path.relative(project, mini)] } }),
	);
	const listed = parsedOr(ListJsonSchema, (await cli(["catalogue", "list", "--json"], path.join(project, "src"))).said);
	check(
		"catalogue.registries in widgetarium.json replaces the repo registry, found from a subfolder",
		typeof listed === "string" ? listed : listed.widgets.map(({ id }) => id),
		["@mini/log-stat"],
	);
	const added = await cli(["add", "@mini/log-stat", "--as", "mini-stat"], project);
	check(
		"a relative lib import is rewritten to the alias of its library",
		[
			added.code,
			read(project, `${WIDGETS}/mini-stat/widget.tsx`).includes('from "@libs/mini/lib"'),
			fs.existsSync(path.join(project, LIBS, "mini/lib.ts")),
		],
		[0, true, true],
	);
	const manifest = PackageSchema.safeParse(JSON.parse(read(project, "package.json")));
	const dependencies = manifest.success ? manifest.data.dependencies : {};
	check(
		"declared dependencies reach package.json, the engine-held ones are not touched",
		[dependencies[MINI_DEPENDENCY], added.said.includes("dependency zod")],
		["^4.1.0", false],
	);
	const origin = parsedOr(OriginSchema, read(project, `${WIDGETS}/mini-stat/origin.json`));
	check("a registry outside git is local", typeof origin === "string" ? origin : origin.commit, "local");

	const server = await servedFolder(mini);
	try {
		const { port } = z.custom<AddressInfo>((held) => typeof held === "object" && held !== null).parse(server.address());
		const shown = parsedOr(
			ShowJsonSchema,
			(await cli(["catalogue", "show", "@mini/log-stat", "--registry", `http://127.0.0.1:${port}`, "--json"])).said,
		);
		check("a registry served over http is read the same way", typeof shown === "string" ? shown : shown.libs, [
			"@mini/lib.ts",
		]);
	} finally {
		server.close();
	}
}

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "wg-catalogue-cli-"));
try {
	await checkCatalogueOverTheRepo();
	const project = path.join(scratch, "shop");
	const engine = fakeEngine(path.join(scratch, "engine"));
	const created = await cli(["create", project, "--engine", engine, "--no-install", "--no-git"]);
	check("a project is created to add into", created.code, 0);
	await checkAddIntoAProject(project);
	await checkConfiguredAndServedRegistries(project, miniRegistry(path.join(scratch, "mini")));
} finally {
	fs.rmSync(scratch, { recursive: true, force: true });
}

console.log(failures === 0 ? "catalogue cli: every check passed" : `catalogue cli: ${failures} checks red`);
process.exit(failures === 0 ? 0 : 1);
