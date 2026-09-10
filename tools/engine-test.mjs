// The one thing src/host.js cannot do: state shared BETWEEN widgets. The vault adapter,
// its filters and its live subscription already exist there — this covers only the gap.
import { buildMirror } from "./mirror.mjs";

buildMirror();
const { createGatewayRefs, createViewCells, narrowedByRefs, refValue, selectionGateway } = await import("./.mjs-cache/gateway/refs.mjs");
const { arrayGateway } = await import("./.mjs-cache/gateway/create.mjs");
const { wiredTiles } = await import("./.mjs-cache/engine/wiring.mjs");
const { mountKeyFor } = await import("./.mjs-cache/mount-key.mjs");
const { createWidthGate, createWidthWatcher } = await import("./.mjs-cache/width-gate.mjs");
const { isMatch } = await import("./.mjs-cache/gateway/match.mjs");

let failed = 0;
function check(name, got, want) {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

{
	const refs = createGatewayRefs();
	const cellFor = createViewCells();
	const boards = arrayGateway([{ name: "Marketing", props: { board: "Marketing" } }, { name: "Ux", props: { board: "Ux" } }], {}, "boards");
	const picked = cellFor("tabs/selection");
	const selection = selectionGateway({ id: "tabs/selection", memory: picked, collection: boards, fieldName: "board", isFallbackToFirst: true });
	refs.put("tabs/selection", selection, { describes: { tile: "tabs", prop: "selection", label: "Selected tab", title: "Editable tabs", kind: "value" } });

	check("a box with nothing picked answers the first row", await selection.get(), "Marketing");
	check("the dropdown is offered what the board holds", refs.offered().map((entry) => entry.ref), ["tabs/selection"]);

	const tasks = arrayGateway(
		[{ name: "One", props: { board: "Marketing" } }, { name: "Two", props: { board: "Ux" } }],
		{},
		"tasks",
	);
	const narrowed = narrowedByRefs(tasks, [{ prop: "board", op: "is", value: { ref: "tabs/selection" } }], refs);
	check("a where row naming a ref reads through it", (await narrowed.list()).rows.map((row) => row.value.name), ["One"]);

	await selection.update("i1");
	check("and follows the box when it moves", (await narrowed.list()).rows.map((row) => row.value.name), ["Two"]);

	let woke = 0;
	const stop = narrowed.subscribe(() => { woke += 1; });
	await selection.update("i0");
	check("a widget reading through a ref is woken by the write", woke > 0, true);
	stop();

	const alias = refValue(refs, "tabs/selection");
	check("an alias reads the same box", await alias.get(), "Marketing");
	check("a ref nothing has registered reads as nothing", await refValue(refs, "nowhere/selection").get(), null);

	refs.put("loop/one", refValue(refs, "loop/two"), { describes: { tile: "loop", prop: "one", label: "One", title: "Loop", kind: "value" }, dependsOn: ["loop/two"] });
	refs.put("loop/two", refValue(refs, "loop/one"), { describes: { tile: "loop", prop: "two", label: "Two", title: "Loop", kind: "value" }, dependsOn: ["loop/one"] });
	check("a ref that reads itself is cut, not chased", await refs.read("loop/one"), null);

	refs.drop("tabs/selection");
	check("dropping a tile takes its box out of the dropdown", refs.offered().map((entry) => entry.ref).includes("tabs/selection"), false);
	await tick();
}


{
	const shelf = {
		"@core/editable-tabs": { props: { tabs: { kind: "collection" }, selection: { kind: "value", of: "tabs" } } },
		"@core/filter-panel": { props: { chosen: { kind: "value" } } },
		"@task/kanban-board": {
			props: {
				tasks: {
					kind: "collection",
					default: {
						path: "Orbitask/Tasks",
						where: [
							{ prop: "board", op: "is", value: { wants: "@core/editable-tabs/selection" } },
							{ spread: { wants: "@core/filter-panel/chosen" } },
						],
					},
				},
				selection: { kind: "value", wants: "@core/editable-tabs/selection" },
				opened: { kind: "value", of: "tasks" },
			},
		},
		"@probe/box-reader": { props: { opened: { kind: "value", wants: "@task/kanban-board/opened" } } },
	};
	const registry = { get: (id) => (shelf[id] ? { manifest: shelf[id] } : null) };

	const alone = { id: "board", widget: "@task/kanban-board" };
	check("a widget with nothing to point at is not written to at all", wiredTiles([alone], registry)[0], alone);

	const wired = wiredTiles(
		[
			{ id: "boards", widget: "@core/editable-tabs" },
			{ id: "filters", widget: "@core/filter-panel" },
			{ id: "board", widget: "@task/kanban-board" },
			{ id: "dialog", widget: "@probe/box-reader" },
		],
		registry,
	);
	const kanban = wired.find((tile) => tile.id === "board");
	check("the tile it wants is found by widget id and named by ref", kanban.props.selection, { from: "ref", ref: "boards/selection" });
	check("a where row is written onto the tile, resolved", kanban.props.tasks.where, [
		{ prop: "board", op: "is", value: { ref: "boards/selection" }, fixed: true },
		{ spread: { ref: "filters/chosen" }, fixed: true },
	]);
	check("and a dialog points at the kanban's own box", wired.find((tile) => tile.id === "dialog").props.opened, { from: "ref", ref: "board/opened" });

	const again = wiredTiles(wired, registry);
	check("wiring an already-wired board writes nothing twice", JSON.stringify(again), JSON.stringify(wired));

	const byHand = wiredTiles(
		[
			{ id: "boards", widget: "@core/editable-tabs" },
			{ id: "board", widget: "@task/kanban-board", props: { selection: { from: "ref", ref: "elsewhere/selection" }, tasks: { where: [{ prop: "status", op: "is", value: "Doing" }] } } },
		],
		registry,
	);
	const held = byHand.find((tile) => tile.id === "board");
	check("a binding somebody made by hand is never overwritten", held.props.selection.ref, "elsewhere/selection");
	check("and their own conditions survive beside the wired ones", held.props.tasks.where.filter((row) => row.fixed !== true), [{ prop: "status", op: "is", value: "Doing" }]);

	const mounted = wiredTiles(
		[
			{ id: "boards", widget: "@core/editable-tabs" },
			{ id: "group", widget: "@core/view-group", mounted: { Kanban: { widget: "@task/kanban-board" } } },
			{ id: "dialog", widget: "@probe/box-reader" },
		],
		registry,
	);
	check("a widget inside a holder is found under the holder's own ref", mounted.find((tile) => tile.id === "dialog").props.opened.ref, "group/Kanban/opened");
}

// INVARIANT: a widget sees its ENVIRONMENT, never the store and never the Obsidian API.
// Handing it `app` lets it reach the whole vault behind the engine, which is the model
// crossing into the view — the thing the layer split exists to prevent.
const { viewHost } = await import("./.mjs-cache/engine/view-host.mjs");
const fullHost = {
	platform: "obsidian",
	can: { fullscreen: true, network: true, renderMarkdown: true },
	ui: { notify: () => {}, openNote: () => {}, renderMarkdown: (element, markdown) => `${markdown} into ${element}` },
	slot: () => ({ list: () => {} }),
	query: { backlinks: () => {} },
	app: { vault: {} },
	plugin: {},
};
fullHost.type = "obsidian-desktop";
fullHost.console = { can: { log: true, run: true }, log: () => true, run: async () => ({ ok: true, output: "", failure: null }) };
const exposed = viewHost(fullHost);
check("the widget is told which platform it runs on", exposed.platform, "obsidian");
check("and what it can do there", Object.keys(exposed.can).sort(), ["fullscreen", "network", "renderMarkdown"]);
check("but gets no store", exposed.slot, undefined);
check("no vault query", exposed.query, undefined);
check("and no Obsidian app object", [exposed.app, exposed.plugin], [undefined, undefined]);
check("and which build of it, so `can` never has to be guessed from the family", exposed.type, "obsidian-desktop");
// CONTEXT: a console is an OUTPUT, so it crosses the boundary; what it may do on this build is
// on its own `can`, which is what a widget asks instead of reading the host type
check("a console crosses, and says what it may do here", Object.keys(exposed.console.can).sort(), ["log", "run"]);
check("what it does get, in full", Object.keys(exposed).sort(), ["can", "console", "platform", "type", "ui"]);

// WHICH BUILD, AND WHAT IT CAN REACH. `systemRun` used to be declared on the host and read by
// nobody; the console is what consumes it, and it answers per build rather than per family.
const { hostTypeOf } = await import("./.mjs-cache/engine/host-type.mjs");
const { createConsole, refusingConsole } = await import("./.mjs-cache/engine/host-console.mjs");

check("a desktop app is a desktop", hostTypeOf({ isDesktopApp: true }), "obsidian-desktop");
check("a phone is a phone even when the desktop flag is on too", hostTypeOf({ isDesktopApp: true, isMobileApp: true }), "obsidian-mobile");
check("a tablet reading as mobile is mobile", hostTypeOf({ isMobile: true }), "obsidian-mobile");
check("anything else is the web", hostTypeOf({}), "obsidian-web");

const fakeRequire = (name) => (name === "child_process" ? { exec: (command, options, done) => done(null, `ran ${command}`, "") } : null);
check("logging is available on every build", [createConsole("obsidian-mobile", null).can.log, createConsole("obsidian-web", null).can.log], [true, true]);
check("a command line only on the desktop", ["obsidian-desktop", "obsidian-mobile", "obsidian-web"].map((type) => createConsole(type, fakeRequire).can.run), [true, false, false]);
check("and only where there is a way to reach one", createConsole("obsidian-desktop", null).can.run, false);
// CONTEXT: caught on purpose — a throw must show up as a wrong VALUE here, not as a crash
const refusedRun = await createConsole("obsidian-mobile", fakeRequire).run("ls").catch((failure) => ({ threw: String(failure?.message ?? failure) }));
check("a refused run says why instead of throwing", refusedRun, { ok: false, output: "", failure: "no command line in this build" });
check("a run hands back what the command printed", await createConsole("obsidian-desktop", fakeRequire).run("ls"), { ok: true, output: "ran ls", failure: null });
check("a preview's console refuses both", Object.values(refusingConsole("no").can), [false, false]);

// MARKDOWN IS THE HOST'S TO DRAW. A widget may only import widgetarium, widgetarium/kit and
// preact, so Obsidian's renderer can only reach it through the host — and it reaches it as a
// call taking an element the widget already owns, never as the app that could render it.
check("a widget can ask the host to render markdown", typeof exposed.ui.renderMarkdown, "function");
check("and the element it names is its own, not the vault", exposed.ui.renderMarkdown("#node", "# Hi"), "# Hi into #node");
check("the ui it gets, in full", Object.keys(exposed.ui).sort(), ["notify", "renderMarkdown"]);
// still nothing else: the seam must not have widened the door it came through
check("still no Obsidian app object", [exposed.app, exposed.plugin, exposed.slot], [undefined, undefined, undefined]);

// Slots: the board decides WHICH widget draws a part of another. A slotted widget gets no
// source of its own — the parent feeds it — which is what makes replacing a card a setting.
const { resolveSlots } = await import("./.mjs-cache/surface.mjs");
if (typeof resolveSlots === "function") {
	const registry = {
		get: (id) =>
			id === "@task/task-card"
				? { component: () => null, manifest: {} }
				: null,
	};
	const manifest = { slots: { card: { of: "widget", default: "@task/task-card" } } };
	const noHost = { platform: "obsidian", can: {}, ui: { notify: () => {} } };

	const bySpec = resolveSlots(manifest, {}, registry, noHost, null);
	check("a slot resolves to its default widget", typeof bySpec.card, "function");
	// the slot builds a vnode; preact calls the component later, so read the props off it
	const node = bySpec.card({ task: { title: "Analyze Insights" } });
	check("the parent's data reaches the slotted widget", node.props.task.title, "Analyze Insights");
	check("a fed slot is handed nothing of its own to tune", node.props.settings, undefined);
	check("the child is handed the narrow host, not the store", Object.keys(node.props.host).sort(), ["can", "console", "platform", "type", "ui"]);

	// CONTEXT: the model normalises both stored shapes, so the engine only ever meets the record
	const overridden = resolveSlots(manifest, { slots: { card: { widget: "@other/card" } } }, registry, noHost, null);
	check("a tile may name a different widget for the slot", overridden.card, null);
	const kept = resolveSlots(manifest, { slots: { card: { widget: "@task/task-card" } } }, registry, noHost, null);
	check("and naming the same widget the manifest defaults to still resolves it", typeof kept.card, "function");

	// ONE SHAPE, EVERY PATH. The registry resolves the same file whether the board placed it
	// or another widget slotted it, so a widget written against props.board as a tile must not
	// meet an undefined there as a slot — it crashed on the first property it read.
	const access = { board: { properties: [{ key: "status" }] }, configureBoard: () => true };
	const withBoard = resolveSlots(manifest, {}, registry, noHost, access)
		.card({});
	check("a slotted widget reads the board the same way a tile does", withBoard.props.board.properties[0].key, "status");
	check("and it is the SAME board, not a copy", withBoard.props.board === access.board, true);
	check("it may configure the board too", withBoard.props.configureBoard(), true);
	const noBoard = bySpec.card({});
	check("with no board behind it the shape still holds", noBoard.props.board, { properties: [] });
	check("and the refusal is a boolean, not a missing function", noBoard.props.configureBoard(), false);
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
	check("a box offers no way to persist", typeof mine("filter/chosen").markTransient, "undefined");
}



// REGRESSION: getSectionInfo returns null while the editor is mid-render — which is when our
// OWN write lands, and on a cold start too. Two fallbacks failed the same way: "the note's
// only mount" has nothing to find on the first render, and a per-pass counter grows whenever
// renders arrive faster than the microtask queue drains. Each one gave a NEW key every time,
// so every write built a new board and left the old one alive with its ResizeObserver — the
// flicker, the shaking, and a collapsed panel springing open.
{
	const NOTE = "Orbitask/Board.md";
	check("a readable position names the block", mountKeyFor([], NOTE, 0), `${NOTE}#0`);
	check("and a second block on the same note is its own", mountKeyFor([], NOTE, 1), `${NOTE}#1`);

	// THE POINT: no position, nothing mounted yet — and still the SAME answer twice
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


// REGRESSION: the exact numbers from a live session — 1256 and 1224, alternating forever,
// with a file write on every turn. A wider board is taller, a taller board brings the note's
// scrollbar in, and the scrollbar takes the width back.
{
	let clock = 0;
	const gate = createWidthGate({ minimum: 120, now: () => clock });
	const feed = (widths, step = 16) => widths.filter((width) => { clock += step; return gate(width); });

	check("the first real width is taken", gate(1256), true);
	check("and a width that has not moved is not", gate(1256), false);

	clock += 16;
	check("the scrollbar taking 32px is taken once", gate(1224), true);
	check("but coming straight back is our own loop", gate(1256), false);
	check("and so is going round again", feed([1224, 1256, 1224, 1256]), []);

	// a person dragging the window is not a loop: it keeps moving, and it is not instant
	clock += 2000;
	check("a real resize still lands", gate(1100), true);
	clock += 2000;
	check("and so does dragging back later", gate(1256), true);

	// a run of widths in one direction is a drag, and every step past the slack counts
	clock += 2000;
	const dragged = feed([1200, 1140, 1080, 1020], 40);
	check("a continuous drag is followed all the way", dragged, [1200, 1140, 1080, 1020]);

	// nothing below the minimum is ever a width
	check("a detached board reports nothing usable", [gate(0), gate(40)], [false, false]);
}


// REGRESSION: Obsidian's side panel SLIDES, and the note went 1115 → 1013 → 973 → 902 → 827
// in one gesture. Every frame was treated as a new screen, so the whole board was re-laid five
// times per toggle — the app lagged, and a tile near its chip threshold crossed it and came
// back within milliseconds, which is the flicker.
{
	let clock = 0;
	let queued = null;
	const taken = [];
	const watcher = createWidthWatcher({
		minimum: 120,
		onWidth: (value) => taken.push(value),
		schedule: (task) => { queued = task; return 1; },
		cancel: () => { queued = null; },
		now: () => clock,
	});
	const idle = () => { const task = queued; queued = null; task?.(); };

	// the board arriving is not a change: it draws at once
	watcher.measured(1115);
	check("the first width lands immediately", taken, [1115]);

	// the panel opening, frame by frame
	clock += 1000;
	for (const width of [1013, 973, 902, 827]) watcher.measured(width);
	check("nothing more is taken while the width is still moving", taken, [1115]);
	idle();
	check("and one width lands when it stops", taken, [1115, 827]);

	// and closing again
	clock += 1000;
	for (const width of [827, 917, 957, 1028, 1080]) watcher.measured(width);
	idle();
	check("the whole way back is also one update", taken, [1115, 827, 1080]);

	// a slow drag of the window edge still keeps up: each pause is its own width
	clock += 1000;
	watcher.measured(900);
	idle();
	clock += 1000;
	watcher.measured(700);
	idle();
	check("a drag that pauses is followed", taken.slice(3), [900, 700]);

	// stopping mid-gesture drops the pending width rather than applying it later
	watcher.measured(400);
	watcher.stop();
	idle();
	check("a board that goes away takes its pending width with it", taken.length, 5);
}


// A filter panel offers checkboxes, so a clause carries several values — and the record's own
// side can be a list too, because a task has several assignees. Comparing list to list with
// includes() answered false for every task that had more than one of anything.
{
	const task = { name: "t", path: "t.md", props: { assignees: ["Emma", "Liam"], priority: "P1" } };
	check("a task matches a member who is on it", isMatch(task, [{ prop: "assignees", op: "in", value: ["Liam"] }]), true);
	check("and not one who is not", isMatch(task, [{ prop: "assignees", op: "in", value: ["Brandon"] }]), false);
	check("any of the ticked members is enough", isMatch(task, [{ prop: "assignees", op: "in", value: ["Brandon", "Emma"] }]), true);
	check("a single value still works against a list of choices", isMatch(task, [{ prop: "priority", op: "in", value: ["P1", "P2"] }]), true);
	check("and an empty choice matches nothing", isMatch(task, [{ prop: "priority", op: "in", value: [] }]), false);
	check("the same clause negated keeps a task off nobody's list", isMatch(task, [{ prop: "assignees", op: "nin", value: ["Brandon"] }]), true);
	check("and takes off one that is on it", isMatch(task, [{ prop: "assignees", op: "nin", value: ["Brandon", "Emma"] }]), false);
	check("an empty choice excludes nobody", isMatch(task, [{ prop: "priority", op: "nin", value: [] }]), true);
}

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
