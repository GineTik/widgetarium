import { JSDOM } from "jsdom";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dom = new JSDOM(`<!doctype html><body><div id="host" class="wg-root"></div></body>`, { pretendToBeVisual: true });
Object.assign(globalThis, {
	window: dom.window,
	document: dom.window.document,
	Node: dom.window.Node,
	Element: dom.window.Element,
	HTMLElement: dom.window.HTMLElement,
	SVGElement: dom.window.SVGElement,
	getComputedStyle: dom.window.getComputedStyle,
	requestAnimationFrame: dom.window.requestAnimationFrame,
	cancelAnimationFrame: dom.window.cancelAnimationFrame,
	MouseEvent: dom.window.MouseEvent,
	Event: dom.window.Event,
	MutationObserver: dom.window.MutationObserver,
	ResizeObserver: class {
		observe(): void {}
		disconnect(): void {}
	},
});

const { createElement: h } = await import("react");
const { render } = await import("../packages/core/src/engine/render.js");
const { readSpec, withFeatureToggled, withChoicePicked, specPathOf, BUILD_STAGES } =
	await import("../packages/core/src/app-spec.js");
const { specAppIn, lastSpecAppIn, buildRunIn, buildStartedIn, installsIn } =
	await import("../apps/obsidian/src/ai/spec-calls.js");
const { buildsIn } = await import("../apps/obsidian/src/ai/builds.js");
const { PinnedRun } = await import("../apps/obsidian/src/ai/pinned-run.js");
const { argumentsIn } = await import("../apps/obsidian/src/ai/tools.js");
const { specOfApp, stageOfApp } = await import("../apps/obsidian/src/ai/spec-command.js");
const { SpecCard } = await import("../apps/obsidian/src/ai/spec-card.js");
const { BuildRunCard } = await import("../apps/obsidian/src/ai/build-run-card.js");
const { briefFor } = await import("../apps/obsidian/src/ai/brief.js");
const { noteNameOf } = await import("../apps/obsidian/src/ai/target-note.js");
const { HANDBOOK } = await import("../apps/obsidian/src/ai/agent-files.js");
import type { KeptCall } from "../apps/obsidian/src/ai/transcript.js";
import type { SpecPort } from "../apps/obsidian/src/ai/spec-port.js";

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
const settle = (ms = 30): Promise<void> => new Promise((done) => setTimeout(done, ms));
const throwsOf = (run: () => unknown): string | null => {
	try {
		run();
		return null;
	} catch (thrown) {
		return thrown instanceof Error ? thrown.message : String(thrown);
	}
};

const ACTIONS = "\nThe actions, for the agent: | Word | yes / no |\n";
const SPEC = `---
app: Vocabulary
job: Keep the words you meet.
features:
  - title: Catch a word in one line
    says: Type the word and its meaning
    actions: [create]
  - title: Today's review
    says: Due words one card at a time
    actions: [update]
    mark: new
research:
  - product: Anki
    takes: Cards come back on a schedule
    url: https://apps.ankiweb.net
records:
  - name: Word
    can: [create, update]
choices:
  - name: Review
    picked: Spaced
    options: [Spaced, Every day]
pages:
  - name: Words
    body: list-detail
    says: The list and the open word
excluded: [Decks]
checks:
  - A word typed and Enter is in the list
---
${ACTIONS}`;

const read = readSpec(SPEC);
check("a spec that fits is read", read.refusal, undefined);
check(
	"every feature is kept until the person says otherwise",
	read.spec?.features.map((one) => one.kept),
	[true, true],
);
check("a spec without front matter is refused", readSpec("Vocabulary").refusal?.includes("front matter"), true);
check(
	"a page on a body that does not exist is refused, naming the field",
	readSpec(SPEC.replace("body: list-detail", "body: sidebar")).refusal?.startsWith("pages.0.body"),
	true,
);
check(
	"a picked choice outside its options is refused",
	readSpec(SPEC.replace("picked: Spaced", "picked: Never")).refusal?.startsWith("choices.0.picked"),
	true,
);
check(
	"a spec with no checks is refused",
	readSpec(SPEC.replace(/checks:\n.*\n/, "checks: []\n")).refusal?.startsWith("checks"),
	true,
);
check(
	"a spec naming no records is refused with what to write, not a type error",
	readSpec(SPEC.replace(/records:\n.*\n.*\n/, "")).refusal?.includes("{ name, can: [create, update, remove] }"),
	true,
);

