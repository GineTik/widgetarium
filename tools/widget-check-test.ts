export {};

const { checkWidget, saidWidgetCheck, WIDGET_CHECK_RULES } = await import("../packages/core/src/widget-check.js");

let failed = 0;
let checks = 0;
const check = (name: string, got: unknown, want: unknown): void => {
	checks += 1;
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
};

const rulesIn = (found: ReturnType<typeof checkWidget>): string[] => found.map((one) => one.rule).sort();
const CLEAN_SOURCE = "const a = useData(rows.list, { limit: 20 });\nrows.map((r) => r);";
const clean = {
	id: "@x/ok",
	source: "const a = useData(rows.list, { limit: 20 });\nrows.map((r) => r);",
	styles: "color: var(--wg-kit-accent);",
	card: { role: "collection" },
};

const draftClean = { ...clean, id: "@draft/app", source: `${CLEAN_SOURCE}\nexport const blocks = {};` };
check("a widget that breaks nothing is named clean", rulesIn(checkWidget(clean)), []);
check("and says so", saidWidgetCheck(checkWidget(clean)), "the widget is clean");

check("a hex colour is a finding", rulesIn(checkWidget({ ...clean, styles: "color: #ff8800;" })), ["colour"]);
check(
	"a colour from Tailwind's own palette is a finding, because no theme repaints it",
	rulesIn(checkWidget({ ...clean, source: `${clean.source}\n<div className="bg-violet-500 text-white" />` })),
	["colour"],
);
check(
	"a colour from the kit's theme is not",
	rulesIn(checkWidget({ ...clean, source: `${clean.source}\n<div className="bg-group text-muted text-red" />` })),
	[],
);
check(
	"a sheet opening with Tailwind 3's entry points is a finding, because none of it compiles",
	rulesIn(checkWidget({ ...clean, styles: '@import "tailwindcss/base";\n@import "tailwindcss/utilities";' })),
	["tailwind"],
);
check("and so is the @tailwind directive", rulesIn(checkWidget({ ...clean, styles: "@tailwind base;" })), ["tailwind"]);
check(
	"a draft whose sheet writes its own rules is a finding, because the look stays behind when a block is lifted",
	rulesIn(checkWidget({ ...draftClean, styles: ".card {\n\tpadding: 8px;\n}" })),
	["hand-written"],
);
check(
	"so is a Tailwind sheet that still writes rules beside its classes",
	rulesIn(checkWidget({ ...clean, styles: '@import "tailwindcss";\n.card {\n\tpadding: 8px;\n}' })),
	["hand-written"],
);
check(
	"an older widget's plain sheet is left alone until the catalogue is converted",
	rulesIn(checkWidget({ ...clean, styles: ".card {\n\tpadding: 8px;\n}" })),
	[],
);
check(
	"a draft sheet of imports and a @theme is clean",
	rulesIn(
		checkWidget({
			...draftClean,
			styles:
				'@import "tailwindcss";\n@import "widgetarium/theme.css";\n@theme {\n\t--color-brand: var(--wg-kit-accent);\n}',
		}),
	),
	[],
);
check(
	"a side border, a shadow and a ring offset from Tailwind's palette are findings too",
	["border-t-red-500", "shadow-white", "ring-offset-blue-200"].map(
		(name) => rulesIn(checkWidget({ ...clean, source: `${clean.source}\n<div className="${name}" />` }))[0],
	),
	["colour", "colour", "colour"],
);
check(
	"a class of one's own that only contains a palette word is not",
	rulesIn(checkWidget({ ...clean, source: `${clean.source}\n<div className="my-bg-white text-white-space" />` })),
	[],
);
check(
	"a commented-out import neither opens Tailwind nor names Tailwind 3",
	rulesIn(
		checkWidget({ ...clean, styles: '/* @import "tailwindcss"; @tailwind base; */\n.card {\n\tpadding: 8px;\n}' }),
	),
	[],
);
check(
	"a sheet opening Tailwind through its layered imports is held the same way",
	rulesIn(
		checkWidget({
			...clean,
			styles: '@import "tailwindcss/utilities.css" layer(utilities);\n.card {\n\tpadding: 8px;\n}',
		}),
	),
	["hand-written"],
);
check(
	"every rule of a minified sheet is counted",
	checkWidget({ ...draftClean, styles: ".a{x:1}.b{y:2}" })[0]?.message.startsWith("2 rules"),
	true,
);
check(
	"the steps of a keyframe inside a @theme are not rules of one's own",
	rulesIn(
		checkWidget({
			...draftClean,
			styles:
				'@import "tailwindcss";\n@theme {\n\t@keyframes spin {\n\t\tfrom {\n\t\t\trotate: 0deg;\n\t\t}\n\t\tto {\n\t\t\trotate: 360deg;\n\t\t}\n\t}\n}',
		}),
	),
	[],
);
check(
	"a draft that exports no blocks is a finding, because the canvas cannot draw its new widgets",
	rulesIn(checkWidget({ ...clean, id: "@draft/app" })),
	["blocks"],
);
check(
	"a draft exporting its blocks is clean",
	rulesIn(checkWidget({ ...draftClean, source: `${clean.source}\nexport const blocks = { Covers };` })),
	[],
);
check(
	"a Tailwind 4 sheet is clean",
	rulesIn(checkWidget({ ...clean, styles: '@import "tailwindcss";\n@import "widgetarium/theme.css";' })),
	[],
);
check(
	"a raw button drawn in a widget is a finding, because Obsidian paints every bare control",
	rulesIn(checkWidget({ ...clean, source: `${clean.source}\n<button className="pick" onClick={go}>Pick</button>` })),
	["control"],
);
check(
	"and it names the kit control that replaces each tag",
	checkWidget({ ...clean, source: `${clean.source}\n<input value={v} />\nh("select", {})` })[0]?.message.includes(
		"<input> → Field or Checkbox; <select> → Select",
	),
	true,
);
check(
	"a collection that adds records is clean: its add stands in its own header",
	rulesIn(checkWidget({ ...clean, source: `${clean.source}\ncreateWord: ICommand.sends(WordSchema),` })),
	[],
);
check(
	"a collection that draws its own title is a finding: the Section above owns it",
	[
		rulesIn(checkWidget({ ...clean, source: `${clean.source}\n<LayoutTitle>People</LayoutTitle>` })),
		rulesIn(checkWidget({ ...clean, source: `${clean.source}\n<LayoutHeader title="People" />` })),
	],
	[["titled"], ["titled"]],
);
check(
	"a detail may title itself",
	rulesIn(checkWidget({ ...clean, card: { role: "detail" }, source: `${clean.source}\n<h3>Maya</h3>` })),
	[],
);
check(
	"a page widget that draws no kit Page is a finding",
	rulesIn(checkWidget({ ...clean, id: "@crm/people-page", card: { role: "layout" }, source: "<main>x</main>" })),
	["page"],
);
check(
	"and so is one that sets its own width",
	checkWidget({
		...clean,
		id: "@crm/people-page",
		card: { role: "layout" },
		source: '<Page kind="index" title="People"><div className="mx-auto max-w-[720px]" /></Page>',
	})[0]?.message.includes("mx-auto, max-w-[720px]"),
	true,
);
check(
	"a page widget drawn by the kit Page is clean",
	rulesIn(
		checkWidget({
			...clean,
			id: "@crm/people-page",
			card: { role: "layout" },
			source: '<Page kind="index" title="People">x</Page>',
		}),
	),
	[],
);
check(
	"the kit's own Button is not a raw control",
	rulesIn(checkWidget({ ...clean, source: `${clean.source}\n<Button onClick={go}>Pick</Button>` })),
	[],
);
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
check("the finding names the prop", checkWidget(drawnUnbounded)[0]?.message.startsWith("rows read through list"), true);

