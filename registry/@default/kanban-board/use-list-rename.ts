import type { KanbanProps } from "./types";
import type { useBoardColumns } from "./use-board-columns";
import type { useTaskWrites } from "./use-task-writes";

type ListRenameGiven = {
	lists: ReturnType<typeof useBoardColumns>;
	writing: ReturnType<typeof useTaskWrites>;
	host: KanbanProps["host"];
};

export function useListRename({ lists, writing, host }: ListRenameGiven) {
	return async (was: string, next: string | null) => {
		const name = String(next ?? "").trim();
		if (!name || name === was) return;
		if (lists.isNameTaken(name)) return host?.ui?.notify(`"${name}" is already a list`);
		lists.rename(was, name);
		await writing.refileUnder(was, name);
	};
}