const unkept = withFeatureToggled(SPEC, "Today's review");
check("leaving a feature out writes kept: false", readSpec(unkept).spec?.features[1]?.kept, false);
check("and keeps the actions below the front matter", unkept.endsWith(ACTIONS), true);
check("and leaves every other feature as it was", readSpec(unkept).spec?.features[0]?.kept, true);
check(
	"a feature that is not there cannot be left out",
	throwsOf(() => withFeatureToggled(SPEC, "Decks"))?.includes('no feature "Decks"'),
	true,
);
check(
	"picking an option writes it",
	readSpec(withChoicePicked(SPEC, "Review", "Every day")).spec?.choices[0]?.picked,
	"Every day",
);
check(
	"picking what is not an option is refused, never written",
	throwsOf(() => withChoicePicked(SPEC, "Review", "Never"))?.includes("not one of the options"),
	true,
);
const REORDERED = SPEC.replace(
	"  - title: Catch a word in one line\n    says: Type the word and its meaning\n    actions: [create]\n",
	"",
).replace(
	"    mark: new\n",
	"    mark: new\n  - title: Catch a word in one line\n    says: Type the word and its meaning\n    actions: [create]\n",
);
check(
	"a feature is found by its title, so a list the agent reordered toggles the right one",
	readSpec(withFeatureToggled(REORDERED, "Catch a word in one line")).spec?.features.map((one) => [
		one.title,
		one.kept,
	]),
	[
		["Today's review", true],
		["Catch a word in one line", false],
	],
);
check(
	"toggling twice brings a feature back",
	readSpec(withFeatureToggled(unkept, "Today's review")).spec?.features[1]?.kept,
	true,
);
check("a spec opening with a byte order mark is still read", readSpec(`\uFEFF${SPEC}`).refusal, undefined);
const CRLF = SPEC.replace(/\n/g, "\r\n");
check("a spec written with CRLF is read", readSpec(CRLF).refusal, undefined);
check("and written back with CRLF alone", /[^\r]\n/.test(withFeatureToggled(CRLF, "Today's review")), false);
check(
	"front matter that is not YAML says where",
	readSpec("---\napp: [unclosed\n---\n").refusal?.startsWith("the front matter is not YAML"),
	true,
);
check(
	"a feature the agent suggested on its own is marked so, and twelve are allowed",
	readSpec(
		SPEC.replace(
			"features:\n",
			`features:\n${[...Array(10).keys()].map((at) => `  - title: Extra ${at}\n    says: More\n    actions: []\n    mark: suggested\n`).join("")}`,
		),
	).spec?.features.filter((feature) => feature.mark === "suggested").length,
	10,
);
check(
	"two features with one title are refused",
	readSpec(SPEC.replace("title: Today's review", "title: Catch a word in one line")).refusal?.startsWith("features"),
	true,
);
check(
	"more than twelve features are refused",
	readSpec(
		SPEC.replace(
			"features:\n",
			`features:\n${[...Array(11).keys()].map((at) => `  - title: Extra ${at}\n    says: More\n    actions: []\n`).join("")}`,
		),
	).refusal?.startsWith("features"),
	true,
);
check(
	"a spec lives in the plugin's own folder, never among the person's notes",
	specPathOf("Vocabulary"),
	".widgetarium/apps/Vocabulary/spec.md",
);

const BIN = "node /v/.widgetarium/bin/widgets.mjs";
const callOf = (ref: string, command: string, answer: Partial<KeptCall> = {}): KeptCall => ({
	ref,
	name: "Bash",
	input: { command },
	answered: true,
	output: "",
	failed: false,
	at: 1000,
	answeredAt: 2000,
	...answer,
});

check("an escaped space stays inside one argument", argumentsIn("Word\\ list data"), ["Word list", "data"]);
check("a quoted app name stays one argument", argumentsIn(`"Word list" data --said "54 notes, seeded"`), [
	"Word list",
	"data",
	"--said",
	"54 notes, seeded",
]);
check("spec names the app its card shows", specAppIn(callOf("a", `${BIN} spec "Word list"`)), "Word list");
check(
	"a spec the tool refused draws no card",
	specAppIn(callOf("a", `${BIN} spec Vocabulary`, { failed: true })),
	null,
);
check(
	"a spec still running draws no card yet",
	specAppIn(callOf("a", `${BIN} spec Vocabulary`, { answered: false })),
	null,
);
check(
	"the last spec of a turn is the one drawn",
	lastSpecAppIn([callOf("a", `${BIN} spec One`), callOf("b", `${BIN} lint X.md`), callOf("c", `${BIN} spec Two`)]),
	"Two",
);

const data = callOf("d", `${BIN} stage Vocabulary data --said "Words and reviews, 54 notes"`);
const design = callOf("e", `${BIN} stage Vocabulary design --said "Words beside the open word"`);
const statusesOf = (calls: KeptCall[], isRunning: boolean): string[] =>
	buildRunIn(calls, isRunning)?.rows.map((row) => row.status) ?? [];
check("a turn with no stage call has no build card", buildRunIn([callOf("a", `${BIN} spec Vocabulary`)], true), null);
const builtTurns = [
	{ role: "user" as const, text: "a vocabulary app", calls: [] },
	{ role: "agent" as const, text: "", calls: [callOf("a", `${BIN} spec Vocabulary`)] },
	{ role: "user" as const, text: "Build it", calls: [] },
	{ role: "agent" as const, text: "", calls: [] },
];
check(
	"the turn answering Build it shows the card before any stage is said, the first stage working",
	buildRunIn([], true, buildStartedIn(builtTurns, 3, "Build it"))?.rows.map((row) => row.status),
	["active", "pending", "pending", "pending", "pending"],
);
check("and only that turn: one answering anything else has none", buildStartedIn(builtTurns, 1, "Build it"), null);
const { buildSpanOf } = await import("../apps/obsidian/src/ai/spec-calls.js");
const approvedTurns = [
	...builtTurns,
	{ role: "user" as const, text: "Approve design", calls: [] },
	{ role: "agent" as const, text: "", calls: [] },
];
check(
	"a build that goes on after Approve design is one span, owned by the turn that answered Build it",
	[
		buildSpanOf(approvedTurns, 5, "Build it"),
		buildSpanOf(approvedTurns, 3, "Build it"),
		buildSpanOf(approvedTurns, 1, "Build it"),
	],
	[{ startAt: 3, endAt: 5 }, { startAt: 3, endAt: 5 }, null],
);
check(
	"the build card has a row per stage",
	buildRunIn([data], true)?.rows.map((row) => row.stage),
	[...BUILD_STAGES],
);
check("a stage said is done and carries its line", buildRunIn([data], true)?.rows[0], {
	stage: "data",
	said: "Words and reviews, 54 notes",
	status: "done",
});
check("the next stage is the active one while the agent runs", statusesOf([data, design], true), [
	"done",
	"done",
	"active",
	"pending",
	"pending",
]);
check("nothing is active once the turn ended", statusesOf([data], false), [
	"done",
	"pending",
	"pending",
	"pending",
	"pending",
]);
check(
	"a stage the tool refused fills no row",
	statusesOf([callOf("f", `${BIN} stage Vocabulary data --said x`, { failed: true })], true),
	[],
);

