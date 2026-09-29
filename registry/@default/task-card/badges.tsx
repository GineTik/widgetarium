import { APPROVAL_TONES, PRIORITY_TONES, Pill, toneOf } from "widgetarium/kit";

const STATUS_LABELS: Record<string, string> = {
	approve: "Approve",
	check: "Check",
	reject: "Reject",
	review: "Review",
};

export function Badges({ priority, status }: { priority: string | null; status: string | null }) {
	if (!priority && !status) return null;
	return (
		<div className="orbi-task-card-badges">
			{priority ? <Pill tone={toneOf(PRIORITY_TONES, priority)}>{priority}</Pill> : null}
			{status ? <Pill tone={toneOf(APPROVAL_TONES, status)}>{labelOf(status)}</Pill> : null}
		</div>
	);
}

function labelOf(status: string): string {
	return STATUS_LABELS[status.toLowerCase()] ?? status;
}
