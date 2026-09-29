import { cn } from "widgetarium/kit";

const STATUS_SHAPES: Record<string, string> = {
	running: "is-running",
	waiting: "is-waiting",
	queued: "is-waiting",
	blocked: "is-blocked",
	failed: "is-failed",
	done: "is-done",
};

const STATUS_LABELS: Record<string, string> = {
	running: "Running",
	waiting: "Waiting",
	queued: "Queued",
	blocked: "Blocked",
	failed: "Failed",
	done: "Done",
};

export function Mark({ status }: { status: string | undefined }) {
	const key = status?.toLowerCase() ?? "";
	const label = STATUS_LABELS[key] ?? status;
	return <span className={cn("flow-row-mark", STATUS_SHAPES[key])} role="img" aria-label={label} title={label} />;
}
