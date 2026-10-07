import { z } from "zod";
import { SPEC_FOLDER } from "./app-spec.js";

export const JOBS_FOLDER = "jobs";
export const JOB_PHASES = ["design", "implement", "review", "task"] as const;
export const JOB_STATUSES = ["queued", "running", "paused", "waiting", "done", "failed"] as const;
export const JOB_ID = /^[a-z0-9][a-z0-9-]*$/;

export type JobPhase = (typeof JOB_PHASES)[number];
export type JobStatus = (typeof JOB_STATUSES)[number];

const QuestionSchema = z.object({
	said: z.string(),
	options: z.array(z.string()).default([]),
});

export const JobSchema = z.object({
	id: z.string().regex(JOB_ID),
	app: z.string().min(1),
	title: z.string().min(1),
	page: z.string().nullable().default(null),
	phase: z.enum(JOB_PHASES),
	says: z.string().min(1),
	after: z.array(z.string()).default([]),
	approval: z.boolean().default(false),
	status: z.enum(JOB_STATUSES).default("queued"),
	reason: z.string().nullable().default(null),
	question: QuestionSchema.nullable().default(null),
	session: z.string().nullable().default(null),
	notes: z.array(z.string()).default([]),
	budget: z.number().int().positive().nullable().default(null),
	spent: z.number().nonnegative().default(0),
	activity: z.string().nullable().default(null),
	said: z.string().nullable().default(null),
	widgets: z.array(z.string()).default([]),
	createdAt: z.number().default(0),
	startedAt: z.number().nullable().default(null),
	endedAt: z.number().nullable().default(null),
});

export type Job = z.infer<typeof JobSchema>;
export type JobQuestion = z.infer<typeof QuestionSchema>;

export type JobRead =
	{ readonly job: Job; readonly refusal?: undefined } | { readonly job?: undefined; readonly refusal: string };

export type JobMove =
	| { readonly to: "running"; readonly at: number }
	| { readonly to: "paused"; readonly reason: string; readonly at: number }
	| { readonly to: "waiting"; readonly question: JobQuestion; readonly said: string | null; readonly at: number }
	| { readonly to: "done"; readonly said: string | null; readonly at: number }
	| { readonly to: "failed"; readonly reason: string; readonly at: number }
	| { readonly to: "queued"; readonly note: string | null };

export type JobMoved =
	{ readonly job: Job; readonly refusal?: undefined } | { readonly job?: undefined; readonly refusal: string };

const MOVES: Readonly<Record<JobStatus, readonly JobStatus[]>> = {
	queued: ["running", "paused"],
	running: ["done", "waiting", "paused", "failed", "queued"],
	paused: ["queued", "running"],
	waiting: ["done", "queued"],
	done: ["queued"],
	failed: ["queued"],
};

const NOT_JSON = "the job is not JSON: {why}";
const NOT_A_MOVE = "job {id} is {from} and cannot become {to}";
const SAID_AT_MOST = 1200;

export const APPROVE = "Approve";

export function jobsFolderOf(app: string): string {
	return `${SPEC_FOLDER}/${app}/${JOBS_FOLDER}`;
}

export function jobPathOf(app: string, id: string): string {
	return `${jobsFolderOf(app)}/${id}.json`;
}

export function jobLogPathOf(app: string, id: string): string {
	return `${jobsFolderOf(app)}/${id}.log`;
}

export function jobAsksFolderOf(app: string): string {
	return `${jobsFolderOf(app)}/asks`;
}

export function readJob(text: string): JobRead {
	let held: unknown;
	try {
		held = JSON.parse(text);
	} catch (failure) {
		return { refusal: NOT_JSON.replace("{why}", failure instanceof Error ? failure.message : String(failure)) };
	}
	const parsed = JobSchema.safeParse(held);
	if (!parsed.success)
		return { refusal: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") };
	return { job: parsed.data };
}

export function jobText(job: Job): string {
	return `${JSON.stringify(job, null, "\t")}\n`;
}

export function canMove(from: JobStatus, to: JobStatus): boolean {
	return MOVES[from].includes(to);
}

export function movedJob(job: Job, move: JobMove): JobMoved {
	if (!canMove(job.status, move.to))
		return { refusal: NOT_A_MOVE.replace("{id}", job.id).replace("{from}", job.status).replace("{to}", move.to) };
	return { job: { ...job, ...fieldsOfMove(job, move), status: move.to } };
}

export function isStartable(job: Job, jobs: readonly Job[]): boolean {
	if (job.status !== "queued") return false;
	return job.after.every((id) => jobs.find((other) => other.id === id)?.status === "done");
}

export function isLive(job: Job): boolean {
	return job.status !== "done";
}

const SHOWN_FIRST: readonly JobStatus[] = ["running", "waiting", "failed", "paused", "queued", "done"];

export function jobOfPage(jobs: readonly Job[], page: string): Job | null {
	const ofPage = jobs.filter((job) => job.page === page);
	for (const status of SHOWN_FIRST) {
		const found = ofPage.find((job) => job.status === status);
		if (found) return found;
	}
	return null;
}

export function pagesOfJobs(jobs: readonly Job[]): string[] {
	return [...new Set(jobs.flatMap((job) => (job.page ? [job.page] : [])))];
}

export function ownerOf(jobs: readonly Job[], widget: string): Job | null {
	return jobs.find((job) => job.widgets.includes(widget)) ?? null;
}

export const JobAskSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("note"), job: z.string(), said: z.string().min(1) }),
	z.object({
		kind: z.literal("question"),
		job: z.string(),
		said: z.string().min(1),
		options: z.array(z.string()).default([]),
	}),
	z.object({ kind: z.literal("stop"), job: z.string() }),
	z.object({ kind: z.literal("start"), job: z.string() }),
	z.object({ kind: z.literal("answer"), job: z.string(), said: z.string().min(1) }),
]);

export type JobAsk = z.infer<typeof JobAskSchema>;

export function readJobAsk(text: string): JobAsk | null {
	try {
		const parsed = JobAskSchema.safeParse(JSON.parse(text));
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}

export function jobIdOf(page: string | null, phase: JobPhase): string {
	const slug = (page ?? "app")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return `${slug || "page"}-${phase}`;
}

function fieldsOfMove(job: Job, move: JobMove): Partial<Job> {
	switch (move.to) {
		case "running":
			return { reason: null, question: null, notes: [], startedAt: job.startedAt ?? move.at, endedAt: null };
		case "paused":
			return { reason: move.reason, activity: null, endedAt: move.at };
		case "waiting":
			return {
				reason: null,
				question: move.question,
				said: clipped(move.said) ?? job.said,
				activity: null,
				endedAt: move.at,
			};
		case "done":
			return { reason: null, question: null, said: clipped(move.said) ?? job.said, activity: null, endedAt: move.at };
		case "failed":
			return { reason: move.reason, activity: null, endedAt: move.at };
		case "queued":
			return { reason: null, question: null, notes: move.note === null ? job.notes : [...job.notes, move.note] };
	}
}

function clipped(said: string | null): string | null {
	if (said === null) return null;
	const trimmed = said.trim();
	if (trimmed === "") return null;
	return trimmed.length > SAID_AT_MOST ? `${trimmed.slice(0, SAID_AT_MOST)}…` : trimmed;
}
