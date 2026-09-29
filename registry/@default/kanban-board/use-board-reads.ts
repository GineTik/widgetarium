import { pickedValue, useData } from "widgetarium";
import { useMemo } from "react";
import type { KanbanProps, TaskRow } from "./types";

type BoardReadsGiven = Pick<KanbanProps, "selection" | "opened" | "tasks" | "board"> & {
	grouping: KanbanProps["groupBy"];
};

export function useBoardReads({ selection, opened, tasks, board, grouping }: BoardReadsGiven) {
	const todayForEveryCard = useMemo(() => new Date(), []);
	const tasksData = useData(tasks.list);
	const rows: TaskRow[] = useMemo(() => tasksData.data, [tasksData.data]);

	return {
		tasksData,
		rows,
		today: todayForEveryCard,
		onBoard: pickedValue(selection.value),
		openedRef: opened.value,
		record: board.value,
		groupBy: grouping || "status",
	};
}
