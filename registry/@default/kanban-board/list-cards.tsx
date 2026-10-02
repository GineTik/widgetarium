import type { ReactNode } from "react";
import type { CardFace, Dragging, TaskRow } from "./types";

type ListCardsProps = {
	rows: TaskRow[];
	cards: CardFace[];
	CardComponent: (given: { getTask: CardFace }) => ReactNode;
	canWrite: boolean;
	dragging: Dragging;
	opened: unknown;
	onOpen?: ((row: TaskRow) => void) | undefined;
};

export function ListCards({ rows, cards, CardComponent, canWrite, dragging, opened, onOpen }: ListCardsProps) {
	return cards.map((task, index) => {
		const row = rows[index];
		if (!row) return null;
		return (
			<div
				key={row.ref}
				className={`ok-card-slot${row.ref === opened ? " is-open" : ""}`}
				draggable={canWrite}
				onDragStart={() => dragging?.pick(row)}
				onDragEnd={() => dragging?.drop()}
				onClick={() => onOpen?.(row)}
			>
				<CardComponent getTask={task} />
			</div>
		);
	});
}
