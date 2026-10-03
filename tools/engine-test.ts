import { createGatewayRefs, createViewCells, narrowByRefs, refValue } from "../packages/core/src/gateway/refs.ts";
import { createPickedGateway, selectionGateway } from "../packages/packs/core/src/picked.ts";
import { arrayGateway } from "../packages/core/src/gateway/create.ts";
import type { Patch } from "../packages/core/src/gateway/contract.ts";
import { wireTiles } from "../packages/core/src/engine/wiring.js";
import { mountKeyFor } from "../packages/core/src/mount-key.js";
import { createWidthGate, createWidthWatcher } from "../packages/core/src/width-gate.js";
import { isMatch } from "../packages/core/src/gateway/match.ts";
import { fieldAt, fieldIn, itemsIn } from "./held-fields.ts";
import { present } from "./page-dom.ts";
import { standIn } from "./stand-in.ts";
import { callAsUntypedSource } from "./untyped-source.ts";

let failed = 0;
function check(name: string, got: unknown, want: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
}

const tick = (): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, 0));

{
	const refs = createGatewayRefs();
	const cellFor = createViewCells();
	const boards = arrayGateway(
		[
			{ name: "Marketing", props: { board: "Marketing" } },
			{ name: "Ux", props: { board: "Ux" } },
		],
		{},
		"boards",
	);
	const picked = cellFor("tabs/selection");
	const selection = selectionGateway({
		id: "tabs/selection",
		memory: picked,
		collection: boards,
		fieldName: "board",
		isFallbackToFirst: true,
	});
	refs.put("tabs/selection", selection, {
		describes: { tile: "tabs", prop: "selection", label: "Selected tab", title: "Editable tabs", kind: "value" },
	});

	check("a box with nothing picked answers the first row", await selection.get(), "Marketing");
	check(
		"the dropdown is offered what the board holds",
		refs.offered().map((entry) => entry.ref),
		["tabs/selection"],
	);

	const tasks = arrayGateway(
		[
			{ name: "One", props: { board: "Marketing" } },
			{ name: "Two", props: { board: "Ux" } },
		],
		{},
		"tasks",
	);
	const narrowed = narrowByRefs(tasks, [{ prop: "board", op: "is", value: { ref: "tabs/selection" } }], refs);
	check(
		"a where row naming a ref reads through it",
		(await narrowed.list()).rows.map((row) => row.name),
		["One"],
	);

	await selection.update("i1");
	check(
		"and follows the box when it moves",
		(await narrowed.list()).rows.map((row) => row.name),
		["Two"],
	);

	let woke = 0;
	const stop = narrowed.subscribe(() => {
		woke += 1;
	});
	await selection.update("i0");
	check("a widget reading through a ref is woken by the write", woke > 0, true);
	stop();

	const alias = refValue(refs, "tabs/selection");
	check("an alias reads the same box", await alias.get(), "Marketing");
	check("a ref nothing has registered reads as nothing", await refValue(refs, "nowhere/selection").get(), null);

	refs.put("loop/one", refValue(refs, "loop/two"), {
		describes: { tile: "loop", prop: "one", label: "One", title: "Loop", kind: "value" },
		dependsOn: ["loop/two"],
	});
	refs.put("loop/two", refValue(refs, "loop/one"), {
		describes: { tile: "loop", prop: "two", label: "Two", title: "Loop", kind: "value" },
		dependsOn: ["loop/one"],
	});
	check("a ref that reads itself is cut, not chased", await refs.read("loop/one"), null);

	refs.drop("tabs/selection");
	check(
		"dropping a tile takes its box out of the dropdown",
		refs
			.offered()
			.map((entry) => entry.ref)
			.includes("tabs/selection"),
		false,
	);
	await tick();
}

