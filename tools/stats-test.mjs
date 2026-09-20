import { buildMirror } from "./mirror.mjs";

buildMirror();
const { statOf, statGateway, todayIso } = await import("./.mjs-cache/gateway/stats.mjs");
const { arrayGateway } = await import("./.mjs-cache/gateway/create.mjs");

let failed = 0;
function check(label, got, want) {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK " : "!! "} ${label}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
}

const TODAY = "2026-09-17";
const note = (props) => ({ path: `N/${Math.random()}.md`, name: "n", props });

const habit = note({ days: ["2026-09-10", "2026-09-11", "2026-09-12", "2026-09-15", "2026-09-16", "2026-09-17"] });
check(
	"streak runs back from today through consecutive days",
	statOf([habit], { algorithm: "streak", date: "days" }, TODAY),
	3,
);
check(
	"a streak survives a today not yet done",
	statOf([habit], { algorithm: "streak", date: "days" }, "2026-09-18"),
	3,
);
check(
	"a streak dies after a whole missed day",
	statOf([habit], { algorithm: "streak", date: "days" }, "2026-09-19"),
	0,
);
check("best streak is the longest run anywhere", statOf([habit], { algorithm: "best-streak", date: "days" }, TODAY), 3);
check(
	"one date repeated twice is one day of a streak",
	statOf([note({ days: ["2026-09-17", "2026-09-17"] })], { algorithm: "streak", date: "days" }, TODAY),
	1,
);

check(
	"active days share the window, not all history",
	statOf([habit], { algorithm: "active-days", date: "days", window: "7d" }, TODAY),
	71.4,
);
check(
	"count over a rolling week counts only inside it",
	statOf([habit], { algorithm: "count", date: "days", window: "7d" }, TODAY),
	5,
);
check("count over all time counts every occurrence", statOf([habit], { algorithm: "count", date: "days" }, TODAY), 6);

const games = ["win", "loss", "win", "win"].map((result, at) => note({ date: `2026-09-1${4 + at}`, result }));
const wins = [{ prop: "result", op: "is", value: "win" }];
check(
	"counts-when keeps the loss in the whole, so the percent divides by it",
	statOf(games, { algorithm: "percent", counts: wins }, TODAY),
	75,
);
check(
	"counts-when breaks a run of records on the loss",
	statOf(games, { algorithm: "best-record-streak", counts: wins }, TODAY),
	2,
);
check(
	"a filter that dropped the loss would have lied",
	statOf(
		games.filter((game) => game.props.result === "win"),
		{ algorithm: "best-record-streak" },
		TODAY,
	),
	3,
);
check(
	"the current run of records ends at the latest one",
	statOf([...games, note({ date: "2026-09-18", result: "loss" })], { algorithm: "record-streak", counts: wins }, TODAY),
	0,
);
check("a day streak counts days, not records", statOf(games, { algorithm: "streak", counts: wins }, TODAY), 2);

const spend = [
	note({ date: "2026-09-01", amount: 10 }),
	note({ date: "2026-09-05", amount: "30" }),
	note({ date: "2026-08-03", amount: 20 }),
];
check(
	"sum reads the field, a written number included",
	statOf(spend, { algorithm: "sum", field: "amount", window: "month" }, TODAY),
	40,
);
check("average of the field", statOf(spend, { algorithm: "average", field: "amount" }, TODAY), 20);
check("max of the field", statOf(spend, { algorithm: "max", field: "amount" }, TODAY), 30);
check(
	"an average over nothing is no number, not zero",
	statOf([], { algorithm: "average", field: "amount" }, TODAY),
	null,
);
check(
	"month-to-date is compared with the same days of last month",
	statOf(spend, { algorithm: "sum", field: "amount", window: "month", compare: "change" }, TODAY),
	20,
);
check(
	"the change in percent is against the previous reading",
	statOf(spend, { algorithm: "sum", field: "amount", window: "month", compare: "change-percent" }, TODAY),
	100,
);
check(
	"a change from zero has no percent",
	statOf(spend, { algorithm: "sum", field: "amount", window: "week", compare: "change-percent" }, TODAY),
	null,
);
check(
	"all time has nothing before it to compare with",
	statOf(spend, { algorithm: "count", compare: "change" }, TODAY),
	null,
);
check(
	"a rolling week is compared with the seven days before it",
	statOf([habit], { algorithm: "count", date: "days", window: "7d", compare: "change" }, TODAY),
	4,
);

check("a note with no date counts toward all time", statOf([note({})], { algorithm: "count" }, TODAY), 1);
check("a note with no date stays out of a window", statOf([note({})], { algorithm: "count", window: "30d" }, TODAY), 0);
check("an algorithm nobody knows reads as a count", statOf(games, { algorithm: "median" }, TODAY), 4);
check("today is written as a local ISO day", todayIso(new Date(2026, 0, 5, 23, 30)), "2026-01-05");

const rows = arrayGateway(games.map((game, at) => ({ ref: `g${at}`, value: game })));
const gateway = statGateway(rows, { algorithm: "percent", counts: wins });
check("the gateway hands the widget one number", await gateway.get(), 75);
check(
	"two queries over one folder are two cache entries",
	gateway.id === statGateway(rows, { algorithm: "count" }).id,
	false,
);

console.log(failed === 0 ? "\nstats gate: clean" : `\nstats gate: ${failed} red`);
process.exit(failed === 0 ? 0 : 1);
