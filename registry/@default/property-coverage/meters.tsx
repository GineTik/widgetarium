import { Ceiling, Line } from "widgetarium/kit";
import { Meter } from "./meter";
import { More } from "./more";
import type { Coverage } from "./types";

type MetersProps = {
	coverage: Coverage[];
	shown: number;
	step: number;
	onMore: (() => void) | null;
	counted: number;
	total: number | null;
};

const NO_PROPERTIES = "None of these notes carries a property.";

export function Meters({ coverage, shown, step, onMore, counted, total }: MetersProps) {
	if (coverage.length === 0) return <Line tone="var(--wg-kit-text-muted)" text={NO_PROPERTIES} />;
	const top = coverage.slice(0, shown);

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "var(--wg-gap-items)" }}>
			{top.map((property) => (
				<Meter key={property.key} coverage={property} counted={counted} />
			))}
			<More left={coverage.length - top.length} step={step} onMore={onMore} />
			<Ceiling total={total} tone="var(--text-faint)" />
		</div>
	);
}
