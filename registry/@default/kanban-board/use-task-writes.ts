import { canDo } from "widgetarium";
import type { KanbanProps, TaskRow } from "./types";

type TaskWritesGiven = {
	tasks: KanbanProps["tasks"];
	rows: TaskRow[];
	groupBy: string;
	onBoard: unknown;
	carried: TaskRow | null;
	onMoved: () => void;
};

export function useTaskWrites({ tasks, rows, groupBy, onBoard, carried, onMoved }: TaskWritesGiven) {
	const canCreate = canDo(tasks.create);
	const canUpdate = canDo(tasks.update);
	const orderAfterLast = () => rows.reduce((highest, row) => Math.max(highest, Number(row.props?.order) || 0), 0) + 1;

	return {
		canCreate,
		add: async (column: string, title: string) => {
			if (!canCreate) return;
			await tasks.create({
				props: { title, [groupBy]: column, board: onBoard, order: orderAfterLast(), progress: 0, priority: "P2" },
			});
		},
		refileUnder: async (was: string, name: string) => {
			if (!canUpdate) return;
			for (const row of rows.filter((held) => (held.props?.[groupBy] ?? "") === was)) {
				await tasks.update({ ref: row.ref, data: { props: { [groupBy]: name } } });
			}
		},
		moveCarriedTo: async (column: string) => {
			if (!carried || !canUpdate) return;
			if ((carried.props?.[groupBy] ?? "") === column) return;
			await tasks.update({ ref: carried.ref, data: { props: { [groupBy]: column } } });
			onMoved();
		},
	};
}
