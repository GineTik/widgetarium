import { canDo } from "widgetarium";
import {
	archiveColumn,
	archivedColumnsOf,
	patchColumn,
	columnsOf,
	columnsToWrite,
	restoreColumn,
	shownColumnsOf,
	type Board,
	type BoardColumn,
} from "@default/lib";
import { useMemo } from "react";
import type { KanbanProps } from "./types";

export function useBoardColumns(board: KanbanProps["board"], record: Board | null) {
	const boardColumns: BoardColumn[] = useMemo(() => columnsOf(record), [record]);
	const archivedColumns = archivedColumnsOf(boardColumns);
	const authoredColumns = boardColumns.map((column) => column.name);
	const shownColumns = shownColumnsOf(boardColumns);
	const columnNames = shownOrOneFreshColumn(shownColumns, [...authoredColumns, ...archivedColumns]);
	const save = (columns: BoardColumn[]) => board.update(columnsToWrite(columns));

	const columnsAfterRename = (was: string, name: string) => {
		if (authoredColumns.includes(was))
			return patchColumn(boardColumns, was, (column: BoardColumn) => ({ ...column, name }));
		return [...boardColumns, { name }];
	};

	return {
		boardColumns,
		archivedColumns,
		shownColumns,
		columnNames,
		canEdit: canDo(board.update),
		save,
		isNameTaken: (name: string) => columnNames.includes(name) || archivedColumns.includes(name),
		add: (name: string) => {
			const trimmed = String(name ?? "").trim();
			if (!trimmed || shownColumns.includes(trimmed)) return;
			if (archivedColumns.includes(trimmed)) {
				save(patchColumn(boardColumns, trimmed, restoreColumn));
				return;
			}
			save([...boardColumns, { name: trimmed }]);
		},
		rename: (was: string, name: string) => save(columnsAfterRename(was, name)),
		archive: (name: string) => save(patchColumn(boardColumns, name, archiveColumn)),
	};
}

function freeUntitled(taken: string[]) {
	let index = 1;
	while (taken.includes(`Untitled ${index}`)) index += 1;
	return `Untitled ${index}`;
}

function shownOrOneFreshColumn(shownColumns: string[], taken: string[]): string[] {
	if (shownColumns.length > 0) return shownColumns;
	return [freeUntitled(taken)];
}
