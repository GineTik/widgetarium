import type { SlotList } from "widgetarium";

export function Controls({ held }: { held: SlotList }) {
	const shown = held.filter((Slot) => !Slot.entry?.problem);
	if (shown.length === 0) return null;
	return (
		<div className="wg-section-controls">
			{shown.map((Slot) => (
				<Slot key={Slot.id} />
			))}
		</div>
	);
}
