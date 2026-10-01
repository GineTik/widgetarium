import { stage, TASK_ROWS } from "./harness.ts";
import { isObject } from "../packages/core/src/engine/is-object.js";

const { TEMPLATES, templateBoard } = await import("../packages/core/src/templates.js");
const { serializeBoard } = await import("../packages/core/src/model.js");

let failed = 0;
function check(name: string, got: unknown, want: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "ok  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
}

const fieldOf = (value: unknown, key: string): unknown => (isObject(value) ? value[key] : undefined);
const sortedListOf = (value: unknown): unknown[] => (Array.isArray(value) ? [...value].sort() : []);

const template = TEMPLATES[0];
if (!template) throw new Error("core ships no template");
const staged = await stage({
	board: serializeBoard(templateBoard(template)),
	steps: [
		{ name: "filterOpened", click: ".ofp-open" },
		{ name: "cardPressed", click: ".orbi-kanban .ok-card-slot", saying: "Doing 1" },
	],
});
const seen = staged["arrival"];

if (!seen) {
	console.error("template render gate: the page reported nothing");
	process.exit(1);
}

check("the page a template writes draws exactly one kanban", fieldOf(seen, "kanbans"), 1);
check("and it is the view the group is showing", fieldOf(seen, "drawn"), ["Kanban"]);
check("the view picker stands beside it", fieldOf(seen, "picker"), true);
check(
	"the board strip drew a tab per board it read",
	fieldOf(seen, "strip"),
	TASK_ROWS.map((row) => row.name),
);
check(
	"and the kanban drew a card per task, through the slot the template names",
	sortedListOf(fieldOf(seen, "cards")),
	TASK_ROWS.map((row) => row.props.title).sort(),
);
check("the filter drew a control the person can press", fieldOf(staged["filterOpened"], "pressed"), true);
check("no card is open on arrival", fieldOf(seen, "openedCard"), null);
check(
	"pressing a card opens it in the dialog the template stands beside the board",
	fieldOf(staged["cardPressed"], "openedCard"),
	"Doing 1",
);
check("nothing complained while it was drawn", fieldOf(seen, "failures"), []);
check("and nothing was left unwired", fieldOf(seen, "warnings"), []);
check("reading the page wrote nothing back to it", fieldOf(seen, "writes"), 0);

console.log(failed === 0 ? "template render gate: clean" : `template render gate: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
