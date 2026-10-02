import { useData } from "widgetarium";
import { useState } from "react";
import type { KanbanProps } from "./types";

export function useIdRepair(getBoards: KanbanProps["getBoards"], repairBoardIds: KanbanProps["repairBoardIds"]) {
	const duplicatesFoundOnRead = useData(getBoards).duplicates;
	const remintCount = duplicatesFoundOnRead.reduce((count, entry) => count + entry.remints.length, 0);
	const [isAsking, setAsking] = useState(false);

	return {
		remintCount,
		canRepair: repairBoardIds.can().can && remintCount > 0,
		isAsking,
		ask: () => setAsking(true),
		dismiss: () => setAsking(false),
		repair: async () => {
			setAsking(false);
			await repairBoardIds();
		},
	};
}
