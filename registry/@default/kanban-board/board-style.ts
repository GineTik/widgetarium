export const BOARD_CSS = `
.ok-board {
	display: flex;
	align-items: flex-start;
	gap: var(--size-4-3, 12px);
	height: 100%;
	padding-bottom: var(--size-4-1, 4px);
	overflow-x: auto;
	overflow-y: auto;
	box-sizing: border-box;
}
.ok-board * { box-sizing: border-box; }

.ok-empty {
	margin: 0;
	padding: var(--size-4-6, 24px);
	font-size: var(--font-ui-small, 14px);
	color: var(--text-faint);
}

/* CONTEXT: the reference's 268 plus 10% — a two-line title and four circles need the room */
.orbi-kanban .ok-list {
	flex: 0 0 296px;
	gap: var(--wg-gap-cards);
}

.orbi-kanban .ok-list.is-over { box-shadow: inset 0 0 0 2px var(--interactive-accent); }

.ok-list-head {
	display: flex;
	align-items: center;
	gap: var(--size-4-2, 8px);
	padding: var(--size-2-2, 4px) var(--size-4-2, 8px);
}

/* CONTEXT: the head is the grip — the body below it is full of cards that drag on their own */
.orbi-kanban .ok-list-head[draggable="true"] { cursor: grab; }
.orbi-kanban .ok-list-head[draggable="true"]:active { cursor: grabbing; }

/* TRADE-OFF: the columns are TRANSLATED, never reordered mid-drag — a moving DOM changes what
   the pointer is over, and the aim then oscillates between two neighbours */
.orbi-kanban .ok-board.is-dragging .ok-list { transition: transform var(--orbi-quick) var(--orbi-ease); }

.orbi-kanban .ok-list.is-placeholder > * { visibility: hidden; }

.ok-list-title {
	min-width: 0;
	font-size: var(--font-ui-small, 14px);
	font-weight: var(--font-semibold, 600);
	color: var(--wg-kit-text);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.orbi-kanban .ok-list-title[contenteditable="true"]:focus {
	outline: none;
	border-bottom: 1px solid var(--interactive-accent);
	cursor: text;
}

/* CONTEXT: no counterpart in the reference — sized to the count, hover ground from .addrow:hover */
.orbi-kanban .ok-list-remove {
	display: grid;
	place-items: center;
	width: 24px;
	height: 24px;
	margin-left: auto;
	color: var(--wg-kit-text-muted);
	opacity: 0;
	transition: opacity var(--orbi-quick) var(--orbi-ease);
}

.orbi-kanban .ok-list-remove::before { border-radius: var(--wg-kit-pill); }

.orbi-kanban .ok-list:hover .ok-list-remove,
.orbi-kanban .ok-list-remove:focus-visible { opacity: 1; }

.orbi-kanban .ok-list-remove:hover { color: var(--wg-kit-text); }
.orbi-kanban .ok-list-remove:hover::before { background: var(--background-modifier-hover); }

.orbi-kanban .ok-card-slot {
	--wg-slot-corner: var(--wg-kit-item);
	cursor: grab;
	border-radius: var(--wg-kit-item);
	transition: transform var(--orbi-press) var(--orbi-ease);
}
.orbi-kanban .ok-card-slot:active { cursor: grabbing; transform: scale(0.955); }
@media (prefers-reduced-motion: reduce) {
	.orbi-kanban .ok-card-slot:active { transform: none; }
}
.orbi-kanban .ok-card-slot.is-open > * { box-shadow: inset 0 0 0 2px var(--interactive-accent); }

/* TRADE-OFF: text only, no fill and no border — a plate is the last background on this board */
.orbi-kanban .ok-add-task {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--size-4-2, 8px);
	padding: var(--size-4-2, 8px);
	font-size: var(--font-ui-small, 14px);
	font-weight: var(--font-medium, 500);
	color: var(--wg-kit-text-muted);
	cursor: pointer;
}

.orbi-kanban .ok-add-task::before { border-radius: var(--wg-kit-item); }

.orbi-kanban .ok-add-task:hover { color: var(--wg-kit-text); }

/* the composer stands where the button stood, inside the column, not in a plate of its own */
.orbi-kanban .ok-add-task-open {
	display: flex;
	flex-direction: column;
	gap: var(--size-4-2, 8px);
	padding: var(--size-2-3, 6px);
}

.orbi-kanban .ok-task-name {
	height: 34px;
	padding: 0 var(--size-4-3, 12px);
	appearance: none;
	border: none;
	border-radius: var(--wg-kit-pill);
	background: var(--background-primary);
	box-shadow: none;
	font-family: inherit;
	font-size: var(--font-ui-small, 14px);
	color: var(--wg-kit-text);
	outline: none;
}

.orbi-kanban .ok-task-name::placeholder { color: var(--text-faint); }
.orbi-kanban .ok-add-task:hover::before { background: var(--background-modifier-hover); }

.ok-card-title {
	min-width: 0;
	font-size: var(--font-ui-small, 14px);
	font-weight: var(--font-semibold, 600);
	line-height: var(--line-height-tight, 1.25);
	color: var(--wg-kit-text);
}

/* TRADE-OFF: the plate shape at rest, so the place a new list lands is already drawn */
.orbi-kanban .ok-add-list-rest {
	position: relative;
	isolation: isolate;
	flex: 0 0 296px;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	height: 48px;
	appearance: none;
	border: none;
	border-radius: 0;
	background: none;
	box-shadow: none;
	margin: 0;
	font-size: var(--font-ui-small, 14px);
	font-weight: var(--font-medium, 500);
	color: var(--wg-kit-text-muted);
	cursor: pointer;
}

.orbi-kanban .ok-add-list-rest::before {
	content: "";
	position: absolute;
	inset: 0;
	z-index: -1;
}

.orbi-kanban .ok-add-list-rest:hover { color: var(--wg-kit-text); }

.orbi-kanban .ok-add-list { flex: 0 0 296px; }

/* CONTEXT: the reference's .search, at the height a plate wants and on the card's own fill */
.orbi-kanban .ok-list-name {
	height: 34px;
	padding: 0 var(--size-4-3, 12px);
	appearance: none;
	border: none;
	border-radius: var(--wg-kit-pill);
	background: var(--background-primary);
	box-shadow: none;
	font-family: inherit;
	font-size: var(--font-ui-small, 14px);
	color: var(--wg-kit-text);
	outline: none;
}

.orbi-kanban .ok-list-name::placeholder { color: var(--text-faint); }

.ok-add-list-actions {
	display: flex;
	gap: var(--size-4-2, 8px);
}

.ok-cancel { flex: 1 1 0; }
.ok-confirm { flex: 1 1 0; }

@container widget (width < 420px) {
	.orbi-kanban .ok-list,
	.orbi-kanban .ok-add-list,
	.orbi-kanban .ok-add-list-rest { flex: 0 0 284px; }
}

/* CONTEXT: the move is offered once and disappears — a dashed plate says it is not a list */
.orbi-kanban .ok-move-boards::before { border: 1px dashed var(--background-modifier-border); }
.orbi-kanban .ok-repair-ids::before { border: 1px dashed var(--background-modifier-border); }
`;
