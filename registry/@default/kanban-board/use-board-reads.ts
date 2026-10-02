import { normalizeWhere, pickedValue, useData } from "widgetarium";
import { useMemo } from "react";
import type { KanbanProps, TaskRow } from "./types";

type BoardReadsGiven = Pick<KanbanProps, "getSelection" | "getOpened" | "getTasks" | "getChosen" | "getBoard"> & {
	grouping: KanbanProps["getGroupBy"];
};

const BY_ORDER = [{ prop: "order", dir: "asc" as const }];

export function useBoardReads({ getSelection, getOpened, getTasks, getChosen, getBoard, grouping }: BoardReadsGiven) {
	const todayForEveryCard = useMemo(() => new Date(), []);
	const onBoard = pickedValue(getSelection);
	const where = [...normalizeWhere({ board: getSelection }), ...normalizeWhere(getChosen)];
	const tasksData = useData(getTasks, { where, sort: BY_ORDER });
	const rows: TaskRow[] = useMemo(() => tasksData.data, [tasksData.data]);

	return {
		tasksData,
		rows,
		today: todayForEveryCard,
		onBoard,
		openedRef: getOpened,
		record: getBoard,
		groupBy: grouping || "status",
	};
}
