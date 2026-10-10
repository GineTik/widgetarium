import { JSDOM } from "jsdom";
import type { DataAdapter, Stat } from "obsidian";
import type { MountContext } from "../apps/obsidian/src/board-mount.js";
import type { ProjectAdapter } from "../apps/obsidian/src/project-files-vault.js";
import type { SurfaceHost } from "../packages/core/src/surface/use-surface-shared.js";
import { standIn } from "./stand-in.ts";

const dom = new JSDOM(`<!doctype html><body></body>`, { pretendToBeVisual: true });
class SilentResizeObserver {
	observe(): void {}
	disconnect(): void {}
}
Object.assign(globalThis, {
	window: dom.window,
	document: dom.window.document,
	Node: dom.window.Node,
	Element: dom.window.Element,
	HTMLElement: dom.window.HTMLElement,
	SVGElement: dom.window.SVGElement,
	getComputedStyle: dom.window.getComputedStyle,
	requestAnimationFrame: dom.window.requestAnimationFrame,
	cancelAnimationFrame: dom.window.cancelAnimationFrame,
	MutationObserver: dom.window.MutationObserver,
	ResizeObserver: SilentResizeObserver,
});
Object.assign(dom.window, { ResizeObserver: SilentResizeObserver });
Object.defineProperty(dom.window.HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 1280 });

const { registerPacks } = await import("../packages/core/src/engine/packs.js");
const { corePack } = await import("../packages/packs/core/src/index.js");
const { drawAppBlock } = await import("../apps/obsidian/src/app-block.js");
const { createAppProjects } = await import("../apps/obsidian/src/app-projects.js");

registerPacks(corePack);

type VaultFiles = Record<string, string>;

interface DrawnBlock {
	readonly element: HTMLElement;
	readonly unload: () => void;
}

const APP = "Apps/Demo";
const NOTE = "Apps/Demo.md";
const TITLES = ["Water the ferns", "Mend the fence"];
const RENAMED_TITLE = "Feed the cat";
const HANDLER_FILE = `${APP}/src/logic/tasks/tasks-query.ts`;
const SETTLED_AFTER_CHANGE_MS = 400;
const UNIMPORTED_KIT_FILE = `${APP}/src/shared/kit/broken.tsx`;
const WIDGET_FILE = `${APP}/src/widgets/tasks/task-list/widget.tsx`;

const SCHEMA = `import { z } from "zod";

export const TaskSchema = z.object({ id: z.string(), title: z.string() });

export type Task = z.infer<typeof TaskSchema>;
`;

const handlerAnswering = (
	titles: readonly string[],
): string => `import { IQuery, PageInputSchema, PageOf, type Page, type PageInput } from "widgetarium";
import { TaskSchema, type Task } from "@schemas/task";

const TASKS: readonly Task[] = ${JSON.stringify(titles.map((title, index) => ({ id: `t${index}`, title })))};

export class TasksQuery extends IQuery.input(PageInputSchema).output(PageOf(TaskSchema)) {
	override async query(_input: PageInput): Promise<Page<Task>> {
		return { items: [...TASKS], next: null, total: TASKS.length };
	}
}
`;

const WIDGET = `import { IQuery, IValueGateway, PageInputSchema, PageOf, createWidget, defineLayout, defineMetadata, useData, z } from "widgetarium";
import { Card } from "widgetarium/kit";
import { TaskSchema } from "@schemas/task";
import { headingOf } from "./heading";

const TaskList = createWidget({
	inject: {
		getTasks: IQuery.input(PageInputSchema).output(PageOf(TaskSchema)),
		getTaskId: IValueGateway.of(z.string().default("")).pick("get"),
	},
	draw: ({ getTasks, getTaskId }) => {
		const { data } = useData(getTasks, { limit: 20 });
		return (
			<Card>
				<p className="task-id">{headingOf(getTaskId)}</p>
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
	props: { getTasks: { label: "Tasks" }, getTaskId: { label: "Task" } },
});

export const layout = defineLayout({ role: "collection", size: { preferredWidth: 360, preferredHeight: "auto" } });

export default TaskList;
`;

const HEADING = `export function headingOf(taskId: string): string {
	return "task " + taskId;
}
`;