const vault = await mkdtemp(join(tmpdir(), "wg-spec-"));
await mkdir(join(vault, ".widgetarium", "apps", "Vocabulary"), { recursive: true });
await writeFile(join(vault, specPathOf("Vocabulary")), SPEC);
check(
	"a spec named in another case is refused with the folder's real name",
	(await specOfApp(vault, "vocabulary")).refusal?.includes('named "Vocabulary"'),
	true,
);
check("the tool reads a spec that fits", (await specOfApp(vault, "Vocabulary")).refusal, undefined);
check(
	"and names a missing one by its path",
	(await specOfApp(vault, "Garden")).refusal?.includes(".widgetarium/apps/Garden/spec.md"),
	true,
);
check(
	"a stage with no spec behind it is refused",
	(await stageOfApp(vault, "Garden", "data", "x")).refusal !== undefined,
	true,
);
check(
	"a stage that is not one of the five is refused",
	(await stageOfApp(vault, "Vocabulary", "deploy", "x")).refusal?.includes("data, design, catalogue, widgets, pages"),
	true,
);
check(
	"a stage with nothing said is refused",
	(await stageOfApp(vault, "Vocabulary", "data", undefined)).refusal?.includes("--said"),
	true,
);
check(
	"a stage said in full is taken",
	(await stageOfApp(vault, "Vocabulary", "data", "54 notes")).refusal ?? "data",
	"data",
);

const written: string[] = [];
let text = SPEC;
const watchers = new Set<() => void>();
const port: SpecPort = {
	read: async (path) => (path === specPathOf("Vocabulary") ? text : null),
	watch: (_path, onChange) => {
		watchers.add(onChange);
		return () => watchers.delete(onChange);
	},
	change: async (_path, edit) => {
		text = edit(text);
		written.push(text);
		watchers.forEach((onChange) => onChange());
	},
};
const host = document.getElementById("host");
if (!host) throw new Error("no host");
const asked: string[] = [];
const drawCard = (isAnswerable: boolean): void =>
	render(
		h(SpecCard, {
			app: "Vocabulary",
			port,
			isAnswerable,
			onBuild: () => asked.push("build"),
			onChange: () => asked.push("change"),
		}),
		host,
	);
drawCard(true);
await settle();
const names = (): string[] => [...host.querySelectorAll(".wg-ai-spec-name")].map((node) => node.textContent ?? "");
const buttons = (): string[] =>
	[...host.querySelectorAll(".wg-ai-spec-buttons button")].map((node) => node.textContent ?? "");
check(
	"the card shows the app and its job",
	host.querySelector(".wg-ai-spec-title")?.textContent,
	"VocabularyKeep the words you meet.",
);
check("every feature is a row with a check", host.querySelectorAll("button.wg-kit-row .wg-kit-check").length, 2);
check("a feature the agent marked new says so", host.querySelector(".wg-kit-row .wg-kit-pill")?.textContent, "new");
check(
	"every kind of record follows the features, saying what it cannot do",
	[names()[3], host.querySelector(".wg-ai-spec-record .wg-ai-spec-sub")?.textContent],
	["Word", "Cannot delete"],
);
check("then a choice and the details", names().slice(4), ["Review", "Details"]);
check(
	"the products looked at stand first, each with what it gave and a link to the page read",
	[
		names()[0],
		host.querySelector(".wg-ai-spec-link")?.getAttribute("href"),
		host.querySelector(".wg-ai-spec-link")?.getAttribute("target"),
	],
	["Anki", "https://apps.ankiweb.net", "_blank"],
);
check(
	"every section of the card folds under its heading: references, features, records and choices",
	[...host.querySelectorAll(".wg-ai-spec-label.is-fold")].map((label) => label.textContent),
	["References", "Features", "What you can do with them", "I chose for you"],
);
check(
	"a reference with no url is refused, because the person must be able to open it",
	readSpec(SPEC.replace("    url: https://apps.ankiweb.net\n", "")).refusal?.startsWith("research.0.url"),
	true,
);
host.querySelector<HTMLElement>(".wg-ai-spec-reference .wg-kit-check")?.click();
await settle();
check(
	"unticking a reference writes it through the one writer, and the row says it is not followed",
	[
		readSpec(written.at(-1) ?? "").spec?.research[0]?.kept,
		host.querySelector(".wg-ai-spec-reference")?.classList.contains("is-off"),
	],
	[false, true],
);
host.querySelector<HTMLElement>(".wg-ai-spec-reference .wg-kit-check")?.click();
await settle();
host.querySelector<HTMLElement>(".wg-ai-spec-label.is-fold")?.click();
await settle();
check(
	"the products fold away under their heading, and come back",
	host.querySelector(".wg-ai-spec-group .wg-ai-fold")?.classList.contains("is-shut"),
	true,
);
host.querySelector<HTMLElement>(".wg-ai-spec-label.is-fold")?.click();
await settle();
const verbButtons = (): HTMLElement[] => [...host.querySelectorAll<HTMLElement>(".wg-ai-spec-verbs button")];
check(
	"each verb is a button the person presses, pressed when the spec says yes",
	verbButtons().map((button) => `${button.textContent}:${button.getAttribute("aria-pressed")}`),
	["Add:true", "Edit:true", "Delete:false"],
);
verbButtons()[2]?.click();
await settle();
check(
	"pressing Delete writes it into the record's can, in the one order",
	readSpec(written.at(-1) ?? "").spec?.records[0]?.can,
	["create", "update", "remove"],
);
verbButtons()[2]?.click();
await settle();
check("the two answers stand side by side", buttons(), ["Build it", "Change"]);

