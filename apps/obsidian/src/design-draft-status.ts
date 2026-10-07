import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Job } from "@widgetarium/core/app-jobs.js";
import type { JobControls } from "./design-job.js";
import { JobLine } from "./design-job-line.js";

const FIRST_DRAFT = "First draft";

export function DraftStatus({
	job,
	jobs,
	controls,
}: {
	job: Job;
	jobs: readonly Job[];
	controls: JobControls;
}): ReactElement {
	return h("span", { className: "wg-design-draft" }, [
		h("span", { key: "said", className: "wg-design-draft-said" }, FIRST_DRAFT),
		h(JobLine, { key: "line", job, jobs, controls }),
	]);
}
