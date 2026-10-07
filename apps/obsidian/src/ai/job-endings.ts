import { APPROVE } from "@widgetarium/core/app-jobs.js";
import type { Job, JobMove, JobQuestion } from "@widgetarium/core/app-jobs.js";

export interface RunEnd {
	readonly endedBy: "stopped" | "budget" | null;
	readonly text: string;
	readonly question: JobQuestion | null;
}

const FIRST_PROMPT = "Do your job now, as the brief above says.";
const CONTINUE = "Continue where you stopped.";
const CORRECTIONS = "Before you go on, the person or the orchestrator asked for this:";
const ASK_APPROVAL = "Approve {title}, or say what to change.";
const BLOCKED = /BLOCKED:\s*([\s\S]+)/;
const ASKS_SAID =
	'Job {id} of {app} asks the person: {question}{options} Put it to them in one line, then pass their reply with `job answer {app} {id} "<their words>"`.';
const OPTIONS_SAID = " Options: {options}.";

export function promptOf(job: Job): string {
	const corrections = job.notes.length ? [CORRECTIONS, ...job.notes.map((note) => `- ${note}`)].join("\n") : null;
	if (job.session === null) return [FIRST_PROMPT, corrections].filter((part) => part !== null).join("\n\n");
	return corrections ?? CONTINUE;
}

export function endingOf(job: Job, live: RunEnd, failure: string | null, at: number): JobMove {
	if (live.endedBy !== null) return { to: "paused", reason: live.endedBy, at };
	if (failure !== null) return { to: "failed", reason: failure, at };
	if (job.notes.length > 0) return { to: "queued", note: null };
	const said = live.text.trim() || null;
	if (live.question) return { to: "waiting", question: live.question, said, at };
	const blocked = said?.match(BLOCKED)?.[1]?.trim();
	if (blocked) return { to: "waiting", question: { said: blocked, options: [] }, said, at };
	if (job.approval)
		return {
			to: "waiting",
			question: { said: ASK_APPROVAL.replace("{title}", job.title), options: [APPROVE] },
			said,
			at,
		};
	return { to: "done", said, at };
}

export function askedSaid(job: Job, question: JobQuestion): string {
	const options = question.options.length ? OPTIONS_SAID.replace("{options}", question.options.join(", ")) : "";
	return ASKS_SAID.replaceAll("{id}", job.id)
		.replaceAll("{app}", job.app)
		.replace("{question}", question.said)
		.replace("{options}", options);
}
