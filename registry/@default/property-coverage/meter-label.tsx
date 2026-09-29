import type { Coverage } from "./types";

export function MeterLabel({ coverage, counted }: { coverage: Coverage; counted: number }) {
	return (
		<div style={{ display: "flex", justifyContent: "space-between", gap: "var(--wg-gap-parts)" }}>
			<span>{coverage.key}</span>
			<span style={{ color: "var(--wg-kit-text-muted)" }}>
				{coverage.filled} of {counted} · {coverage.share}%
			</span>
		</div>
	);
}
