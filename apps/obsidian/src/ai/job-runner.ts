import { APPROVE, isLive, isStartable, movedJob } from "@widgetarium/core/app-jobs.js";
import type { Job, JobAsk, JobMove, JobQuestion } from "@widgetarium/core/app-jobs.js";
import { CLI, briefGoesInTheMessage } from "./providers.js";
import type { AiSettings } from "./settings.js";
import type { Run, Runner } from "./run.js";
import type { StreamPart } from "./stream.js";
import { hintOf, titleOf } from "./tools.js";
import { startIn } from "./builds.js";
import { JOB_ENV } from "./job-command.js";
import type { JobFiles } from "./job-store.js";
import { askedSaid, endingOf, promptOf } from "./job-endings.js";

export interface LiveJob {
	readonly activity: string | null;
	readonly lines: readonly string[];
	readonly spent: number;
}

export interface Jobs {
	watch(onChange: () => void): () => void;
	version(): number;
	apps(): string[];
	jobsOf(app: string): Job[];
	liveOf(app: string, id: string): LiveJob | null;
	start(app: string, id: string): Promise<void>;
	stop(app: string, id: string): Promise<void>;
	note(app: string, id: string, said: string): Promise<void>;
	answer(app: string, id: string, said: string): Promise<void>;
	stopAll(): Promise<void>;
	close(): void;
}

export interface JobsDoors {
	readonly files: JobFiles;
	readonly runner: Runner;
	readonly settings: AiSettings;
	readonly briefOf: (job: Job) => Promise<string>;
	readonly tell: (app: string, said: string) => void;
	readonly now: () => number;
	readonly tickMs?: number;
}

interface Running {
	readonly run: Run;
	readonly spentBefore: number;
	spentNow: number;
	text: string;
	activity: string | null;
	question: JobQuestion | null;
	endedBy: "stopped" | "budget" | null;
	unsaved: string[];
}

interface JobsHeld {
	readonly doors: JobsDoors;
	readonly held: Map<string, Job>;
	readonly running: Map<string, Running>;
	readonly lines: Map<string, string[]>;
	readonly watchers: Set<() => void>;
	isTicking: boolean;
	changes: number;
}

type Call = { readonly ref: string; readonly name: string; readonly input: Readonly<Record<string, unknown>> };

const TICK_MS = 1000;
const SAVE_EVERY_MS = 2000;
const LINES_KEPT = 14;
const ANSWERED = "The person answered: {said}";
const NO_EDITING_PROVIDER = "The chosen provider cannot edit files, so it cannot run a job. Pick a command-line agent.";
const INTERRUPTED = "interrupted";
const STOPPED = "stopped";
const OVER_BUDGET = "budget";
const FAILED_SAID =
	"Job {id} of {app} failed: {reason}. Read it with `jobs {app}`; retry it with `job start {app} {id}`, send it a note, or say plainly what blocks it.";
const ALL_DONE_SAID = "Every job of {app} is done. Run `report {app}` and end with its lines.";

export function createJobs(doors: JobsDoors): Jobs {
	const state: JobsHeld = {
		doors,
		held: new Map(),
		running: new Map(),
		lines: new Map(),
		watchers: new Set(),
		isTicking: false,
		changes: 0,
	};
	const tickMs = doors.tickMs ?? TICK_MS;
	const timers = [
		setInterval(() => void tick(state), tickMs),
		setInterval(() => void saveLive(state), tickMs * (SAVE_EVERY_MS / TICK_MS)),
	];
	void tick(state);
	return {
		watch(onChange) {
			state.watchers.add(onChange);
			return () => state.watchers.delete(onChange);
		},
		version: () => state.changes,
		apps: () => [...new Set([...state.held.values()].map((job) => job.app))].sort(),
		jobsOf: (app) => jobsOfApp(state, app),
		liveOf: (app, id) => liveOf(state, keyOf(app, id)),
		start: (app, id) => startJob(state, keyOf(app, id)),
		stop: (app, id) => stopJob(state, keyOf(app, id)),
		note: (app, id, said) => noteJob(state, keyOf(app, id), said),
		answer: (app, id, said) => answerJob(state, keyOf(app, id), said),
		stopAll: () => stopAll(state),
		close: () => closeJobs(state, timers),
	};
}

function keyOf(app: string, id: string): string {
	return `${app}/${id}`;
}

function notify(state: JobsHeld): void {
	state.changes += 1;
	for (const watch of state.watchers) watch();
}

async function save(state: JobsHeld, job: Job): Promise<void> {
	state.held.set(keyOf(job.app, job.id), job);
	notify(state);
	await state.doors.files.save(job);
}

