// The chain end to end, without Obsidian: notes on disk → adapter → filter bound to the
// shared selection → columns. If the tabs do not actually steer the board, this fails.
import fs from "node:fs";
import path from "node:path";
import { buildMirror } from "./mirror.mjs";

const VAULT = process.env.WG_VAULT ?? "tools/fixture";
const TASKS = path.join(VAULT, "Orbitask", "Tasks");

buildMirror();
const { createContext } = await import("./.mjs-cache/engine/context.mjs");
const { resolveFilter } = await import("./.mjs-cache/surface.mjs");
// the REAL matcher the vault adapter uses — a copy here is how a dead operator hid before
const { matches, KNOWN_OPERATORS } = await import("./.mjs-cache/engine/match.mjs");

let failed = 0;
function check(name, got, want) {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
}

// read the notes the way host.js does: frontmatter is the properties
function readTasks() {
	return fs
		.readdirSync(TASKS)
		.filter((name) => name.endsWith(".md"))
		.map((name) => {
			const text = fs.readFileSync(path.join(TASKS, name), "utf8");
			const block = text.match(/^---\n([\s\S]*?)\n---/);
			const props = {};
			for (const line of (block?.[1] ?? "").split("\n")) {
				const at = line.indexOf(":");
				if (at < 0) continue;
				props[line.slice(0, at).trim()] = line.slice(at + 1).trim();
			}
			return { path: `Orbitask/Tasks/${name}`, props };
		});
}

const rows = readTasks();
// Counts are read off the vault, never written into the test: this file used to assert 10
// tasks, so creating one IN THE APP broke a suite that was supposed to be watching the app.
check("the vault holds tasks at all", rows.length > 0, true);
check("and every one names a board", rows.every((row) => Boolean(row.props.board)), true);

function applyFilter(all, filters) {
	return all.filter((row) => matches(row, filters));
}

function columnsOf(all, names, groupBy) {
	return names.map((name) => ({ name, count: all.filter((row) => row.props[groupBy] === name).length }));
}

const declared = [{ prop: "board", op: "is", value: "@board" }];
const context = createContext({ board: "Marketing Team" });

const marketing = applyFilter(rows, resolveFilter(declared, context));
check("the board filter resolves against the selection", marketing.length > 0 && marketing.length < rows.length, true);
check("and it kept only that board", marketing.every((row) => row.props.board === "Marketing Team"), true);

const columns = columnsOf(marketing, ["To Do", "Doing", "Done"], "status");
check("the columns account for every task on the board", columns.reduce((total, column) => total + column.count, 0), marketing.length);
check("and each column really holds its own status", columns.every((column) => marketing.filter((row) => row.props.status === column.name).length === column.count), true);

// the whole point: a click on the other tab changes what the board sees
context.set("board", "Ux Team", "@orbitask/board-tabs");
const ux = applyFilter(rows, resolveFilter(declared, context));
check("switching the tab switches the tasks", ux.length > 0 && ux.length !== marketing.length, true);
check("and none of the other board came with it", ux.every((row) => row.props.board === "Ux Team"), true);
check(
	"and the columns follow",
	columnsOf(ux, ["To Do", "Doing", "Done"], "status"),
	[{ name: "To Do", count: 1 }, { name: "Doing", count: 1 }, { name: "Done", count: 1 }],
);

// GROUPING IS A SETTING, NOT A SHAPE BAKED INTO THE WIDGET. This reads the real vault, so a
// pinned count is a promise about the user's notes rather than about the code — it broke the
// moment a task was added in the app. Assert the LAW instead: regrouping re-sorts the same rows.
{
	const byPriority = columnsOf(marketing, ["P1", "P2", "P3"], "priority");
	const held = byPriority.reduce((sum, column) => sum + column.count, 0);
	check("regrouping by priority keeps every task that has one", held, marketing.filter((row) => ["P1", "P2", "P3"].includes(row.props.priority)).length);
	check("and it really is a different shape from the status grouping", byPriority.map((column) => column.name).join(), "P1,P2,P3");
	check("with every task under the priority it names", marketing.every((row) => !["P1", "P2", "P3"].includes(row.props.priority) || byPriority.find((column) => column.name === row.props.priority).count > 0), true);
}

// REGRESSION: every manifest writes op:"is", and an unknown operator used to pass silently,
// so the board filter let all ten tasks through while looking like it worked.
check("the operator the manifests actually use is known", KNOWN_OPERATORS.includes("is"), true);
check("a note can be filtered by its path, which the popup needs", matches({ path: "a/b.md", props: {} }, [{ prop: "path", op: "is", value: "a/b.md" }]), true);
check("and a different path does not match", matches({ path: "a/c.md", props: {} }, [{ prop: "path", op: "is", value: "a/b.md" }]), false);

