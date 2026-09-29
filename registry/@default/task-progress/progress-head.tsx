import { Icon } from "widgetarium/kit";
import { NO_STEPS, overallOf } from "./overall";
import type { OverallStatus, Progress, Step } from "./types";

const STEPS_DONE = "{done} of {total} steps done";
const OPEN_STEPS = "Show the steps";
const CLOSE_STEPS = "Hide the steps";

const MARK_GLYPH: Record<OverallStatus, string | null> = {
	running: null,
	done: "tick",
	failed: "close",
	stopped: "minus",
};

export function ProgressHead({ progress, onToggleOpen }: { progress: Progress; onToggleOpen: (() => void) | null }) {
	const mark = MARK_GLYPH[overallOf(progress.rows)];
	const statusLine = saidNow(progress.rows);
	return (
		<button
			type="button"
			className="wg-task-progress-head"
			aria-expanded={progress.isOpen}
			aria-label={progress.isOpen ? CLOSE_STEPS : OPEN_STEPS}
			disabled={!onToggleOpen}
			onClick={onToggleOpen ?? undefined}
		>
			<span className="wg-task-progress-mark">{mark ? <Icon name={mark} size={16} /> : null}</span>
			<span className="wg-task-progress-said">
				<span className="wg-task-progress-title">{progress.title}</span>
				<span className="wg-task-progress-now">
					<span key={statusLine}>{statusLine}</span>
				</span>
			</span>
			{progress.clock === "" ? null : <span className="wg-task-progress-clock">{progress.clock}</span>}
			<Icon name="chevron-down" size={14} className="wg-task-progress-chevron" />
		</button>
	);
}

function saidNow(steps: readonly Step[]): string {
	if (steps.length === 0) return NO_STEPS;
	const named = steps.find((step) => step.status === "active") ?? steps.find((step) => step.status === "failed");
	if (named) return named.label;
	const done = steps.filter((step) => step.status === "done").length;
	return STEPS_DONE.replace("{done}", String(done)).replace("{total}", String(steps.length));
}
