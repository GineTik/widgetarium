import { createElement as h, useSyncExternalStore } from "react";
import type { ReactElement } from "react";
import { Button } from "@widgetarium/kit";
import type { Job, JobStatus } from "@widgetarium/core/app-jobs.js";
import type { Jobs } from "./job-runner.js";

export interface JobsStripProps {
	readonly jobs: Jobs;
	readonly openDesign: (app: string) => void;
}

const OPEN_CANVAS = "Open canvas";
const COUNTED: ReadonlyArray<readonly [JobStatus, string]> = [
	["waiting", "{count} needs you"],
	["running", "{count} working"],
	["failed", "{count} failed"],
	["paused", "{count} paused"],
	["queued", "{count} queued"],
];
const DONE = "{done} of {all} done";

export function JobsStrip({ jobs, openDesign }: JobsStripProps): ReactElement | null {
	const version = useSyncExternalStore(jobs.watch, () => jobs.version());
	const apps = jobs.apps().filter((app) => jobs.jobsOf(app).some((job) => job.status !== "done"));
	if (apps.length === 0) return null;
	return h(
		"div",
		{ className: "wg-ai-jobs", "data-version": version },
		apps.map((app) =>
			h("div", { key: app, className: "wg-ai-jobs-app" }, [
				h("b", { key: "app" }, app),
				h("span", { key: "said", className: "wg-ai-jobs-said" }, saidOf(jobs.jobsOf(app))),
				h(Button, { key: "open", size: "s", variant: "neutral", onClick: () => openDesign(app) }, OPEN_CANVAS),
			]),
		),
	);
}

function saidOf(jobs: readonly Job[]): string {
	const counts = COUNTED.flatMap(([status, said]) => {
		const count = jobs.filter((job) => job.status === status).length;
		return count === 0 ? [] : [said.replace("{count}", String(count))];
	});
	const done = DONE.replace("{done}", String(jobs.filter((job) => job.status === "done").length)).replace(
		"{all}",
		String(jobs.length),
	);
	return [...counts, done].join(" · ");
}
