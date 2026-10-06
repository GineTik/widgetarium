import type { SlotList } from "widgetarium";
import { LayoutItem } from "widgetarium/kit";
import { NothingPlaced } from "./nothing-placed";

export function Placed({ held }: { held: SlotList }) {
	if (held.length === 0) return <NothingPlaced />;
	return (
		<>
			{held.map((Slot) =>
				Slot.entry?.surface ? (
					<Slot key={Slot.id} className="wg-section-stands" />
				) : (
					<LayoutItem key={Slot.id} className="wg-section-stands">
						<Slot />
					</LayoutItem>
				),
			)}
		</>
	);
}