async function move(state: JobsHeld, job: Job, step: JobMove): Promise<Job | null> {
	const moved = movedJob(job, step);
	if (moved.refusal !== undefined) {
		console.warn(`[widgetarium] ${moved.refusal}`);
		return null;
	}
	await save(state, moved.job);
	return moved.job;
}

function jobsOfApp(state: JobsHeld, app: string): Job[] {
	return [...state.held.values()]
		.filter((job) => job.app === app)
		.sort((one, other) => one.createdAt - other.createdAt);
}

function liveOf(state: JobsHeld, key: string): LiveJob | null {
	const live = state.running.get(key);
	const shown = state.lines.get(key) ?? [];
	if (!live) return shown.length ? { activity: null, lines: shown, spent: state.held.get(key)?.spent ?? 0 } : null;
	return { activity: live.activity, lines: shown, spent: live.spentBefore + live.spentNow };
}

async function startJob(state: JobsHeld, key: string): Promise<void> {
	const job = state.held.get(key);
	if (!job || state.running.has(key)) return;
	if (job.status === "queued") return begin(state, job);
	const queued = await move(state, job, { to: "queued", note: null });
	if (queued) await begin(state, queued);
}

async function stopJob(state: JobsHeld, key: string): Promise<void> {
	const job = state.held.get(key);
	const live = state.running.get(key);
	if (!job) return;
	if (live) {
		live.endedBy = STOPPED;
		live.run.stop();
		return;
	}
	if (job.status === "queued") await move(state, job, { to: "paused", reason: STOPPED, at: state.doors.now() });
}

async function noteJob(state: JobsHeld, key: string, said: string): Promise<void> {
	const job = state.held.get(key);
	if (!job || said.trim() === "") return;
	if (job.status === "running" || job.status === "queued")
		return save(state, { ...job, notes: [...job.notes, said.trim()] });
	await move(state, job, { to: "queued", note: said.trim() });
}

async function answerJob(state: JobsHeld, key: string, said: string): Promise<void> {
	const job = state.held.get(key);
	if (!job || job.status !== "waiting") return;
	if (said === APPROVE) {
		await move(state, job, { to: "done", said: null, at: state.doors.now() });
		return tellWhenAllDone(state, job.app);
	}
	await move(state, job, { to: "queued", note: ANSWERED.replace("{said}", said) });
}

async function stopAll(state: JobsHeld): Promise<void> {
	for (const job of [...state.held.values()]) await stopJob(state, keyOf(job.app, job.id));
}

function closeJobs(state: JobsHeld, timers: readonly ReturnType<typeof setInterval>[]): void {
	for (const timer of timers) clearInterval(timer);
	for (const live of state.running.values()) {
		live.endedBy = STOPPED;
		live.run.stop();
	}
}

async function tick(state: JobsHeld): Promise<void> {
	if (state.isTicking) return;
	state.isTicking = true;
	try {
		await load(state);
		await saveLive(state);
		await startFree(state);
	} catch (failure) {
		console.error("[widgetarium] the jobs could not be read", failure);
	}
	state.isTicking = false;
}

async function load(state: JobsHeld): Promise<void> {
	for (const app of await state.doors.files.apps()) {
		const seen = new Set<string>();
		for (const job of await state.doors.files.jobsOf(app)) {
			const key = keyOf(app, job.id);
			seen.add(key);
			if (state.held.has(key)) continue;
			state.held.set(key, job);
			if (job.status === "running" && !state.running.has(key))
				await move(state, job, { to: "paused", reason: INTERRUPTED, at: state.doors.now() });
		}
		for (const key of [...state.held.keys()])
			if (key.startsWith(`${app}/`) && !seen.has(key) && !state.running.has(key)) state.held.delete(key);
		await takeAsks(state, app);
	}
}

async function takeAsks(state: JobsHeld, app: string): Promise<void> {
	for (const ask of await state.doors.files.asksOf(app)) await applyAsk(state, app, ask);
}

async function applyAsk(state: JobsHeld, app: string, ask: JobAsk): Promise<void> {
	const key = keyOf(app, ask.job);
	if (ask.kind === "question") {
		const live = state.running.get(key);
		if (live) live.question = { said: ask.said, options: ask.options };
		return;
	}
	if (ask.kind === "note") return noteJob(state, key, ask.said);
	if (ask.kind === "stop") return stopJob(state, key);
	if (ask.kind === "answer") return answerJob(state, key, ask.said);
	return startJob(state, key);
}

async function startFree(state: JobsHeld): Promise<void> {
	const settings = await state.doors.settings.state();
	if (!settings.jobsStartThemselves) return;
	const all = [...state.held.values()].sort((one, other) => one.createdAt - other.createdAt);
	for (const job of all) {
		if (state.running.size >= settings.jobsAtOnce) return;
		if (
			isStartable(
				job,
				all.filter((other) => other.app === job.app),
			)
		)
			await begin(state, job);
	}
}

