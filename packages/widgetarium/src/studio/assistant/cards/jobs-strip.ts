import { createElement as h, useSyncExternalStore } from "react";
import type { ReactElement } from "react";
import { Loader } from "@widgetarium/kit";
import { buildKeyOf } from "@widgetarium/core/engine/assistant-cards.js";
import type { AppJobs } from "@widgetarium/core/engine/assistant-port.js";
import { workingSaidOf } from "./build-job-rows.js";
import type { JobsPort } from "./card-ports.js";

export interface JobsStripProps {
	readonly jobs: JobsPort;
	readonly showCard: (key: string) => void;
}

interface WorkingLine {
	readonly app: string;
	readonly said: string;
}

const WORKING = "{count} agents working · {said}";

export function JobsStrip({ jobs, showCard }: JobsStripProps): ReactElement | null {
	const held = useSyncExternalStore(jobs.onJobs, jobs.jobs);
	const lines = held.flatMap(workingLineOf);
	if (lines.length === 0) return null;
	return h(
		"div",
		{ className: "wg-studio-ai-jobs" },
		lines.map(({ app, said }) =>
			h(
				"button",
				{ key: app, type: "button", className: "wg-studio-ai-jobs-app", onClick: () => showCard(buildKeyOf(app)) },
				[
					h(Loader, { key: "mark", label: "", size: 16 }),
					h("b", { key: "app" }, app),
					h("span", { key: "said", className: "wg-studio-ai-jobs-said" }, said),
				],
			),
		),
	);
}

function workingLineOf({ app, jobs }: AppJobs): WorkingLine[] {
	const said = workingSaidOf(jobs);
	if (said === null) return [];
	const running = jobs.filter((job) => job.status === "running").length;
	return [{ app, said: running > 1 ? WORKING.replace("{count}", String(running)).replace("{said}", said) : said }];
}