{
	const shelf: Readonly<Record<string, object>> = {
		"@default/editable-tabs": {
			props: {
				tabs: { kind: "collection" },
				selection: { kind: "value", source: { implementation: "@core/selection", fields: { rows: "tabs" } } },
			},
		},
		"@default/filter-panel": { props: { chosen: { kind: "value" } } },
		"@default/kanban-board": {
			props: {
				tasks: {
					kind: "collection",
					where: [
						{ prop: "board", op: "is", value: { wants: "@default/editable-tabs/selection" } },
						{ spread: { wants: "@default/filter-panel/chosen" } },
					],
					default: { path: "Orbitask/Tasks" },
				},
				selection: { kind: "value", wants: "@default/editable-tabs/selection" },
				opened: { kind: "value", source: { implementation: "@core/selection", fields: { rows: "tasks" } } },
			},
		},
		"@probe/box-reader": { props: { opened: { kind: "value", wants: "@default/kanban-board/opened" } } },
	};
	const registry = standIn<Parameters<typeof wireTiles>[1]>(
		{ get: (id: string) => (shelf[id] ? { manifest: shelf[id] } : null) },
		["get"],
		"registry",
	);
	const wire = (tiles: readonly object[], held = registry): ReturnType<typeof wireTiles> =>
		callAsUntypedSource(wireTiles, tiles, held);
	const tileNamed = (tiles: ReturnType<typeof wireTiles>, id: string): unknown => tiles.find((tile) => tile.id === id);

	const alone = { id: "board", widget: "@default/kanban-board" };
	check("a widget with nothing to point at is not written to at all", wire([alone])[0], alone);

	const wired = wire(
		[
			{ id: "boards", widget: "@default/editable-tabs" },
			{ id: "filters", widget: "@default/filter-panel" },
			{ id: "board", widget: "@default/kanban-board" },
			{ id: "dialog", widget: "@probe/box-reader" },
		],
		registry,
	);
	const kanban = tileNamed(wired, "board");
	check("the tile it wants is found by widget id and named by ref", fieldAt(kanban, "props", "selection"), {
		implementation: "@core/from-tile-value",
		fields: { ref: "boards/selection" },
	});
	check("a where row is written onto the tile, resolved", fieldAt(kanban, "props", "tasks", "fields", "where"), [
		{ prop: "board", op: "is", value: { ref: "boards/selection" }, fixed: true },
		{ spread: { ref: "filters/chosen" }, fixed: true },
	]);
	check("and a dialog points at the kanban's own box", fieldAt(tileNamed(wired, "dialog"), "props", "opened"), {
		implementation: "@core/from-tile-value",
		fields: { ref: "board/opened" },
	});

	const again = wireTiles(wired, registry);
	check("wiring an already-wired board writes nothing twice", JSON.stringify(again), JSON.stringify(wired));

	const byHand = wire(
		[
			{ id: "boards", widget: "@default/editable-tabs" },
			{
				id: "board",
				widget: "@default/kanban-board",
				props: {
					selection: { implementation: "@core/from-tile-value", fields: { ref: "elsewhere/selection" } },
					tasks: { fields: { where: [{ prop: "status", op: "is", value: "Doing" }] } },
				},
			},
		],
		registry,
	);
	const held = tileNamed(byHand, "board");
	check(
		"a binding somebody made by hand is never overwritten",
		fieldAt(held, "props", "selection", "fields", "ref"),
		"elsewhere/selection",
	);
	check(
		"and their own conditions survive beside the wired ones",
		itemsIn(fieldAt(held, "props", "tasks", "fields", "where")).filter((row) => fieldIn(row, "fixed") !== true),
		[{ prop: "status", op: "is", value: "Doing" }],
	);

	const mounted = wire(
		[
			{ id: "boards", widget: "@default/editable-tabs" },
			{ id: "group", widget: "@default/view-group", mounted: { Kanban: { widget: "@default/kanban-board" } } },
			{ id: "dialog", widget: "@probe/box-reader" },
		],
		registry,
	);
	check(
		"a widget inside a holder is found under the holder's own ref",
		fieldAt(tileNamed(mounted, "dialog"), "props", "opened", "fields", "ref"),
		"group/Kanban/opened",
	);
}

