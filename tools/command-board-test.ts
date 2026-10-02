import { JSDOM } from "jsdom";
import { byId } from "./dom-find.ts";
import { present } from "./page-dom.ts";
import type { Board } from "../packages/core/src/model.js";
import type { Command, RecordRef } from "../packages/core/src/gateway/declared.ts";
import type { BoardRegistry, SurfaceHost } from "../packages/core/src/surface/use-surface-shared.js";
import { standIn } from "./stand-in.ts";

const dom = new JSDOM(`<!doctype html><body><div class="view-content"><div id="host"></div></div></body>`, {
	pretendToBeVisual: true,
});
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
	KeyboardEvent: dom.window.KeyboardEvent,
	MouseEvent: dom.window.MouseEvent,
	Event: dom.window.Event,
	MutationObserver: dom.window.MutationObserver,
	ResizeObserver: SilentResizeObserver,
});
Object.assign(dom.window, { ResizeObserver: SilentResizeObserver });
Object.defineProperty(dom.window.HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 1280 });

const { createElement: h } = await import("react");
const { render } = await import("../packages/core/src/engine/render.js");
const { WidgetSurface } = await import("../packages/core/src/surface.js");
const { normalizeBoard } = await import("../packages/core/src/model.js");
const { createWidget } = await import("../packages/core/src/widget-api.js");
const { useData } = await import("../packages/core/src/gateway/use-data.ts");
const { manifestOfModule, RecordRefSchema, z } = await import("../packages/core/src/gateway/declared.ts");
const { ICommand, IQuery } = await import("../packages/core/src/gateway/queries.ts");

let failed = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK " : "!! "} ${what}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(wanted)}`}`,
	);
}

const StatusSchema = z.enum(["todo", "doing", "done"]);
const TaskSchema = z.object({ title: z.string(), status: StatusSchema, id: z.string().optional() });

interface Seen {
	readonly tasks: readonly { readonly ref: RecordRef; readonly title: string; readonly status: string }[];
	readonly move: Command<{ ref: RecordRef; status: "todo" | "doing" | "done" }>;
	readonly create: Command<{ id: string; title: string; status: "todo" | "doing" | "done" }>;
}
const seen: Seen[] = [];

const TaskBoard = createWidget({
	inject: {
		tasks: IQuery.of(z.array(TaskSchema)),
		move: ICommand.of(z.object({ ref: RecordRefSchema, status: StatusSchema })),
		create: ICommand.of(TaskSchema.extend({ id: z.uuid() })),
	},
	draw: ({ tasks, move, create }) => {
		const read = useData(tasks);
		seen.push({ tasks: read.data, move, create });
		return h("b", null, String(read.data.length));
	},
});

const ID = "@test/task-board";
const module = {
	default: TaskBoard,
	metadata: { title: "Task board", description: "Tasks", props: { move: { label: "Move" } } },
	layout: { role: "content", size: { preferredWidth: 320, preferredHeight: "auto" as const } },
};
const manifest = { ...present(manifestOfModule(module), "the task board manifest"), id: ID };
const registry = {
	get: (id: string) => (id === ID ? { manifest, component: TaskBoard, module } : null),
	list: () => [{ manifest }],
};
const slot = {
	canCreate: true,
	canUpdate: true,
	canRemove: true,
	canSubscribe: false,
	list: async () => ({ rows: [], total: 0 }),
	describe: async () => [],
};
const host = { platform: "test", can: {}, slot: () => slot, ui: { notify() {}, openNote() {} } };

let board: Board = normalizeBoard({
	tiles: [
		{
			id: "t1",
			widget: ID,
			props: {
				tasks: { from: "typed", rows: [{ title: "Ship spec", status: "doing" }] },
				move: { implementation: "@core/typed-rows-update", fields: { target: "t1/tasks" } },
				create: { implementation: "@core/typed-rows-create", fields: { target: "t1/tasks" } },
			},
		},
	],
	layouts: { 20: [{ id: "t1", x: 0, y: 0, w: 12, h: 8 }] },
});
const mount = byId(document, "host");
const draw = (): void =>
	render(
		h(WidgetSurface, {
			boardNode: mount,
			board,
			registry: standIn<BoardRegistry>(registry, ["get", "list"], "registry"),
			host: standIn<SurfaceHost>(host, ["slot", "ui"], "host"),
			editing: false,
			initialWidth: 1280,
			onChange: (next: Board) => {
				board = next;
				draw();
			},
		}),
		mount,
	);
draw();

