import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import type { Job } from "@widgetarium/core/app-jobs.js";
import type { LiveJob } from "./ai/job-runner.js";
import type { Size } from "widgetarium/studio";
import { Group } from "./design-group.js";
import { Region } from "./design-region.js";
import { JobLine } from "./design-job-line.js";

export interface JobControls {
	readonly live: (id: string) => LiveJob | null;
	readonly stop: (id: string) => void;
}

const PAGES = "Pages";

export function runningJobOfPage(jobs: readonly Job[], page: string): Job | null {
	return jobs.find((job) => job.page === page && job.status === "running") ?? null;
}

export function pagesBeingWorkedOn(jobs: readonly Job[]): string[] {
	return [...new Set(jobs.flatMap((job) => (job.page && job.status === "running" ? [job.page] : [])))];
}

export function pageLabelOf(page: string, jobs: readonly Job[]): ReactNode {
	if (!runningJobOfPage(jobs, page)) return page;
	return h("span", { className: "wg-design-tab" }, [
		h("span", { key: "dot", className: "wg-design-job-dot is-running" }),
		h("span", { key: "name" }, page),
	]);
}

export function PlannedPageRegion({
	job,
	controls,
	size,
}: {
	job: Job;
	controls: JobControls;
	size: Size;
}): ReactElement {
	const page = job.page ?? job.title;
	return h(
		Region,
		{ title: PAGES, count: 1 },
		h(
			Group,
			{ title: page },
			h("div", { className: "wg-design-frame", style: { width: `${size.width}px` } }, [
				h("div", { key: "top", className: "wg-design-top" }, h("span", { className: "wg-design-name" }, page)),
				h(
					"div",
					{ key: "job", className: "wg-design-job-frame is-running", style: { minHeight: `${size.height}px` } },
					h(JobLine, { job, controls }),
				),
			]),
		),
	);
}
