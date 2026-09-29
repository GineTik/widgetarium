import type { Row } from "widgetarium";
import { Icon } from "widgetarium/kit";
import type { Step, StepStatus } from "./types";

const DOT_GLYPH: Record<StepStatus, string | null> = { pending: null, active: null, done: "tick", failed: "close" };

export function StepRow({ step }: { step: Row<Step> }) {
	const glyph = DOT_GLYPH[step.status] ?? null;
	const hint = step.status === "active" || step.status === "failed" ? (step.hint ?? "") : "";
	return (
		<li className="wg-task-progress-step" data-status={step.status}>
			<span className="wg-task-progress-dot">{glyph ? <Icon name={glyph} size={12} /> : null}</span>
			<span className="wg-task-progress-label">{step.label}</span>
			{hint === "" ? null : <span className="wg-task-progress-hint">{hint}</span>}
		</li>
	);
}
