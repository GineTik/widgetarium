import { execFile } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { PACKED_INTO, packEngine } from "./pack-engine.mts";
import { findBrowser } from "./harness.ts";
import { installOfflineFirst, md5Of, ran, runnerWithTheCli } from "./packed-project.mts";

interface Drawn {
	readonly dom: string;
	readonly errors: readonly string[];
}

const APP = "farm";
const TITLES = ["Water the ferns", "Mend the fence"];
const SCHEMA_FILE = "src/shared/schemas/task.ts";
const HANDLER_FILE = "src/logic/tasks/tasks-query.ts";
const WIDGET_FILE = "src/widgets/tasks/task-list/widget.tsx";
const BOARD_FILE = "src/app/routes/board.json";
const ERRORS_ATTRIBUTE = "data-wg-console-errors";
const ERRORS_HELD = new RegExp(`${ERRORS_ATTRIBUTE}="([^"]*)"`);
const RENDER_BUDGET_MS = 9000;
const STUDIO_MARK = "wg-studio-band";
const STUDIO_OUT = "dist-studio";

const SCHEMA = `import { z } from "zod";

export const TaskSchema = z.object({ id: z.string(), title: z.string() });

export type Task = z.infer<typeof TaskSchema>;
`;

const HANDLER = `import { IQuery, PageInputSchema, PageOf, type Page, type PageInput } from "widgetarium";
import { TaskSchema, type Task } from "@schemas/task";

const TASKS: readonly Task[] = [
	{ id: "t1", title: ${JSON.stringify(TITLES[0])} },
	{ id: "t2", title: ${JSON.stringify(TITLES[1])} },
];

export class TasksQuery extends IQuery.input(PageInputSchema).output(PageOf(TaskSchema)) {
	override async query(_input: PageInput): Promise<Page<Task>> {
		return { items: TASKS.map((task) => ({ id: task.id, title: task.title })), next: null, total: TASKS.length };
	}
}
`;

const WIDGET = `import { IQuery, PageInputSchema, PageOf, createWidget, defineLayout, defineMetadata, defineStates, useData } from "widgetarium";
import { Card } from "widgetarium/kit";
import { TaskSchema } from "@schemas/task";

const TaskList = createWidget({
	inject: { getTasks: IQuery.input(PageInputSchema).output(PageOf(TaskSchema)) },
	draw: ({ getTasks }) => {
		const { data } = useData(getTasks, { limit: 20 });
		return (
			<Card>
				{data.map((task) => (
					<p key={task.id}>{task.title}</p>
				))}
			</Card>
		);
	},
});

export const metadata = defineMetadata(TaskList, {
	title: "Task list",
	description: "Which tasks are left to do?",
	keywords: ["tasks", "list"],
	props: { getTasks: { label: "Tasks" } },
});

export const layout = defineLayout({ role: "collection", size: { preferredWidth: 360, preferredHeight: "auto" } });

export const states = defineStates(TaskList, {
	Full: { getTasks: [{ id: "t1", title: "A task" }] },
	Empty: { getTasks: [] },
});

export default TaskList;
`;

const TASKS_TILE = {
	id: "tasks",
	widget: "task-list",
	props: { getTasks: { implementation: "TasksQuery", fields: {}, allow: ["query"] } },
};

const BOARD = { v: 2, tiles: [TASKS_TILE], layout: { dir: "column", of: [{ id: "tasks" }] } };
const UNBOUND_TILE = {
	...TASKS_TILE,
	props: { getTasks: { ...TASKS_TILE.props.getTasks, implementation: "NoSuchQuery" } },
};
const BOARD_UNBOUND = { ...BOARD, tiles: [UNBOUND_TILE] };

const ERROR_CATCHER = `<script>
(() => {
	const said = [];
	const keep = (line) => {
		said.push(line);
		document.documentElement.setAttribute(${JSON.stringify(ERRORS_ATTRIBUTE)}, encodeURIComponent(JSON.stringify(said)));
	};
	const original = console.error;
	console.error = (...parts) => {
		keep(parts.map(String).join(" "));
		original.apply(console, parts);
	};
	addEventListener("error", (event) => keep("error: " + event.message));
	addEventListener("unhandledrejection", (event) => keep("rejected: " + String(event.reason)));
})();
</script>`;

const CONTENT_TYPES: Readonly<Record<string, string>> = {
	".html": "text/html",
	".js": "text/javascript",
	".css": "text/css",
	".svg": "image/svg+xml",
	".json": "application/json",
};

let failures = 0;

function check(name: string, held: unknown, wanted: unknown): void {
	const same = held === wanted;
	if (!same) failures += 1;
	console.log(`${same ? "ok  " : "not ok"} ${name}${same ? "" : `\n      held ${String(held)}`}`);
}

function writeIn(app: string, relative: string, text: string): void {
	fs.mkdirSync(path.dirname(path.join(app, relative)), { recursive: true });
	fs.writeFileSync(path.join(app, relative), text);
}

function writeBoard(app: string, board: object): void {
	writeIn(app, BOARD_FILE, `${JSON.stringify(board, null, "\t")}\n`);
}

function servedFile(dist: string, url: string): { readonly at: string; readonly isPage: boolean } {
	const asked = path.join(dist, decodeURIComponent(new URL(url, "http://local").pathname));
	const isAsset = asked.startsWith(dist) && fs.existsSync(asked) && fs.statSync(asked).isFile();
	return isAsset ? { at: asked, isPage: asked.endsWith(".html") } : { at: path.join(dist, "index.html"), isPage: true };
}