const { viewHost } = await import("../packages/core/src/engine/view-host.js");
const fullHost = standIn<Parameters<typeof viewHost>[0]>(
	{
		platform: "obsidian",
		can: { fullscreen: true, network: true, renderMarkdown: true },
		ui: {
			notify: () => {},
			openNote: () => {},
			renderMarkdown: (element: unknown, markdown: unknown) => `${String(markdown)} into ${String(element)}`,
		},
		slot: () => ({ list: () => {} }),
		query: { backlinks: () => {} },
		app: { vault: {} },
		plugin: {},
		type: "obsidian-desktop",
		console: {
			can: { log: true, run: true },
			log: () => true,
			run: async () => ({ ok: true, output: "", failure: null }),
		},
	},
	["platform", "type", "can", "console", "ui"],
	"full host",
);
const exposed = viewHost(fullHost);
check("the widget is told which platform it runs on", exposed.platform, "obsidian");
check("and what it can do there", Object.keys(exposed.can).sort(), ["fullscreen", "network", "renderMarkdown"]);
check("but gets no store", fieldIn(exposed, "slot"), undefined);
check("no vault query", fieldIn(exposed, "query"), undefined);
check("and no Obsidian app object", [fieldIn(exposed, "app"), fieldIn(exposed, "plugin")], [undefined, undefined]);
check("and which build of it, so `can` never has to be guessed from the family", exposed.type, "obsidian-desktop");
check("a console crosses, and says what it may do here", Object.keys(exposed.console.can).sort(), ["log", "run"]);
check("what it does get, in full", Object.keys(exposed).sort(), ["can", "console", "platform", "type", "ui"]);

const { hostTypeOf } = await import("../packages/core/src/engine/host-type.js");
const { createConsole, refusingConsole } = await import("../packages/core/src/engine/host-console.js");

check("a desktop app is a desktop", hostTypeOf({ isDesktopApp: true }), "obsidian-desktop");
check(
	"a phone is a phone even when the desktop flag is on too",
	hostTypeOf({ isDesktopApp: true, isMobileApp: true }),
	"obsidian-mobile",
);
check("a tablet reading as mobile is mobile", hostTypeOf({ isMobile: true }), "obsidian-mobile");
check("anything else is the web", hostTypeOf({}), "obsidian-web");

type Done = (failure: Error | null, output: string, errors: string) => void;

const fakeRequire = (name: string): unknown =>
	name === "child_process"
		? { exec: (command: string, _options: unknown, done: Done) => done(null, `ran ${command}`, "") }
		: null;
check(
	"logging is available on every build",
	[
		createConsole("obsidian-mobile", undefined, undefined).can.log,
		createConsole("obsidian-web", undefined, undefined).can.log,
	],
	[true, true],
);
check(
	"a command line only on the desktop",
	["obsidian-desktop", "obsidian-mobile", "obsidian-web"].map(
		(type) => createConsole(type, fakeRequire, undefined).can.run,
	),
	[true, false, false],
);
check(
	"and only where there is a way to reach one",
	createConsole("obsidian-desktop", undefined, undefined).can.run,
	false,
);
const refusedRun = await createConsole("obsidian-mobile", fakeRequire, undefined)
	.run("ls")
	.catch((failure: unknown) => ({ threw: failure instanceof Error ? failure.message : String(failure) }));
check("a refused run says why instead of throwing", refusedRun, {
	ok: false,
	output: "",
	failure: "no command line in this build",
});
check(
	"a run hands back what the command printed",
	await createConsole("obsidian-desktop", fakeRequire, undefined).run("ls"),
	{
		ok: true,
		output: "ran ls",
		failure: null,
	},
);
check("a preview's console refuses both", Object.values(refusingConsole("no").can), [false, false]);

check("a widget can ask the host to render markdown", typeof exposed.ui.renderMarkdown, "function");
check(
	"and the element it names is its own, not the vault",
	callAsUntypedSource(exposed.ui.renderMarkdown, "#node", "# Hi"),
	"# Hi into #node",
);
check("the ui it gets, in full", Object.keys(exposed.ui).sort(), ["notify", "renderMarkdown"]);
check(
	"still no Obsidian app object",
	[fieldIn(exposed, "app"), fieldIn(exposed, "plugin"), fieldIn(exposed, "slot")],
	[undefined, undefined, undefined],
);