host.querySelector<HTMLElement>("button.wg-kit-row .wg-kit-check")?.click();
await settle();
check(
	"unticking a feature writes the note through the one writer",
	readSpec(written.at(-1) ?? "").spec?.features[0]?.kept,
	false,
);
check("the row shows it is left out", host.querySelector("button.wg-kit-row")?.classList.contains("is-off"), true);
check("and Build says how many features it will build", buttons()[0], "Build 1 features");

host.querySelectorAll<HTMLElement>("button.wg-kit-row .wg-ai-spec-name")[1]?.click();
await settle();
check(
	"pressing anywhere on a feature row toggles it, not only the box",
	readSpec(written.at(-1) ?? "").spec?.features[1]?.kept,
	false,
);
check(
	"the whole row is one button the keyboard reaches",
	host.querySelectorAll("button.wg-kit-row[aria-pressed]").length,
	2,
);
host.querySelectorAll<HTMLElement>("button.wg-kit-row .wg-ai-spec-name")[1]?.click();
await settle();
host.querySelectorAll<HTMLButtonElement>(".wg-ai-spec-buttons button")[0]?.click();
host.querySelectorAll<HTMLButtonElement>(".wg-ai-spec-buttons button")[1]?.click();
check("Build and Change answer the agent", asked, ["build", "change"]);

host.querySelector<HTMLButtonElement>(".wg-kit-row.is-details")?.click();
await settle();
check(
	"Details opens the pages, what is left out and the checks",
	[...host.querySelectorAll(".wg-ai-spec-details .wg-ai-spec-label")].map((label) => label.textContent),
	["Pages", "Not included", "Done when"],
);

drawCard(false);
await settle();
check("a card from an earlier turn offers no answers", host.querySelectorAll(".wg-ai-spec-buttons").length, 0);
check(
	"and its features can no longer be ticked, drawn as they were",
	[...host.querySelectorAll<HTMLButtonElement>("button.wg-kit-row[aria-pressed]")].map((row) => row.disabled),
	[true, true],
);
const writtenBeforeLockedPress = written.length;
host.querySelector<HTMLElement>("button.wg-kit-row[aria-pressed]")?.click();
await settle();
check("so pressing one writes nothing", written.length, writtenBeforeLockedPress);

text = "no front matter";
watchers.forEach((onChange) => onChange());
await settle();
check(
	"a spec that stopped fitting says why instead of drawing",
	host.querySelector(".wg-ai-spec-refused")?.textContent?.includes("front matter"),
	true,
);

text = SPEC;
const slowWrites: (() => void)[] = [];
const slowPort: SpecPort = {
	read: async () => text,
	watch: () => () => {},
	change: (_path, edit) =>
		new Promise((done, refuse) => {
			slowWrites.push(() => {
				if (text === "refuse") return refuse(new Error("the disk said no"));
				text = edit(text);
				done();
			});
		}),
};
const drawSlow = (): void =>
	render(
		h(SpecCard, { app: "Vocabulary", port: slowPort, isAnswerable: true, onBuild: () => {}, onChange: () => {} }),
		host,
	);
drawSlow();
await settle();
host.querySelector<HTMLElement>("button.wg-kit-row .wg-kit-check")?.click();
await settle();
check(
	"a tick shows at once, before a slow vault has written it",
	host.querySelector("button.wg-kit-row")?.classList.contains("is-off"),
	true,
);
check("while the write is still on its way", slowWrites.length, 1);
slowWrites.shift()?.();
await settle();
check("and the write lands what the card already showed", readSpec(text).spec?.features[0]?.kept, false);
const keptBefore = text;
host.querySelector<HTMLElement>("button.wg-kit-row .wg-kit-check")?.click();
await settle();
text = "refuse";
slowWrites.shift()?.();
text = keptBefore;
await settle(60);
check(
	"a write the vault refused takes the tick back",
	host.querySelector("button.wg-kit-row")?.classList.contains("is-off"),
	true,
);
check("and says why", host.querySelector(".wg-ai-spec-refused")?.textContent, "the disk said no");