const TASKS_TILE = {
	id: "tasks",
	widget: "task-list",
	props: {
		getTasks: { implementation: "TasksQuery", fields: {}, allow: ["query"] },
		getTaskId: { implementation: "@core/page-param", fields: { key: "id" } },
	},
};
const TASK_BOARD = { v: 2, tiles: [TASKS_TILE], layout: { dir: "column", of: [{ id: "tasks" }] } };
const HOME_BOARD = { v: 2, tiles: [], layout: { dir: "column", of: [] } };

const PROJECT: VaultFiles = {
	[`${APP}/widgetarium.json`]: JSON.stringify({
		name: "demo",
		aliases: { "@schemas": "src/shared/schemas/index.ts", "@schemas/task": "src/shared/schemas/task.ts" },
	}),
	[`${APP}/src/shared/schemas/task.ts`]: SCHEMA,
	[HANDLER_FILE]: handlerAnswering(TITLES),
	[WIDGET_FILE]: WIDGET,
	[`${APP}/src/widgets/tasks/task-list/heading.ts`]: HEADING,
	[`${APP}/src/app/routes/board.json`]: JSON.stringify(HOME_BOARD),
	[`${APP}/src/app/routes/tasks/[id]/board.json`]: JSON.stringify(TASK_BOARD),
	[UNIMPORTED_KIT_FILE]: "export function (",
};

let failed = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK " : "!! "} ${what}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(wanted)}`}`,
	);
}

function adapterOver(files: VaultFiles): ProjectAdapter {
	const under = (folder: string): string[] => Object.keys(files).filter((path) => path.startsWith(`${folder}/`));
	const childOf = (folder: string, path: string): string => `${folder}/${path.slice(folder.length + 1).split("/")[0]}`;
	const isFolder = (path: string): boolean => under(path).length > 0;
	const stat = (type: Stat["type"]): Stat => ({ type, ctime: 0, mtime: 0, size: 0 });
	const adapter: Pick<DataAdapter, "list" | "read" | "stat"> = {
		list: async (folder) => {
			const children = [...new Set(under(folder).map((path) => childOf(folder, path)))];
			return { files: children.filter((path) => path in files), folders: children.filter(isFolder) };
		},
		read: async (path) => {
			const text = files[path];
			if (text === undefined) throw new Error(`${path} does not exist`);
			return text;
		},
		stat: async (path) => {
			if (path in files) return stat("file");
			return isFolder(path) ? stat("folder") : null;
		},
	};
	return adapter;
}

const slot = {
	canCreate: false,
	canUpdate: false,
	canRemove: false,
	canSubscribe: false,
	list: async () => ({ rows: [], total: 0 }),
};
const host = standIn<SurfaceHost>(
	{ platform: "test", can: {}, slot: () => slot, ui: { notify() {} }, notePath: NOTE },
	["slot", "ui"],
	"host",
);

const tick = async (): Promise<void> => {
	for (let frame = 0; frame < 6; frame += 1)
		await new Promise((settled) => globalThis.requestAnimationFrame(() => setTimeout(settled, 0)));
};

async function drawn(projects: ReturnType<typeof createAppProjects>, source: string): Promise<DrawnBlock> {
	const element = document.createElement("div");
	document.body.appendChild(element);
	const children: { onunload?: () => void }[] = [];
	const context = standIn<MountContext>(
		{ sourcePath: NOTE, addChild: (child: { onunload?: () => void }) => children.push(child) },
		["sourcePath", "addChild"],
		"context",
	);
	drawAppBlock({ projects, hostOf: () => host }, source, element, context);
	await tick();
	return { element, unload: () => children.forEach((child) => child.onunload?.()) };
}

function textOf(block: DrawnBlock): string {
	return block.element.textContent ?? "";
}

function refusalOf(block: DrawnBlock): string {
	return block.element.querySelector(".wg-app-refusal")?.textContent ?? "";
}

const files: VaultFiles = { ...PROJECT };
const projects = createAppProjects(adapterOver(files));

