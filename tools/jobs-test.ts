import { mkdtemp, mkdir, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

Object.assign(globalThis, { window: globalThis });

const { JobSchema, movedJob, isStartable, readJob, jobText, jobPathOf } =
	await import("../packages/core/src/app-jobs.js");
const { createJobs } = await import("../apps/obsidian/src/ai/job-runner.js");
const { createJobFiles } = await import("../apps/obsidian/src/ai/job-store.js");
const { createAiSettings } = await import("../apps/obsidian/src/ai/settings.js");
const { addJob, askJob, listJobs, refuseOwnedElsewhere } = await import("../apps/obsidian/src/ai/job-command.js");
const { jobBriefFor } = await import("../apps/obsidian/src/ai/brief.js");
const { buildsIn } = await import("../apps/obsidian/src/ai/builds.js");

import type { Job } from "../packages/core/src/app-jobs.js";
import type { JobAdapter } from "../apps/obsidian/src/ai/job-store.js";
import type { Emit } from "../apps/obsidian/src/ai/stream.js";
import type { RunAsk, RunAnswer } from "../apps/obsidian/src/ai/run.js";

let failed = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${what}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(wanted)}`}`,
	);
}

const settle = (ms = 80): Promise<void> => new Promise((done) => setTimeout(done, ms));

const base = JobSchema.parse({
	id: "home-design",
	app: "Studio",
	title: "Design Home",
	page: "Home",
	phase: "design",
	says: "Draw Home.",
});

check("a new job is queued with nothing spent", [base.status, base.spent, base.notes], ["queued", 0, []]);
const running = movedJob(base, { to: "running", at: 5 });
check("queued becomes running and remembers when", [running.job?.status, running.job?.startedAt], ["running", 5]);
check(
	"done cannot be reached from queued",
	movedJob(base, { to: "done", said: null, at: 1 }).refusal,
	"job home-design is queued and cannot become done",
);
const waiting = running.job
	? movedJob(running.job, { to: "waiting", question: { said: "Pick", options: ["A", "B"] }, said: "Drew three", at: 9 })
	: null;
check(
	"a running job may wait on the person, keeping its question",
	[waiting?.job?.status, waiting?.job?.question?.options],
	["waiting", ["A", "B"]],
);
const requeued = waiting?.job ? movedJob(waiting.job, { to: "queued", note: "The person answered: B" }) : null;
check(
	"an answer queues it again with the note",
	[requeued?.job?.status, requeued?.job?.notes, requeued?.job?.question],
	["queued", ["The person answered: B"], null],
);
const restarted = requeued?.job ? movedJob(requeued.job, { to: "running", at: 20 }) : null;
check(
	"starting again delivers the notes and keeps the first start",
	[restarted?.job?.notes, restarted?.job?.startedAt],
	[[], 5],
);
check("a job reads back from its own text", readJob(jobText(base)).job?.id, "home-design");
check("a job file that is not JSON is refused with why", readJob("{").refusal?.startsWith("the job is not JSON"), true);

const after = JobSchema.parse({ ...base, id: "people-design", page: "People", after: ["home-design"] });
check("a job waits for the jobs it comes after", isStartable(after, [base, after]), false);
check("and starts once they are done", isStartable(after, [{ ...base, status: "done" }, after]), true);
check(
	"a job never runs beside another of its phase, so two never edit the same widgets",
	isStartable(after, [{ ...base, status: "done" }, { ...base, id: "inbox-design", status: "running" }, after]),
	false,
);
check(
	"a review runs beside the next design",
	isStartable(after, [
		{ ...base, status: "done" },
		{ ...base, id: "home-review", phase: "review", status: "running" },
		after,
	]),
	true,
);

check(
	"a build title written as a shell variable falls back to the widget's name",
	buildsIn(
		[
			{
				ref: "1",
				name: "Bash",
				input: { command: 'node widgets.mjs start @studio/hook-list --title "$2"' },
				answered: true,
				output: "",
				failed: false,
				at: 1,
			},
		],
		false,
	)[0]?.title,
	"Building Hook list",
);