text = SPEC;
const installed = callOf("i", `${BIN} install @default/list`);
const writing = callOf("w", `${BIN} start @you/flashcard --title Flashcard`);
const runCalls = [
	data,
	design,
	installed,
	callOf("c", `${BIN} stage Vocabulary catalogue --said "List installed"`),
	writing,
];
const liveRun = buildRunIn(runCalls, true) ?? { key: "", app: "", rows: [] };
const liveBuilds = buildsIn(runCalls, true);
render(h(BuildRunCard, { run: liveRun, port, builds: liveBuilds, installs: installsIn(runCalls) }), host);
await settle();
check("the build card names the app", host.querySelector(".wg-ai-spec-title h3")?.textContent, "Building Vocabulary");
check(
	"and counts the features still kept",
	host.querySelector(".wg-ai-spec-title span")?.textContent,
	"2 features · 1 pages",
);
check(
	"a done stage draws the kit's done circle",
	host.querySelectorAll(".wg-kit-row:not(.is-inner) .wg-ai-stage-ring.is-done").length,
	4,
);
check(
	"a widget installed from the catalogue stands under its stage",
	[...host.querySelectorAll(".wg-kit-row.is-inner .wg-ai-spec-name")].map((node) => node.textContent),
	["@default/list", "Flashcard"],
);
check(
	"and the widget being written stands under New widgets, with the step it is on",
	host.querySelectorAll(".wg-kit-row.is-inner .wg-ai-spec-sub")[1]?.textContent,
	"Writing the widget",
);
check(
	"each widget stands right under the stage it belongs to",
	[...host.querySelectorAll(".wg-kit-row .wg-ai-spec-name")].map((node) => node.textContent),
	["Research", "Data", "Design", "From the catalogue", "@default/list", "New widgets", "Flashcard", "Pages"],
);
check(
	"the stage names say where the widgets come from",
	[...host.querySelectorAll(".wg-kit-row:not(.is-inner) .wg-ai-spec-name")].map((node) => node.textContent),
	["Research", "Data", "Design", "From the catalogue", "New widgets", "Pages"],
);
check(
	"the stage in progress draws a turning one",
	host.querySelectorAll(".wg-kit-row:not(.is-inner) .wg-ai-stage-ring.is-active").length,
	1,
);
const stageButton = (name: string): HTMLElement | undefined =>
	[...host.querySelectorAll<HTMLElement>("button.wg-kit-row")].find(
		(node) => node.querySelector(".wg-ai-spec-name")?.textContent === name,
	);
check(
	"a stage with widgets under it is a button that folds them, open at first",
	[stageButton("New widgets")?.getAttribute("aria-expanded"), stageButton("Data") === undefined],
	["true", true],
);
stageButton("New widgets")?.click();
await settle();
check(
	"pressing it shuts that stage's list and only that one",
	[...host.querySelectorAll(".wg-ai-stage-fold > .wg-ai-fold")].map((fold) => fold.classList.contains("is-shut")),
	[false, true],
);
const { buildStatusOf } = await import("../apps/obsidian/src/ai/build-stages.js");
const finishedElsewhere = {
	key: "b",
	widget: "@you/x",
	name: "X",
	title: "X",
	isLive: false,
	startedAt: 0,
	endedAt: 1,
};
const unseenSteps = [{ label: "Writing the widget", status: "pending" as const, hint: "" }];
check(
	"a widget a helper built, its steps never seen in this chat, counts as built once its stage is said",
	buildStatusOf({ ...finishedElsewhere, steps: unseenSteps }, { isRunning: false, isStageDone: true }),
	"done",
);
check(
	"while the run goes on it is being built",
	buildStatusOf({ ...finishedElsewhere, steps: unseenSteps }, { isRunning: true, isStageDone: false }),
	"active",
);
check(
	"and a run that ended before its stage was said leaves it cancelled, never spinning",
	buildStatusOf({ ...finishedElsewhere, steps: unseenSteps }, { isRunning: false, isStageDone: false }),
	"cancelled",
);
check(
	"a widget whose step failed still counts as failed",
	buildStatusOf(
		{ ...finishedElsewhere, steps: [{ label: "Checking", status: "failed", hint: "" }] },
		{ isRunning: false, isStageDone: true },
	),
	"failed",
);
const { latestPerWidget } = await import("../apps/obsidian/src/ai/build-stages.js");
check(
	"a widget started three times stands once, as its latest start",
	latestPerWidget([
		{ ...finishedElsewhere, key: "a", startedAt: 1, steps: unseenSteps },
		{ ...finishedElsewhere, key: "b", widget: "@you/y", startedAt: 2, steps: unseenSteps },
		{ ...finishedElsewhere, key: "c", startedAt: 3, steps: unseenSteps },
	]).map((build) => build.key),
	["b", "c"],
);
const scrolledTo: string[] = [];
Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
	configurable: true,
	value(this: HTMLElement) {
		scrolledTo.push(this.dataset["buildKey"] ?? "");
	},
});
render(
	h("div", {}, [
		h(BuildRunCard, { key: "card", run: liveRun, port, builds: liveBuilds, installs: [] }),
		h(PinnedRun, { key: "pinned", run: liveRun, builds: liveBuilds }),
	]),
	host,
);
await settle();
host.querySelector<HTMLElement>(".wg-ai-pinned-run")?.click();
check("pressing the pinned bar takes the person to its build card", scrolledTo, [liveRun.key]);
render(h(PinnedRun, { run: liveRun, builds: liveBuilds }), host);
await settle();
check(
	"the pinned bar says where the build is, and what it is doing right now",
	[...host.querySelectorAll(".wg-ai-spec-text > span")].map((node) => node.textContent),
	["Vocabulary · 4 of 5", "New widgets · Flashcard · Writing the widget"],
);
render(null, host);

