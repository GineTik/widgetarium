import {
	ICrudGateway,
	IHost,
	INavigator,
	ISlot,
	IValueGateway,
	createWidget,
	defineLayout,
	defineMetadata,
	defineProps,
	z,
} from "widgetarium";
import type { Board } from "@default/lib";
import { useState } from "react";
import { BoardDialogs } from "./board-dialogs";
import { BoardStrip } from "./board-strip";
import { LoadingBoard } from "./loading-board";
import { CSS } from "./style";
import type { CardFace, KanbanColumn, TaskRow } from "./types";
import { useBoardColumns } from "./use-board-columns";
import { useBoardReads } from "./use-board-reads";
import { useCarriedTask } from "./use-carried-task";
import { useColumnReorder } from "./use-column-reorder";
import { useIdRepair } from "./use-id-repair";
import { useListRename } from "./use-list-rename";
import { useTaskWrites } from "./use-task-writes";

export const TaskSchema = z.looseObject({
	path: z.string().optional(),
	name: z.string().optional(),
	props: z.record(z.string(), z.unknown()).optional(),
	attachments: z.number().optional(),
	body: z.string().optional(),
});

function toColumns(rows: TaskRow[], columnNames: string[], groupBy: string, archived: string[]): KanbanColumn[] {
	const byName = new Map<string, TaskRow[]>(columnNames.map((name) => [name, []]));
	for (const row of rows) {
		const value = String(row.props?.[groupBy] ?? columnNames[0]);
		if (archived.includes(value)) continue;
		const held = byName.get(value) ?? [];
		byName.set(value, held);
		held.push(row);
	}
	return [...byName.entries()].map(([title, held]) => ({ title, rows: held }));
}

export const props = defineProps({
	tasks: ICrudGateway.of(TaskSchema, {
		sort: [{ prop: "order", dir: "asc" }],
		where: [
			{ prop: "board", op: "is", value: { wants: "@default/editable-tabs/selection" } },
			{ spread: { wants: "@default/filter-panel/chosen" } },
		],
		default: [],
	}),
	boards: ICrudGateway.of(z.custom<Board>(), { default: [] }).pick("list", "create", "update", "repairIds"),
	selection: IValueGateway.of(z.unknown()).pick("get", "update"),
	board: IValueGateway.of(
		z.custom<Board>().default({ columns: [{ name: "To Do" }, { name: "Doing" }, { name: "Done" }] }),
	).pick("get", "update"),
	opened: IValueGateway.of(z.string().nullable()).pick("get", "update"),
	groupBy: IValueGateway.of(z.string().default("status")).pick("get"),
	card: ISlot.of<{ task: CardFace }>({
		default: "@default/task-card",
		surface: "group",
		gives: { task: ["title", "tags", "tagTones", "priority", "status", "progress", "initials", "due", "files"] },
	}),
	host: IHost,
	navigator: INavigator,
});

const KanbanBoard = createWidget({
	inject: props,
	draw: ({ board, groupBy: grouping, card, tasks, boards, selection, opened, host, navigator }) => {
		const reading = useBoardReads({ selection, opened, tasks, board, grouping });
		const { rows, today, onBoard, openedRef, record, groupBy } = reading;

		const lists = useBoardColumns(board, record);
		const reordering = useColumnReorder(lists.columnNames, lists.boardColumns, lists.save);
		const repairing = useIdRepair(boards);
		const carrying = useCarriedTask();
		const writing = useTaskWrites({
			tasks,
			rows,
			groupBy,
			onBoard,
			carried: carrying.carried,
			onMoved: carrying.release,
		});

		const columns = toColumns(rows, lists.columnNames, groupBy, lists.archivedColumns);
		const [archiving, setArchiving] = useState<string | null>(null);
		const renameList = useListRename({ lists, writing, host });

		if (reading.tasksData.isLoading && rows.length === 0) return <LoadingBoard />;

		return (
			<div className="orbi orbi-kanban">
				<style>{CSS}</style>
				<BoardStrip
					columns={columns}
					today={today}
					CardSlot={card}
					openedRef={openedRef}
					lists={lists}
					reordering={reordering}
					carrying={carrying}
					writing={writing}
					repairing={repairing}
					onOpen={(row) => opened.update(row.ref)}
					onArchive={setArchiving}
					onRename={renameList}
				/>

				<BoardDialogs
					archiving={archiving}
					onArchivingChange={setArchiving}
					heldByArchiving={columns.find((column) => column.title === archiving)?.rows.length ?? 0}
					reading={reading}
					lists={lists}
					repairing={repairing}
					board={board}
					tasks={tasks}
					opened={opened}
					host={host}
					navigator={navigator}
				/>
			</div>
		);
	},
});

