import { Fragment } from "react";
import type { ReactNode } from "react";
import { Card } from "./card";
import type { CardRow, Dragging, Picking } from "./types";

export function Pen({
	name,
	cards,
	drag,
	picked,
	onPressCard,
	onEditCard,
	onPlace,
	after,
}: Picking & { name: string | null; cards: CardRow[]; after?: ReactNode }) {
	const carried = drag.carry?.isDragging ? drag.carry.row.ref : "";
	const shown = cards.filter((row) => row.ref !== carried);
	const slotAt = slotIndex(drag, name, shown.length);

	return (
		<div
			className={`wr-pen${slotAt === -1 ? "" : " is-target"}`}
			data-pen={name ?? ""}
			onClick={() => (picked ? onPlace(name) : undefined)}
		>
			{shown.map((row, at) => (
				<Fragment key={row.ref}>
					{slotAt === at ? <span className="wr-slot" /> : null}
					<Card row={row} drag={drag} isPicked={picked === row.ref} onPress={onPressCard} onEdit={onEditCard} />
				</Fragment>
			))}
			{slotAt === shown.length ? <span className="wr-slot" /> : null}
			{after}
		</div>
	);
}

function slotIndex(drag: Dragging, name: string | null, shown: number) {
	if (!drag.carry?.isDragging || drag.target?.tier !== name) return -1;
	return Math.min(drag.target?.at ?? shown, shown);
}
