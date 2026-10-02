import type { KanbanProps, TaskRow } from "./types";

type TaskWritesGiven = {
	createTask: KanbanProps["createTask"];
	updateTask: KanbanProps["updateTask"];
	rows: TaskRow[];
	groupBy: string;
	onBoard: unknown;
	carried: TaskRow | null;
	onMoved: () => void;
};

export function useTaskWrites({ createTask, updateTask, rows, groupBy, onBoard, carried, onMoved }: TaskWritesGiven) {
	const canCreate = createTask.can().can;
	const canUpdate = updateTask.can().can;
	const orderAfterLast = () => rows.reduce((highest, row) => Math.max(highest, Number(row.props?.order) || 0), 0) + 1;

	return {
		canCreate,
		add: async (column: string, title: string) => {
			if (!canCreate) return;
			await createTask({
				id: crypto.randomUUID(),
				props: { title, [groupBy]: column, board: onBoard, order: orderAfterLast(), progress: 0, priority: "P2" },
			});
		},
		refileUnder: async (was: string, name: string) => {
			if (!canUpdate) return;
			for (const row of rows.filter((held) => (held.props?.[groupBy] ?? "") === was)) {
				await updateTask({ ref: row.ref, props: { [groupBy]: name } });
			}
		},
		moveCarriedTo: async (column: string) => {
			if (!carried || !canUpdate) return;
			if ((carried.props?.[groupBy] ?? "") === column) return;
			await updateTask({ ref: carried.ref, props: { [groupBy]: column } });
			onMoved();
		},
	};
}
