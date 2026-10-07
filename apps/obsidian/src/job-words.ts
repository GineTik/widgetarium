import type { Job } from "@widgetarium/core/app-jobs.js";

const DOING: Readonly<Record<Job["phase"], string>> = {
	design: "Designing the {page} page",
	implement: "Connecting the {page} page",
	review: "Reviewing the {page} page",
	task: "{title}",
};

export function doingOf(job: Job): string {
	return DOING[job.phase].replace("{page}", job.page ?? job.title).replace("{title}", job.title);
}
