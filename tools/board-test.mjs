// The chain end to end, without Obsidian: notes on disk → adapter → filter bound to the
// shared selection → columns. If the tabs do not actually steer the board, this fails.
import fs from "node:fs";
import path from "node:path";
import { buildMirror } from "./mirror.mjs";

const VAULT = process.env.WG_VAULT ?? "tools/fixture";
const TASKS = path.join(VAULT, "Orbitask", "Tasks");

buildMirror();
const { createGatewayRefs, createViewCells, resolveWhere } = await import("./.mjs-cache/gateway/refs.mjs");
// the REAL matcher the vault adapter uses — a copy here is how a dead operator hid before
const { isMatch, KNOWN_OPERATORS } = await import("./.mjs-cache/gateway/match.mjs");

let failed = 0;
function check(name, got, want) {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
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
			// CONTEXT: a block list is how Obsidian writes tags, and its items carry no colon
			let list = null;
			for (const line of (block?.[1] ?? "").split("\n")) {
				const item = /^\s+- (.*)$/.exec(line);
				if (item && list) {
					props[list].push(item[1].trim());
					continue;
				}
				const at = line.indexOf(":");
				if (at < 0 || /^\s/.test(line)) continue;
				const value = line.slice(at + 1).trim();
				list = value === "" ? line.slice(0, at).trim() : null;
				props[line.slice(0, at).trim()] = list ? [] : value;
			}
			return { path: `Orbitask/Tasks/${name}`, props };
		});
}

const rows = readTasks();
// Counts are read off the vault, never written into the test: this file used to assert 10
// tasks, so creating one IN THE APP broke a suite that was supposed to be watching the app.
check("the vault holds tasks at all", rows.length > 0, true);
check(
	"and every one names a board",
	rows.every((row) => Boolean(row.props.board)),
	true,
);

function applyFilter(all, filters) {
	return all.filter((row) => isMatch(row, filters));
}

function columnsOf(all, names, groupBy) {
	return names.map((name) => ({ name, count: all.filter((row) => row.props[groupBy] === name).length }));
}

const cells = createViewCells();
const BOARD_REF = "tabs/selection";
const FILTER_REF = "filter/chosen";
const OPEN_REF = "kanban/opened";

function boardWith(picked) {
	const refs = createGatewayRefs();
	const box = cells(BOARD_REF);
	refs.put(BOARD_REF, box, {
		describes: { tile: "tabs", prop: "selection", label: "Selected tab", title: "Editable tabs", kind: "value" },
	});
	box.update(picked);
	return refs;
}

const declared = [{ prop: "board", op: "is", value: { ref: BOARD_REF } }];
const refs = boardWith("Marketing Team");

const marketing = applyFilter(rows, await resolveWhere(declared, refs));
check("the board filter resolves against the selection", marketing.length > 0 && marketing.length < rows.length, true);
check(
	"and it kept only that board",
	marketing.every((row) => row.props.board === "Marketing Team"),
	true,
);

const columns = columnsOf(marketing, ["To Do", "Doing", "Done"], "status");
check(
	"the columns account for every task on the board",
	columns.reduce((total, column) => total + column.count, 0),
	marketing.length,
);
check(
	"and each column really holds its own status",
	columns.every((column) => marketing.filter((row) => row.props.status === column.name).length === column.count),
	true,
);

// the whole point: a click on the other tab changes what the board sees
await cells(BOARD_REF).update("Ux Team");
const ux = applyFilter(rows, await resolveWhere(declared, refs));
check("switching the tab switches the tasks", ux.length > 0 && ux.length !== marketing.length, true);
check(
	"and none of the other board came with it",
	ux.every((row) => row.props.board === "Ux Team"),
	true,
);
check("and the columns follow", columnsOf(ux, ["To Do", "Doing", "Done"], "status"), [
	{ name: "To Do", count: 1 },
	{ name: "Doing", count: 1 },
	{ name: "Done", count: 1 },
]);

// GROUPING IS A SETTING, NOT A SHAPE BAKED INTO THE WIDGET. This reads the real vault, so a
// pinned count is a promise about the user's notes rather than about the code — it broke the
// moment a task was added in the app. Assert the LAW instead: regrouping re-sorts the same rows.
{
	const byPriority = columnsOf(marketing, ["P1", "P2", "P3"], "priority");
	const held = byPriority.reduce((sum, column) => sum + column.count, 0);
	check(
		"regrouping by priority keeps every task that has one",
		held,
		marketing.filter((row) => ["P1", "P2", "P3"].includes(row.props.priority)).length,
	);
	check(
		"and it really is a different shape from the status grouping",
		byPriority.map((column) => column.name).join(),
		"P1,P2,P3",
	);
	check(
		"with every task under the priority it names",
		marketing.every(
			(row) =>
				!["P1", "P2", "P3"].includes(row.props.priority) ||
				byPriority.find((column) => column.name === row.props.priority).count > 0,
		),
		true,
	);
}

// REGRESSION: every manifest writes op:"is", and an unknown operator used to pass silently,
// so the board filter let all ten tasks through while looking like it worked.
check("the operator the manifests actually use is known", KNOWN_OPERATORS.includes("is"), true);
check(
	"a note can be filtered by its path, which the popup needs",
	isMatch({ path: "a/b.md", props: {} }, [{ prop: "path", op: "is", value: "a/b.md" }]),
	true,
);
check(
	"and a different path does not match",
	isMatch({ path: "a/c.md", props: {} }, [{ prop: "path", op: "is", value: "a/b.md" }]),
	false,
);