const cardNamingNoRole: Readonly<Record<string, unknown>> = { title: "x" };
check("a manifest with no role is a finding", rulesIn(checkWidget({ ...clean, card: cardNamingNoRole })), ["role"]);
check("no card at all is not judged for a role", rulesIn(checkWidget({ ...clean, card: null })), []);

const surface = ["useData", "createWidget", "defineMetadata"];
const reaching = { ...clean, source: 'import { useData, flatRows } from "widgetarium";\n' + clean.source };
check("an import the surface does not carry is a finding", rulesIn(checkWidget({ ...reaching, surface })), ["reaches"]);
check(
	"the finding names what cannot be reached",
	checkWidget({ ...reaching, surface })[0]?.message.startsWith("flatRows imported"),
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
		"import { flatRows } from \"widgetarium\";\nconst l = useData(rows.list);\nl.data.map((r) => r);\nconst c = '#abc';\nreturn <h1>Title<button>Go</button></h1>;",
	styles: '@import "tailwindcss/base";\n@import "tailwindcss";\n.bad { font-family: Inter; }',
	card: {},
	surface,
};
check(
	"every rule that judges no role can fire at once",
	rulesIn(checkWidget(allBroken)),
	WIDGET_CHECK_RULES.filter((rule) => !["blocks", "titled", "page"].includes(rule)).sort(),
);
check(
	"each finding carries the widget it came from",
	[...new Set(checkWidget(allBroken).map((one) => one.widget))],
	["@x/bad"],
);
check(
	"the report names the rule and the widget",
	saidWidgetCheck(checkWidget(allBroken)).split("\n")[0]?.startsWith("@x/bad colour:"),
	true,
);

console.log(`\n${checks - failed}/${checks} checks passed`);
process.exit(failed === 0 ? 0 : 1);
