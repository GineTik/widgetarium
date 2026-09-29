import { MeterLabel } from "./meter-label";
import type { Coverage } from "./types";

export function Meter({ coverage, counted }: { coverage: Coverage; counted: number }) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "var(--wg-gap-parts)" }}>
			<MeterLabel coverage={coverage} counted={counted} />
			<div className="coverage-track">
				<div className="coverage-fill" style={{ width: `${Math.max(2, coverage.share)}%` }} />
			</div>
		</div>
	);
}
