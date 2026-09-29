import { Pill, RowValue } from "widgetarium/kit";
import { textOf } from "./text-of";
import type { Flight } from "./types";

const STAGE_TONES: Record<string, string> = {
	plan: "info",
	build: "accent",
	review: "warning",
	test: "note",
	ship: "success",
	blocked: "error",
	failed: "error",
};

// TRADE-OFF: a cell is drawn empty rather than dropped — a dropped one moves the column under it
export function Trail({ flight }: { flight: Flight }) {
	const stage = textOf(flight.stage);
	const elapsed = textOf(flight.elapsed);
	const initial = initialOf(textOf(flight.who));

	return (
		<RowValue>
			<span className="flow-row-cell is-stage">
				{stage === undefined ? null : <Pill tone={STAGE_TONES[stage.toLowerCase()] ?? "neutral"}>{stage}</Pill>}
			</span>
			<span className="flow-row-cell is-time">{elapsed}</span>
			<span className="flow-row-cell is-face">
				{initial === undefined ? null : (
					<span className="flow-row-face" aria-label={flight.who} title={flight.who}>
						{initial}
					</span>
				)}
			</span>
		</RowValue>
	);
}

function initialOf(who: string | undefined): string | undefined {
	return who === undefined ? undefined : who.charAt(0).toUpperCase();
}
