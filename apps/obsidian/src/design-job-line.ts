import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Loader, useNow } from "@widgetarium/kit";
import type { Job } from "@widgetarium/core/app-jobs.js";
import type { JobControls } from "./design-job.js";
import { doingOf } from "@widgetarium/core/job-words.js";

const PAUSE = "Pause";
const TOKENS = "{tokens} tokens";
const MINUTES = "{minutes} min";
const MS_PER_MINUTE = 60000;
const COMPACT = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export function JobLine({
	job,
	controls,
	isInline = false,
}: {
	job: Job;
	controls: JobControls;
	isInline?: boolean;
}): ReactElement {
	const now = useNow(1000, true);
	return h(
		"div",
		{ className: isInline ? "wg-design-job-line is-inline" : "wg-design-job-line", "data-wg-job": job.id },
		[
			h("div", { key: "status", className: "wg-design-job-status" }, [
				h(Loader, { key: "mark", label: "", size: 18 }),
				h("span", { key: "said" }, doingOf(job)),
			]),
			h("div", { key: "meta", className: "wg-design-job-meta" }, [
				h("span", { key: "said" }, [...metaOf(job, controls, now), ""].join(" · ")),
				h(
					"button",
					{ key: "act", type: "button", className: "wg-design-job-act", onClick: () => controls.stop(job.id) },
					PAUSE,
				),
			]),
		],
	);
}

function metaOf(job: Job, controls: JobControls, now: number): string[] {
	const spent = controls.live(job.id)?.spent ?? job.spent;
	const minutes = job.startedAt === null ? null : Math.max(1, Math.round((now - job.startedAt) / MS_PER_MINUTE));
	return [
		spent > 0 ? TOKENS.replace("{tokens}", COMPACT.format(spent)) : null,
		minutes === null ? null : MINUTES.replace("{minutes}", String(minutes)),
	].filter((part): part is string => part !== null);
}
