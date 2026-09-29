import { NO_STEPS } from "./overall";
import { StepRow } from "./step-row";
import type { Progress } from "./types";

export function StepsFold({ progress }: { progress: Progress }) {
	return (
		<div className="wg-task-progress-fold" aria-hidden={!progress.isOpen}>
			{progress.rows.length === 0 ? (
				<p className="wg-task-progress-empty">{NO_STEPS}</p>
			) : (
				<ol className="wg-task-progress-steps">
					{progress.rows.map((step) => (
						<StepRow key={step.ref} step={step} />
					))}
				</ol>
			)}
		</div>
	);
}