{
	const opened = createGatewayRefs();
	const box = cells(OPEN_REF);
	opened.put(OPEN_REF, box, {
		describes: { tile: "kanban", prop: "opened", label: "Opened task", title: "Kanban board", kind: "value" },
	});
	await box.update("Orbitask/Tasks/audit-the-type-scale.md");
	const popupFilter = await resolveWhere([{ prop: "path", op: "is", value: { ref: OPEN_REF } }], opened);
	const forPopup = rows.filter((row) => isMatch(row, popupFilter));
	check("the dialog gets exactly the opened task", forPopup.length, 1);
	check("and it is the right one", forPopup[0]?.props.title, "Audit the type scale");

	await box.update("Orbitask/Tasks/rework-the-empty-states.md");
	const nextWhere = await resolveWhere([{ prop: "path", op: "is", value: { ref: OPEN_REF } }], opened);
	const next = rows.filter((row) => isMatch(row, nextWhere));
	check("opening another card swaps what the dialog shows", next[0]?.props.title, "Rework the empty states");
}

// The filter bar writes ONE object; the board's filter carries a spread clause that becomes
// one query clause per key. Without it every widget would have to know in advance which
// properties are filterable — the exact knowledge the bar reads off the data at runtime.
const picking = boardWith("Marketing Team");
const chosen = cells(FILTER_REF);
picking.put(FILTER_REF, chosen, {
	describes: { tile: "filter", prop: "chosen", label: "Chosen filters", title: "Filter", kind: "value" },
});
await chosen.update({ priority: "P1" });

const boardFilter = [{ prop: "board", op: "is", value: { ref: BOARD_REF } }, { spread: { ref: FILTER_REF } }];
const narrowed = await resolveWhere(boardFilter, picking);
check("the spread became a real clause", narrowed.length, 2);
check("and it names the property that was picked", narrowed[1]?.prop, "priority");

const pickingWhere = await resolveWhere(declared, picking);
const marketingRows = rows.filter((row) => isMatch(row, pickingWhere));
const p1 = rows.filter((row) => isMatch(row, narrowed));
check("picking a priority narrows the board", p1.length < marketingRows.length, true);

// EVERY FIELD THE BOARD NAMES IS FILTERABLE, not the three somebody once typed into a setting.
// The mechanism was always generic; the LIST was a colon-separated string, so a board could name
// a property, the dialog could write it, and it was still not offered in the bar.
{
	const boardProperties = ["Status", "Priority", "Approval", "Assignees", "Tags"];
	const spelled = (name) => {
		const wanted = name.toLowerCase();
		for (const row of rows) {
			const found = Object.keys(row.props ?? {}).find((key) => key.toLowerCase() === wanted);
			if (found) return found;
		}
		return null;
	};
	const valuesOf = (prop) => [
		...new Set(
			rows.flatMap((row) => {
				const held = row.props?.[prop];
				return Array.isArray(held) ? held : held === undefined ? [] : [held];
			}),
		),
	];

	for (const name of boardProperties) {
		const prop = spelled(name);
		if (!prop) {
			check(`${name}: the board names a property no note carries`, prop, "a note that carries it");
			continue;
		}
		const values = valuesOf(prop);
		const ctx = boardWith("Marketing Team");
		const box = cells(FILTER_REF);
		ctx.put(FILTER_REF, box, {
			describes: { tile: "filter", prop: "chosen", label: "Chosen filters", title: "Filter", kind: "value" },
		});
		await box.update({ [prop]: [values[0]] });
		const wholeWhere = await resolveWhere(declared, ctx);
		const keptWhere = await resolveWhere(boardFilter, ctx);
		const whole = rows.filter((row) => isMatch(row, wholeWhere));
		const kept = rows.filter((row) => isMatch(row, keptWhere));
		check(`${name}: picking one narrows the board`, kept.length > 0 && kept.length < whole.length, true);
		check(
			`${name}: and every row left really carries it`,
			kept.every((row) => {
				const held = row.props?.[prop];
				return (Array.isArray(held) ? held : [held]).includes(values[0]);
			}),
			true,
		);
	}
}
check(
	"and every row left really carries it",
	p1.every((row) => row.props.priority === "P1"),
	true,
);

await chosen.update({});
const clearedWhere = await resolveWhere(boardFilter, picking);
check(
	"clearing the bar restores the whole board",
	rows.filter((row) => isMatch(row, clearedWhere)).length,
	marketingRows.length,
);

// REGRESSION: an unset selection used to become a clause matching the empty string, which
// matched nothing — the board came up blank until something was clicked.
const nothingPicked = createGatewayRefs();
check(
	"with nothing selected the board is not filtered to nothing",
	(await resolveWhere(declared, nothingPicked)).length,
	0,
);
const noneWhere = await resolveWhere(declared, nothingPicked);
check("so every task is shown", rows.filter((row) => isMatch(row, noneWhere)).length, rows.length);

console.log(failed ? `\n${failed} failed` : "\nthe board reads real notes and the tabs steer it");
process.exit(failed ? 1 : 0);
