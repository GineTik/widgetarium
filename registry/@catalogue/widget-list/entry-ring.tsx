import { ProgressRing } from "widgetarium/kit";
import type { Job } from "./types";

export function EntryRing({ job, label }: { readonly job: Job; readonly label: string }) {
	return (
		<span className="wg-catalogue-card-ring">
			<ProgressRing done={job.done} total={job.total} label={label} />
		</span>
	);
}
