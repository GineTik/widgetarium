import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Loader, useNow } from "@widgetarium/kit";
import { isStartable } from "@widgetarium/core/app-jobs.js";
import type { Job } from "@widgetarium/core/app-jobs.js";
import type { LiveJob } from "./ai/job-runner.js";
import type { JobControls } from "./design-job.js";

interface JobAction {
	readonly label: string;
	readonly press: (controls: JobControls, job: Job) => void;
}

const DOING: Readonly<Record<Job["phase"], string>> = {
	design: "Designing the {page} page",
	implement: "Building the {page} page",
	review: "Polishing the {page} page",
	task: "{title}",
};
const NEXT: Readonly<Record<Job["phase"], string>> = {
	design: "{page} page planned",
	implement: "Building {page} next",
	review: "Polishing {page} next",
	task: "{title} planned",
};
const STATUS: Readonly<Record<Exclude<Job["status"], "running" | "queued">, string>> = {
	paused: "{page} page paused",
	waiting: "{page} waits for you in the chat",
	failed: "{page} page stopped",
	done: "{page} page done",
};
const ACTIONS: Readonly<Partial<Record<Job["status"], JobAction>>> = {
	running: { label: "Pause", press: (controls, job) => controls.stop(job.id) },
	queued: { label: "Start now", press: (controls, job) => controls.start(job.id) },
	paused: { label: "Resume", press: (controls, job) => controls.start(job.id) },
	failed: { label: "Retry", press: (controls, job) => controls.start(job.id) },
	waiting: { label: "Open chat", press: (controls) => controls.openChat() },
};
const STARTS_AFTER = "Starts after {after}";
const STARTS_SOON = "Starts when a place is free";
const STARTS_ON_PRESS = "Waits for Start now";
const REACHED_BUDGET = "Reached its budget";
const TOKENS = "{tokens} tokens";
const MINUTES = "{minutes} min";
const MS_PER_MINUTE = 60000;
const REASON_AT_MOST = 60;
const COMPACT = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export function JobLine({
	job,
	jobs,
	controls,
}: {
	job: Job;
	jobs: readonly Job[];
	controls: JobControls;
}): ReactElement {
	const now = useNow(1000, job.status === "running");
	const live = controls.live(job.id);
	const action = ACTIONS[job.status];
	return h("div", { className: "wg-design-job-line", "data-wg-job": job.id }, [
		h("div", { key: "status", className: "wg-design-job-status" }, [
			job.status === "running"
				? h(Loader, { key: "mark", label: "", size: 18 })
				: h("span", { key: "mark", className: `wg-design-job-mark is-${job.status}` }),
			h("span", { key: "said" }, statusOf(job)),
		]),
		h("div", { key: "meta", className: "wg-design-job-meta" }, [
			h("span", { key: "said" }, [...metaOf(job, jobs, controls, live, now), ...(action ? [""] : [])].join(" · ")),
			action
				? h(
						"button",
						{ key: "act", type: "button", className: "wg-design-job-act", onClick: () => action.press(controls, job) },
						action.label,
					)
				: null,
		]),
	]);
}

function statusOf(job: Job): string {
	const template =
		job.status === "running" ? DOING[job.phase] : job.status === "queued" ? NEXT[job.phase] : STATUS[job.status];
	return template.replace("{page}", job.page ?? job.title).replace("{title}", job.title);
}

function metaOf(job: Job, jobs: readonly Job[], controls: JobControls, live: LiveJob | null, now: number): string[] {
	if (job.status === "queued") return [startsOf(job, jobs, controls)];
	const spent = live?.spent ?? job.spent;
	const ended = job.status === "running" ? now : (job.endedAt ?? now);
	const minutes = job.startedAt === null ? null : Math.max(1, Math.round((ended - job.startedAt) / MS_PER_MINUTE));
	return [
		job.status === "failed" ? reasonOf(job.reason) : null,
		job.status === "paused" && job.reason === "budget" ? REACHED_BUDGET : null,
		spent > 0 ? TOKENS.replace("{tokens}", COMPACT.format(spent)) : null,
		minutes === null ? null : MINUTES.replace("{minutes}", String(minutes)),
	].filter((part): part is string => part !== null);
}

function startsOf(job: Job, jobs: readonly Job[], controls: JobControls): string {
	if (!isStartable(job, jobs)) {
		const waiting = job.after
			.map((id) => jobs.find((one) => one.id === id))
			.filter((one): one is Job => one !== undefined && one.status !== "done")
			.map((one) => one.page ?? one.title);
		return STARTS_AFTER.replace("{after}", [...new Set(waiting)].join(", "));
	}
	return controls.startsThemselves ? STARTS_SOON : STARTS_ON_PRESS;
}

function reasonOf(reason: string | null): string | null {
	const first = (reason ?? "").split(/(?<=\.)\s/)[0]?.trim() ?? "";
	if (first === "") return null;
	return first.length > REASON_AT_MOST ? `${first.slice(0, REASON_AT_MOST)}…` : first;
}
