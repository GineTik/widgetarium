import { createElement as h, useSyncExternalStore } from "react";
import type { ReactElement } from "react";
import { Loader } from "@widgetarium/kit";
import type { Jobs } from "./job-runner.js";
import { workingSaidOf } from "./build-job-rows.js";
import { scrollToCard } from "./pinned-run.js";
import { buildKeyOf } from "./spec-calls.js";

export interface JobsStripProps {
	readonly jobs: Jobs;
}

const WORKING = "{count} agents working · {said}";

export function JobsStrip({ jobs }: JobsStripProps): ReactElement | null {
	const version = useSyncExternalStore(jobs.watch, () => jobs.version());
	const lines = jobs.apps().flatMap((app) => {
		const held = jobs.jobsOf(app);
		const said = workingSaidOf(held);
		if (said === null) return [];
		const running = held.filter((job) => job.status === "running").length;
		return [{ app, said: running > 1 ? WORKING.replace("{count}", String(running)).replace("{said}", said) : said }];
	});
	if (lines.length === 0) return null;
	return h(
		"div",
		{ className: "wg-ai-jobs", "data-version": version },
		lines.map(({ app, said }) =>
			h(
				"button",
				{ key: app, type: "button", className: "wg-ai-jobs-app", onClick: () => scrollToCard(buildKeyOf(app)) },
				[
					h(Loader, { key: "mark", label: "", size: 16 }),
					h("b", { key: "app" }, app),
					h("span", { key: "said", className: "wg-ai-jobs-said" }, said),
				],
			),
		),
	);
}