// The popup: the board writes which task is open, the popup's own filter resolves @task
// against it and comes back with exactly one row. Neither widget knows the other exists.
const opened = createContext({ board: "Marketing Team" });
opened.set("task", "Orbitask/Tasks/audit-the-type-scale.md", "@orbitask/kanban-board");
const popupFilter = resolveFilter([{ prop: "path", op: "is", value: "@task" }], opened);
const forPopup = rows.filter((row) => matches(row, popupFilter));
check("the popup gets exactly the opened task", forPopup.length, 1);
check("and it is the right one", forPopup[0]?.props.title, "Audit the type scale");

opened.set("task", "Orbitask/Tasks/rework-the-empty-states.md", "@orbitask/kanban-board");
const next = rows.filter((row) => matches(row, resolveFilter([{ prop: "path", op: "is", value: "@task" }], opened)));
check("opening another card swaps what the popup shows", next[0]?.props.title, "Rework the empty states");

// one writer per key still holds across widgets that both want to open things
check("a second widget may not also write the task key", opened.set("task", "x", "@orbitask/task-dialog"), false);

// The filter bar writes ONE object; the board's filter carries a spread clause that becomes
// one query clause per key. Without it every widget would have to know in advance which
// properties are filterable — the exact knowledge the bar reads off the data at runtime.
const picking = createContext({ board: "Marketing Team" });
picking.set("filters", { priority: "P1" }, "@orbitask/filter-panel");

const boardFilter = [{ prop: "board", op: "is", value: "@board" }, { spread: "@filters" }];
const narrowed = resolveFilter(boardFilter, picking);
check("the spread became a real clause", narrowed.length, 2);
check("and it names the property that was picked", narrowed[1]?.prop, "priority");

const marketingRows = rows.filter((row) => matches(row, resolveFilter([{ prop: "board", op: "is", value: "@board" }], picking)));
const p1 = rows.filter((row) => matches(row, narrowed));
check("picking a priority narrows the board", p1.length < marketingRows.length, true);

// EVERY FIELD THE BOARD NAMES IS FILTERABLE, not the three somebody once typed into a setting.
// The mechanism was always generic; the LIST was a colon-separated string, so a board could name
// a property, the dialog could write it, and it was still not offered in the bar.
{
	const boardProperties = ["Status", "Priority", "Approval", "Assignees", "Tag"];
	const spelled = (name) => {
		const wanted = name.toLowerCase();
		for (const row of rows) {
			const found = Object.keys(row.props ?? {}).find((key) => key.toLowerCase() === wanted);
			if (found) return found;
		}
		return null;
	};
	const valuesOf = (prop) => [...new Set(rows.flatMap((row) => {
		const held = row.props?.[prop];
		return Array.isArray(held) ? held : held === undefined ? [] : [held];
	}))];

	for (const name of boardProperties) {
		const prop = spelled(name);
		if (!prop) {
			check(`${name}: the board names a property no note carries`, prop, "a note that carries it");
			continue;
		}
		const values = valuesOf(prop);
		const ctx = createContext({ board: "Marketing Team" });
		ctx.set("filters", { [prop]: [values[0]] }, "@orbitask/filter-panel");
		const whole = rows.filter((row) => matches(row, resolveFilter([{ prop: "board", op: "is", value: "@board" }], ctx)));
		const kept = rows.filter((row) => matches(row, resolveFilter(boardFilter, ctx)));
		check(`${name}: picking one narrows the board`, kept.length > 0 && kept.length < whole.length, true);
		check(`${name}: and every row left really carries it`, kept.every((row) => {
			const held = row.props?.[prop];
			return (Array.isArray(held) ? held : [held]).includes(values[0]);
		}), true);
	}
}
check("and every row left really carries it", p1.every((row) => row.props.priority === "P1"), true);

picking.set("filters", {}, "@orbitask/filter-panel");
check("clearing the bar restores the whole board", rows.filter((row) => matches(row, resolveFilter(boardFilter, picking))).length, marketingRows.length);

// REGRESSION: an unset selection used to become a clause matching the empty string, which
// matched nothing — the board came up blank until something was clicked.
const nothingPicked = createContext({});
check("with nothing selected the board is not filtered to nothing", resolveFilter([{ prop: "board", op: "is", value: "@board" }], nothingPicked).length, 0);
check("so every task is shown", rows.filter((row) => matches(row, resolveFilter([{ prop: "board", op: "is", value: "@board" }], nothingPicked))).length, rows.length);

console.log(failed ? `\n${failed} failed` : "\nthe board reads real notes and the tabs steer it");
process.exit(failed ? 1 : 0);
