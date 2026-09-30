import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Board } from "../model.js";

export type SaveBoard = (next: Board, isCommit: boolean) => void;

export interface DraftBoard {
	readonly staged: Board | null;
	readonly setStaged: Dispatch<SetStateAction<Board | null>>;
	readonly board: Board;
	readonly onChange: (next: Board, isCommit?: boolean) => void;
}

export function useDraftBoard(
	saved: Board,
	save: SaveBoard,
	onDrafting: ((isDrafting: boolean) => void) | null | undefined,
): DraftBoard {
	const [staged, setStaged] = useState<Board | null>(null);
	useEffect(() => {
		onDrafting?.(staged !== null);
	});
	return {
		staged,
		setStaged,
		board: staged ?? saved,
		onChange: (next, isCommit = true) => (staged === null ? save(next, isCommit) : setStaged(next)),
	};
}