const { resolveSlots } = await import("../packages/core/src/surface.js");
if (typeof resolveSlots === "function") {
	const registry = {
		get: (id: string) => (id === "@default/task-card" ? { component: () => null, manifest: {} } : null),
	};
	const manifest = { slots: { card: { of: "widget", default: "@default/task-card" } } };
	const noHost = { platform: "obsidian", can: {}, ui: { notify: () => {} } };
	const slotsFor = (tile: object, foldIntoGroup: (() => boolean) | null): ReturnType<typeof resolveSlots> =>
		callAsUntypedSource(resolveSlots, {
			manifest,
			tile,
			registry,
			host: noHost,
			foldIntoGroup,
			gatewaysOf: () => ({}),
		});
	const drawnBy = (slots: ReturnType<typeof resolveSlots>, given: Readonly<Record<string, unknown>>): unknown =>
		present(slots["card"], "the card slot")(given);
	const foldFrom = (node: unknown): unknown => {
		const props = fieldIn(node, "props");
		const fold = fieldIn(props, "foldIntoGroup");
		if (typeof fold !== "function") throw new TypeError("the slotted widget was handed no foldIntoGroup");
		return Reflect.apply(fold, props, []);
	};

	const bySpec = slotsFor({}, null);
	check("a slot resolves to its default widget", typeof bySpec["card"], "function");
	const node = drawnBy(bySpec, { task: { title: "Analyze Insights" } });
	check("the parent's data reaches the slotted widget", fieldAt(node, "props", "task", "title"), "Analyze Insights");
	check("a fed slot is handed nothing of its own to tune", fieldAt(node, "props", "settings"), undefined);
	check(
		"the child is handed the narrow host, not the store",
		Object.keys(Object(fieldAt(node, "props", "host"))).sort(),
		["can", "console", "platform", "type", "ui"],
	);

	const overridden = slotsFor({ slots: { card: { widget: "@other/card" } } }, null);
	check("a tile may name a different widget for the slot", overridden["card"], null);
	const kept = slotsFor({ slots: { card: { widget: "@default/task-card" } } }, null);
	check("and naming the same widget the manifest defaults to still resolves it", typeof kept["card"], "function");

	const fold = (): boolean => true;
	const withBoard = drawnBy(slotsFor({}, fold), {});
	check("a slotted widget may fold the board's views the same way a tile does", foldFrom(withBoard), true);
	const noBoard = drawnBy(bySpec, {});
	check("and with no board behind it the refusal is a boolean, not a missing function", foldFrom(noBoard), false);
} else {
	failed += 1;
	console.log("!!  resolveSlots is not exported from surface.js — slots cannot be tested");
}

{
	const mine = createViewCells();
	const yours = createViewCells();

	await mine("filter/chosen").update({ priority: "P1" });
	await mine("kanban/opened").update("Orbitask/Tasks/one.md");

	check("what I look at is mine", await mine("kanban/opened").get(), "Orbitask/Tasks/one.md");
	check("and none of it reaches another viewer", await yours("kanban/opened").get(), null);
	check("a box offers no way to persist", typeof fieldIn(mine("filter/chosen"), "markTransient"), "undefined");
}

{
	const NOTE = "Orbitask/Board.md";
	check("a readable position names the block", mountKeyFor([], NOTE, 0), `${NOTE}#0`);
	check("and a second block on the same note is its own", mountKeyFor([], NOTE, 1), `${NOTE}#1`);

	check("a cold start with no position is stable", mountKeyFor([], NOTE, -1), mountKeyFor([], NOTE, -1));
	check("and it assumes the first board", mountKeyFor([], NOTE, -1), `${NOTE}#0`);

	const one = [`${NOTE}#0`];
	check("with one board mounted it is found again", mountKeyFor(one, NOTE, -1), `${NOTE}#0`);

	const second = [`${NOTE}#2`];
	check("a note whose board is the third block is still found", mountKeyFor(second, NOTE, -1), `${NOTE}#2`);

	const two = [`${NOTE}#0`, `${NOTE}#1`];
	check("with two boards and no position we fall back to the first", mountKeyFor(two, NOTE, -1), `${NOTE}#0`);
	check("another note is never adopted", mountKeyFor(["Other.md#0"], NOTE, -1), `${NOTE}#0`);
}

