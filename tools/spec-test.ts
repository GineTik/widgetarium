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
const { specAppIn, lastSpecAppIn, buildRunIn, installsIn } = await import("../apps/obsidian/src/ai/spec-calls.js");
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
  - title: Today's review
    says: Due words one card at a time
    mark: new
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
	"  - title: Catch a word in one line\n    says: Type the word and its meaning\n",
	"",
).replace(
	"    mark: new\n",
	"    mark: new\n  - title: Catch a word in one line\n    says: Type the word and its meaning\n",
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
	"two features with one title are refused",
	readSpec(SPEC.replace("title: Today's review", "title: Catch a word in one line")).refusal?.startsWith("features"),
	true,
);
check(
	"more than seven features are refused",
	readSpec(
		SPEC.replace(
			"features:\n",
			`features:\n${[...Array(7).keys()].map((at) => `  - title: Extra ${at}\n    says: More\n`).join("")}`,
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
check("every feature is a row with a check", host.querySelectorAll(".wg-kit-check").length, 2);
check("a feature the agent marked new says so", host.querySelector(".wg-kit-row .wg-kit-pill")?.textContent, "new");
check("a choice and the details follow the features", names().slice(2), ["Review", "Details"]);
check("the two answers stand side by side", buttons(), ["Build it", "Change"]);

host.querySelector<HTMLElement>(".wg-kit-check")?.click();
await settle();
check(
	"unticking a feature writes the note through the one writer",
	readSpec(written.at(-1) ?? "").spec?.features[0]?.kept,
	false,
);
check("the row shows it is left out", host.querySelector(".wg-kit-row")?.classList.contains("is-off"), true);
check("and Build says how many features it will build", buttons()[0], "Build 1 features");

host.querySelectorAll<HTMLElement>(".wg-kit-row .wg-ai-spec-name")[1]?.click();
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
host.querySelectorAll<HTMLElement>(".wg-kit-row .wg-ai-spec-name")[1]?.click();
await settle();
host.querySelectorAll<HTMLButtonElement>(".wg-ai-spec-buttons button")[0]?.click();
host.querySelectorAll<HTMLButtonElement>(".wg-ai-spec-buttons button")[1]?.click();
check("Build and Change answer the agent", asked, ["build", "change"]);

host.querySelector<HTMLButtonElement>(".wg-kit-row.is-details")?.click();
await settle();
check(
	"Details opens the pages, what is left out and the checks",
	host.querySelectorAll(".wg-ai-spec-details .wg-kit-list").length,
	3,
);

drawCard(false);
await settle();
check("a card from an earlier turn offers no answers", host.querySelectorAll(".wg-ai-spec-buttons").length, 0);

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
host.querySelector<HTMLElement>(".wg-kit-check")?.click();
await settle();
check(
	"a tick shows at once, before a slow vault has written it",
	host.querySelector(".wg-kit-row")?.classList.contains("is-off"),
	true,
);
check("while the write is still on its way", slowWrites.length, 1);
slowWrites.shift()?.();
await settle();
check("and the write lands what the card already showed", readSpec(text).spec?.features[0]?.kept, false);
const keptBefore = text;
host.querySelector<HTMLElement>(".wg-kit-check")?.click();
await settle();
text = "refuse";
slowWrites.shift()?.();
text = keptBefore;
await settle(60);
check(
	"a write the vault refused takes the tick back",
	host.querySelector(".wg-kit-row")?.classList.contains("is-off"),
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
	3,
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
	["Data", "Design", "From the catalogue", "@default/list", "New widgets", "Flashcard", "Pages"],
);
check(
	"the stage names say where the widgets come from",
	[...host.querySelectorAll(".wg-kit-row:not(.is-inner) .wg-ai-spec-name")].map((node) => node.textContent),
	["Data", "Design", "From the catalogue", "New widgets", "Pages"],
);
check(
	"the stage in progress draws a turning one",
	host.querySelectorAll(".wg-kit-row:not(.is-inner) .wg-ai-stage-ring.is-active").length,
	1,
);
render(h(PinnedRun, { run: liveRun, builds: liveBuilds }), host);
await settle();
check(
	"the pinned bar says where the build is, and what it is doing right now",
	[...host.querySelectorAll(".wg-ai-spec-text > span")].map((node) => node.textContent),
	["Vocabulary · 4 of 5", "New widgets · Flashcard · Writing the widget"],
);
render(null, host);

const prompt = briefFor({ paths: { vault: "/v", plugin: "/p", widgets: "/w", handbook: "/h", tool: "/t" } });
check("the spec page is laid on disk", Object.keys(HANDBOOK).includes("spec.md"), true);
check("and left out of the prompt, which only points at it", prompt.includes("=== HANDBOOK PAGE: spec.md ==="), false);

check("the open note is named by its name alone", noteNameOf("Widgetarium agents/Shell demo/Flow.md"), "Flow");

console.log(`\nspec gate: ${failed === 0 ? "clean" : `${failed} of ${checks} failed`}, ${checks} checks`);
process.exit(failed === 0 ? 0 : 1);
