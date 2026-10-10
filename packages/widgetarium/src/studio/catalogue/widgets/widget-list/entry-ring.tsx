import { createElement as h } from "react";
import { ProgressRing } from "@widgetarium/kit";
import type { Job } from "./types.js";

export function EntryRing({ job, label }: { readonly job: Job; readonly label: string }) {
	return (
		<span className="wg-studio-catalogue-card-ring">
			<ProgressRing done={job.done} total={job.total} label={label} />
		</span>
	);
}