const { readDesign, designPathOf } = await import("../packages/core/src/app-design.ts");
const { lastDesignAppIn } = await import("../apps/obsidian/src/ai/spec-calls.js");
const { DesignCard } = await import("../apps/obsidian/src/ai/design-card.js");
const DESIGN = JSON.stringify({
	app: "Vocabulary",
	screens: [
		{ name: "Words", file: "Words.md" },
		{ name: "Review", file: "Review.md" },
	],
});
check(
	"a design names its screens in order",
	readDesign(DESIGN).design?.screens.map((screen) => screen.name),
	["Words", "Review"],
);
check(
	"a screen that is not a note is refused, naming the field",
	readDesign(DESIGN.replace("Words.md", "Words.html")).refusal?.startsWith("screens.0.file"),
	true,
);
check(
	"a screen file that climbs out of the design folder is refused",
	[
		readDesign(DESIGN.replace("Words.md", "../../Secret.md")).refusal !== undefined,
		readDesign(DESIGN.replace("Words.md", "a/Words.md")).refusal !== undefined,
	],
	[true, true],
);
const { statesOf } = await import("../packages/core/src/app-design.ts");
const STATED = JSON.stringify({
	screens: [
		{
			name: "Inbox",
			states: [
				{ name: "Full", file: "Inbox.md" },
				{ name: "Empty", file: "Inbox empty.md" },
			],
		},
	],
});
check(
	"a screen may show several states, each a note of its own the person switches between",
	statesOf(readDesign(STATED).design?.screens[0] ?? { name: "", file: "x.md" }).map((state) => state.name),
	["Full", "Empty"],
);
check(
	"a screen naming both one file and states is refused",
	readDesign(STATED.replace('"states"', '"file":"Inbox.md","states"')).refusal !== undefined,
	true,
);
const { designOfApp } = await import("../apps/obsidian/src/ai/design-command.js");
const designVault = await mkdtemp(join(tmpdir(), "wg-design-"));
const designFolder = join(designVault, ".widgetarium", "apps", "Inbox", "design");
await mkdir(designFolder, { recursive: true });
await writeFile(join(designFolder, "canvas.json"), JSON.stringify({ screens: [{ name: "Inbox", file: "Inbox.md" }] }));
const screenNote = (implementation: string): string =>
	`\`\`\`widgetarium\nv: 2\ntiles:\n  - id: w0\n    widget: "@default/list"\n    props:\n      items: { implementation: "${implementation}", fields: { path: Inbox } }\nlayout:\n  dir: row\n  of:\n    - dir: column\n      of: [{ id: w0 }]\n\`\`\`\n`;
await writeFile(join(designFolder, "Inbox.md"), screenNote("@obsidian/folder"));
check(
	"a design screen bound to a real vault folder is refused: a design shows sample rows only",
	(await designOfApp(designVault, "Inbox")).refusal?.includes("binds a prop to the vault (@obsidian/folder)"),
	true,
);
await writeFile(join(designFolder, "Inbox.md"), screenNote("@core/typed-rows"));
check("and one drawn on sample rows is shown", (await designOfApp(designVault, "Inbox")).refusal, undefined);
check(
	"a design with no screens is refused",
	readDesign('{"app":"Vocabulary","screens":[]}').refusal?.startsWith("screens"),
	true,
);
check(
	"the chat finds the design the agent showed last",
	lastDesignAppIn([callOf("a", `${BIN} design Vocabulary`), callOf("b", `${BIN} lint X.md`)]),
	"Vocabulary",
);
const designAsked: string[] = [];
const designPort: SpecPort = {
	read: async (path) => (path === designPathOf("Vocabulary") ? DESIGN : null),
	watch: () => () => undefined,
	change: async () => undefined,
};
const designCard = (isAnswerable: boolean) =>
	h(DesignCard, {
		app: "Vocabulary",
		port: designPort,
		isAnswerable,
		onOpen: () => designAsked.push("open"),
		onApprove: () => designAsked.push("approve"),
		onChange: () => designAsked.push("change"),
	});
render(designCard(true), host);
await settle();
check(
	"the design card is one press that opens the canvas, naming its screens",
	[
		host.querySelector(".wg-ai-design .wg-ai-spec-sub")?.textContent,
		host.querySelectorAll(".wg-ai-design-frame").length,
	],
	["2 screens · Words, Review", 2],
);
host.querySelector<HTMLElement>(".wg-ai-design")?.click();
host.querySelectorAll<HTMLElement>(".wg-ai-spec-buttons button").forEach((button) => button.click());
check("and its two answers approve or change it", designAsked, ["open", "approve", "change"]);
render(designCard(false), host);
await settle();
check(
	"a design from an earlier turn opens but offers no answers",
	host.querySelectorAll(".wg-ai-spec-buttons").length,
	0,
);
render(null, host);

const prompt = briefFor({ paths: { vault: "/v", plugin: "/p", widgets: "/w", handbook: "/h", tool: "/t" } });
check("the spec page is laid on disk", Object.keys(HANDBOOK).includes("spec.md"), true);
check("and left out of the prompt, which only points at it", prompt.includes("=== HANDBOOK PAGE: spec.md ==="), false);

check("the open note is named by its name alone", noteNameOf("Widgetarium agents/Shell demo/Flow.md"), "Flow");

const { reportOfApp, refuseStage, isReportClean } = await import("../apps/obsidian/src/ai/report-command.js");
const reportVault = await mkdtemp(join(tmpdir(), "wg-report-"));
const appFolder = join(reportVault, ".widgetarium", "apps", "Garden");
const widgetFolder = join(reportVault, ".widgetarium", "widgets", "@you", "word-list");
await mkdir(appFolder, { recursive: true });
await mkdir(widgetFolder, { recursive: true });
await mkdir(join(reportVault, "Pages"), { recursive: true });
const REPORT_SPEC = `---
app: Garden
job: Keep words.
features:
  - title: Plant a word
    says: Add a word
    actions: [create]
    widget: "@you/word-list"
    page: Words
  - title: Study a deck
    says: Flip cards
    actions: []
    widget: "@you/flashcard"
    page: Words
  - title: See today
    says: Due count
    actions: []
research:
  - product: Anki
    takes: Cards come back on a schedule
    url: https://apps.ankiweb.net
records:
  - name: Word
    can: [create]
pages:
  - name: Words
    body: list-detail
    says: The list
    note: Pages/Words.md
checks:
  - A word typed lands in the list
---
`;
await writeFile(join(appFolder, "spec.md"), REPORT_SPEC);
await writeFile(join(widgetFolder, "widget.tsx"), "export default function List() { return <Button>Add</Button>; }");
const WORDS_ALLOW = "[list, create]";
const SWITCHED_ON =
	'\n      createWord: { implementation: "@core/rows-create", fields: { target: w0/getWords }, allow: [run] }';
