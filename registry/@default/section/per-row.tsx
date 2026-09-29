import type { RecordRef, Slot } from "widgetarium";
import { LayoutItem } from "widgetarium/kit";

type Item = { ref: RecordRef };

export function PerRow({ Drawn, rows }: { Drawn: Slot<Record<string, unknown>> | undefined; rows: Item[] }) {
	if (!Drawn) return null;
	return (
		<>
			{rows.map((row) => (
				<LayoutItem key={String(row.ref)}>
					<Drawn {...row} />
				</LayoutItem>
			))}
		</>
	);
}
