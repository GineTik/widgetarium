import { Icon, Card } from "widgetarium/kit";
import type { Slot } from "widgetarium";
import { AddList } from "./add-list";
import { KanbanList } from "./kanban-list";
import { MONTHS } from "./months";
import { keyFor, toTrimmedList } from "./task-fields";
import type { CardFace, KanbanColumn, TaskProps, TaskRow } from "./types";
import type { useBoardColumns } from "./use-board-columns";
import type { useCarriedTask } from "./use-carried-task";
import type { useColumnReorder } from "./use-column-reorder";
import type { useIdRepair } from "./use-id-repair";
import type { useTaskWrites } from "./use-task-writes";

type BoardStripProps = {
	columns: KanbanColumn[];
	today: Date;
	CardSlot: Slot<{ task: CardFace }>;
	openedRef: unknown;
	lists: ReturnType<typeof useBoardColumns>;
	reordering: ReturnType<typeof useColumnReorder>;
	carrying: ReturnType<typeof useCarriedTask>;
	writing: ReturnType<typeof useTaskWrites>;
	repairing: ReturnType<typeof useIdRepair>;
	onOpen: (row: TaskRow) => void;
	onArchive: (title: string) => void;
	onRename: (title: string, next: string | null) => void;
};

const REPAIR_BOARDS = "Repair duplicate ids";

export function BoardStrip({
	columns,
	today,
	CardSlot,
	openedRef,
	lists,
	reordering,
	carrying,
	writing,
	repairing,
	onOpen,
	onArchive,
	onRename,
}: BoardStripProps) {
	return (
		<div
			className={`ok-board${reordering.isReordering ? " is-dragging" : ""}`}
			ref={reordering.boardRef}
			onDragOver={reordering.aim}
			onDrop={reordering.drop}
		>
			{columns.map((column, index) => (
				<KanbanList
					key={column.title}
					column={column}
					cards={column.rows.map((row) => toCard(row, today))}
					CardSlot={CardSlot}
					canWrite={writing.canCreate}
					dragging={carrying.dragging}
					carry={{
						shift: reordering.shiftOf(index),
						placeholder: reordering.carriedFrom === index,
						onGrab: lists.canEdit && index < lists.columnNames.length ? reordering.grab(index) : undefined,
						onRelease: reordering.release,
					}}
					onAdd={(title) => writing.add(column.title, title)}
					onArchive={lists.canEdit ? () => onArchive(column.title) : undefined}
					onRename={lists.canEdit ? (next) => onRename(column.title, next) : undefined}
					onOpen={onOpen}
					onDropTask={() => writing.moveCarriedTo(column.title)}
					opened={openedRef}
				/>
			))}
			{lists.canEdit ? <AddList onAdd={lists.add} /> : null}
			{repairing.canRepair ? (
				<Card type="group" asChild>
					<button type="button" className="ok-add-list-rest ok-repair-ids" onClick={repairing.ask}>
						<Icon name="folder" size={16} />
						<span>{REPAIR_BOARDS}</span>
					</button>
				</Card>
			) : null}
		</div>
	);
}

// TRADE-OFF: the year only when it is not this one; otherwise the card is wrong about a whole year.
function dateLabel(value: unknown, now: Date) {
	const date = new Date(String(value));
	if (Number.isNaN(date.getTime())) return String(value);
	const day = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
	return date.getFullYear() === now.getFullYear() ? day : `${day} ${date.getFullYear()}`;
}

function dueOf(deadline: unknown, now: Date): { due?: string } {
	if (deadline === undefined || deadline === null || deadline === "") return {};
	return { due: dateLabel(deadline, now) };
}

function filesOf(attachments: number | undefined): { files?: number } {
	if (!attachments || attachments <= 0) return {};
	return { files: attachments };
}

function toCard(row: TaskRow, now: Date): CardFace {
	const props: TaskProps = row.props ?? {};
	const deadline = props[keyFor(props, "deadline")];
	return {
		title: props.title ?? row.name,
		tags: toTrimmedList(props[keyFor(props, "tags")]),
		tagTones: props[keyFor(props, "tagTones")],
		priority: props.priority,
		status: props.approval,
		progress: props.progress,
		initials: toTrimmedList(props.assignees),
		...dueOf(deadline, now),
		...filesOf(row.attachments),
	};
}
