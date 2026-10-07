import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	JOB_ID,
	JOB_PHASES,
	JobSchema,
	isStartable,
	jobAsksFolderOf,
	jobIdOf,
	jobPathOf,
	jobText,
	jobsFolderOf,
	ownerOf,
	readJob,
} from "@widgetarium/core/app-jobs.js";
import type { Job, JobAsk, JobPhase } from "@widgetarium/core/app-jobs.js";
import { specOfApp } from "./spec-command.js";
import type { Told } from "./shape-command.js";

export interface JobAdd {
	readonly title: unknown;
	readonly page: unknown;
	readonly phase: unknown;
	readonly says: unknown;
	readonly after: unknown;
	readonly approval: unknown;
	readonly budget: unknown;
	readonly id: unknown;
}

export const JOB_ENV = "WIDGETARIUM_JOB";

const NO_PHASE = `Name the phase: --phase ${JOB_PHASES.join("|")}.`;
const NO_SAYS = 'Say what the job does, everything it needs and nothing else: --says "<instructions>"';
const NO_TITLE = 'Name the job as the person reads it: --title "Design the People page"';
const BAD_ID = "{id} is not a job id: lowercase words joined by hyphens.";
const TAKEN = "{app} already has a job {id}. Name another with --id, or send it a note: job note {app} {id} <text>.";
const NO_AFTER = "{after} is not a job of {app}; --after names jobs already added.";
const BAD_BUDGET = "--budget is the most output tokens the job may spend before it pauses, a whole number.";
const NO_JOB = "{app} has no job {id}. `jobs {app}` lists them.";
const NO_SAID = "Say it: the words go after the job id.";
const ADDED = "Added {id}: {title}. It starts {when}.";
const WHEN_NOW = "as soon as a place is free";
const WHEN_AFTER = "when {after} are done";
const ASKED = "Sent to {id}. The plugin reads it within a second.";
const NO_JOBS = "{app} has no jobs yet.";
const OWNED =
	"{widget} belongs to the job {owner}. Leave it, and end your turn with BLOCKED: <what you need changed in it>.";

export async function addJob(vault: string, app: unknown, asked: JobAdd, now: number): Promise<Told<Job>> {
	const spec = await specOfApp(vault, app);
	if (spec.refusal !== undefined) return spec;
	const name = spec.value.app === app ? spec.value.app : String(app);
	const refusal = refuseAdd(asked);
	if (refusal) return { refusal };
	const jobs = await jobsOfApp(vault, name);
	const page = textOf(asked.page);
	const phase: JobPhase = JOB_PHASES.find((one) => one === asked.phase) ?? "task";
	const id = textOf(asked.id) ?? jobIdOf(page, phase);
	if (!JOB_ID.test(id)) return { refusal: BAD_ID.replace("{id}", id) };
	if (jobs.some((job) => job.id === id)) return { refusal: TAKEN.replaceAll("{app}", name).replaceAll("{id}", id) };
	const after = listOf(asked.after);
	const unknown = after.find((one) => !jobs.some((job) => job.id === one));
	if (unknown) return { refusal: NO_AFTER.replace("{after}", unknown).replace("{app}", name) };
	const job = JobSchema.parse({
		id,
		app: name,
		title: textOf(asked.title),
		page,
		phase,
		says: textOf(asked.says),
		after,
		approval: asked.approval === true,
		budget: asked.budget === undefined ? null : Number(asked.budget),
		createdAt: now,
	});
	await mkdir(join(vault, jobsFolderOf(name)), { recursive: true });
	await writeFile(join(vault, jobPathOf(name, id)), jobText(job));
	const when = after.length === 0 ? WHEN_NOW : WHEN_AFTER.replace("{after}", after.join(", "));
	return { value: job, text: ADDED.replace("{id}", id).replace("{title}", job.title).replace("{when}", when) };
}

export async function jobsOfApp(vault: string, app: string): Promise<Job[]> {
	const folder = join(vault, jobsFolderOf(app));
	const names = await readdir(folder).catch(() => []);
	const read = await Promise.all(
		names.filter((name) => name.endsWith(".json")).map((name) => readFile(join(folder, name), "utf8").then(readJob)),
	);
	return read.flatMap((one) => (one.job ? [one.job] : [])).sort((one, other) => one.createdAt - other.createdAt);
}

export async function listJobs(vault: string, app: unknown): Promise<Told<Job[]>> {
	const spec = await specOfApp(vault, app);
	if (spec.refusal !== undefined) return spec;
	const jobs = await jobsOfApp(vault, spec.value.app);
	if (jobs.length === 0) return { value: jobs, text: NO_JOBS.replace("{app}", spec.value.app) };
	return { value: jobs, text: jobs.map((job) => jobLine(job, jobs)).join("\n") };
}

export async function askJob(vault: string, app: unknown, ask: JobAsk, now: number): Promise<Told<JobAsk>> {
	const spec = await specOfApp(vault, app);
	if (spec.refusal !== undefined) return spec;
	const name = spec.value.app;
	const jobs = await jobsOfApp(vault, name);
	if (!jobs.some((job) => job.id === ask.job))
		return { refusal: NO_JOB.replaceAll("{app}", name).replaceAll("{id}", ask.job) };
	if ((ask.kind === "note" || ask.kind === "question") && ask.said.trim() === "") return { refusal: NO_SAID };
	const folder = join(vault, jobAsksFolderOf(name));
	await mkdir(folder, { recursive: true });
	await writeFile(
		join(folder, `${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}.json`),
		JSON.stringify(ask),
	);
	return { value: ask, text: ASKED.replace("{id}", ask.job) };
}

export async function refuseOwnedElsewhere(
	vault: string,
	widget: string,
	running: string | undefined,
): Promise<string | null> {
	const [app, id] = (running ?? "").split("/");
	if (!app || !id) return null;
	const owner = ownerOf(await jobsOfApp(vault, app), widget);
	if (!owner || owner.id === id) return null;
	return OWNED.replace("{widget}", widget).replace("{owner}", owner.id);
}

function textOf(value: unknown): string | null {
	return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function listOf(value: unknown): string[] {
	if (typeof value !== "string") return [];
	return value
		.split(",")
		.map((one) => one.trim())
		.filter((one) => one !== "");
}

function refuseAdd(asked: JobAdd): string | null {
	if (!textOf(asked.title)) return NO_TITLE;
	if (!JOB_PHASES.some((phase) => phase === asked.phase)) return NO_PHASE;
	if (!textOf(asked.says)) return NO_SAYS;
	if (asked.budget !== undefined && !(Number.isInteger(Number(asked.budget)) && Number(asked.budget) > 0))
		return BAD_BUDGET;
	return null;
}

function jobLine(job: Job, jobs: readonly Job[]): string {
	const waitsOn = job.status === "queued" && !isStartable(job, jobs) ? ` (after ${job.after.join(", ")})` : "";
	const head = `${job.id.padEnd(24)} ${job.status}${job.reason ? `: ${job.reason}` : ""}${waitsOn} — ${job.title}`;
	const lines = [
		head,
		job.question
			? `    asks: ${job.question.said}${job.question.options.length ? ` [${job.question.options.join(" / ")}]` : ""}`
			: null,
		job.said ? `    said: ${job.said.split("\n")[0]}` : null,
		job.widgets.length ? `    owns: ${job.widgets.join(", ")}` : null,
	];
	return lines.filter((line): line is string => line !== null).join("\n");
}
