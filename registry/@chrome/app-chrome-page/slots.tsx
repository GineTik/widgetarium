import type { SlotList } from "widgetarium";

export function Slots({ of }: { readonly of: SlotList }) {
	return (
		<>
			{of.map((Slot) => (
				<Slot key={Slot.id} />
			))}
		</>
	);
}