const brief = jobBriefFor(
	{ vault: "/v", plugin: "/p", widgets: "/w", handbook: "/h", tool: "/t/widgets.mjs" },
	base,
	true,
);
check(
	"the job brief names the job and carries its instructions last",
	[brief.includes("Your job id: home-design"), brief.trimEnd().endsWith("Draw Home.")],
	[true, true],
);
check(
	"and the job's own rules, with the tool path filled in",
	[brief.includes("## You are one job"), brief.includes("node /t/widgets.mjs job ask")],
	[true, true],
);

function memoryAdapter(): JobAdapter & { files: Map<string, string> } {
	const files = new Map<string, string>();
	const folders = new Set<string>();
	const under = (path: string, name: string): boolean =>
		name.startsWith(`${path}/`) && !name.slice(path.length + 1).includes("/");
	return {
		files,
		exists: async (path) => files.has(path) || folders.has(path),
		list: async (path) => ({
			files: [...files.keys()].filter((name) => under(path, name)),
			folders: [...folders].filter((name) => under(path, name)),
		}),
		read: async (path) => files.get(path) ?? Promise.reject(new Error(`no ${path}`)),
		write: async (path, data) => void files.set(path, data),
		append: async (path, data) => void files.set(path, (files.get(path) ?? "") + data),
		remove: async (path) => void files.delete(path),
		mkdir: async (path) => {
			const parts = path.split("/");
			for (let at = 1; at <= parts.length; at += 1) folders.add(parts.slice(0, at).join("/"));
		},
	};
}

interface Scripted {
	readonly ask: RunAsk;
	readonly emit: Emit;
	readonly finish: (failure: string | null) => void;
	stopped: boolean;
}

function scriptedRunner(): {
	runs: Scripted[];
	runner: { run: (provider: unknown, ask: RunAsk, emit: Emit) => { stop(): void; done: Promise<RunAnswer> } };
} {
	const runs: Scripted[] = [];
	return {
		runs,
		runner: {
			run(_provider, ask, emit) {
				let finish: (failure: string | null) => void = () => undefined;
				const done = new Promise<RunAnswer>((resolve) => {
					finish = (failure) => resolve({ failure });
				});
				const scripted: Scripted = { ask, emit, finish, stopped: false };
				runs.push(scripted);
				return {
					stop() {
						scripted.stopped = true;
					},
					done,
				};
			},
		},
	};
}

async function jobsWith(stored: Record<string, unknown>) {
	const adapter = memoryAdapter();
	let data: unknown = { ai: stored };
	const settings = createAiSettings({ read: async () => data, write: async (next) => void (data = next) });
	const told: string[] = [];
	const { runs, runner } = scriptedRunner();
	await adapter.mkdir(".widgetarium/apps/Studio/jobs");
	const put = (job: Job): void => void adapter.files.set(jobPathOf(job.app, job.id), jobText(job));
	const jobs = createJobs({
		files: createJobFiles(adapter),
		runner,
		settings,
		briefOf: async (job) => `brief for ${job.id}`,
		tell: (_app, said) => told.push(said),
		now: () => 1000,
		tickMs: 10,
	});
	return { adapter, jobs, runs, told, put, stored: () => data };
}

