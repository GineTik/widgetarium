import { buildMirror } from "./mirror.mjs";

buildMirror();

const { checkWidget, saidWidgetCheck, WIDGET_CHECK_RULES } = await import("./.mjs-cache/widget-check.mjs");

let failed = 0;
let checks = 0;
const check = (name, got, want) => {
	checks += 1;
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
};

const rulesIn = (found) => found.map((one) => one.rule).sort();
const clean = {
	id: "@x/ok",
	source: "const a = useData(rows.list, { limit: 20 });\nrows.map((r) => r);",
	styles: "color: var(--wg-kit-accent);",
	card: { role: "collection" },
};

check("a widget that breaks nothing is named clean", rulesIn(checkWidget(clean)), []);
check("and says so", saidWidgetCheck(checkWidget(clean)), "the widget is clean");

check("a hex colour is a finding", rulesIn(checkWidget({ ...clean, styles: "color: #ff8800;" })), ["colour"]);
check("an rgb colour is a finding", rulesIn(checkWidget({ ...clean, styles: "background: rgba(0,0,0,0.4);" })), [
	"colour",
]);
check(
	"a colour inside a token definition is not",
	rulesIn(checkWidget({ ...clean, styles: "--wg-kit-mine: #ff8800;" })),
	[],
);
check(
	"a plate painted from the host text ramp is a finding",
	rulesIn(checkWidget({ ...clean, styles: "background: var(--text-faint);" })),
	["colour"],
);
check(
	"a plate painted from a kit token is not",
	rulesIn(checkWidget({ ...clean, styles: "background: var(--wg-kit-fill);" })),
	[],
);
check(
	"ink from the host is not a finding",
	rulesIn(checkWidget({ ...clean, styles: "color: var(--text-muted);" })),
	[],
);
check(
	"a transparent background is not a finding",
	rulesIn(checkWidget({ ...clean, styles: "background: transparent; border: none;" })),
	[],
);
check("a corner radius is not paint", rulesIn(checkWidget({ ...clean, styles: "border-radius: 50%;" })), []);
check(
	"a shadow with a hand-written colour is a finding",
	rulesIn(checkWidget({ ...clean, styles: "box-shadow: 0 2px 4px black;" })),
	["colour"],
);
check(
	"a gradient painted from outside the kit is a finding",
	rulesIn(checkWidget({ ...clean, styles: "background-image: linear-gradient(gray, black);" })),
	["colour"],
);
check(
	"an outline painted from outside the kit is a finding",
	rulesIn(checkWidget({ ...clean, styles: "outline: 2px solid gray;" })),
	["colour"],
);
check("a border width alone is not paint", rulesIn(checkWidget({ ...clean, styles: "border-top-width: 3px;" })), []);
check(
	"a background position is not paint",
	rulesIn(checkWidget({ ...clean, styles: "background-position: 50% 0;" })),
	[],
);
check("a border style alone is not paint", rulesIn(checkWidget({ ...clean, styles: "border-style: solid;" })), []);
check("a whole border shorthand still is", rulesIn(checkWidget({ ...clean, styles: "border: 1px solid gray;" })), [
	"colour",
]);
check(
	"a colour in the component, not the sheet, is caught too",
	rulesIn(checkWidget({ ...clean, source: `${clean.source}\nconst c = "#123456";` })),
	["colour"],
);

check(
	"a named font family is a finding",
	rulesIn(checkWidget({ ...clean, styles: "font-family: Inter, sans-serif;" })),
	["font"],
);
check(
	"a font size built on a host variable is a finding",
	rulesIn(checkWidget({ ...clean, styles: "font-size: calc(var(--font-ui-medium) * 1.9);" })),
	["font"],
);
check(
	"a host font variable taken whole is not",
	rulesIn(checkWidget({ ...clean, styles: "font-size: var(--font-ui-small);" })),
	[],
);
check(
	"a font family from a token is not",
	rulesIn(checkWidget({ ...clean, styles: "font-family: var(--font-text);" })),
	[],
);
check("a hand-written font size is a finding", rulesIn(checkWidget({ ...clean, styles: "font-size: 13px;" })), [
	"font",
]);