{
	let clock = 0;
	const gate = createWidthGate({ minimum: 120, now: () => clock });
	const feed = (widths: readonly number[], step = 16): number[] =>
		widths.filter((width) => {
			clock += step;
			return gate(width);
		});

	check("the first real width is taken", gate(1256), true);
	check("and a width that has not moved is not", gate(1256), false);

	clock += 16;
	check("the scrollbar taking 32px is taken once", gate(1224), true);
	check("but coming straight back is our own loop", gate(1256), false);
	check("and so is going round again", feed([1224, 1256, 1224, 1256]), []);

	clock += 2000;
	check("a real resize still lands", gate(1100), true);
	clock += 2000;
	check("and so does dragging back later", gate(1256), true);

	clock += 2000;
	const dragged = feed([1200, 1140, 1080, 1020], 40);
	check("a continuous drag is followed all the way", dragged, [1200, 1140, 1080, 1020]);

	check("a detached board reports nothing usable", [gate(0), gate(40)], [false, false]);
}

{
	let clock = 0;
	let queued: (() => void) | null = null;
	const taken: number[] = [];
	const watcher = createWidthWatcher({
		minimum: 120,
		onWidth: (value) => taken.push(value),
		schedule: (task: () => void) => {
			queued = task;
			return 1;
		},
		cancel: () => {
			queued = null;
		},
		now: () => clock,
	});
	const idle = () => {
		const task = queued;
		queued = null;
		task?.();
	};

	watcher.measured(1115);
	check("the first width lands immediately", taken, [1115]);

	clock += 1000;
	for (const width of [1013, 973, 902, 827]) watcher.measured(width);
	check("nothing more is taken while the width is still moving", taken, [1115]);
	idle();
	check("and one width lands when it stops", taken, [1115, 827]);

	clock += 1000;
	for (const width of [827, 917, 957, 1028, 1080]) watcher.measured(width);
	idle();
	check("the whole way back is also one update", taken, [1115, 827, 1080]);

	clock += 1000;
	watcher.measured(900);
	idle();
	clock += 1000;
	watcher.measured(700);
	idle();
	check("a drag that pauses is followed", taken.slice(3), [900, 700]);

	watcher.measured(400);
	watcher.stop();
	idle();
	check("a board that goes away takes its pending width with it", taken.length, 5);
}

{
	const task = { name: "t", path: "t.md", props: { assignees: ["Emma", "Liam"], priority: "P1" } };
	check(
		"a task matches a member who is on it",
		isMatch(task, [{ prop: "assignees", op: "in", value: ["Liam"] }]),
		true,
	);
	check("and not one who is not", isMatch(task, [{ prop: "assignees", op: "in", value: ["Brandon"] }]), false);
	check(
		"any of the ticked members is enough",
		isMatch(task, [{ prop: "assignees", op: "in", value: ["Brandon", "Emma"] }]),
		true,
	);
	check(
		"a single value still works against a list of choices",
		isMatch(task, [{ prop: "priority", op: "in", value: ["P1", "P2"] }]),
		true,
	);
	check("and an empty choice matches nothing", isMatch(task, [{ prop: "priority", op: "in", value: [] }]), false);
	check(
		"the same clause negated keeps a task off nobody's list",
		isMatch(task, [{ prop: "assignees", op: "nin", value: ["Brandon"] }]),
		true,
	);
	check(
		"and takes off one that is on it",
		isMatch(task, [{ prop: "assignees", op: "nin", value: ["Brandon", "Emma"] }]),
		false,
	);
	check("an empty choice excludes nobody", isMatch(task, [{ prop: "priority", op: "nin", value: [] }]), true);
}