export const metadata = defineMetadata(KanbanBoard, {
	title: "Kanban board",
	description: "Draws tasks as cards in columns and moves them between columns by drag.",
	keywords: [
		"kanban",
		"board",
		"columns",
		"cards",
		"tasks",
		"drag",
		"drop",
		"todo",
		"doing",
		"done",
		"backlog",
		"sprint",
		"agile",
		"swimlane",
		"workflow",
	],
	preview: {
		size: { w: 5, h: 4 },
		props: {
			tasks: {
				rows: [
					{
						path: "preview/1.md",
						title: "Design the onboarding flow",
						status: "To Do",
						priority: "P1",
						approval: "Check",
						progress: 34,
						assignees: ["Alex Morgan", "Maya Chen"],
						order: 1,
						tags: ["design", "research"],
						tagTones: { design: "error" },
					},
					{
						path: "preview/2.md",
						title: "Collect competitor references",
						status: "To Do",
						priority: "P2",
						approval: "Check",
						progress: 45,
						assignees: ["Sam Okafor"],
						order: 2,
						tags: ["research"],
						tagTones: { research: "warning" },
					},
					{
						path: "preview/3.md",
						title: "Build the board layout engine",
						status: "Doing",
						priority: "P1",
						approval: "Check",
						progress: 68,
						assignees: ["Dana Reid", "Liam Parker"],
						order: 3,
						tags: ["engine", "design"],
						tagTones: { engine: "accent" },
					},
					{
						path: "preview/4.md",
						title: "Ship the colour token set",
						status: "Done",
						priority: "P2",
						approval: "Approve",
						progress: 100,
						assignees: ["Kai Lawson"],
						order: 4,
						tags: ["tokens"],
						tagTones: { tokens: "success" },
					},
				],
			},
			board: {
				value: {
					columns: [{ name: "To Do" }, { name: "Doing" }, { name: "Done" }],
					properties: ["Status", "Priority", "Assignees"],
				},
			},
		},
		shot: { of: "422217216" },
	},
	props: {
		tasks: { label: "Tasks" },
		boards: { label: "Boards" },
		selection: {
			label: "Shown board",
			hint: "Which board this draws. Bind a tab strip and the two move together.",
			wants: "@default/editable-tabs/selection",
			source: {
				implementation: "@core/selection",
				fields: { rows: "boards", field: "board", whenNothingPicked: "first" },
			},
		},
		board: {
			label: "Board",
			hint: "The board this draws: its columns, their order and which of them are archived.",
			source: {
				implementation: "@core/selected-row",
				fields: { rows: "boards", picked: "selection", field: "board", whenNothingPicked: "first" },
			},
		},
		opened: {
			label: "Opened task",
			hint: "Which card is open, as a box. The board draws it full size itself.",
			source: { implementation: "@core/selection", fields: { rows: "tasks" } },
		},
		groupBy: { label: "Group tasks by property" },
	},
});

export const layout = defineLayout({
	role: "collection",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 240, stackBelowPx: 320 },
	view: "Kanban",
});

export default KanbanBoard;
