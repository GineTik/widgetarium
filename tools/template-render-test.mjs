import { stage, TASK_ROWS } from "./harness.mjs";
import { buildMirror } from "./mirror.mjs";

buildMirror();
const { TEMPLATES, templateBoard } = await import("./.mjs-cache/templates.mjs");
const { serializeBoard } = await import("./.mjs-cache/model.mjs");

let failed = 0;
function check(name, got, want) {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "ok  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
}

const template = TEMPLATES[0];
const staged = await stage({
	board: serializeBoard(templateBoard(template)),
	steps: [
		{ name: "filterOpened", click: ".ofp-open" },
		{ name: "cardPressed", click: ".orbi-kanban .ok-card-slot", saying: "Doing 1" },
	],
});
const seen = staged.arrival;

if (!seen) {
	console.error("template render gate: the page reported nothing");
	process.exit(1);
}

check("the page a template writes draws exactly one kanban", seen.kanbans, 1);
check("and it is the view the group is showing", seen.drawn, ["Kanban"]);
check("the view picker stands beside it", seen.picker, true);
check(
	"the board strip drew a tab per board it read",
	seen.strip,
	TASK_ROWS.map((row) => row.name),
);
check(
	"and the kanban drew a card per task, through the slot the template names",
	seen.cards.sort(),
	TASK_ROWS.map((row) => row.props.title).sort(),
);
check("the filter drew a control the person can press", staged.filterOpened.pressed, true);
check("no card is open on arrival", seen.openedCard, null);
check(
	"pressing a card opens it in the dialog the template stands beside the board",
	staged.cardPressed.openedCard,
	"Doing 1",
);
check("nothing complained while it was drawn", seen.failures, []);
check("and nothing was left unwired", seen.warnings, []);
check("reading the page wrote nothing back to it", seen.writes, 0);

console.log(failed === 0 ? "template render gate: clean" : `template render gate: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
