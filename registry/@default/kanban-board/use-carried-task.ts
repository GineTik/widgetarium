import { useState } from "react";
import type { Dragging, TaskRow } from "./types";

export function useCarriedTask() {
	const [carried, setCarried] = useState<TaskRow | null>(null);
	const dragging: Dragging = {
		row: carried,
		pick: (row: TaskRow) => setCarried(row),
		drop: () => setCarried(null),
	};
	return { carried, dragging, release: () => setCarried(null) };
}
