import type { Group } from "./types";

export function Bar({ group, widest }: { group: Group; widest: number }) {
	const width = Math.max(2, Math.round((group.count / widest) * 100));
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "var(--wg-gap-parts)" }}>
			<div style={{ display: "flex", justifyContent: "space-between", gap: "var(--wg-gap-parts)" }}>
				<span>{group.key}</span>
				<span style={{ color: "var(--wg-kit-text-muted)" }}>{group.count}</span>
			</div>
			<div className="breakdown-track">
				<div className="breakdown-fill" style={{ width: `${width}%` }} />
			</div>
		</div>
	);
}