{
	const cellFor = createViewCells();
	const rows = [
		{ name: "Marketing", props: { board: "Marketing", columns: [{ name: "To Do" }] } },
		{ name: "Ux", props: { board: "Ux", columns: [{ name: "Backlog" }] } },
	];
	const written: Patch<unknown>[] = [];
	const boards = arrayGateway(rows, { update: (patch: Patch<unknown>) => written.push(patch) }, "boards");
	const picked = cellFor("kanban/selection");
	const selection = selectionGateway({
		id: "kanban/selection",
		memory: picked,
		collection: boards,
		fieldName: "board",
		isFallbackToFirst: true,
	});
	const board = createPickedGateway({
		id: "kanban/board",
		chosen: selection,
		collection: boards,
		fieldName: "board",
		isFallbackToFirst: true,
	});

	check("a selection answers with the field it names", await selection.get(), "Marketing");
	check("and the prop that picks by it answers with the whole record", fieldAt(await board.get(), "props", "columns"), [
		{ name: "To Do" },
	]);

	await selection.update("i1");
	check("moving the selection moves the record it picks", fieldIn(await board.get(), "name"), "Ux");

	await board.update({ columns: [{ name: "Doing" }] });
	check("and a write through it patches that row, not the tile", written, [
		{ ref: "i1", data: { columns: [{ name: "Doing" }] } },
	]);

	const readOnly = createPickedGateway({
		id: "kanban/readOnly",
		chosen: selection,
		collection: arrayGateway(rows, {}, "frozen"),
		fieldName: "board",
		isFallbackToFirst: true,
	});
	check("a collection that refuses update makes the picked record read-only", readOnly.update.can().can, false);

	const withArchived = arrayGateway(
		[
			{ name: "Old", props: { board: "Old", archivedAt: "2026-09-09T09:30:42.630Z", columns: [{ name: "Gone" }] } },
			...rows,
		],
		{},
		"boardsWithArchived",
	);
	const pickedNothing = cellFor("kanban/nothing-picked");
	const standing = selectionGateway({
		id: "kanban/standing",
		memory: pickedNothing,
		collection: withArchived,
		fieldName: "board",
		isFallbackToFirst: true,
	});
	check("a selection with nothing picked skips a row that was archived", await standing.get(), "Marketing");
	const standingBoard = createPickedGateway({
		id: "kanban/standingBoard",
		chosen: standing,
		collection: withArchived,
		fieldName: "board",
		isFallbackToFirst: true,
	});
	check(
		"and the record it picks is the first one still standing",
		fieldAt(await standingBoard.get(), "props", "columns"),
		[{ name: "To Do" }],
	);

	const inTile = cellFor("kanban/board?tile");
	await inTile.update({ columns: [{ name: "Solo" }] });
	const untied = createPickedGateway({
		id: "kanban/untied",
		chosen: selection,
		collection: arrayGateway([], {}, "noBoards"),
		fieldName: "board",
		isFallbackToFirst: true,
		inTile,
	});
	check("with no record to pick the board is the one the tile holds", await untied.get(), {
		columns: [{ name: "Solo" }],
	});

	await untied.update({ columns: [{ name: "Solo" }, { name: "Next" }] });
	check("and a write lands in the tile, patched, not replaced", await inTile.get(), {
		columns: [{ name: "Solo" }, { name: "Next" }],
	});
	check("the record still wins over the tile when there is one", fieldIn(await board.get(), "name"), "Ux");

	const heldElsewhere = cellFor("kanban/board?elsewhere");
	await heldElsewhere.update({ columns: [{ name: "Held" }] });
	const missed = createPickedGateway({
		id: "kanban/missed",
		chosen: standIn<Parameters<typeof createPickedGateway>[0]["chosen"]>(
			{ get: async () => "Nowhere", subscribe: () => () => {} },
			["get", "subscribe"],
			"chosen",
		),
		collection: arrayGateway(rows, { update: (patch: Patch<unknown>) => written.push(patch) }, "boardsAgain"),
		fieldName: "board",
		isFallbackToFirst: false,
		inTile: heldElsewhere,
	});
	const refused = await missed.update({ columns: [{ name: "Lost" }] }).then(
		() => null,
		(failure: unknown) => String(failure instanceof Error ? failure.message : undefined),
	);
	check(
		"a write that names no row on a collection that holds some is refused, not diverted to the tile",
		Boolean(refused),
		true,
	);
	check("and the refusal says why instead of answering nothing at all", refused?.includes("not empty"), true);
	check("and the tile it could have landed in is untouched", await heldElsewhere.get(), {
		columns: [{ name: "Held" }],
	});
}

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
