import {
	ICommand,
	IHost,
	INavigator,
	IQuery,
	ISlot,
	RecordRefSchema,
	createWidget,
	defineLayout,
	defineMetadata,
	z,
} from "widgetarium";
import { BoardSchema } from "@default/lib";
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

const TaskPropsSchema = z.looseObject({
	title: z.unknown().optional(),
	order: z.unknown().optional(),
	priority: z.unknown().optional(),
	approval: z.unknown().optional(),
	progress: z.unknown().optional(),
	assignees: z.unknown().optional(),
});

export const TaskSchema = z.looseObject({
	path: z.string().optional(),
	name: z.string().optional(),
	props: TaskPropsSchema.optional(),
	attachments: z.number().optional(),
	body: z.string().optional(),
});

const ChosenSchema = z.record(z.string(), z.union([z.string(), z.array(z.string())]));

const KanbanBoardSchema = BoardSchema.extend({
	properties: z.union([z.string(), z.array(z.string())]).optional(),
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

const KanbanBoard = createWidget({
	inject: {
		getTasks: IQuery.expects(z.array(TaskSchema).default([])),
		createTask: ICommand.sends(TaskSchema.extend({ id: z.uuid() })),
		updateTask: ICommand.sends(TaskSchema.partial().extend({ ref: RecordRefSchema })),
		getChosen: IQuery.expects(ChosenSchema.default({})),
		getBoards: IQuery.expects(z.array(KanbanBoardSchema).default([])),
		repairBoardIds: ICommand,
		getSelection: IQuery.expects(z.unknown()),
		getBoard: IQuery.expects(
			KanbanBoardSchema.default({ columns: [{ name: "To Do" }, { name: "Doing" }, { name: "Done" }] }),
		),
		updateBoard: ICommand.sends(KanbanBoardSchema),
		getOpened: IQuery.expects(z.string().nullable().default(null)),
		open: ICommand.sends(z.string().nullable()),
		getGroupBy: IQuery.expects(z.string().default("status")),
		card: ISlot.of<{ getTask: CardFace }>({
			default: "@default/task-card",
			surface: "group",
			gives: { getTask: ["title", "tags", "tagTones", "priority", "status", "progress", "initials", "due", "files"] },
		}),
		host: IHost,
		navigator: INavigator,
	},
	draw: ({
		getBoard,
		updateBoard,
		getGroupBy: grouping,
		card,
		getTasks,
		createTask,
		updateTask,
		getChosen,
		getBoards,
		repairBoardIds,
		getSelection,
		getOpened,
		open,
		host,
		navigator,
	}) => {
		const reading = useBoardReads({ getSelection, getOpened, getTasks, getChosen, getBoard, grouping });
		const { rows, today, onBoard, openedRef, record, groupBy } = reading;

		const lists = useBoardColumns(updateBoard, record);
		const reordering = useColumnReorder(lists.columnNames, lists.boardColumns, lists.save);
		const repairing = useIdRepair(getBoards, repairBoardIds);
		const carrying = useCarriedTask();
		const writing = useTaskWrites({
			createTask,
			updateTask,
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
					onOpen={(row) => void open(row.ref)}
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
					updateBoard={updateBoard}
					getTasks={getTasks}
					updateTask={updateTask}
					onClose={() => void open(null)}
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
			getTasks: {
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
			getBoard: {
				value: {
					columns: [{ name: "To Do" }, { name: "Doing" }, { name: "Done" }],
					properties: ["Status", "Priority", "Assignees"],
				},
			},
		},
		shot: { of: "422217216" },
	},
	props: {
		getTasks: { label: "Tasks", aka: ["tasks"] },
		createTask: {
			label: "Add a task",
			source: { implementation: "@core/rows-create", fields: { target: "getTasks" } },
		},
		updateTask: {
			label: "Change a task",
			source: { implementation: "@core/rows-update", fields: { target: "getTasks" } },
		},
		getChosen: {
			label: "Chosen filters",
			hint: "Narrows the cards to what a filter panel has chosen.",
			wants: "@default/filter-panel/getChosen",
		},
		getBoards: { label: "Boards", aka: ["boards"] },
		repairBoardIds: {
			label: "Repair duplicate board ids",
			source: { implementation: "@core/rows-repair-ids", fields: { target: "getBoards" } },
		},
		getSelection: {
			label: "Shown board",
			hint: "Which board this draws. Bind a tab strip and the two move together.",
			aka: ["selection"],
			wants: "@default/editable-tabs/getSelection",
			source: {
				implementation: "@core/selection",
				fields: { rows: "getBoards", field: "board", whenNothingPicked: "first" },
			},
		},
		getBoard: {
			label: "Board",
			hint: "The board this draws: its columns, their order and which of them are archived.",
			aka: ["board"],
			source: {
				implementation: "@core/selected-row",
				fields: { rows: "getBoards", picked: "getSelection", field: "board", whenNothingPicked: "first" },
			},
		},
		updateBoard: {
			label: "Change the board's columns",
			source: { implementation: "@core/value-set", fields: { target: "getBoard" } },
		},
		getOpened: {
			label: "Opened task",
			hint: "Which card is open, as a box. The board draws it full size itself.",
			aka: ["opened"],
			source: { implementation: "@core/selection", fields: { rows: "getTasks" } },
		},
		open: {
			label: "Open a task",
			source: { implementation: "@core/value-set", fields: { target: "getOpened" } },
		},
		getGroupBy: { label: "Group tasks by property", aka: ["groupBy"] },
	},
});

export const layout = defineLayout({
	role: "collection",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 240, stackBelowPx: 320 },
	view: "Kanban",
});

export default KanbanBoard;