const drawnUnbounded = {
	...clean,
	source: "const listed = useData(rows.list);\nreturn listed.data.map((r) => r.title);",
};
check("drawing from an unlimited list is a finding", rulesIn(checkWidget(drawnUnbounded)), ["unbounded"]);
check(
	"reading an unlimited list without drawing it is not",
	rulesIn(checkWidget({ ...clean, source: "const total = useData(rows.list).data.length;" })),
	[],
);
check(
	"passing a limit clears it",
	rulesIn(checkWidget({ ...clean, source: "const l = useData(rows.list, { limit: 50 });\nl.data.map((r) => r);" })),
	[],
);
check("the finding names the prop", checkWidget(drawnUnbounded)[0].message.startsWith("rows read through list"), true);

check("a manifest with no role is a finding", rulesIn(checkWidget({ ...clean, card: { title: "x" } })), ["role"]);
check("no card at all is not judged for a role", rulesIn(checkWidget({ ...clean, card: null })), []);

const surface = ["useData", "createWidget", "defineManifest"];
const reaching = { ...clean, source: 'import { useData, flatRows } from "widgetarium";\n' + clean.source };
check("an import the surface does not carry is a finding", rulesIn(checkWidget({ ...reaching, surface })), ["reaches"]);
check(
	"the finding names what cannot be reached",
	checkWidget({ ...reaching, surface })[0].message.startsWith("flatRows imported"),
	true,
);
check(
	"an import the surface carries is not",
	rulesIn(checkWidget({ ...clean, source: 'import { useData } from "widgetarium";\n' + clean.source, surface })),
	[],
);
check(
	"a type import is never a reach finding",
	rulesIn(checkWidget({ ...clean, source: 'import type { Row } from "widgetarium";\n' + clean.source, surface })),
	[],
);
check("with no surface given the rule stays quiet", rulesIn(checkWidget(reaching)), []);

const heading = { ...clean, source: `${clean.source}\nreturn <h2>Metadata</h2>;` };
check("a board heading drawn inside a widget is a finding", rulesIn(checkWidget(heading)), ["heading"]);
check("the same heading in a text widget is not", rulesIn(checkWidget({ ...heading, card: { role: "text" } })), []);
check("a widget with no card yet is not judged for a heading", rulesIn(checkWidget({ ...heading, card: null })), []);
const kitHeading = { ...clean, source: `${clean.source}\nreturn <Heading level={1}>Metadata</Heading>;` };
check("so is the kit's Heading asked for a board level", rulesIn(checkWidget(kitHeading)), ["heading"]);
check(
	"a kit Heading at a card's level is not",
	rulesIn(checkWidget({ ...clean, source: `${clean.source}\nreturn <Heading level={3} size={4}>Due</Heading>;` })),
	[],
);
check(
	"a card's own h3 is not a board heading",
	rulesIn(checkWidget({ ...clean, source: `${clean.source}\nreturn <h3>{r.title}</h3>;` })),
	[],
);

const allBroken = {
	id: "@x/bad",
	source:
		"import { flatRows } from \"widgetarium\";\nconst l = useData(rows.list);\nl.data.map((r) => r);\nconst c = '#abc';\nreturn <h1>Title</h1>;",
	styles: "font-family: Inter;",
	card: {},
	surface,
};
check("every rule can fire at once", rulesIn(checkWidget(allBroken)), [...WIDGET_CHECK_RULES].sort());
check(
	"each finding carries the widget it came from",
	[...new Set(checkWidget(allBroken).map((one) => one.widget))],
	["@x/bad"],
);
check(
	"the report names the rule and the widget",
	saidWidgetCheck(checkWidget(allBroken)).split("\n")[0].startsWith("@x/bad colour:"),
	true,
);

console.log(`\n${checks - failed}/${checks} checks passed`);
process.exit(failed === 0 ? 0 : 1);