{
	const { jobs, runs, put, told, adapter } = await jobsWith({ jobsAtOnce: 1 });
	put(base);
	put(JobSchema.parse({ ...base, id: "people-design", page: "People", title: "Design People", createdAt: 1 }));
	await settle();
	check(
		"a queued job starts by itself, one at a time",
		[runs.length, jobs.jobsOf("Studio").map((job) => job.status)],
		[1, ["running", "queued"]],
	);
	check(
		"its first prompt asks it to do its job, with the job in the environment",
		[runs[0]?.ask.prompt.includes("Do your job now"), runs[0]?.ask.env],
		[true, { WIDGETARIUM_JOB: "Studio/home-design" }],
	);
	runs[0]?.emit({ session: "s-1" });
	runs[0]?.emit({
		call: { ref: "c1", name: "Bash", input: { command: "node widgets.mjs start @studio/hook-list --title Hooks" } },
	});
	runs[0]?.emit({ spentMore: 120 });
	runs[0]?.emit({ text: "Drew Home with its hero." });
	await settle();
	const home = jobs.jobsOf("Studio")[0];
	check(
		"it keeps its session and owns the widget it started",
		[home?.session, home?.widgets],
		["s-1", ["@studio/hook-list"]],
	);
	check(
		"the canvas sees what it is doing now",
		jobs.liveOf("Studio", "home-design")?.activity,
		"Widgetarium · start — @studio/hook-list --title Hooks",
	);
	runs[0]?.finish(null);
	await settle();
	check(
		"finishing marks it done with its last words and its spend",
		[jobs.jobsOf("Studio")[0]?.status, jobs.jobsOf("Studio")[0]?.said, jobs.jobsOf("Studio")[0]?.spent],
		["done", "Drew Home with its hero.", 120],
	);
	check("and frees the place for the next one", [runs.length, jobs.jobsOf("Studio")[1]?.status], [2, "running"]);
	check(
		"every step is written to the job's log",
		adapter.files.get(".widgetarium/apps/Studio/jobs/home-design.log")?.includes("@studio/hook-list"),
		true,
	);
	runs[1]?.finish(null);
	await settle();
	check("the orchestrator hears once every job is done", told, [
		"Every job of Studio is done. Run `report Studio` and end with its lines.",
	]);
	jobs.close();
}

{
	const { jobs, runs, put, adapter } = await jobsWith({});
	put(base);
	await settle();
	runs[0]?.emit({ session: "s-2" });
	await adapter.mkdir(".widgetarium/apps/Studio/jobs/asks");
	await adapter.write(
		".widgetarium/apps/Studio/jobs/asks/1.json",
		JSON.stringify({ kind: "question", job: "home-design", said: "Which direction?", options: ["A", "B", "C"] }),
	);
	runs[0]?.finish(null);
	await settle();
	check(
		"a job that asked waits on the person with its options",
		[jobs.jobsOf("Studio")[0]?.status, jobs.jobsOf("Studio")[0]?.question?.options],
		["waiting", ["A", "B", "C"]],
	);
	await jobs.answer("Studio", "home-design", "B");
	await settle();
	check(
		"the answer resumes the same session with the answer as its prompt",
		[runs.length, runs[1]?.ask.session, runs[1]?.ask.prompt],
		[2, "s-2", "Before you go on, the person or the orchestrator asked for this:\n- The person answered: B"],
	);
	runs[1]?.finish(null);
	await settle();
	check("an answered job finishes without asking to be approved", jobs.jobsOf("Studio")[0]?.status, "done");
	jobs.close();
}

{
	const { jobs, runs, put, told } = await jobsWith({});
	put(JobSchema.parse({ ...base, budget: 100 }));
	await settle();
	runs[0]?.emit({ spentMore: 150 });
	await settle();
	check(
		"a job past its budget is stopped and paused, not failed",
		[runs[0]?.stopped, jobs.jobsOf("Studio")[0]?.status, jobs.jobsOf("Studio")[0]?.reason],
		[true, "paused", "budget"],
	);
	await jobs.start("Studio", "home-design");
	await settle();
	check("pressing Resume starts it again", [runs.length, jobs.jobsOf("Studio")[0]?.status], [2, "running"]);
	await jobs.stop("Studio", "home-design");
	await settle();
	check(
		"Stop pauses it as stopped by the person",
		[jobs.jobsOf("Studio")[0]?.status, jobs.jobsOf("Studio")[0]?.reason],
		["paused", "stopped"],
	);
	check("a stopped job is not started again by itself", runs.length, 2);
	put(
		JobSchema.parse({
			...base,
			id: "home-implement",
			phase: "implement",
			after: ["home-review"],
			status: "paused",
			reason: "stopped",
			createdAt: 5,
		}),
	);
	put(
		JobSchema.parse({ ...base, id: "home-review", phase: "review", createdAt: 4, status: "paused", reason: "stopped" }),
	);
	await settle();
	await jobs.start("Studio", "home-implement");
	await settle();
	check(
		"Resume on a job whose turn has not come queues it and starts nothing",
		[runs.length, jobs.jobsOf("Studio").find((one) => one.id === "home-implement")?.status],
		[2, "queued"],
	);
	await jobs.start("Studio", "home-design");
	await settle();
	runs[2]?.finish("claude exited with code 1.");
	await settle();
	check(
		"a failure is kept with its reason and told to the orchestrator",
		[jobs.jobsOf("Studio")[0]?.status, told[0]?.startsWith("Job home-design of Studio failed: claude exited")],
		["failed", true],
	);
	jobs.close();
}