const tick = async (): Promise<void> => {
	for (let frame = 0; frame < 3; frame += 1)
		await new Promise((settled) => globalThis.requestAnimationFrame(() => setTimeout(settled, 0)));
};
const last = (): Seen => present(seen[seen.length - 1], "a drawn task board");
const rowsInNote = (): unknown => board.tiles.find((tile) => tile.id === "t1")?.props?.["tasks"];

await tick();
check(
	"the typed query draws its rows",
	last().tasks.map((row) => [row.title, row.status]),
	[["Ship spec", "doing"]],
);
check("a command bound to a typed list can run", last().move.can(), { can: true });

const shipped = present(last().tasks[0], "the first task");
check("moving a task answers only a status", await last().move({ ref: shipped.ref, status: "done" }), { ok: true });
await tick();
check("the note holds the change", JSON.stringify(rowsInNote()).includes('"status":"done"'), true);
check(
	"and the query draws it",
	last().tasks.map((row) => row.status),
	["done"],
);

const id = "0f8fad5b-d9cb-469f-a165-70867728950e";
check("a create with its own id answers ok", await last().create({ id, title: "Port heatmap", status: "todo" }), {
	ok: true,
});
await tick();
check("and the same create again answers ok", await last().create({ id, title: "Port heatmap", status: "todo" }), {
	ok: true,
});
await tick();
check(
	"but leaves one record",
	last().tasks.map((row) => row.title),
	["Ship spec", "Port heatmap"],
);

const switchedOff = { implementation: "@core/typed-rows-update", fields: { target: "t1/tasks" }, allow: [] };
board = { ...board, tiles: board.tiles.map((tile) => ({ ...tile, props: { ...tile.props, move: switchedOff } })) };
draw();
await tick();
check("a command switched off in the Data tab cannot run", last().move.can().can, false);

board = {
	...board,
	tiles: board.tiles.map((tile) => ({
		...tile,
		props: { ...tile.props, move: { implementation: "@core/typed-rows-update" } },
	})),
};
let isEditing = true;
const drawEditing = (): void =>
	render(
		h(WidgetSurface, {
			boardNode: mount,
			board,
			registry: standIn<BoardRegistry>(registry, ["get", "list"], "registry"),
			host: standIn<SurfaceHost>(host, ["slot", "ui"], "host"),
			editing: isEditing,
			initialWidth: 1280,
			onChange: (next: Board) => {
				board = next;
				drawEditing();
			},
		}),
		mount,
	);
drawEditing();
await tick();
const all = (selector: string): Element[] => [...document.querySelectorAll(selector)];
const press = async (node: Element | undefined): Promise<void> => {
	node?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
	await tick();
};
await press(document.querySelector('.wg-tile-actions button[aria-label="Settings"]') ?? undefined);
const labels = (): string[] => all(".wg-set-panel .wg-kit-side-label").map((node) => node.textContent?.trim() ?? "");
check("the Settings tab lists commands under Actions", labels().includes("Actions"), true);
const moveRow = all(".wg-set-panel .wg-kit-row").find((row) => row.textContent?.startsWith("Move"));
check(
	"a command row shows no implementation on its right",
	moveRow?.querySelector(".wg-kit-row-value")?.textContent ?? "",
	"",
);
await press(moveRow);
const popText = (): string =>
	all('.wg-kit-anchor[aria-expanded="true"] .wg-set-pop')
		.map((node) => node.textContent)
		.join(" ");
check(
	"its popover asks which rows it changes, grouped by widget",
	[popText().includes("Rows it changes"), popText().includes("This widget")],
	[true, true],
);
const listRow = all('.wg-kit-anchor[aria-expanded="true"] .wg-set-pop button.wg-kit-row').find((row) =>
	row.textContent?.startsWith("Tasks"),
);
await press(listRow);
const done = (): Element | undefined =>
	all(".wg-set-head .wg-kit-btn").find((button) => button.textContent?.trim() === "Done");
const dataTab = all(".wg-set-panel .wg-kit-seg button").find((button) => button.textContent?.trim() === "Data");
await press(dataTab);
check("the Data tab has a group per command", labels().includes("What Move can do"), true);
const runSwitch = all(".wg-set-panel .wg-kit-switch").find((node) => node.getAttribute("aria-label") === "Move");
await press(runSwitch);
await press(done());
const moveBinding = (): unknown => board.tiles.find((tile) => tile.id === "t1")?.props?.["move"];
check("picking a list links the command by ref, and switching it off writes allow without run", moveBinding(), {
	implementation: "@core/typed-rows-update",
	fields: { target: "t1/tasks" },
	allow: [],
});
isEditing = false;

console.log(`\n${failed === 0 ? "command board: clean" : `command board: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
