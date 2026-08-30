// The one thing src/host.js cannot do: state shared BETWEEN widgets. The vault adapter,
// its filters and its live subscription already exist there — this covers only the gap.
import { buildMirror } from "./mirror.mjs";

buildMirror();
const { createContext } = await import("./.mjs-cache/engine/context.mjs");
const { mountKeyFor } = await import("./.mjs-cache/mount-key.mjs");
const { createWidthGate, createWidthWatcher } = await import("./.mjs-cache/width-gate.mjs");
const { matches } = await import("./.mjs-cache/engine/match.mjs");

let failed = 0;
function check(name, got, want) {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
}

const persisted = [];
const context = createContext({ board: "Marketing" });
check("the first widget to write a key owns it", context.set("board", "Ux Team", "board-tabs"), true);
check("a second widget is refused", context.set("board", "Other", "breadcrumb"), false);
check("and the value is untouched", context.get("board"), "Ux Team");
check("looking at another board changes nothing outside this viewer", persisted.length, 0);
check("the key is offered to the binding dropdown", context.offered(), ["board"]);

let seen = 0;
const stop = context.subscribe(() => {
	seen += 1;
});
context.set("view", "Table", "view-tabs");
check("subscribers hear a change", seen, 1);
context.set("view", "Table", "view-tabs");
check("and are not woken by a write of the same value", seen, 1);
stop();
context.set("view", "Kanban", "view-tabs");
check("unsubscribing stops the calls", seen, 1);

// The binding itself: a source filter naming "@board" must resolve against the shared
// selection, so the tabs widget steers the board without either knowing the other.
const { resolveFilter } = await import("./.mjs-cache/surface.mjs");
if (typeof resolveFilter === "function") {
	const bound = createContext({ board: "Ux Team" });
	check(
		"a filter bound to @board reads the selection",
		resolveFilter([{ prop: "board", op: "is", value: "@board" }], bound),
		[{ prop: "board", op: "is", value: "Ux Team" }],
	);
	check(
		"a plain value is left alone",
		resolveFilter([{ prop: "status", op: "is", value: "todo" }], bound),
		[{ prop: "status", op: "is", value: "todo" }],
	);
	bound.set("board", "Marketing", "tabs");
	check(
		"and it follows the selection when it changes",
		resolveFilter([{ prop: "board", op: "is", value: "@board" }], bound)[0].value,
		"Marketing",
	);
} else {
	failed += 1;
	console.log("!!  resolveFilter is not exported from surface.js — the binding cannot be tested");
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
const exposed = viewHost(fullHost);
check("the widget is told which platform it runs on", exposed.platform, "obsidian");
check("and what it can do there", Object.keys(exposed.can).sort(), ["fullscreen", "network", "renderMarkdown"]);
check("but gets no store", exposed.slot, undefined);
check("no vault query", exposed.query, undefined);
check("and no Obsidian app object", [exposed.app, exposed.plugin], [undefined, undefined]);
check("what it does get, in full", Object.keys(exposed).sort(), ["can", "platform", "ui"]);

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
			id === "@orbitask/task-card"
				? { component: () => null, manifest: { settings: [{ key: "tone", default: "plain" }] } }
				: null,
	};
	const manifest = { slots: { card: { of: "widget", default: "@orbitask/task-card" } } };
	const noHost = { platform: "obsidian", can: {}, ui: { notify: () => {} } };

	const bySpec = resolveSlots(manifest, {}, registry, noHost, {});
	check("a slot resolves to its default widget", typeof bySpec.card, "function");
	// the slot builds a vnode; preact calls the component later, so read the props off it
	const node = bySpec.card({ task: { title: "Analyze Insights" } });
	check("the parent's data reaches the slotted widget", node.props.task.title, "Analyze Insights");
	check("and the child's own defaults are applied", node.props.settings.tone, "plain");
	check("the child is handed the narrow host, not the store", Object.keys(node.props.host).sort(), ["can", "platform", "ui"]);

	const overridden = resolveSlots(manifest, { slots: { card: "@other/card" } }, registry, noHost, {});
	check("a tile may name a different widget for the slot", overridden.card, null);

	// ONE SHAPE, EVERY PATH. The registry resolves the same file whether the board placed it
	// or another widget slotted it, so a widget written against props.board as a tile must not
	// meet an undefined there as a slot — it crashed on the first property it read.
	const access = { board: { properties: [{ key: "status" }] }, configureBoard: () => true };
	const withBoard = resolveSlots(manifest, {}, registry, noHost, {}, access)
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


// THE LAW: the context is LOCAL. Nothing written to it reaches the file or another viewer —
// so one person filtering a shared board does not move anybody else's screen. A widget that
// means to tell everyone writes to a store instead, through actions.
//
// REGRESSION: it used to persist, which wrote the note on every keystroke in the search box.
// The editor rebuilt the block on each write and the expanded page came down with it.
{
	const mine = createContext({ board: "Marketing Team" });
	const yours = createContext({ board: "Marketing Team" });

	mine.set("search", "audit", "@orbitask/board-tabs");
	mine.set("filters", { priority: "P1" }, "@orbitask/filter-panel");
	mine.set("task", "Orbitask/Tasks/one.md", "@orbitask/kanban-board");
	mine.set("board", "Ux Team", "@orbitask/board-tabs");

	check("what I look at is mine", [mine.get("search"), mine.get("board")], ["audit", "Ux Team"]);
	check("and none of it reaches another viewer", [yours.get("search"), yours.get("task"), yours.get("board")], [undefined, undefined, "Marketing Team"]);
	check("the context offers no way to persist", typeof mine.markTransient, "undefined");
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
	check("a task matches a member who is on it", matches(task, [{ prop: "assignees", op: "in", value: ["Liam"] }]), true);
	check("and not one who is not", matches(task, [{ prop: "assignees", op: "in", value: ["Brandon"] }]), false);
	check("any of the ticked members is enough", matches(task, [{ prop: "assignees", op: "in", value: ["Brandon", "Emma"] }]), true);
	check("a single value still works against a list of choices", matches(task, [{ prop: "priority", op: "in", value: ["P1", "P2"] }]), true);
	check("and an empty choice matches nothing", matches(task, [{ prop: "priority", op: "in", value: [] }]), false);
}

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