{
	const { jobs, runs, put } = await jobsWith({});
	put(base);
	await settle();
	await jobs.note("Studio", "home-design", "Make the calendar square.");
	runs[0]?.finish(null);
	await settle();
	check(
		"a note sent while it works is delivered as soon as it finishes",
		[runs.length, runs[1]?.ask.prompt.includes("Make the calendar square.")],
		[2, true],
	);
	jobs.close();
}

{
	const { jobs, runs, put } = await jobsWith({});
	put({ ...base, status: "running", session: "s-9" });
	put({ ...base, id: "people-design", page: "People", status: "paused", reason: "stopped" });
	await settle();
	check(
		"a job left running by a closed Obsidian starts again in its own session; one the person paused stays paused",
		[runs.length, runs[0]?.ask.session, jobs.jobsOf("Studio").find((one) => one.id === "people-design")?.status],
		[1, "s-9", "paused"],
	);
	jobs.close();
	await settle();
	check(
		"closing Obsidian leaves a working job as it was, to be picked up on the next start",
		jobs.jobsOf("Studio")[0]?.status,
		"running",
	);
}

{
	const { jobs, runs, put } = await jobsWith({ jobsStartThemselves: false });
	put(base);
	await settle();
	check("with jobs set not to start themselves, a queued job waits for Start", runs.length, 0);
	await jobs.start("Studio", "home-design");
	check("and Start runs it", runs.length, 1);
	jobs.close();
}

{
	const { jobs, runs, put, told, adapter } = await jobsWith({});
	put(base);
	await settle();
	await adapter.mkdir(".widgetarium/apps/Studio/jobs/asks");
	await adapter.write(
		".widgetarium/apps/Studio/jobs/asks/1.json",
		JSON.stringify({ kind: "question", job: "home-design", said: "Which direction?", options: ["A", "B"] }),
	);
	runs[0]?.finish(null);
	await settle();
	check("a job's question goes to the orchestrator in the chat, with how to answer it", told, [
		'Job home-design of Studio asks the person: Which direction? Options: A, B. Put it to them in one line, then pass their reply with `job answer Studio home-design "<their words>"`.',
	]);
	await adapter.write(
		".widgetarium/apps/Studio/jobs/asks/2.json",
		JSON.stringify({ kind: "answer", job: "home-design", said: "B" }),
	);
	await settle();
	check(
		"job answer resumes the job with the reply",
		[runs.length, runs[1]?.ask.prompt.includes("The person answered: B")],
		[2, true],
	);
	jobs.close();
}

const SPEC = `---
app: Studio
job: Plan and post short videos.
features:
  - title: Ideas
    says: Keep ideas
    actions: [create]
research:
  - product: Later
    takes: A calendar of posts
    url: https://later.com
records:
  - name: Video
    can: [create]
pages:
  - name: Home
    body: list-detail
    says: What to film next
checks:
  - An idea typed is in the list
---
`;

const { withReferenceNoted, readDesign } = await import("../packages/core/src/app-design.js");
const { NotedPicture } = await import("../apps/obsidian/src/design-noted-picture.js");
const { JobLine } = await import("../apps/obsidian/src/design-job-line.js");
const { Group } = await import("../apps/obsidian/src/design-group.js");
const { canvasPagesOf, canvasTabsOf, shownPageOf } = await import("../apps/obsidian/src/design-canvas-page.js");
const { noteOfApp } = await import("../apps/obsidian/src/ai/reference-command.js");
const { renderToStaticMarkup } = await import("react-dom/server");
const { createElement } = await import("react");

