import { Bar } from "./bar";
import { Ceiling } from "./ceiling";
import { More } from "./more";
import type { Group } from "./types";

type BarsProps = { groups: Group[]; shown: number; step: number; onMore: (() => void) | null; total: number | null };

export function Bars({ groups, shown, step, onMore, total }: BarsProps) {
	const top = groups.slice(0, shown);
	const widest = top[0]?.count ?? 1;

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "var(--wg-gap-items)" }}>
			{top.map((group) => (
				<Bar key={group.key} group={group} widest={widest} />
			))}
			<More left={groups.slice(top.length)} step={step} onMore={onMore} />
			<Ceiling total={total} />
		</div>
	);
}
