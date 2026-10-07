import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { jobOfPage } from "@widgetarium/core/app-jobs.js";
import type { Job } from "@widgetarium/core/app-jobs.js";
import type { LiveJob } from "./ai/job-runner.js";
import type { Size } from "./design-canvas-shapes.js";
import { Group } from "./design-group.js";
import { Region } from "./design-region.js";
import { JobLine } from "./design-job-line.js";

export interface JobControls {
	readonly live: (id: string) => LiveJob | null;
	readonly start: (id: string) => void;
	readonly stop: (id: string) => void;
	readonly openChat: () => void;
	readonly startsThemselves: boolean;
}

const PAGES = "Pages";

export function pageLabelOf(page: string, jobs: readonly Job[]): ReactNode {
	const job = jobOfPage(jobs, page);
	if (!job || job.status === "done") return page;
	return h("span", { className: "wg-design-tab" }, [
		h("span", { key: "dot", className: `wg-design-job-dot is-${job.status}` }),
		h("span", { key: "name" }, page),
	]);
}

export function PlannedPageRegion({
	job,
	jobs,
	controls,
	size,
}: {
	job: Job;
	jobs: readonly Job[];
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
					{
						key: "job",
						className: `wg-design-job-frame${job.status === "running" ? " is-running" : ""}`,
						style: { minHeight: `${size.height}px` },
					},
					h(JobLine, { job, jobs, controls }),
				),
			]),
		),
	);
}
