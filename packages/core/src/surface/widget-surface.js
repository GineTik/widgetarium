import { createElement as h, useRef, useState } from "react";
import { Board } from "./board.js";
import { boardEdits } from "./board-edits.js";
import { Page } from "./page.js";
import { surfaceParts } from "./surface-parts.js";
import { MIN_LAID_OUT_BOARD_PX } from "./use-board-width.js";
import { useDraftBoard } from "./use-draft-board.js";
import { useSettingsSession } from "./use-settings-session.js";
import { useSurfaceShared } from "./use-surface-shared.js";

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
}) {
	const latestRef = useRef(null);
	const draft = useDraftBoard(saved, save, onDrafting);
	const boardAsItStands = () => latestRef.current?.board ?? draft.board;
	const [width, setWidth] = useState(initialWidth);
	const session = useSettingsSession(draft, save, boardAsItStands);
	const [removingId, setRemovingId] = useState(null);
	const [pickingInto, setPickingInto] = useState(null);
	const { refs, shared, foldRef } = useSurfaceShared({ host, registry, tiles: draft.board.tiles, width });
	const isPage = draft.board.mode === "expanded";
	const boardShell = (children) =>
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
