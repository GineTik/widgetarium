import { createElement as h } from "react";
import type { ReactElement } from "react";
import { cn } from "../utils/cn";

export interface ProgressRingProps {
	readonly done?: number | undefined;
	readonly total?: number | undefined;
	readonly label?: string | undefined;
	readonly className?: string | undefined;
}

const RING_RADIUS = 14;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const WAITING_ARC = 0.28;

export function ProgressRing({ done = 0, total = 0, label, className }: ProgressRingProps): ReactElement {
	const isMeasured = total > 0;
	const share = isMeasured ? Math.min(Math.max(done / total, 0), 1) : 0;
	return (
		<span className={cn("wg-kit-ring", className)} role="progressbar" aria-label={label}>
			<svg
				className={isMeasured ? "wg-kit-ring-svg" : "wg-kit-ring-svg is-waiting"}
				viewBox="0 0 32 32"
				aria-hidden="true"
			>
				<circle className="wg-kit-ring-track" cx={16} cy={16} r={RING_RADIUS} />
				<circle
					className="wg-kit-ring-arc"
					cx={16}
					cy={16}
					r={RING_RADIUS}
					strokeDasharray={isMeasured ? RING_LENGTH : RING_LENGTH * WAITING_ARC}
					strokeDashoffset={isMeasured ? RING_LENGTH * (1 - share) : 0}
				/>
			</svg>
			<span className="wg-kit-ring-stop" />
		</span>
	);
}
