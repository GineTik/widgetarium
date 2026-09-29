import { Icon } from "widgetarium/kit";
import { nameOf } from "@default/lib";
import { Face } from "./face";
import type { CardRow, Dragging } from "./types";

export function Card({
	row,
	drag,
	isPicked,
	onPress,
	onEdit,
}: {
	row: CardRow;
	drag: Dragging;
	isPicked: boolean;
	onPress: (ref: string) => void;
	onEdit: ((row: CardRow) => void) | null;
}) {
	return (
		<div
			className={`wr-card${isPicked ? " is-picked" : ""}`}
			data-card={row.ref}
			onPointerDown={drag.grab(row)}
			onClick={(event) => {
				event.stopPropagation();
				onPress(isPicked ? "" : row.ref);
			}}
		>
			<Face card={row} />
			<span className="wr-cap">{nameOf(row)}</span>
			{onEdit ? (
				<button
					type="button"
					className="wr-edit"
					aria-label="Edit this card"
					onPointerDown={(event) => event.stopPropagation()}
					onClick={(event) => {
						event.stopPropagation();
						onEdit(row);
					}}
				>
					<Icon name="pencil" size={12} />
				</button>
			) : null}
		</div>
	);
}