function serve(dist: string): Promise<http.Server> {
	const server = http.createServer((request, response) => {
		const { at, isPage } = servedFile(dist, request.url ?? "/");
		const body = fs.readFileSync(at);
		response.setHeader("content-type", CONTENT_TYPES[path.extname(at)] ?? "application/octet-stream");
		response.end(isPage ? body.toString("utf8").replace("<head>", `<head>${ERROR_CATCHER}`) : body);
	});
	return new Promise((listening) => server.listen(0, "127.0.0.1", () => listening(server)));
}

async function drawnAt(url: string): Promise<Drawn> {
	const { stdout } = await promisify(execFile)(
		findBrowser("project render"),
		[
			"--headless",
			"--disable-gpu",
			"--no-sandbox",
			"--window-size=1280,900",
			`--virtual-time-budget=${RENDER_BUDGET_MS}`,
			"--dump-dom",
			url,
		],
		{ encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
	);
	const held = ERRORS_HELD.exec(stdout)?.[1];
	const errors: unknown = held === undefined ? [] : JSON.parse(decodeURIComponent(held));
	return { dom: stdout, errors: Array.isArray(errors) ? errors.map(String) : [] };
}

async function builtAndDrawn(app: string): Promise<Drawn> {
	const build = ran(app, "npm", ["run", "build"]);
	if (!build.ok) throw new Error(`npm run build failed:\n${build.said}`);
	return drawnFrom(path.join(app, "dist"));
}

async function studioBuiltAndDrawn(app: string): Promise<Drawn> {
	const build = ran(app, "npx", ["vite", "build", "--mode", "studio", "--outDir", STUDIO_OUT]);
	if (!build.ok) throw new Error(`vite build --mode studio failed:\n${build.said}`);
	return drawnFrom(path.join(app, STUDIO_OUT));
}

function scriptsUnder(dist: string): string {
	return fs
		.readdirSync(dist, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
		.map((entry) => fs.readFileSync(path.join(entry.parentPath, entry.name), "utf8"))
		.join("\n");
}

async function drawnFrom(dist: string): Promise<Drawn> {
	const server = await serve(dist);
	try {
		return await drawnAt(`http://127.0.0.1:${portOf(server.address())}/`);
	} finally {
		server.close();
	}
}

function portOf(address: string | { readonly port: number } | null): number {
	if (typeof address !== "object" || address === null) throw new Error("the static server listens on no port");
	return address.port;
}

function titlesDrawnInBoard({ dom }: Drawn): boolean {
	const board = dom.indexOf("wg-root");
	return board >= 0 && TITLES.every((title) => dom.indexOf(title, board) > board);
}

function typecheckSaid(app: string): string {
	const typecheck = ran(app, "npm", ["run", "typecheck"]);
	return typecheck.ok ? "" : typecheck.said;
}

function withTitleRenamedInSchema<T>(app: string, run: () => T): T {
	const at = path.join(app, SCHEMA_FILE);
	const kept = { text: fs.readFileSync(at, "utf8"), md5: md5Of(at) };
	fs.writeFileSync(at, kept.text.replace("title: z.string()", "name: z.string()"));
	try {
		return run();
	} finally {
		fs.writeFileSync(at, kept.text);
		check("and the schema is restored byte for byte", md5Of(at), kept.md5);
	}
}

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "wg-project-render-"));
try {
	const runner = runnerWithTheCli(await packEngine(), scratch);
	const app = path.join(scratch, APP);
	const created = ran(scratch, path.join(runner, "node_modules/.bin/widgetarium"), [
		"create",
		app,
		"--engine",
		PACKED_INTO,
		"--no-git",
		"--no-install",
	]);
	if (!created.ok) throw new Error(`widgetarium create failed:\n${created.said}`);
	writeIn(app, SCHEMA_FILE, SCHEMA);
	writeIn(app, HANDLER_FILE, HANDLER);
	writeIn(app, WIDGET_FILE, WIDGET);
	writeBoard(app, BOARD);
	installOfflineFirst(app);

	check("npm run typecheck is clean", typecheckSaid(app), "");
	const projectCheck = ran(app, "npm", ["run", "check"]);
	check("npm run check finds nothing", projectCheck.ok ? "" : projectCheck.said, "");

	const drawn = await builtAndDrawn(app);
	check("the route's board draws both task titles the handler answered", titlesDrawnInBoard(drawn), true);
	check("and the page logs no console error", drawn.errors.join("\n"), "");
	check("app mode ships no studio code", scriptsUnder(path.join(app, "dist")).includes(STUDIO_MARK), false);

	const studio = await studioBuiltAndDrawn(app);
	check("studio mode ships the studio", scriptsUnder(path.join(app, STUDIO_OUT)).includes(STUDIO_MARK), true);
	check("and draws its band", studio.dom.includes(`class="${STUDIO_MARK}"`), true);
	check("with the route's tasks below it", titlesDrawnInBoard(studio), true);
	check("and logs no console error", studio.errors.join("\n"), "");

	writeBoard(app, BOARD_UNBOUND);
	const unbound = await builtAndDrawn(app);
	check("falsified: a tile bound to a handler nobody exports draws no title", titlesDrawnInBoard(unbound), false);
	check("and its failure reaches the console", unbound.errors.length > 0, true);
	writeBoard(app, BOARD);

	withTitleRenamedInSchema(app, () => {
		const said = typecheckSaid(app);
		check("with title renamed in the schema, typecheck is red in the widget", said.includes(WIDGET_FILE), true);
		check("and red in the handler", said.includes(HANDLER_FILE), true);
	});
	check("restored, typecheck is clean again", typecheckSaid(app), "");
} finally {
	fs.rmSync(scratch, { recursive: true, force: true });
}

console.log(failures === 0 ? "project render: every check passed" : `project render: ${failures} checks red`);
process.exit(failures === 0 ? 0 : 1);
