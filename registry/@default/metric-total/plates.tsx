import { MetricPlate } from "./metric-plate";
import { compactOf, signedOf } from "./numbers";
import type { Summary } from "./types";

export function Plates({ summary }: { summary: Summary }) {
	return (
		<div data-part="plates" className="mt3-plates">
			<MetricPlate name="today" label="today" value={signedOf(summary.today)} isTone />
			<MetricPlate name="peak" label="peak" value={compactOf(summary.peak)} />
			<MetricPlate name="low" label="low" value={compactOf(summary.low)} />
			<MetricPlate name="avg" label="avg" value={compactOf(summary.avg)} />
		</div>
	);
}