const tileYaml = (widget: string, at: number, allow: string, consent: string): string =>
	`  - id: w${at}\n    widget: "${widget}"\n    props:\n      getWords: { implementation: "@obsidian/folder", fields: { path: Words }, allow: ${allow} }${consent}`;
const boardNote = (widgets: string[], allow = WORDS_ALLOW, consent = SWITCHED_ON): string =>
	`\`\`\`widgetarium\nv: 2\ntiles:\n${widgets.map((widget, at) => tileYaml(widget, at, allow, consent)).join("\n")}\nlayout:\n  dir: row\n  of:\n    - dir: column\n      of: [${widgets.map((_, at) => `{ id: w${at} }`).join(", ")}]\n\`\`\`\n`;
await mkdir(join(widgetFolder, "build"), { recursive: true });
await writeFile(
	join(widgetFolder, "build", "card.json"),
	JSON.stringify({
		role: "collection",
		props: {
			getWords: { kind: "collection" },
			createWord: { source: { implementation: "@core/rows-create", fields: { target: "getWords" } } },
		},
	}),
);
await writeFile(join(reportVault, "Pages", "Words.md"), boardNote(["@you/word-list"]));
const entryOf = (id: string, folder: string) => ({
	id,
	role: "collection",
	installed: true,
	folder,
	files: ["widget.tsx"],
	pack: "@you",
	title: id,
	description: "",
	keywords: [],
	defaultSize: null,
	api: 2,
});
const reportPlace = { vault: reportVault, installed: [entryOf("@you/word-list", widgetFolder)], surface: [] };
const firstReport = await reportOfApp(reportPlace, "Garden");
const rowsOf = (told: typeof firstReport) => (told.refusal === undefined ? told.value : []);
const problemsOf = (title: string) => rowsOf(firstReport).find((row) => row.feature === title)?.problems ?? [];
check("a feature built, checked and placed is done", problemsOf("Plant a word"), []);
check("a feature whose widget does not exist is named", problemsOf("Study a deck"), [
	"@you/flashcard is not in this vault",
	"@you/flashcard is not on Pages/Words.md",
]);
check("a feature that names no widget and no page says both", problemsOf("See today").length, 2);
check("the report is not clean while any feature is left", isReportClean(rowsOf(firstReport)), false);
check(
	"so the pages stage is refused, with the list of what is left",
	refuseStage("pages", rowsOf(firstReport))?.includes("✗ Study a deck"),
	true,
);
check(
	"and so is the widgets stage, while a widget is missing",
	refuseStage("widgets", rowsOf(firstReport)) !== null,
	true,
);
check("an ungated stage is never refused", refuseStage("data", rowsOf(firstReport)), null);
await writeFile(join(widgetFolder, "widget.tsx"), "export default function List() { return <button>Add</button>; }");
check(
	"a widget that fails check fails its feature",
	rowsOf(await reportOfApp(reportPlace, "Garden")).find((row) => row.feature === "Plant a word")?.problems,
	["check: control"],
);
await writeFile(join(widgetFolder, "widget.tsx"), "export default function List() { return <Button>Add</Button>; }");
await writeFile(join(reportVault, "Pages", "Words.md"), boardNote(["@default/text-line"]));
check(
	"a widget left off its page fails its feature",
	rowsOf(await reportOfApp(reportPlace, "Garden")).find((row) => row.feature === "Plant a word")?.problems,
	["@you/word-list is not on Pages/Words.md"],
);
await writeFile(
	join(appFolder, "spec.md"),
	REPORT_SPEC.replace(/  - title: Study a deck[\s\S]*?page: Words\n/, "").replace(
		/  - title: See today\n    says: Due count\n    actions: \[\]\n/,
		"",
	),
);
await writeFile(join(reportVault, "Pages", "Words.md"), boardNote(["@you/word-list"]));
await writeFile(join(reportVault, "Pages", "Words.md"), boardNote(["@you/word-list"], WORDS_ALLOW, ""));
check(
	"a command that writes the vault and was never switched on is named, with the line that switches it on",
	rowsOf(await reportOfApp(reportPlace, "Garden")).find((row) => row.feature === "Plant a word")?.problems,
	[
		'@you/word-list\'s createWord writes the vault and is switched off on this page: give it its own binding — createWord: { implementation: "@core/rows-create", fields: { target: w0/getWords }, allow: [run] }',
	],
);
await writeFile(join(reportVault, "Pages", "Words.md"), boardNote(["@you/word-list"], "[list, get]"));
check(
	"a feature whose action the page does not allow is named, with the line to change",
	rowsOf(await reportOfApp(reportPlace, "Garden")).find((row) => row.feature === "Plant a word")?.problems,
	[
		"@you/word-list's createWord would create getWords, and getWords on this page allows list, get: add create to its allow",
	],
);
await writeFile(join(reportVault, "Pages", "Words.md"), boardNote(["@you/word-list"]));
const doneReport = rowsOf(await reportOfApp(reportPlace, "Garden"));
check("with every feature done the report is clean", [doneReport.length, isReportClean(doneReport)], [1, true]);
check("and the pages stage goes through", refuseStage("pages", doneReport), null);
const ADD_BUTTON_TILE =
	'  - id: w1\n    widget: "@default/add-button"\n    props:\n      create: { implementation: "@core/rows-create", fields: { target: w0/getWords }, allow: [run] }\n';
