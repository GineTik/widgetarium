import { Pill } from "widgetarium/kit";
import type { Counted } from "./types";

export function Counts({ counted }: { counted: Counted[] }) {
	if (counted.length === 0) return null;
	return (
		<div className="flow-project-card-counts">
			{counted.map((one) => (
				<Pill key={one.field} tone={one.tone} className="flow-project-card-count" title={one.label}>
					<b className="flow-project-card-count-number">{one.count}</b>
					<span className="flow-project-card-count-label">{one.label}</span>
				</Pill>
			))}
		</div>
	);
}
