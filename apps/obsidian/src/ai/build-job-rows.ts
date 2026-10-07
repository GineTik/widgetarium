import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Row } from "@widgetarium/kit";
import { isStartable } from "@widgetarium/core/app-jobs.js";
import type { Job, JobPhase } from "@widgetarium/core/app-jobs.js";
import { doingOf } from "../job-words.js";
import { stageRing } from "./build-stages.js";
import { rowText } from "./spec-rows.js";
import type { ItemStatus, StageStatus } from "./spec-calls.js";

export interface JobPresses {
	readonly start: (id: string) => void;
	readonly stop: (id: string) => void;
}

export interface JobStage {
	readonly key: string;
	readonly name: string;
	readonly status: RingStatus;
	readonly said: string;
	readonly jobs: readonly Job[];
}

type RingStatus = StageStatus | ItemStatus;

const PREPARING = "Preparing";
const PLANNED = "Planned {count} jobs";
const STAGES: ReadonlyArray<{ key: string; name: string; phases: readonly JobPhase[] }> = [
	{ key: "canvas", name: "Canvas", phases: ["design", "review"] },
	{ key: "connecting", name: "Connecting logic", phases: ["implement"] },
	{ key: "tasks", name: "Tasks", phases: ["task"] },
];
const COUNT_DONE = "{done} of {all} done";
const ASKS = "{title} asks you in the chat";
const SAID: Readonly<Record<Exclude<Job["status"], "queued">, string>> = {
	running: "Working",
	waiting: "Asks you in the chat",
	paused: "Paused",
	failed: "Stopped",
	done: "Done",
};
const STARTS_NEXT = "Starts next";
const AFTER = "After {titles}";
const RING: Readonly<Record<Job["status"], RingStatus>> = {
	running: "active",
	waiting: "active",
	paused: "cancelled",
	failed: "failed",
	done: "done",
	queued: "pending",
};
const PRESS: Readonly<Partial<Record<Job["status"], { label: string; of: keyof JobPresses }>>> = {
	running: { label: "Pause", of: "stop" },
	paused: { label: "Resume", of: "start" },
	failed: { label: "Retry", of: "start" },
};
const ITEM_RING_PX = 22;
const STAGE_RING_PX = 28;

export function preparingRow(jobs: readonly Job[]): ReactElement {
	return h(Row, { key: "preparing", className: "is-done" }, [
		stageRing("done", STAGE_RING_PX),
		rowText(PREPARING, PLANNED.replace("{count}", String(jobs.length))),
	]);
}

export function jobStagesOf(jobs: readonly Job[]): JobStage[] {
	return STAGES.flatMap(({ key, name, phases }) => {
		const held = jobs.filter((job) => phases.includes(job.phase));
		if (held.length === 0) return [];
		return [{ key, name, status: stageStatusOf(held), said: stageSaidOf(held), jobs: held }];
	});
}

export function jobRow(job: Job, jobs: readonly Job[], presses: JobPresses): ReactElement {
	const press = PRESS[job.status];
	return h(Row, { key: job.id, className: `is-inner is-${RING[job.status]}` }, [
		stageRing(RING[job.status], ITEM_RING_PX),
		rowText(job.title, jobSaidOf(job, jobs)),
		press
			? h(Button, { key: "press", size: "s", variant: "ghost", onClick: () => presses[press.of](job.id) }, press.label)
			: null,
	]);
}

export function workingSaidOf(jobs: readonly Job[]): string | null {
	const running = jobs.filter((job) => job.status === "running").map(doingOf);
	if (running.length > 0) return running.join(" · ");
	const asking = jobs.find((job) => job.status === "waiting");
	return asking ? ASKS.replace("{title}", asking.page ?? asking.title) : null;
}

function stageStatusOf(jobs: readonly Job[]): RingStatus {
	if (jobs.every((job) => job.status === "done")) return "done";
	if (jobs.some((job) => job.status === "failed")) return "failed";
	if (jobs.some((job) => job.status === "running" || job.status === "waiting")) return "active";
	return "pending";
}

function stageSaidOf(jobs: readonly Job[]): string {
	return (
		workingSaidOf(jobs) ??
		COUNT_DONE.replace("{done}", String(jobs.filter((job) => job.status === "done").length)).replace(
			"{all}",
			String(jobs.length),
		)
	);
}

function jobSaidOf(job: Job, jobs: readonly Job[]): string {
	if (job.status !== "queued")
		return job.status === "failed" && job.reason ? `${SAID.failed}: ${job.reason}` : SAID[job.status];
	if (isStartable(job, jobs)) return STARTS_NEXT;
	const ahead = job.after.flatMap((id) => jobs.filter((one) => one.id === id && one.status !== "done"));
	const running = jobs.find((one) => one.status === "running" && one.phase === job.phase);
	const titles = (ahead.length > 0 ? ahead : running ? [running] : []).map((one) => one.title).join(", ");
	return titles === "" ? STARTS_NEXT : AFTER.replace("{titles}", titles);
}