await writeFile(
	join(reportVault, "Pages", "Words.md"),
	boardNote(["@you/word-list"], WORDS_ALLOW, "").replace("layout:", `${ADD_BUTTON_TILE}layout:`),
);
const addButtonPlace = {
	...reportPlace,
	installed: [
		...reportPlace.installed,
		{ ...entryOf("@default/add-button", join(process.cwd(), "registry", "@default", "add-button")), role: "composer" },
	],
};
await writeFile(
	join(reportVault, "Pages", "Words.md"),
	boardNote(["@you/word-list"], WORDS_ALLOW, "").replace(
		"layout:",
		`  - id: s1\n    widget: "@default/text-line"\n    mounted:\n      plus:\n${ADD_BUTTON_TILE.replace(/^ {2}- /, "        ").replace(/\n {4}/g, "\n        ")}layout:`,
	),
);
check(
	"and so does one mounted inside another tile, a section's controls",
	rowsOf(await reportOfApp(addButtonPlace, "Garden")).find((row) => row.feature === "Plant a word")?.problems,
	[],
);
await writeFile(
	join(reportVault, "Pages", "Words.md"),
	boardNote(["@you/word-list"], WORDS_ALLOW, "").replace("layout:", `${ADD_BUTTON_TILE}layout:`),
);
check(
	"an add button elsewhere on the page that creates into the feature's rows does the feature's create",
	rowsOf(await reportOfApp(addButtonPlace, "Garden")).find((row) => row.feature === "Plant a word")?.problems,
	[],
);

const { helpersFor } = await import("../apps/obsidian/src/ai/brief.js");
const { PRESETS: PRESETS_ALL } = await import("../apps/obsidian/src/ai/providers.js");
const { expandArgs } = await import("../apps/obsidian/src/ai/command.js");
const { createAiSettings } = await import("../apps/obsidian/src/ai/settings.js");
const helperPaths = { vault: "/v", plugin: "/p", widgets: "/w", handbook: "/h", tool: "/t" };
const withHelpers = briefFor({ paths: helperPaths, helpers: true });
const alone = briefFor({ paths: helperPaths, helpers: false });
check("with helpers the agent is told it leads them", withHelpers.includes("## You lead helpers"), true);
check(
	"and carries no handbook bodies, which are its helpers' to read",
	withHelpers.includes("=== HANDBOOK PAGE: board.md ==="),
	false,
);
check(
	"without helpers it carries the handbook and builds alone",
	[alone.includes("=== HANDBOOK PAGE: board.md ==="), alone.includes("## You lead helpers")],
	[true, false],
);
const helpers = JSON.parse(helpersFor(helperPaths)) as Record<string, { description: string; prompt: string }>;
check("two helpers are handed to the agent", Object.keys(helpers), ["widget-developer", "page-designer"]);
check(
	"each helper's prompt names the real paths, not placeholders",
	Object.values(helpers).every((helper) => helper.prompt.includes("/h/") && !helper.prompt.includes("{tool}")),
	true,
);
check(
	"the page designer owns the words of a page, not only its widgets",
	helpers["page-designer"]?.prompt.includes("A page of bare widgets is not done"),
	true,
);
const claude = PRESETS_ALL.find((preset) => preset.id === "claude-code");
const argsWith = (given: string | null): string[] =>
	claude ? expandArgs(claude, { prompt: "p", brief: "b", vaultPath: "/v", pluginPath: "/p", helpers: given }) : [];
check("the helpers reach the CLI as --agents", argsWith('{"x":{}}').includes("--agents"), true);
check("and nothing is passed when they are off", argsWith(null).includes("--agents"), false);
const freshSettings = createAiSettings({ read: async () => ({}), write: async () => {} });
check("helper agents are on until the person turns them off", (await freshSettings.state()).helperAgents, true);

const { PRESETS } = await import("../apps/obsidian/src/ai/providers.js");
check(
	"the vault agent loads no setting of the person's own Claude, so their hooks, skills and memory stay out",
	PRESETS.find((preset) => preset.id === "claude-code")?.args.includes("--setting-sources project,local"),
	true,
);
const { writeBuiltCards } = await import("../apps/obsidian/src/built-cards.js");
const disk = new Map<string, string>([[".widgetarium/widgets/@shipped/list/manifest.generated.json", "{}"]]);
const cardAdapter = {
	exists: async (path: string) => disk.has(path) || [...disk.keys()].some((key) => key.startsWith(`${path}/`)),
	read: async (path: string) => disk.get(path) ?? "",
	write: async (path: string, text: string) => void disk.set(path, text),
	mkdir: async () => {},
};
const manifestOf = (id: string) => ({ id, props: { createDeck: { label: "Add a deck" } } });
const lookup = {
	list: () => [
		{ manifest: manifestOf("@agent/deck-list"), folder: ".widgetarium/widgets/@agent/deck-list" },
		{ manifest: manifestOf("@shipped/list"), folder: ".widgetarium/widgets/@shipped/list" },
		{ manifest: manifestOf("@catalogue/head"), folder: "plugin/widgets/@catalogue/head" },
	],
	get: () => null,
};
const firstPass = await writeBuiltCards(cardAdapter, lookup);
check("a widget written in the vault gets its card beside its build", firstPass, [
	".widgetarium/widgets/@agent/deck-list/build/card.json",
]);
check(
	"and the card carries the props the tool needs",
	Object.keys(JSON.parse(disk.get(firstPass[0] ?? "") ?? "{}").props ?? {}),
	["createDeck"],
);
check("an unchanged card is not written again", await writeBuiltCards(cardAdapter, lookup), []);

console.log(`\nspec gate: ${failed === 0 ? "clean" : `${failed} of ${checks} failed`}, ${checks} checks`);
process.exit(failed === 0 ? 0 : 1);