const tasks = await drawn(projects, `app: ${APP}\nroute: /tasks/42`);
check(
	"the route's board draws both titles its handler answered",
	TITLES.map((title) => textOf(tasks).includes(title)),
	[true, true],
);
check("a widget importing a sibling module and an alias draws through both", textOf(tasks).includes("task "), true);
check("the route parameter reaches the widget", tasks.element.querySelector(".task-id")?.textContent ?? "", "task 42");
check("and nothing is refused, so a kit file no widget imports was never compiled", refusalOf(tasks), "");

files[HANDLER_FILE] = handlerAnswering([RENAMED_TITLE]);
projects.changed(HANDLER_FILE);
await new Promise((settled) => setTimeout(settled, SETTLED_AFTER_CHANGE_MS));
await tick();
check(
	"an edit to a handler redraws the open block with what it answers now",
	textOf(tasks).includes(RENAMED_TITLE),
	true,
);
check("and the old answer is gone", textOf(tasks).includes(TITLES[0] ?? ""), false);

tasks.unload();
check("unloading the block empties it", tasks.element.querySelector(".wg-app-block")?.childElementCount ?? -1, 0);

const home = await drawn(projects, `app: ${APP}/`);
check(
	"a block naming no route draws the root route's board",
	[refusalOf(home), home.element.querySelector(".wg-root") !== null],
	["", true],
);

const nowhere = await drawn(projects, `app: ${APP}\nroute: /nope`);
check(
	"an unknown route says so and names the routes there are",
	refusalOf(nowhere),
	`The app at ${APP} has no route answering /nope. Its routes: /, /tasks/:id.`,
);

const nameless = await drawn(projects, "route: /");
check(
	"a block naming no app is refused with what it should hold",
	refusalOf(nameless).startsWith("This widgetarium-app block cannot be read"),
	true,
);

const broken = createAppProjects(adapterOver({ ...PROJECT, [`${APP}/widgetarium.json`]: "{ name: " }));
const badConfig = await drawn(broken, `app: ${APP}`);
check(
	"an invalid widgetarium.json is named in the block",
	refusalOf(badConfig).includes("widgetarium.json: is not valid JSON"),
	true,
);

const missing = await drawn(createAppProjects(adapterOver({})), `app: ${APP}`);
check(
	"a folder holding no project says widgetarium.json is missing",
	refusalOf(missing).includes("widgetarium.json: missing at the project root"),
	true,
);

const unbuildable = createAppProjects(
	adapterOver({ ...PROJECT, [`${APP}/src/widgets/tasks/task-list/heading.ts`]: "export function (" }),
);
const syntax = await drawn(unbuildable, `app: ${APP}\nroute: /tasks/1`);
check("a module that does not compile is named in the block", refusalOf(syntax).includes("heading.ts"), true);

const strayImport = createAppProjects(
	adapterOver({ ...PROJECT, [WIDGET_FILE]: WIDGET.replace('"./heading"', '"@schemas/nowhere"') }),
);
const stray = await drawn(strayImport, `app: ${APP}\nroute: /tasks/1`);
check(
	"an alias naming no module is named in the block",
	refusalOf(stray).includes(
		`${WIDGET_FILE.slice(APP.length + 1)}: imports "@schemas/nowhere", which names no module in this project`,
	),
	true,
);

const opened: ((said: string) => void)[] = [];
let redrawRacing = (): void => {};
const racing = standIn<ReturnType<typeof createAppProjects>>(
	{
		open: () =>
			new Promise((settle) =>
				opened.push((said) => settle({ ok: false, findings: [{ path: "x", message: said }], version: opened.length })),
			),
		watch: (_folder: string, redraw: () => void) => {
			redrawRacing = redraw;
			return () => {};
		},
		changed: () => {},
		close: () => {},
	},
	["open", "watch", "changed", "close"],
	"projects",
);
const raced = await drawn(racing, `app: ${APP}`);
redrawRacing();
opened[1]?.("fresh");
await tick();
opened[0]?.("stale");
await tick();
check("an older open settling after a newer one does not draw over it", refusalOf(raced).includes("x: fresh"), true);

console.log(failed === 0 ? "app block: every check passed" : `app block: ${failed} checks red`);
process.exit(failed === 0 ? 0 : 1);
