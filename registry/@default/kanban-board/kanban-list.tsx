import { Card } from "widgetarium/kit";
import { useState, type DragEvent } from "react";
import type { Slot } from "widgetarium";
import { AddTask } from "./add-task";
import { FallbackCard } from "./fallback-card";
import { ListCards } from "./list-cards";
import { ListHead } from "./list-head";
import type { CardFace, Dragging, KanbanColumn, TaskRow } from "./types";

type ListCarry = {
	shift?: number | undefined;
	placeholder?: boolean;
	onGrab?: ((event: DragEvent<HTMLElement>) => void) | undefined;
	onRelease?: () => void;
};

type KanbanListProps = {
	column: KanbanColumn;
	cards: CardFace[];
	CardSlot: Slot<{ getTask: CardFace }>;
	onAdd?: (title: string) => void;
	onArchive?: (() => void) | undefined;
	onRename?: ((name: string | null) => void) | undefined;
	onOpen?: (row: TaskRow) => void;
	onDropTask?: () => void;
	carry: ListCarry;
	canWrite: boolean;
	dragging: Dragging;
	opened: unknown;
};

export function KanbanList({
	column: { title, rows },
	cards,
	CardSlot,
	onAdd,
	onArchive,
	onRename,
	onOpen,
	onDropTask,
	carry: { shift, placeholder, onGrab, onRelease },
	canWrite,
	dragging,
	opened,
}: KanbanListProps) {
	const [isOver, setOver] = useState(false);
	const [isRenaming, setRenaming] = useState(false);

	return (
		<Card
			type="group"
			className={`ok-list${isOver ? " is-over" : ""}${placeholder ? " is-placeholder" : ""}`}
			style={shift === undefined ? undefined : { transform: `translateX(${shift}px)` }}
			onDragOver={(event: DragEvent<HTMLElement>) => {
				if (!dragging?.row) return;
				event.preventDefault();
				setOver(true);
			}}
			onDragLeave={() => setOver(false)}
			onDrop={(event: DragEvent<HTMLElement>) => {
				event.preventDefault();
				setOver(false);
				onDropTask?.();
			}}
		>
			<div
				className="ok-list-head"
				draggable={Boolean(onGrab) && !isRenaming}
				onDragStart={onGrab}
				onDragEnd={onRelease}
			>
				<ListHead
					title={title}
					count={rows.length}
					onArchive={onArchive}
					onRename={onRename}
					onRenaming={setRenaming}
				/>
			</div>

			<ListCards
				rows={rows}
				cards={cards}
				CardComponent={CardSlot ?? FallbackCard}
				canWrite={canWrite}
				dragging={dragging}
				opened={opened}
				onOpen={onOpen}
			/>

			{canWrite && onAdd ? <AddTask onAdd={onAdd} /> : null}
		</Card>
	);
}