const canvas = JSON.stringify({
	screens: [],
	references: [{ url: "https://x.test/board.png", notes: [{ text: "Columns with counts", tone: "take" }] }],
});
const renoted = withReferenceNoted(canvas, "board.png", {
	text: "Columns with counts",
	tone: "take",
	into: "@studio/video-board",
});
check(
	"writing a note again with --into updates it in place",
	renoted ? readDesign(renoted).design?.references[0]?.notes : null,
	[{ text: "Columns with counts", tone: "take", into: "@studio/video-board" }],
);

const opened: string[] = [];
const opener = {
	open: (widget: string) => void opened.push(widget),
	nameOf: (widget: string) => (widget === "@studio/video-board" ? "Video pipeline board" : widget),
};
const reference = {
	name: "board.png",
	src: "https://x.test/board.png",
	why: undefined,
	kind: undefined,
	pages: [],
	notes: [
		{ text: "Columns with counts", tone: "take" as const, into: "@studio/video-board" },
		{ text: "Property list on every card: too busy on a phone", tone: "dislike" as const },
	],
};
const notedDrawn = renderToStaticMarkup(createElement(NotedPicture, { reference, opener }));
check(
	"a take that became a widget carries a button named after the widget, a leave carries none",
	[notedDrawn.match(/wg-design-note-widget/g)?.length ?? 0, notedDrawn.includes("Video pipeline board ↗")],
	[1, true],
);

const review = JobSchema.parse({ ...base, id: "ideas-review", page: "Ideas", phase: "review", status: "running" });
const headDrawn = renderToStaticMarkup(
	createElement(
		Group,
		{
			title: "Ideas",
			sub: "4 states",
			status: createElement(JobLine, {
				job: review,
				controls: { live: () => null, stop: () => undefined },
				isInline: true,
			}),
		},
		null,
	),
);
check(
	"a drawn page being worked on says so in one line beside its name",
	[headDrawn.includes("is-inline"), /<b>Ideas<\/b>.*Reviewing the Ideas page/.test(headDrawn)],
	[true, true],
);
const planned = [
	{ ...base, status: "done" as const },
	{ ...base, id: "ideas-design", page: "Ideas", status: "running" as const },
	{ ...base, id: "people-design", page: "People", after: ["ideas-design"] },
];
check(
	"the canvas shows a page only once something is drawn or being drawn on it",
	canvasPagesOf({ screens: [], references: [], jobs: planned, docs: [] }),
	["Ideas", "Components"],
);
const held = {
	screens: [],
	references: [reference],
	jobs: planned,
	docs: [{ name: "Spec", path: ".widgetarium/apps/Studio/spec.md", markdown: "**Ideas**" }],
};
check("docs lead the tabs, the screens follow, references and components close them", canvasTabsOf(held), {
	leading: ["Docs"],
	screens: ["Ideas"],
	trailing: ["References", "Components"],
});
check(
	"a tab saved under its old name opens the tab it moved into",
	["Brief", "Design system", "Widgets"].map((page) => shownPageOf(page, held)),
	["Docs", "Docs", "Components"],
);
check(
	"an old docs tab with no docs left opens the first page, never a blank one",
	shownPageOf("Brief", { ...held, docs: [] }),
	"Ideas",
);