async function begin(state: JobsHeld, job: Job): Promise<void> {
	const { doors } = state;
	const settings = await doors.settings.state();
	const { provider } = settings;
	if (provider.kind !== CLI || !provider.canEdit) {
		const now = await move(state, job, { to: "running", at: doors.now() });
		if (now) await move(state, now, { to: "failed", reason: NO_EDITING_PROVIDER, at: doors.now() });
		return;
	}
	const prompt = promptOf(job);
	const brief = await doors.briefOf(job);
	const started = await move(state, job, { to: "running", at: doors.now() });
	if (!started) return;
	const key = keyOf(job.app, job.id);
	const ask = {
		prompt: briefGoesInTheMessage(provider) ? `${brief}\n\n---\n\n${prompt}` : prompt,
		brief,
		history: [],
		session: job.session,
		skipPermissions: settings.skipPermissions,
		helpers: null,
		env: { [JOB_ENV]: key },
	};
	const run = doors.runner.run(provider, ask, (event) => heard(state, key, event));
	state.running.set(key, {
		run,
		spentBefore: job.spent,
		spentNow: 0,
		text: "",
		activity: null,
		question: null,
		endedBy: null,
		unsaved: [],
	});
	notify(state);
	void run.done.then((answer) => settle(state, key, answer.failure));
}

function heard(state: JobsHeld, key: string, event: StreamPart): void {
	const live = state.running.get(key);
	const job = state.held.get(key);
	if (!live || !job) return;
	if ("session" in event && event.session && job.session !== event.session)
		void save(state, { ...job, session: event.session });
	if ("spentMore" in event && Number.isFinite(event.spentMore)) live.spentNow += event.spentMore;
	if ("spent" in event && Number.isFinite(event.spent)) live.spentNow = event.spent;
	if ("text" in event && event.text) live.text += event.text;
	if ("call" in event && event.call) heardCall(state, key, live, event.call);
	if (job.budget !== null && live.spentBefore + live.spentNow > job.budget && live.endedBy === null) {
		live.endedBy = OVER_BUDGET;
		live.run.stop();
	}
	notify(state);
}

function heardCall(state: JobsHeld, key: string, live: Running, call: Call): void {
	const at = state.doors.now();
	const hint = hintOf(call);
	live.activity = hint ? `${titleOf(call)} — ${hint}` : titleOf(call);
	live.text = "";
	live.unsaved.push(`${new Date(at).toISOString()} ${live.activity}`);
	state.lines.set(key, [...(state.lines.get(key) ?? []), live.activity].slice(-LINES_KEPT));
	const started = startIn({ ...call, answered: false, output: "", failed: false, at });
	const job = state.held.get(key);
	if (started && job && !job.widgets.includes(started.id))
		void save(state, { ...job, widgets: [...job.widgets, started.id] });
}

async function saveLive(state: JobsHeld): Promise<void> {
	for (const [key, live] of state.running) {
		const job = state.held.get(key);
		if (!job) continue;
		const spent = live.spentBefore + live.spentNow;
		await state.doors.files.log(job, live.unsaved.splice(0));
		if (job.activity !== live.activity || job.spent !== spent)
			await save(state, { ...job, activity: live.activity, spent });
	}
}

async function settle(state: JobsHeld, key: string, failure: string | null): Promise<void> {
	const live = state.running.get(key);
	const before = state.held.get(key);
	if (!live || !before) return;
	await takeAsks(state, before.app);
	state.running.delete(key);
	const job = state.held.get(key) ?? before;
	await state.doors.files.log(job, live.unsaved.splice(0));
	const spent = { ...job, spent: live.spentBefore + live.spentNow };
	const ended = await move(state, spent, endingOf(spent, live, failure, state.doors.now()));
	if (ended) tellOrchestrator(state, ended);
	notify(state);
}

function tellOrchestrator(state: JobsHeld, job: Job): void {
	if (job.status === "failed")
		return state.doors.tell(
			job.app,
			FAILED_SAID.replaceAll("{id}", job.id)
				.replaceAll("{app}", job.app)
				.replace("{reason}", job.reason ?? ""),
		);
	if (job.status === "waiting" && job.question) return state.doors.tell(job.app, askedSaid(job, job.question));
	tellWhenAllDone(state, job.app);
}

function tellWhenAllDone(state: JobsHeld, app: string): void {
	const ofApp = jobsOfApp(state, app);
	if (ofApp.length > 0 && ofApp.every((one) => !isLive(one)))
		state.doors.tell(app, ALL_DONE_SAID.replaceAll("{app}", app));
}
