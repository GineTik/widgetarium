import { createElement as h } from "react";
import type { ReactElement } from "react";
import { clamp } from "./catalogue-entries.js";
import type { FetchProgress } from "./engine/widget-source.js";

export interface RingProps {
	readonly step: FetchProgress | null;
}

const RING_RADIUS = 14;

const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

const WAITING_ARC = 0.28;

export function Ring({ step }: RingProps): ReactElement {
	const measured = step !== null && step.total > 0;
	const share = step !== null && measured ? clamp(step.done / step.total, 0, 1) : 0;
	return h(
		"svg",
		{
			className: measured ? "wg-cat-ring" : "wg-cat-ring is-waiting",
			viewBox: "0 0 32 32",
			width: 32,
			height: 32,
			"aria-hidden": "true",
		},
		[
			h("circle", { key: "track", className: "wg-cat-ring-track", cx: 16, cy: 16, r: RING_RADIUS }),
			h("circle", {
				key: "arc",
				className: "wg-cat-ring-arc",
				cx: 16,
				cy: 16,
				r: RING_RADIUS,
				strokeDasharray: measured ? RING_LENGTH : RING_LENGTH * WAITING_ARC,
				strokeDashoffset: measured ? RING_LENGTH * (1 - share) : 0,
			}),
		],
	);
}
