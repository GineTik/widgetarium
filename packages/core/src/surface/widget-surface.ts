import { createElement as h, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import type { Board as BoardRecord } from "../model.js";
import type { NodePath } from "../tree.js";
import { Board } from "./board.js";
import { boardEdits } from "./board-edits.js";
import { Page } from "./page.js";
import { surfaceParts } from "./surface-parts.js";
import { MIN_LAID_OUT_BOARD_PX } from "./use-board-width.js";
import { useDraftBoard } from "./use-draft-board.js";
import type { SaveBoard } from "./use-draft-board.js";
import { useSettingsSession } from "./use-settings-session.js";
import type { OnActions } from "./use-header-actions.js";
import { useSurfaceShared } from "./use-surface-shared.js";
import type { BoardRegistry, SurfaceHost } from "./use-surface-shared.js";

export interface WidgetSurfaceProps {
	readonly board: BoardRecord;
	readonly boardNode?: Element | null | undefined;
	readonly registry: BoardRegistry;
	readonly host: SurfaceHost;
	readonly editing: boolean;
	readonly onChange: SaveBoard;
	readonly onActions?: OnActions | null | undefined;
	readonly screen?: boolean | undefined;
	readonly initialWidth?: number | undefined;
	readonly onWidth?: ((width: number) => void) | null | undefined;
	readonly onDrafting?: ((isDrafting: boolean) => void) | null | undefined;
}

export function WidgetSurface({
	board: saved,
	boardNode,
	registry,
	host,
	editing,
	onChange: save,
	onActions,
	screen,
	initialWidth = 0,
	onWidth,
	onDrafting,
}: WidgetSurfaceProps): ReactNode {
	const latestRef = useRef<{ readonly board: BoardRecord } | null>(null);
	const draft = useDraftBoard(saved, save, onDrafting);
	const boardAsItStands = (): BoardRecord => latestRef.current?.board ?? draft.board;
	const [width, setWidth] = useState(initialWidth);
	const session = useSettingsSession(draft, save, boardAsItStands);
	const [removingId, setRemovingId] = useState<string | null>(null);
	const [pickingInto, setPickingInto] = useState<NodePath | null>(null);
	const { refs, shared, foldRef } = useSurfaceShared({ host, registry, tiles: draft.board.tiles, width });
	const isPage = draft.board.mode === "expanded";
	const boardShell = (children: ReactNode): ReactElement =>
		h(Board, {
			className: `wg-root wg-board${editing ? " is-editing" : ""}${screen ? " is-screen" : ""}${isPage ? " is-page" : ""}`,
			onWidth: (value) => {
				setWidth(value);
				onWidth?.(value);
			},
			children,
		});

	if (width < MIN_LAID_OUT_BOARD_PX) return isPage ? h(Page, { boardNode }, boardShell(null)) : boardShell(null);

	const edits = boardEdits({ boardAsItStands, onChange: draft.onChange, registry });
	foldRef.current = edits.foldIntoGroup;
	latestRef.current = { board: draft.board };
	const drawn = boardShell(
		surfaceParts({
			board: draft.board,
			width,
			host,
			registry,
			refs,
			shared,
			editing,
			onActions,
			edits,
			session,
			removal: { id: removingId, set: setRemovingId },
			picking: { into: pickingInto, set: setPickingInto },
		}),
	);
	return isPage ? h(Page, { boardNode }, drawn) : drawn;
}