const vault = await mkdtemp(join(tmpdir(), "wg-jobs-"));
await mkdir(join(vault, ".widgetarium/apps/Studio/design"), { recursive: true });
await writeFile(join(vault, ".widgetarium/apps/Studio/design/canvas.json"), canvas);
check(
	"--into that names no widget is refused with what to do instead",
	(
		await noteOfApp(vault, "Studio", ["board.png", "Board under a week strip"], {
			tone: "take",
			into: "the Ideas layout",
		})
	).refusal?.startsWith("--into names the widget a take became"),
	true,
);
check(
	"--into a widget is written on the note",
	(
		await noteOfApp(vault, "Studio", ["board.png", "Columns with counts"], {
			tone: "take",
			into: "@studio/video-board",
		})
	).refusal,
	undefined,
);
await mkdir(join(vault, ".widgetarium/apps/Studio"), { recursive: true });
await writeFile(join(vault, ".widgetarium/apps/Studio/spec.md"), SPEC);
const add = (asked: Record<string, unknown>) =>
	addJob(
		vault,
		"Studio",
		{
			title: undefined,
			page: undefined,
			phase: undefined,
			says: undefined,
			after: undefined,
			budget: undefined,
			id: undefined,
			...asked,
		},
		7,
	);
const added = await add({ title: "Design Home", page: "Home", phase: "design", says: "Draw Home" });
const addedJob = added.refusal === undefined ? added.value : null;
check(
	"job add writes a queued job named after its page and phase",
	[addedJob?.id, addedJob?.status],
	["home-design", "queued"],
);
const toldText = (told: {
	readonly refusal?: string | undefined;
	readonly text?: string | undefined;
}): string | undefined => told.text ?? told.refusal;
check(
	"the same job twice is refused",
	(await add({ title: "Again", page: "Home", phase: "design", says: "x" })).refusal?.startsWith(
		"Studio already has a job home-design",
	),
	true,
);
check(
	"after must name a job already added",
	(await add({ title: "Build", page: "Home", phase: "implement", says: "x", after: "home-review" })).refusal,
	"home-review is not a job of Studio; --after names jobs already added.",
);
check(
	"a phase outside the list is refused",
	(await add({ title: "x", phase: "dance", says: "x" })).refusal?.startsWith("Name the phase"),
	true,
);
check(
	"jobs lists every job with its status",
	toldText(await listJobs(vault, "Studio")),
	"home-design              queued — Design Home",
);
check(
	"job note writes an ask the plugin reads",
	toldText(await askJob(vault, "Studio", { kind: "note", job: "home-design", said: "Bigger" }, 9)),
	"Sent to home-design. The plugin reads it within a second.",
);
check(
	"one ask file stands in the asks folder",
	(await readdir(join(vault, ".widgetarium/apps/Studio/jobs/asks"))).length,
	1,
);
check(
	"a note to a job that does not exist is refused",
	(await askJob(vault, "Studio", { kind: "stop", job: "nope" }, 9)).refusal,
	"Studio has no job nope. `jobs Studio` lists them.",
);
const owned = JobSchema.parse({ ...base, id: "people-design", page: "People", widgets: ["@studio/hook-list"] });
await writeFile(join(vault, jobPathOf("Studio", "people-design")), jobText(owned));
await writeFile(
	join(vault, jobPathOf("Studio", "people-review")),
	jobText(JobSchema.parse({ ...base, id: "people-review", page: "People", phase: "review" })),
);
check(
	"a later job of the same page works on the page's widgets",
	await refuseOwnedElsewhere(vault, "@studio/hook-list", "Studio/people-review"),
	null,
);
check(
	"a later design works on an earlier design's widget, since two designs never run at once",
	await refuseOwnedElsewhere(vault, "@studio/hook-list", "Studio/home-design"),
	null,
);
await writeFile(
	join(vault, jobPathOf("Studio", "home-implement")),
	jobText(JobSchema.parse({ ...base, id: "home-implement", phase: "implement" })),
);
check(
	"start refuses a widget a job of another page and phase owns, since the two may run at once",
	(await refuseOwnedElsewhere(vault, "@studio/hook-list", "Studio/home-implement"))?.startsWith(
		"@studio/hook-list belongs to the job people-design",
	),
	true,
);
check(
	"and lets its owner and the orchestrator through",
	[
		await refuseOwnedElsewhere(vault, "@studio/hook-list", "Studio/people-design"),
		await refuseOwnedElsewhere(vault, "@studio/hook-list", undefined),
	],
	[null, null],
);

console.log(`\n${failed === 0 ? "jobs: clean" : `jobs: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
