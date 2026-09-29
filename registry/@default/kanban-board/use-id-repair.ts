import { canDo, useData } from "widgetarium";
import { useState } from "react";
import type { KanbanProps } from "./types";

export function useIdRepair(boards: KanbanProps["boards"]) {
	const duplicatesFoundOnRead = useData(boards.list).duplicates;
	const remintCount = duplicatesFoundOnRead.reduce((count, entry) => count + entry.remints.length, 0);
	const [isAsking, setAsking] = useState(false);

	return {
		remintCount,
		canRepair: canDo(boards.repairIds) && remintCount > 0,
		isAsking,
		ask: () => setAsking(true),
		dismiss: () => setAsking(false),
		repair: async () => {
			setAsking(false);
			await boards.repairIds();
		},
	};
}
