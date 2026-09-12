import { canDo, createWidget, WidgetRoot, ConfirmDialog, Dialog, DialogContent, flatRows, pickedValue, useData } from "widgetarium";
import { archived, archivedColumnsOf, columnPatched, columnsOf, columnsWritten, propertiesOf, restored, shownColumnsOf } from "@task/lib";
import type { Board, BoardColumn } from "@task/lib";
import {
	APPROVAL_TONES,
	Button,
	Calendar,
	Card,
	Count,
	Field,
	Icon,
	IconButton,
	MarkdownEditor,
	PRIORITY_TONES,
	Pill,
	Plate,
	Popover,
	PopoverItem,
	PopoverSearch,
	PopoverSeparator,
	Progress,
	Segmented,
	Sidebar,
	SidebarGroup,
	SidebarRow,
	TONE_NAMES,
	cx,
	iconButtonClass,
	toneClass,
	toneOf,
} from "widgetarium/kit";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent, FormEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import type {
	Action,
	CollectionGateway,
	CreateAction,
	GetAction,
	ListAction,
	Navigation,
	RemoveAction,
	Slot,
	UpdateAction,
	ValueGateway,
	ViewHost,
} from "widgetarium";

type TaskRecord = {
	path?: string;
	name?: string;
	props?: Record<string, unknown>;
	attachments?: number;
	body?: string;
};

type TaskRow = TaskRecord & { ref: string };

type KanbanColumn = { title: string; rows: TaskRow[] };

type Choice = { value: string; note?: string };

type Anchor = {
	kind: string;
	icon: string;
	word: string;
	required?: boolean;
	choices?: Choice[];
	tones?: Record<string, string>;
};

type Tones = Record<string, string>;

type Dragging = { row: TaskRow | null; pick: (row: TaskRow) => void; drop: () => void };

type Reorder = { from: number; to: number; step: number; origin: number };

type TagDrag = { at: number; list: string[]; isDragging: boolean };

type RenderMarkdown = ViewHost["ui"]["renderMarkdown"];

type TaskAccesses = {
	list: ListAction;
	get?: GetAction;
	create?: CreateAction;
	update?: UpdateAction;
	remove?: RemoveAction;
};

type BoardAccesses = {
	list?: ListAction;
	create?: CreateAction;
	update?: UpdateAction;
	repairIds?: Action<void, number>;
};

type KanbanProps = {
	tasks: CollectionGateway<TaskRecord, TaskAccesses>;
	boards: CollectionGateway<Board, BoardAccesses>;
	board: ValueGateway<Board, { get: GetAction; update?: UpdateAction }>;
	selection: ValueGateway<unknown, { get: GetAction; update?: UpdateAction }>;
	opened: ValueGateway<unknown, { get: GetAction; update: UpdateAction }>;
	groupBy: ValueGateway<string>;
	slots?: { card?: Slot<{ task: unknown }> };
	host?: ViewHost;
	navigator?: Navigation;
};


// CONTEXT: authored whole, filled by replace — a built sentence cannot be reordered
const ARCHIVE_TITLE = "Archive {name}?";
const ARCHIVE = "Archive";
const REPAIR_BOARDS = "Repair duplicate ids";
const REPAIR_TITLE = "Repair duplicate ids?";
const REPAIR_ONE = "One board shares its id with another. The board whose path sorts first keeps it; the other is given a new one. Nothing else in either note changes.";
const REPAIR_MANY = "{count} boards share an id with another. In each pair the board whose path sorts first keeps it; the other is given a new one. Nothing else in either note changes.";
const REPAIR = "Repair";

const CSS = `
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

/* CONTEXT: the kit plate carries fill, radius and pad; the reference's tight gap is 6px */
/* CONTEXT: the reference's 268 plus 10% — a two-line title and four circles need the room */
.orbi-kanban .ok-list {
	flex: 0 0 296px;
	gap: var(--size-2-3, 6px);
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

/* CONTEXT: the plate's own fill and radius ARE the landing block; hidden children keep its size */
.orbi-kanban .ok-list.is-placeholder > * { visibility: hidden; }

.ok-list-title {
	min-width: 0;
	font-size: var(--font-ui-small, 14px);
	font-weight: var(--font-semibold, 600);
	color: var(--text-normal);
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
	color: var(--text-muted);
	opacity: 0;
	transition: opacity var(--orbi-quick) var(--orbi-ease);
}

.orbi-kanban .ok-list-remove::before { border-radius: var(--wg-kit-pill); }

.orbi-kanban .ok-list:hover .ok-list-remove,
.orbi-kanban .ok-list-remove:focus-visible { opacity: 1; }

.orbi-kanban .ok-list-remove:hover { color: var(--text-normal); }
.orbi-kanban .ok-list-remove:hover::before { background: var(--background-modifier-hover); }

.orbi-kanban .ok-card-slot { cursor: grab; border-radius: var(--wg-kit-item); }
.orbi-kanban .ok-card-slot:active { cursor: grabbing; }
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
	color: var(--text-muted);
	cursor: pointer;
}

.orbi-kanban .ok-add-task::before { border-radius: var(--wg-kit-item); }

.orbi-kanban .ok-add-task:hover { color: var(--text-normal); }

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
	color: var(--text-normal);
	outline: none;
}

.orbi-kanban .ok-task-name::placeholder { color: var(--text-faint); }
.orbi-kanban .ok-add-task:hover::before { background: var(--background-modifier-hover); }

/* CONTEXT: drawn only when the card slot holds no widget; the kit card carries fill and radius */
.orbi-kanban .ok-card { padding: var(--size-4-3, 12px); }

.ok-card-title {
	min-width: 0;
	font-size: var(--font-ui-small, 14px);
	font-weight: var(--font-semibold, 600);
	line-height: var(--line-height-tight, 1.25);
	color: var(--text-normal);
}

/* TRADE-OFF: the plate shape at rest, so the place a new list lands is already drawn */
/* CONTEXT: Plate puts a kit class on this button, which excludes it from the suite's reset —
   so the plate's own fill and corner are re-laid on ::before, out of the host's reach. */
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
	color: var(--text-muted);
	cursor: pointer;
}

.orbi-kanban .ok-add-list-rest::before {
	content: "";
	position: absolute;
	inset: 0;
	z-index: -1;
	border-radius: var(--wg-kit-plate);
	background: var(--wg-kit-fill);
}

.orbi-kanban .ok-add-list-rest:hover { color: var(--text-normal); }

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
	color: var(--text-normal);
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

/* CONTEXT: the dialog is portalled onto <body>, out of reach of the widget root's class */
.wg-dialog.ok-archive,
.wg-dialog.ok-move-boards-ask { width: min(420px, 100%); }
.wg-dialog.ok-repair-ids-ask { width: min(420px, 100%); }

/* CONTEXT: the dialog is portalled onto <body>, out of reach of the widget root's container */
.orbi-task-dialog.wg-dialog {
	container-type: inline-size;
	container-name: taskdialog;
	box-sizing: border-box;
	width: min(980px, 100%);
	max-height: 84vh;
	gap: var(--size-4-3, 12px);
	padding: var(--size-4-4, 16px) var(--size-4-5, 20px) var(--size-4-5, 20px);
}

.orbi-task-dialog .otd-top {
	display: flex;
	align-items: center;
	gap: var(--size-4-3, 12px);
}

.orbi-task-dialog .otd-where {
	display: inline-flex;
	align-items: center;
	gap: var(--size-4-2, 8px);
	min-width: 0;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	font-size: var(--font-ui-smaller, 12px);
	font-weight: var(--font-medium, 500);
	color: var(--text-faint);
}

/* TRADE-OFF: close takes the extreme corner, so a mis-aimed press lands on the recoverable one */
.orbi-task-dialog .otd-corner {
	display: flex;
	flex: none;
	align-items: center;
	gap: var(--size-2-3, 6px);
	margin-left: auto;
}

/* A SCROLL BOX CUTS ITS CHILDREN'S SHADOWS AT ITS OWN EDGE, and the properties block stands hard
   against three of them. The room the lift reaches into is padded in and pulled straight back out,
   so nothing moves — the clip widens, the content stays where it was. The room comes out of what
   the dialog already owns: 20px of padding at the sides and foot, and the 12px gap above. */
.orbi-task-dialog .otd-body {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 316px;
	align-items: start;
	gap: var(--size-4-5, 20px);
	min-height: 0;
	overflow: auto;
	margin: calc(-1 * var(--wg-kit-lift-room));
	padding: var(--wg-kit-lift-room);
}

.orbi-task-dialog .otd-left {
	display: flex;
	flex-direction: column;
	gap: var(--size-4-3, 12px);
	min-width: 0;
}

.orbi-task-dialog .otd-right { min-width: 0; }

/* CONTEXT: the title is the note's own, so it is typed where it is read */
.orbi-task-dialog .otd-title {
	margin: 0;
	padding: var(--size-2-3, 6px) var(--size-4-2, 8px);
	border-radius: var(--wg-kit-item);
	font-size: 27px;
	font-weight: var(--font-bold, 700);
	/* 1.18 cut the descenders of a title that wrapped; the box has to hold the whole line box */
	line-height: 1.3;
	letter-spacing: -0.022em;
	color: var(--text-normal);
	cursor: text;
	/* a long title wraps inside the column and never reaches past the window's edge */
	overflow-wrap: anywhere;
}

.orbi-task-dialog .otd-title:hover { background: var(--background-modifier-hover); }

.orbi-task-dialog .otd-title:focus {
	outline: none;
	background: var(--background-modifier-hover);
	box-shadow: inset 0 0 0 2px var(--interactive-accent);
}

/* CONTEXT: Obsidian paints its own button, so the pill's look needs the reset to survive one */
.orbi-task-dialog button.otd-tag {
	display: inline-flex;
	align-items: center;
	height: auto;
	border: none;
	box-shadow: none;
	font-family: inherit;
	cursor: grab;
	touch-action: none;
}

.orbi-task-dialog button.otd-tag:hover { box-shadow: inset 0 0 0 1.4px var(--wg-line); }

.orbi-task-dialog button.otd-tag.is-held {
	cursor: grabbing;
	opacity: 0.55;
}

.orbi-task-dialog .otd-tones {
	display: flex;
	align-items: center;
	gap: var(--size-2-3, 6px);
	padding: var(--size-2-2, 4px) var(--size-2-3, 6px) var(--size-4-2, 8px);
}

/* CONTEXT: a swatch with no tone is the kit's neutral, which is the grey a tag starts at */
.orbi-task-dialog .otd-tone {
	flex: none;
	box-sizing: border-box;
	width: 22px;
	height: 22px;
	padding: 0;
	appearance: none;
	border: none;
	border-radius: var(--wg-kit-pill);
	background: var(--wg-kit-fill-hover);
	box-shadow: none;
	cursor: pointer;
}

.orbi-task-dialog .otd-tone.is-accent { background: var(--interactive-accent); }
.orbi-task-dialog .otd-tone.is-ok { background: var(--text-success); }
.orbi-task-dialog .otd-tone.is-warn { background: var(--wg-kit-warning); }
.orbi-task-dialog .otd-tone.is-err { background: var(--text-error); }
.orbi-task-dialog .otd-tone.is-info { background: var(--wg-kit-info); }
.orbi-task-dialog .otd-tone.is-note { background: var(--wg-kit-note); }
.orbi-task-dialog .otd-tone.is-standout { background: var(--wg-kit-standout); }

.orbi-task-dialog .otd-tone.is-picked { box-shadow: 0 0 0 2px var(--background-primary), 0 0 0 4px var(--interactive-accent); }

.orbi-task-dialog .otd-pop-actions {
	display: flex;
	align-items: center;
	gap: var(--size-4-2, 8px);
	padding: var(--size-4-2, 8px);
}

/* CONTEXT: Save takes whatever room is left; Cancel is the same size it always was */
.orbi-task-dialog .otd-pop-actions .wg-kit-btn.is-accent {
	flex: 1 1 auto;
}


.orbi-task-dialog .otd-tags {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--size-2-3, 6px);
}

/* TRADE-OFF: text only — a pill here would read as a tag the note already carries */
.orbi-task-dialog .otd-tag-add {
	display: inline-flex;
	align-items: center;
	gap: var(--size-2-2, 4px);
	padding: 3px var(--size-4-2, 8px) 3px var(--size-2-3, 6px);
	border: none;
	border-radius: var(--wg-kit-pill);
	background: none;
	font-family: inherit;
	font-size: 11px;
	font-weight: var(--font-medium, 500);
	color: var(--text-faint);
	cursor: pointer;
}

.orbi-task-dialog .otd-tag-add:hover { background: var(--wg-kit-fill); color: var(--text-muted); }

.orbi-task-dialog .otd-desc {
	display: flex;
	flex-direction: column;
	gap: var(--size-4-2, 8px);
	padding-top: var(--size-2-2, 4px);
}

.orbi-task-dialog .otd-cap {
	font-size: var(--font-ui-smaller, 12px);
	font-weight: var(--font-medium, 500);
	color: var(--text-faint);
}

.orbi-task-dialog .otd-desc-head {
	display: flex;
	align-items: center;
	gap: var(--size-4-3, 12px);
}

.orbi-task-dialog .otd-desc-head .otd-cap { margin-right: auto; }

/* CONTEXT: Obsidian renders into this element, so the rules below dress ITS markup, not ours */
.orbi-task-dialog .otd-md {
	font-size: var(--font-ui-small, 14px);
	line-height: 1.62;
	color: var(--text-normal);
}

/* CONTEXT: a diagram arrives as wide as it likes and with no scroller of its own */
.orbi-task-dialog .otd-md > * {
	margin: 0 0 var(--size-4-3, 12px);
	max-width: 100%;
	overflow-x: auto;
}

.orbi-task-dialog .otd-md > :last-child { margin-bottom: 0; }

.orbi-task-dialog .otd-md h1,
.orbi-task-dialog .otd-md h2,
.orbi-task-dialog .otd-md h3,
.orbi-task-dialog .otd-md h4,
.orbi-task-dialog .otd-md h5,
.orbi-task-dialog .otd-md h6 {
	font-size: var(--font-ui-medium, 16px);
	font-weight: var(--font-semibold, 600);
	line-height: 1.3;
	letter-spacing: -0.01em;
	color: var(--text-normal);
}

.orbi-task-dialog .otd-md p { max-width: 66ch; color: var(--text-muted); }

.orbi-task-dialog .otd-md ul,
.orbi-task-dialog .otd-md ol {
	padding-left: 1.15em;
	color: var(--text-muted);
}

.orbi-task-dialog .otd-md li::marker { color: var(--text-faint); }

/* A TABLE ARRIVES FROM THE RENDERER WITH NO RULES OF ITS OWN, so its columns never line up and
   it reads as text that failed to become a table. Wide ones scroll rather than push the dialog. */
.orbi-task-dialog .otd-md table {
	display: block;
	width: max-content;
	max-width: 100%;
	overflow-x: auto;
	border-collapse: collapse;
	font-size: var(--font-ui-small, 14px);
}

.orbi-task-dialog .otd-md th,
.orbi-task-dialog .otd-md td {
	padding: var(--size-2-3, 6px) var(--size-4-3, 12px);
	border-bottom: 1px solid var(--wg-line);
	text-align: left;
	vertical-align: top;
	color: var(--text-muted);
}

.orbi-task-dialog .otd-md th {
	font-weight: var(--font-semibold, 600);
	color: var(--text-normal);
	white-space: nowrap;
}

.orbi-task-dialog .otd-md tr:last-child td { border-bottom: none; }

/* CONTEXT: the CODE scrolls, not the block — an absolute button inside a scroller travels with it */
.orbi-task-dialog .otd-md pre {
	position: relative;
	max-width: 100%;
	padding: var(--size-4-3, 12px) var(--size-4-4, 16px);
	border-radius: var(--wg-kit-item);
	background: var(--wg-kit-fill);
}

/* CONTEXT: the padding is the room the copy button stands in */
.orbi-task-dialog .otd-md pre code {
	display: block;
	overflow-x: auto;
	padding-right: 30px;
	font-family: var(--font-monospace);
	font-size: var(--font-ui-smaller, 12px);
	line-height: 1.7;
	color: var(--text-muted);
	white-space: pre;
}

/* CONTEXT: built by hand into the renderer's own markup, where preact does not reach */
.orbi-task-dialog .otd-md pre .otd-copy {
	position: absolute;
	top: var(--size-2-3, 6px);
	right: var(--size-2-3, 6px);
}

.orbi-task-dialog .otd-md :not(pre) > code {
	padding: 1px 5px;
	border-radius: 6px;
	background: var(--wg-kit-fill);
	font-family: var(--font-monospace);
	font-size: 0.85em;
	color: var(--text-normal);
}

.orbi-task-dialog .otd-md a {
	font-weight: var(--font-medium, 500);
	color: var(--interactive-accent);
	text-decoration: none;
}

.orbi-task-dialog .otd-md a:hover { text-decoration: underline; }

/* CONTEXT: an empty note still has to be a place to type, so the box keeps a height of its own */
/* THE EDITOR READS LIKE THE PREVIEW, so switching between them does not move the text: no ground
   of its own, no padding. The padding lives on .wg-kit-md-text, which BOTH the mirror and the
   textarea wear — dropping it on one only would put the caret a line away from its own character. */
.orbi-task-dialog .otd-editor {
	min-height: 160px;
	background: none;
	border-radius: 0;
}

.orbi-task-dialog .otd-editor .wg-kit-md-text { padding: 0; }

/* TRADE-OFF: it stays until the text is fixed — a notice would be gone before the cause was */
.orbi-task-dialog .otd-refused {
	display: flex;
	align-items: center;
	gap: var(--size-4-2, 8px);
	margin: 0;
	padding: var(--size-2-3, 6px) var(--size-4-3, 12px);
	border-radius: var(--wg-kit-item);
	background: var(--wg-kit-warning-wash);
	font-size: var(--font-ui-smaller, 12px);
	line-height: 1.45;
	color: var(--wg-kit-warning);
}

/* THE PANEL IS WHITE WITH AN EDGE; the grey belongs to the GROUP inside it, and the group holds
   the properties only — a heading and an Add sit on the panel, not in the block of values.
   THE WHITE AND THE EDGE ARE THE KIT SIDEBAR'S, not this file's: they were spelled here a second
   time inside a Plate, which is why the lift on the block never reached the properties. */
.orbi-task-dialog .otd-props {
	gap: var(--size-2-3, 6px);
}

.orbi-task-dialog .otd-plate-head {
	display: flex;
	align-items: center;
	gap: var(--size-4-2, 8px);
	padding: var(--size-2-3, 6px) var(--size-4-2, 8px) var(--size-2-2, 4px);
}

.orbi-task-dialog .otd-plate-head h4 {
	margin: 0;
	font-size: var(--font-ui-small, 14px);
	font-weight: var(--font-semibold, 600);
	color: var(--text-normal);
}

/* CONTEXT: the kit's anchor stands between plate and row, so the row cannot reach full width without it */
.orbi-task-dialog .otd-props .wg-kit-anchor { display: flex; width: 100%; }

/* CONTEXT: fill and corner live on ::before, out of reach of the host's own button rules */
.orbi-task-dialog .otd-row {
	position: relative;
	isolation: isolate;
	display: flex;
	align-items: center;
	gap: var(--size-4-3, 12px);
	box-sizing: border-box;
	width: 100%;
	min-height: 38px;
	padding: var(--size-2-3, 6px) var(--size-4-2, 8px);
	appearance: none;
	border: none;
	border-radius: 0;
	background: none;
	box-shadow: none;
	font-family: inherit;
	font-size: var(--font-ui-small, 14px);
	color: var(--text-normal);
	text-align: left;
	cursor: pointer;
}

.orbi-task-dialog .otd-row::before {
	content: "";
	position: absolute;
	inset: 0;
	z-index: -1;
	border-radius: var(--wg-kit-item);
	transition: background var(--wg-quick) var(--wg-ease);
}

.orbi-task-dialog .otd-row:hover::before { background: var(--background-modifier-hover); }

/* PRESSED, THE ROW LIFTS OFF THE GROUP — and nothing is lighter than the white panel it lifts
   toward, so the step is an EDGE. A raised fill alone put white on white and the row's own
   boundary disappeared into the panel. */
.orbi-task-dialog .otd-row.is-open::before,
.orbi-task-dialog .otd-row:focus-within::before {
	background-color: var(--background-primary);
	box-shadow: inset 0 0 0 1px var(--wg-kit-card-edge), var(--wg-kit-shadow);
}

.orbi-task-dialog .otd-row .wg-kit-row-label {
	display: inline-flex;
	align-items: center;
	gap: var(--size-4-2, 8px);
	flex: none;
	width: 104px;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	font-size: var(--font-ui-small, 14px);
	font-weight: var(--font-medium, 500);
	color: var(--text-muted);
}

.orbi-task-dialog .otd-row.is-unset .wg-kit-row-label { color: var(--text-faint); }

/* CONTEXT: the row's value CELL is what fills the line now — the old markup had no cell, so the
   value itself carried the fill and lost it the moment the kit wrapped one around it */
.orbi-task-dialog .otd-row .wg-kit-side-value {
	display: flex;
	justify-content: flex-end;
	flex: 1 1 auto;
	min-width: 0;
}

.orbi-task-dialog .otd-value {
	display: inline-flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--size-4-2, 8px);
	flex: 1 1 auto;
	min-width: 0;
	font-size: var(--font-ui-small, 14px);
	font-weight: var(--font-medium, 500);
	color: var(--text-normal);
}

.orbi-task-dialog .otd-value.is-empty { color: var(--text-faint); }

/* CONTEXT: a neutral pill is the plate's own fill, so on the plate it has to lift to be seen */
.orbi-task-dialog .otd-value .wg-kit-pill:not(.is-accent):not(.is-ok):not(.is-warn):not(.is-err) {
	background: var(--wg-kit-raise);
	color: var(--text-normal);
}

.orbi-task-dialog .otd-glyph {
	flex: none;
	width: 15px;
	height: 15px;
	fill: none;
	stroke: currentColor;
	stroke-width: 1.6;
	stroke-linecap: round;
	stroke-linejoin: round;
}

.orbi-task-dialog .otd-row .wg-kit-side-icon { color: var(--text-faint); }
.orbi-task-dialog .otd-caret { color: var(--text-faint); }

/* CONTEXT: Obsidian paints its own input, so the reset needs two classes to win */
.orbi-task-dialog input.otd-text {
	flex: 1 1 auto;
	min-width: 0;
	width: 100%;
	height: auto;
	padding: 0;
	appearance: none;
	border: none;
	border-radius: 0;
	outline: none;
	box-shadow: none;
	background: none;
	font: inherit;
	font-size: var(--font-ui-small, 14px);
	color: var(--text-normal);
	text-align: right;
}

.orbi-task-dialog input.otd-text::placeholder { color: var(--text-faint); }

.orbi-task-dialog .otd-avatars {
	display: flex;
	align-items: center;
	flex: none;
}

/* CONTEXT: the 2px ring in the plate's own fill is what makes the -5px overlap readable */
.orbi-task-dialog .otd-avatar {
	display: grid;
	place-content: center;
	flex: none;
	box-sizing: border-box;
	width: 28px;
	height: 28px;
	margin-left: -5px;
	border-radius: var(--wg-kit-pill);
	box-shadow: 0 0 0 2px var(--wg-kit-fill);
	font-size: 11px;
	font-weight: var(--font-semibold, 600);
	letter-spacing: -0.01em;
	font-style: normal;
}

.orbi-task-dialog .otd-avatar:first-child { margin-left: 0; }

.orbi-task-dialog .otd-avatar-add {
	background: none;
	box-shadow: 0 0 0 2px var(--wg-kit-fill), inset 0 0 0 1.4px var(--wg-line);
	color: var(--text-faint);
}

.orbi-task-dialog .otd-add {
	display: flex;
	align-items: center;
	gap: var(--size-4-2, 8px);
	box-sizing: border-box;
	width: 100%;
	padding: var(--size-4-2, 8px);
	appearance: none;
	border: none;
	border-radius: var(--wg-kit-item);
	background: none;
	font-family: inherit;
	font-size: var(--font-ui-small, 14px);
	font-weight: var(--font-medium, 500);
	color: var(--text-muted);
	text-align: left;
	cursor: pointer;
}

.orbi-task-dialog .otd-add:hover { background: var(--background-modifier-hover); color: var(--text-normal); }

.orbi-task-dialog .otd-pop-field { padding: var(--size-2-2, 4px) var(--size-2-3, 6px) var(--size-4-2, 8px); }

.orbi-task-dialog .otd-item-note {
	margin-left: auto;
	font-size: var(--font-ui-smaller, 12px);
	color: var(--text-faint);
}

/* CONTEXT: the anchor is announced while typing, at the one moment the rule needs explaining */
.orbi-task-dialog .otd-hint {
	display: flex;
	align-items: center;
	gap: var(--size-4-2, 8px);
	padding: var(--size-2-3, 6px) var(--size-4-3, 12px);
	font-size: var(--font-ui-smaller, 12px);
	color: var(--text-muted);
}

@container taskdialog (width < 760px) {
	.orbi-task-dialog .otd-body { grid-template-columns: minmax(0, 1fr); }
	.orbi-task-dialog .otd-title { font-size: 21px; }
}
`;

// TRADE-OFF: the task-card widget owns the card; this draws a title when the slot is empty
function FallbackCard({ task }: { task: CardFace }) {
	return (
		<Card className="ok-card">
			<span className="ok-card-title">{String(task.title ?? "")}</span>
		</Card>
	);
}

type KanbanListProps = {
	title: string;
	rows: TaskRow[];
	cards: CardFace[];
	CardSlot: Slot<{ task: CardFace }>;
	onAdd?: (title: string) => void;
	onArchive?: (() => void) | undefined;
	onRename?: ((name: string | null) => void) | undefined;
	onOpen?: (row: TaskRow) => void;
	onDropTask?: () => void;
	onGrab?: ((event: DragEvent<HTMLElement>) => void) | undefined;
	onRelease?: () => void;
	shift?: number | undefined;
	placeholder?: boolean;
	canWrite: boolean;
	dragging: Dragging;
	opened: unknown;
};

function KanbanList({ title, rows, cards, CardSlot, onAdd, onArchive, onRename, onOpen, onDropTask, onGrab, onRelease, shift, placeholder, canWrite, dragging, opened }: KanbanListProps) {
	const CardComponent = CardSlot ?? FallbackCard;
	const [isOver, setOver] = useState(false);
	// CONTEXT: a grip around an editable heading steals the drag that selects its text
	const [isRenaming, setRenaming] = useState(false);

	return (
		<Plate
			className={`ok-list${isOver ? " is-over" : ""}${placeholder ? " is-placeholder" : ""}`}
			style={shift === undefined ? null : { transform: `translateX(${shift}px)` }}
			onDragOver={(event: DragEvent<HTMLElement>) => {
				if (!dragging?.row) return;
				event.preventDefault();
				setOver(true);
			}}
			onDragLeave={() => setOver(false)}
			onDrop={(event: DragEvent<HTMLElement>) => {
				event.preventDefault();
				setOver(false);
				onDropTask?.();
			}}
		>
			<div className="ok-list-head" draggable={Boolean(onGrab) && !isRenaming} onDragStart={onGrab} onDragEnd={onRelease}>
				<span
					className="ok-list-title"
					// CONTEXT: the lowercase attribute — a property some engines never mirror back is unreadable
					contentEditable={onRename ? "true" : undefined}
					suppressContentEditableWarning
					onFocus={() => setRenaming(true)}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							event.preventDefault();
							event.currentTarget.blur();
						}
						if (event.key === "Escape") {
							event.currentTarget.textContent = title;
							event.currentTarget.blur();
						}
					}}
					onBlur={(event) => {
						setRenaming(false);
						onRename?.(event.currentTarget.textContent);
					}}
				>
					{title}
				</span>
				<Count>{rows.length}</Count>
				{onArchive ? (
					<button type="button" className="ok-list-remove" title={`Archive ${title}`} onClick={onArchive}>
						<Icon name="archive" size={15} />
					</button>
				) : null}
			</div>

			{cards.map((task, index) => {
				const row = rows[index];
				if (!row) return null;
				return (
					<div
						key={row.ref}
						className={`ok-card-slot${row.ref === opened ? " is-open" : ""}`}
						draggable={canWrite}
						onDragStart={() => dragging?.pick(row)}
						onDragEnd={() => dragging?.drop()}
						onClick={() => onOpen?.(row)}
					>
						<CardComponent task={task} />
					</div>
				);
			})}

			{canWrite && onAdd ? <AddTask onAdd={onAdd} /> : null}
		</Plate>
	);
}

// TRADE-OFF: the same shape as AddList, not the same component — a list is named in a plate of
// its own, a task is named inside the column it will land in
function AddTask({ onAdd }: { onAdd: (title: string) => void }) {
	const [isOpen, setOpen] = useState(false);
	const [name, setName] = useState("");

	const confirm = () => {
		const trimmed = name.trim();
		if (trimmed) onAdd(trimmed);
		setName("");
		setOpen(false);
	};

	if (!isOpen) {
		return (
			<button type="button" className="ok-add-task" onClick={() => setOpen(true)}>
				<Icon name="plus" size={16} />
				<span>Add new task</span>
			</button>
		);
	}

	return (
		<div className="ok-add-task-open">
			<input
				className="ok-task-name"
				ref={(node) => node?.focus()}
				placeholder="Enter task name..."
				value={name}
				onInput={(event) => setName(event.currentTarget.value)}
				onKeyDown={(event) => {
					if (event.key === "Enter") confirm();
					if (event.key === "Escape") setOpen(false);
				}}
			/>
			<div className="ok-add-list-actions">
				<Button className="ok-cancel" size="s" onClick={() => setOpen(false)}>
					Cancel
				</Button>
				<Button className="ok-confirm" size="s" variant="accent" onClick={confirm}>
					Add
				</Button>
			</div>
		</div>
	);
}

function AddList({ onAdd }: { onAdd?: (name: string) => void }) {
	const [isOpen, setOpen] = useState(false);
	const [name, setName] = useState("");

	if (!isOpen) {
		return (
			<Plate asChild>
				<button type="button" className="ok-add-list-rest" onClick={() => setOpen(true)}>
					<Icon name="plus" size={16} />
					<span>Add List</span>
				</button>
			</Plate>
		);
	}

	const confirm = () => {
		const trimmed = name.trim();
		if (trimmed) onAdd?.(trimmed);
		setName("");
		setOpen(false);
	};

	return (
		<Plate className="ok-add-list">
			<input
				className="ok-list-name"
				// CONTEXT: the field appeared because it was asked for; a click to reach it is one step too many
				ref={(node) => node?.focus()}
				placeholder="Enter list name..."
				value={name}
				onInput={(event) => setName(event.currentTarget.value)}
				onKeyDown={(event) => {
					if (event.key === "Enter") confirm();
					if (event.key === "Escape") setOpen(false);
				}}
			/>
			<div className="ok-add-list-actions">
				<Button className="ok-cancel" size="s" onClick={() => setOpen(false)}>
					Cancel
				</Button>
				<Button className="ok-confirm" size="s" variant="accent" onClick={confirm}>
					Add
				</Button>
			</div>
		</Plate>
	);
}

// CONTEXT: columns are the values of ONE property — groupBy regroups the same rows
// CONTEXT: a value a note names is a column of its own, so an archived one walks back unless refused
function toColumns(rows: TaskRow[], columnNames: string[], groupBy: string, archived: string[]): KanbanColumn[] {
	const byName = new Map<string, TaskRow[]>(columnNames.map((name) => [name, []]));
	for (const row of rows) {
		const value = String(row.props?.[groupBy] ?? columnNames[0]);
		if (archived.includes(value)) continue;
		const held = byName.get(value) ?? [];
		byName.set(value, held);
		held.push(row);
	}
	return [...byName.entries()].map(([title, held]) => ({ title, rows: held }));
}

// CONTEXT: an archived name keeps its slot, so a restore returns the column to where it sat
function afterColumnMoves(authored: BoardColumn[], shown: string[], from: number, to: number) {
	const moving = shown[from];
	if (!moving) return authored;
	const order = shown.filter((_, index) => index !== from);
	order.splice(to, 0, moving);
	const moved = order[Symbol.iterator]();
	const byName = new Map(authored.map((column) => [column.name, column]));
	return authored.map((column) => {
		if (!shown.includes(column.name)) return column;
		return byName.get(String(moved.next().value)) ?? column;
	});
}

// CONTEXT: the first free number, so a column leaving does not hand out a name already in use
function freeUntitled(taken: string[]) {
	let index = 1;
	while (taken.includes(`Untitled ${index}`)) index += 1;
	return `Untitled ${index}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// TRADE-OFF: the year only when it is not this one — a deadline this year reads as "31 Aug",
// and one in another year has to say which, or the card is quietly wrong about a whole year
function dateLabel(value: unknown, now: Date) {
	const date = new Date(String(value));
	if (Number.isNaN(date.getTime())) return String(value);
	const day = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
	return date.getFullYear() === now.getFullYear() ? day : `${day} ${date.getFullYear()}`;
}

// TRADE-OFF: nothing invented — an absent field must stay absent, or the card cannot tell it from a value
// The strip carries FACTS THE NOTE HAS: the deadline it names and the files it embeds. Comments
// and a checklist were drawn from properties nothing writes, so every card claimed 0 of each.
type CardFace = {
	title: unknown;
	tags: string[];
	tagTones: unknown;
	priority: unknown;
	status: unknown;
	progress: unknown;
	initials: string[];
	due?: string;
	files?: number;
};

function dueOf(deadline: unknown, now: Date): { due?: string } {
	if (deadline === undefined || deadline === null || deadline === "") return {};
	return { due: dateLabel(deadline, now) };
}

function filesOf(attachments: number | undefined): { files?: number } {
	if (!attachments || attachments <= 0) return {};
	return { files: attachments };
}

function toCard(row: TaskRow, now: Date): CardFace {
	const props = row.props ?? {};
	// the DEADLINE, and nothing standing in for it — a note with no deadline shows no date
	const deadline = props[keyFor(props, "deadline")];
	return {
		title: props.title ?? row.name,
		tags: toTrimmedList(props[keyFor(props, "tags")]),
		tagTones: props[keyFor(props, "tagTones")],
		priority: props.priority,
		status: props.approval,
		progress: props.progress,
		initials: toTrimmedList(props.assignees),
		...dueOf(deadline, now),
		...filesOf(row.attachments),
	};
}

// CONTEXT: paths copied from docs/reference/task-dialog.html, on its 16 grid
const GLYPHS: Record<string, string> = {
	columns: '<rect x="2.4" y="2.8" width="4" height="10.4" rx="1.3"/><rect x="9.6" y="2.8" width="4" height="6.6" rx="1.3"/>',
	task: '<rect x="2.6" y="2.2" width="10.8" height="11.6" rx="2.6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5.6 8.1l1.8 1.8 3.2-3.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
	flag: '<path d="M4 14V2.6"/><path d="M4 3.4h8.4l-2 2.9 2 2.9H4"/>',
	seal: '<circle cx="8" cy="8" r="5.4"/><path d="M5.6 8.2l1.7 1.7 3.2-3.5"/>',
	gauge: '<path d="M2.6 11.2a5.4 5.4 0 0 1 10.8 0"/><path d="M8 11.2l2.8-2.9"/>',
	calendar: '<rect x="2.4" y="3.4" width="11.2" height="10.2" rx="2.2"/><path d="M2.4 6.6h11.2M5.6 2v3M10.4 2v3"/>',
	people: '<circle cx="6.2" cy="6" r="2.4"/><path d="M2.3 13c.5-2.2 2-3.3 3.9-3.3s3.4 1.1 3.9 3.3"/><path d="M11 4.1a2.2 2.2 0 0 1 0 4.2"/>',
	lines: '<path d="M3 4.4h10M3 8h10M3 11.6h5.6"/>',
	expand: '<path d="M9.6 2.6h3.8v3.8"/><path d="M6.4 13.4H2.6V9.6"/><path d="M13.4 2.6L9.2 6.8"/><path d="M2.6 13.4l4.2-4.2"/>',
	close: '<path d="M4.4 4.4l7.2 7.2M11.6 4.4l-7.2 7.2"/>',
	caret: '<path d="M4.4 6.4L8 10l3.6-3.6"/>',
	eye: '<path d="M1.6 8S4 3.6 8 3.6 14.4 8 14.4 8 12 12.4 8 12.4 1.6 8 1.6 8z"/><circle cx="8" cy="8" r="1.9"/>',
	brackets: '<path d="M6 3.4L3 8l3 4.6M10 3.4L13 8l-3 4.6"/>',
	alert: '<path d="M8 2.9L14.2 13.1H1.8z"/><path d="M8 6.6v3.1M8 11.5v.1"/>',
	plus: '<path d="M8 3.6v8.8M3.6 8h8.8"/>',
	copy: '<rect x="5.6" y="5.6" width="8" height="8" rx="2"/><path d="M10.4 5.6V4.4a2 2 0 0 0-2-2H4.4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1.2"/>',
	tick: '<path d="M3.4 8.4l3.2 3.2 6-6.6"/>',
};

function Glyph({ name, className }: { name: string; className?: string }) {
	return (
		<svg
			className={`otd-glyph${className ? ` ${className}` : ""}`}
			viewBox="0 0 16 16"
			aria-hidden="true"
			dangerouslySetInnerHTML={{ __html: GLYPHS[name] ?? "" }}
		/>
	);
}

const PRIORITY_CHOICES = [
	{ value: "P1", note: "Drop everything" },
	{ value: "P2", note: "This week" },
	{ value: "P3", note: "When it comes up" },
];

const APPROVAL_CHOICES = [{ value: "Review" }, { value: "Check" }, { value: "Approve" }, { value: "Reject" }];

// CONTEXT: the name decides the control, for good — renaming re-anchors, on every task at once
const ANCHORS: Record<string, Anchor> = {
	// CONTEXT: a task always sits in a column, so status is the one choice that cannot be emptied
	status: { kind: "choice", icon: "columns", word: "one of the board's columns", required: true },
	priority: { kind: "choice", icon: "flag", choices: PRIORITY_CHOICES, tones: PRIORITY_TONES, word: "a priority" },
	approval: { kind: "choice", icon: "seal", choices: APPROVAL_CHOICES, tones: APPROVAL_TONES, word: "an approval" },
	progress: { kind: "progress", icon: "gauge", word: "a number from 0 to 100" },
	deadline: { kind: "date", icon: "calendar", word: "a date" },
	members: { kind: "people", icon: "people", word: "people" },
	// CONTEXT: one anchor, two accepted names — a board may call it either
	assignees: { kind: "people", icon: "people", word: "people" },
};

const TEXT_ANCHOR = { kind: "text", icon: "lines", word: "plain text" };

// CONTEXT: what a board that has never named a property shows, until the first Add writes one
const STARTING_PROPERTIES = ["Status", "Priority", "Approval", "Progress", "Assignees", "Deadline"];

function anchorOf(name: string): Anchor {
	// CONTEXT: a property called "constructor" would otherwise reach Object's own prototype
	const wanted = String(name ?? "").trim().toLowerCase();
	if (!Object.hasOwn(ANCHORS, wanted)) return TEXT_ANCHOR;
	return ANCHORS[wanted] ?? TEXT_ANCHOR;
}

function toTrimmedList(value: unknown): string[] {
	if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
	return String(value ?? "")
		.split(",")
		.map((entry) => entry.trim())
		.filter(Boolean);
}

// CONTEXT: names compare case-insensitively, and a note keeps the key it already spells
function keyFor(props: Record<string, unknown> | undefined, name: string): string {
	const wanted = String(name ?? "").toLowerCase();
	return Object.keys(props ?? {}).find((key) => key.toLowerCase() === wanted) ?? name;
}

// CONTEXT: the tone map is a fact about tags, kept apart from the list itself, which travels alone
function toToneMap(value: unknown): Tones {
	return value && typeof value === "object" && !Array.isArray(value) ? (value as Tones) : {};
}

function withoutTone(tones: Tones, tag: string): Tones {
	const kept = { ...tones };
	delete kept[tag];
	return kept;
}

function isUnset(value: unknown): boolean {
	if (value === undefined || value === null || value === "") return true;
	return Array.isArray(value) && value.length === 0;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

// TRADE-OFF: only ISO parses — anything else is shown verbatim rather than reinterpreted
function toDate(value: unknown): Date | null {
	if (value instanceof Date) return value;
	const found = ISO_DATE.exec(String(value ?? ""));
	if (!found) return null;
	return new Date(Number(found[1]), Number(found[2]) - 1, Number(found[3]));
}

function isoOf(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}

function fullDateLabel(value: unknown): string {
	const date = toDate(value);
	if (!date) return String(value ?? "");
	return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function nextMonday(today: Date): Date {
	const ahead = (8 - today.getDay()) % 7 || 7;
	return new Date(today.getFullYear(), today.getMonth(), today.getDate() + ahead);
}

const AVATAR_TONES = [
	{ background: "var(--wg-kit-accent-wash)", color: "var(--interactive-accent)" },
	{ background: "var(--wg-kit-success-wash)", color: "var(--text-success)" },
	{ background: "var(--wg-kit-warning-wash)", color: "var(--wg-kit-warning)" },
	{ background: "var(--wg-kit-error-wash)", color: "var(--text-error)" },
];

// CONTEXT: one person keeps one colour across every task, so the plate can be scanned
function toneForPerson(name: string) {
	let hash = 0;
	for (const letter of String(name)) hash = (hash * 31 + letter.charCodeAt(0)) % 100000;
	return AVATAR_TONES[hash % AVATAR_TONES.length];
}

function initialsOf(name: string): string {
	return String(name)
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((word) => word.charAt(0).toUpperCase())
		.join("");
}

function Avatar({ person }: { person: string }) {
	return (
		<i className="otd-avatar" style={toneForPerson(person)} title={person}>
			{initialsOf(person)}
		</i>
	);
}

// CONTEXT: the kit owns the row now — this is the same list as the settings panel, read closer
type RowFrameProps = {
	anchor: Anchor;
	name: string;
	unset: boolean;
	children: ReactNode;
	isOpen?: boolean;
	asButton?: boolean;
	onClick?: () => void;
};

function RowFrame({ anchor, name, unset, isOpen, children, asButton, onClick }: RowFrameProps) {
	return (
		<SidebarRow
			as={asButton ? "button" : "div"}
			className="otd-row"
			icon={<Glyph name={anchor.icon} />}
			label={name}
			unset={unset}
			isOpen={isOpen}
			onClick={onClick}
		>
			{children}
		</SidebarRow>
	);
}

type ChoiceRowProps = {
	anchor: Anchor;
	name: string;
	value: unknown;
	choices: Choice[];
	onPick: (next: string) => void;
};

function ChoiceRow({ anchor, name, value, choices, onPick }: ChoiceRowProps) {
	const [isOpen, setOpen] = useState(false);
	const unset = isUnset(value);

	const shown = unset ? (
		<span className="otd-value is-empty">Empty</span>
	) : (
		<span className="otd-value">
			<Pill tone={anchor.tones ? toneOf(anchor.tones, value) : "neutral"}>{String(value)}</Pill>
			<Glyph name="caret" className="otd-caret" />
		</span>
	);

	const pick = (next: string) => {
		setOpen(false);
		onPick(next);
	};

	return (
		<Popover
			isOpen={isOpen}
			onOpenChange={setOpen}
			trigger={
				<RowFrame anchor={anchor} name={name} unset={unset} isOpen={isOpen} asButton>
					{shown}
				</RowFrame>
			}
		>
			{choices.map((choice) => (
				<PopoverItem key={choice.value} checked={choice.value === value} onClick={() => pick(choice.value)}>
					{anchor.tones ? (
						<Pill tone={toneOf(anchor.tones, choice.value)}>{choice.value}</Pill>
					) : (
						<span>{choice.value}</span>
					)}
					{choice.note ? <span className="otd-item-note">{choice.note}</span> : null}
				</PopoverItem>
			))}
{anchor.required ? null : (
				<>
								<PopoverSeparator />
				<PopoverItem onClick={() => pick("")}>
					<Glyph name="close" />
					Clear
				</PopoverItem>
				</>
			)}
		</Popover>
	);
}

function ProgressRow({ anchor, name, value, onPick }: { anchor: Anchor; name: string; value: unknown; onPick: (next: number) => void }) {
	const number = Number(value);
	return (
		<RowFrame anchor={anchor} name={name} unset={isUnset(value)}>
			<span className="otd-value">
				<Progress value={Number.isFinite(number) ? number : 0} label={name} onChange={onPick} />
			</span>
		</RowFrame>
	);
}

type DeadlineRowProps = {
	anchor: Anchor;
	name: string;
	value: unknown;
	today: Date;
	onPick: (next: string) => void;
};

function DeadlineRow({ anchor, name, value, today, onPick }: DeadlineRowProps) {
	const [isOpen, setOpen] = useState(false);
	const unset = isUnset(value);

	const shown = unset ? (
		<span className="otd-value is-empty">Empty</span>
	) : (
		<span className="otd-value">
			{fullDateLabel(value)}
			<Glyph name="caret" className="otd-caret" />
		</span>
	);

	const pick = (date: Date | null) => {
		setOpen(false);
		onPick(date === null ? "" : isoOf(date));
	};

	return (
		<Popover
			isOpen={isOpen}
			onOpenChange={setOpen}
			trigger={
				<RowFrame anchor={anchor} name={name} unset={unset} isOpen={isOpen} asButton>
					{shown}
				</RowFrame>
			}
		>
			<Calendar selected={toDate(value) ?? undefined} today={today} onSelect={pick} />
			<PopoverSeparator />
			<PopoverItem onClick={() => pick(today)}>
				Today
				<span className="otd-item-note">{fullDateLabel(isoOf(today))}</span>
			</PopoverItem>
			<PopoverItem onClick={() => pick(nextMonday(today))}>
				Next Monday
				<span className="otd-item-note">{fullDateLabel(isoOf(nextMonday(today)))}</span>
			</PopoverItem>
			<PopoverSeparator />
			<PopoverItem onClick={() => pick(null)}>
				<Glyph name="close" />
				Clear
			</PopoverItem>
		</Popover>
	);
}

type MembersRowProps = {
	anchor: Anchor;
	name: string;
	value: unknown;
	roster: string[];
	onPick: (next: string[]) => void;
};

function MembersRow({ anchor, name, value, roster, onPick }: MembersRowProps) {
	const [isOpen, setOpen] = useState(false);
	const held = toTrimmedList(value);
	const unset = held.length === 0;

	const toggle = (person: string) => {
		onPick(held.includes(person) ? held.filter((entry) => entry !== person) : [...held, person]);
	};

	const shown = (
		<span className={`otd-value${unset ? " is-empty" : ""}`}>
			{unset ? (
				"Empty"
			) : (
				<span className="otd-avatars">
					{held.map((person) => (
						<Avatar key={person} person={person} />
					))}
					<i className="otd-avatar otd-avatar-add">
						<Glyph name="plus" />
					</i>
				</span>
			)}
		</span>
	);

	return (
		<Popover
			isOpen={isOpen}
			onOpenChange={setOpen}
			trigger={
				<RowFrame anchor={anchor} name={name} unset={unset} isOpen={isOpen} asButton>
					{shown}
				</RowFrame>
			}
		>
			<PopoverSearch placeholder="Find a person">
				{(needle: string) => [
					...roster
						.filter((person) => person.toLowerCase().includes(needle))
						.map((person) => (
							<PopoverItem key={person} checked={held.includes(person)} onClick={() => toggle(person)}>
								<Avatar person={person} />
								{person}
							</PopoverItem>
						)),
					needle !== "" && !roster.some((person) => person.toLowerCase() === needle) ? (
						<PopoverItem key="add" onClick={() => toggle(needle)}>
							<Glyph name="plus" />
							{needle}
						</PopoverItem>
					) : null,
				]}
			</PopoverSearch>
		</Popover>
	);
}

// TRADE-OFF: the row IS the field — no mode to enter, and nothing to save
function TextRow({ anchor, name, value, onPick }: { anchor: Anchor; name: string; value: unknown; onPick: (next: string) => void }) {
	const [draft, setDraft] = useState(String(value ?? ""));

	useEffect(() => {
		setDraft(String(value ?? ""));
	}, [value]);

	return (
		<RowFrame anchor={anchor} name={name} unset={isUnset(value)}>
			<span className="otd-value">
				<input
					className="otd-text"
					placeholder="Empty"
					value={draft}
					onInput={(event) => setDraft(event.currentTarget.value)}
					onBlur={() => draft !== String(value ?? "") && onPick(draft)}
					onKeyDown={(event) => {
						if (event.key === "Enter") event.currentTarget.blur();
						if (event.key === "Escape") {
							setDraft(String(value ?? ""));
							event.currentTarget.blur();
						}
					}}
				/>
			</span>
		</RowFrame>
	);
}

type PropertyRowProps = {
	name: string;
	props: Record<string, unknown>;
	columns: string[];
	roster: string[];
	today: Date;
	onWrite: (key: string, value: unknown) => void;
};

function PropertyRow({ name, props, columns, roster, today, onWrite }: PropertyRowProps) {
	const anchor = anchorOf(name);
	const key = keyFor(props, name);
	const value = props?.[key];
	const write = (next: unknown) => onWrite(key, next);

	if (anchor.kind === "choice") {
		return (
			<ChoiceRow
				anchor={anchor}
				name={name}
				value={value}
				choices={anchor.choices ?? columns.map((column) => ({ value: column }))}
				onPick={write}
			/>
		);
	}
	if (anchor.kind === "progress") return <ProgressRow anchor={anchor} name={name} value={value} onPick={write} />;
	if (anchor.kind === "date") {
		return <DeadlineRow anchor={anchor} name={name} value={value} today={today} onPick={write} />;
	}
	if (anchor.kind === "people") {
		return <MembersRow anchor={anchor} name={name} value={value} roster={roster} onPick={write} />;
	}
	return <TextRow anchor={anchor} name={name} value={value} onPick={write} />;
}

// CONTEXT: the anchor is announced while typing, before the name is committed
function AddProperty({ taken, onAdd }: { taken: string[]; onAdd: (name: string) => void }) {
	const [isOpen, setOpen] = useState(false);
	const [draft, setDraft] = useState("");
	const anchor = anchorOf(draft);
	const isNameTaken = taken.some((name) => name.toLowerCase() === draft.trim().toLowerCase());

	const commit = () => {
		const name = draft.trim();
		setDraft("");
		setOpen(false);
		if (name !== "" && !isNameTaken) onAdd(name);
	};

	return (
		<Popover
			isOpen={isOpen}
			onOpenChange={setOpen}
			trigger={
				<button type="button" className="otd-add">
					<Glyph name="plus" />
					Add property
				</button>
			}
		>
			<div className="otd-pop-field" onKeyDown={(event) => event.key === "Enter" && commit()}>
				<Field
					block
					size="s"
					placeholder="Name it"
					value={draft}
					onInput={(event: FormEvent<HTMLInputElement>) => setDraft(event.currentTarget.value)}
				/>
			</div>
			<span className="otd-hint">
				<Glyph name={anchor.icon} />
				{isNameTaken
					? "This board already has a property with that name"
					: "Recognised — this will be {kind}".replace("{kind}", anchor.word)}
			</span>
		</Popover>
	);
}

const PREVIEW = "preview";
const DETAIL = "detail";

const COPIED_SECONDS = 1.4;

function glyphMarkup(name: string): string {
	return `<svg class="otd-glyph" viewBox="0 0 16 16" aria-hidden="true">${GLYPHS[name]}</svg>`;
}

// TRADE-OFF: the kit's class function, not its component — preact does not own this markup
function addCopyButton(block: HTMLElement) {
	const button = block.ownerDocument.createElement("button");
	button.type = "button";
	button.className = `${iconButtonClass({ size: "s" })} otd-copy`;
	button.setAttribute("aria-label", "Copy");
	button.title = "Copy";
	button.innerHTML = glyphMarkup("copy");

	let settle: ReturnType<typeof setTimeout> | undefined;
	const copy = () => {
		const text = (block.querySelector("code") ?? block).textContent ?? "";
		block.ownerDocument.defaultView?.navigator?.clipboard?.writeText?.(text);
		button.innerHTML = glyphMarkup("tick");
		clearTimeout(settle);
		settle = setTimeout(() => {
			button.innerHTML = glyphMarkup("copy");
		}, COPIED_SECONDS * 1000);
	};

	button.addEventListener("click", copy);
	block.appendChild(button);
	return () => {
		clearTimeout(settle);
		button.removeEventListener("click", copy);
		button.remove();
	};
}

// CONTEXT: the host renders read mode, post-processors included; we own the element and nothing else
function Preview({ markdown, render }: { markdown: string; render?: RenderMarkdown | undefined }) {
	const holder = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const element = holder.current;
		if (!element || !render) return undefined;
		const stop = render(element, markdown);
		const dressed = new Map<Element, () => void>();

		const dress = () => {
			for (const block of element.querySelectorAll("pre")) {
				if (!dressed.has(block)) dressed.set(block, addCopyButton(block));
			}
			for (const [block, undo] of dressed) {
				if (element.contains(block)) continue;
				undo();
				dressed.delete(block);
			}
		};

		dress();
		// CONTEXT: renderMarkdown hands back a stop, not a promise, and mermaid lands later still
		const watcher = new MutationObserver(dress);
		watcher.observe(element, { childList: true, subtree: true });

		return () => {
			watcher.disconnect();
			for (const undo of dressed.values()) undo();
			stop?.();
		};
	}, [markdown]);

	return <div className="otd-md" ref={holder} />;
}

// TRADE-OFF: fetched when the note opens — listing re-runs on every vault event, so rows carry no body
type DescriptionProps = {
	path: string;
	read: (given: { path: string }) => Promise<TaskRecord | null>;
	write: (given: { path: string }, patch: { body: string }) => Promise<TaskRecord | null>;
	render?: RenderMarkdown | undefined;
	canPreview: boolean;
	canEdit: boolean;
};

function Description({ path, read, write, render, canPreview, canEdit }: DescriptionProps) {
	const [saved, setSaved] = useState("");
	const [draft, setDraft] = useState("");
	const [isRefused, setRefused] = useState(false);
	const [wanted, setWanted] = useState(PREVIEW);
	// CONTEXT: the caret is only handed over to somebody who ASKED for the editor, never on first paint
	const [isSwitched, setSwitched] = useState(false);

	useEffect(() => {
		let alive = true;
		read({ path }).then((record) => {
			if (!alive) return;
			setSaved(record?.body ?? "");
			setDraft(record?.body ?? "");
			setRefused(false);
		});
		return () => {
			alive = false;
		};
	}, [path]);

	const offered = [canPreview ? PREVIEW : null, canEdit ? DETAIL : null].filter(Boolean);
	if (offered.length === 0) return null;
	const mode = offered.includes(wanted) ? wanted : offered[0];

	const save = async () => {
		if (draft === saved) return;
		const record = await write({ path }, { body: draft });
		// CONTEXT: update reports the body that LANDED, so an absent one is a write the note refused
		if (record?.body === undefined) return setRefused(true);
		setRefused(false);
		setSaved(record.body);
		setDraft(record.body);
	};

	return (
		<div className="otd-desc" onBlur={save}>
			<div className="otd-desc-head">
				<span className="otd-cap">Description</span>
				{offered.length > 1 ? (
					<Segmented
						items={[
							{ value: PREVIEW, label: [<Glyph key="glyph" name="eye" />, "Preview"] },
							{ value: DETAIL, label: [<Glyph key="glyph" name="brackets" />, "Detail"] },
						]}
						size="s"
						value={mode}
						onChange={(next: string) => {
							setWanted(next);
							setSwitched(true);
						}}
					/>
				) : null}
			</div>
			{isRefused ? (
				<p className="otd-refused">
					<Glyph name="alert" />
					Not saved. This would turn the note's first line into its properties.
				</p>
			) : null}
			{mode === PREVIEW ? (
				<Preview markdown={draft} render={render} />
			) : (
				<MarkdownEditor className="otd-editor" value={draft} placeholder="Say what this is" onInput={setDraft} focusAtStart={isSwitched} />
			)}
		</div>
	);
}

// CONTEXT: under this a press is a press, over it a drag — src/settings-window.js draws the same line
const TAP_SLOP_PX = 4;

// CONTEXT: chips wrap, so the drop is the chip NEAREST the pointer, never the one under a column
function dropIndex(boxes: DOMRect[], x: number, y: number): number {
	let landed = -1;
	let nearest = Infinity;
	boxes.forEach((box, at) => {
		const dx = x - (box.left + box.width / 2);
		const dy = y - (box.top + box.height / 2);
		const far = dx * dx + dy * dy;
		if (far >= nearest) return;
		nearest = far;
		landed = at;
	});
	return landed;
}

function movedWithin(list: string[], from: number, to: number): string[] {
	const next = [...list];
	const [moving] = next.splice(from, 1);
	if (!moving) return list;
	next.splice(to, 0, moving);
	return next;
}

// CONTEXT: a drag ends in a click, and the chip under it is a popover trigger
function swallowNextClick() {
	const swallow = (event: Event) => {
		event.stopPropagation();
		event.preventDefault();
		release();
	};
	const release = () => window.removeEventListener("click", swallow, true);
	window.addEventListener("click", swallow, true);
	setTimeout(release, 0);
}

type TagChipProps = {
	tag: string;
	tone: string;
	held: boolean;
	onGrab: (event: ReactPointerEvent<HTMLButtonElement>) => void;
	onSave: (name: string, tone: string) => void;
};

function TagChip({ tag, tone, held, onGrab, onSave }: TagChipProps) {
	const [isOpen, setOpen] = useState(false);
	const [name, setName] = useState(tag);
	const [picked, setPicked] = useState(tone);

	// CONTEXT: the draft is the tag as it stands the moment the panel opens, never what was typed before
	const show = (next: boolean) => {
		setOpen(next);
		if (!next) return;
		setName(tag);
		setPicked(tone);
	};

	const save = () => {
		setOpen(false);
		onSave(String(name).trim(), picked);
	};

	return (
		<Popover
			isOpen={isOpen}
			onOpenChange={show}
			trigger={
				<Pill tone={tone} asChild>
					<button
						type="button"
						className={`otd-tag${held ? " is-held" : ""}`}
						title={`Edit ${tag}`}
						onPointerDown={onGrab}
					>
						{`#${tag}`}
					</button>
				</Pill>
			}
		>
			<div className="otd-pop-field" onKeyDown={(event) => event.key === "Enter" && save()}>
				<Field block size="s" placeholder="Name it" value={name} onInput={(event: FormEvent<HTMLInputElement>) => setName(event.currentTarget.value)} />
			</div>
			<div className="otd-tones">
				{TONE_NAMES.map((each: string) => (
					<button
						key={each}
						type="button"
						className={cx("otd-tone", toneClass(each), each === picked && "is-picked")}
						aria-label={each}
						title={each}
						aria-pressed={each === picked}
						onClick={() => setPicked(each)}
					/>
				))}
			</div>
			<div className="otd-pop-actions">
				<Button size="s" variant="neutral" onClick={() => setOpen(false)}>
					Cancel
				</Button>
				<Button size="s" variant="accent" block onClick={save}>
					Save
				</Button>
			</div>
		</Popover>
	);
}

type TagRowProps = {
	tags: string[];
	tones: Tones;
	roster: string[];
	onWrite: (tags: string[], tones: Tones) => void;
};

function TagRow({ tags, tones, roster, onWrite }: TagRowProps) {
	const [isOpen, setOpen] = useState(false);
	const [dragged, setDragged] = useState<TagDrag | null>(null);
	const listRef = useRef<HTMLDivElement | null>(null);
	const shown = dragged?.list ?? tags;

	const toggle = (tag: string) => {
		if (!tags.includes(tag)) return onWrite([...tags, tag], tones);
		onWrite(tags.filter((entry) => entry !== tag), withoutTone(tones, tag));
	};

	// CONTEXT: a rename moves the tone with the name, so the map never keeps a tag nobody wears
	const save = (was: string, name: string, tone: string) => {
		const wanted = name === "" ? was : name;
		const next = [...new Set(tags.map((entry) => (entry === was ? wanted : entry)))];
		const kept = withoutTone(tones, was);
		onWrite(next, tone === "neutral" ? kept : { ...kept, [wanted]: tone });
	};

	const grab = (at: number) => (event: ReactPointerEvent<HTMLButtonElement>) => {
		if (event.button) return;
		const start = { x: event.clientX, y: event.clientY };
		const drag = { at, list: tags, isDragging: false };

		const move = (pointer: PointerEvent) => {
			const isPastTapSlop = Math.abs(pointer.clientX - start.x) > TAP_SLOP_PX || Math.abs(pointer.clientY - start.y) > TAP_SLOP_PX;
			if (!drag.isDragging && !isPastTapSlop) return;
			drag.isDragging = true;
			const boxes = [...(listRef.current?.querySelectorAll(".otd-tag") ?? [])].map((node) => node.getBoundingClientRect());
			const to = dropIndex(boxes, pointer.clientX, pointer.clientY);
			if (to < 0 || to === drag.at) return setDragged({ ...drag });
			drag.list = movedWithin(drag.list, drag.at, to);
			drag.at = to;
			setDragged({ ...drag });
		};

		const stop = () => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", stop);
			setDragged(null);
			if (!drag.isDragging) return;
			swallowNextClick();
			if (drag.list.join("\n") !== tags.join("\n")) onWrite(drag.list, tones);
		};

		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", stop);
	};

	return (
		<div className="otd-tags" ref={listRef}>
			{shown.map((tag, at) => (
				<TagChip
					key={tag}
					tag={tag}
					tone={tones[tag] ?? "neutral"}
					held={dragged?.isDragging === true && dragged.at === at}
					onGrab={grab(at)}
					onSave={(name, tone) => save(tag, name, tone)}
				/>
			))}
			<Popover
				isOpen={isOpen}
				onOpenChange={setOpen}
				trigger={
					<button type="button" className="otd-tag-add">
						<Glyph name="plus" />
						Tag
					</button>
				}
			>
				<PopoverSearch placeholder="Find a tag">
					{(needle: string) => [
						...roster
							.filter((tag) => tag.toLowerCase().includes(needle))
							.map((tag) => (
								<PopoverItem key={tag} checked={tags.includes(tag)} onClick={() => toggle(tag)}>
									{`#${tag}`}
								</PopoverItem>
							)),
						needle !== "" && !roster.some((tag) => tag.toLowerCase() === needle) ? (
							<PopoverItem key="add" onClick={() => toggle(needle)}>
								<Glyph name="plus" />
								{`#${needle}`}
							</PopoverItem>
						) : null,
					]}
				</PopoverSearch>
			</Popover>
		</div>
	);
}

// CONTEXT: gathered off the board's own notes — there is no roster anywhere else to read
function valuesAcross(rows: TaskRow[], name: string): string[] {
	const seen = new Set<string>();
	for (const row of rows) {
		for (const entry of toTrimmedList(row.props?.[keyFor(row.props, name)])) seen.add(entry);
	}
	return [...seen];
}

type TaskDialogProps = {
	tasks: CollectionGateway<TaskRecord, TaskAccesses>;
	rows: TaskRow[];
	columns: string[];
	properties: string[];
	onBoard: string;
	opened: ValueGateway<unknown, { get: GetAction; update: UpdateAction }>;
	openedRef: unknown;
	today: Date;
	onAddProperty?: ((names: string[]) => void) | undefined;
	host?: ViewHost | undefined;
	navigator?: Navigation | undefined;
};

function TaskDialog({ tasks, rows, columns, properties, onBoard, opened, openedRef, today, onAddProperty, host, navigator }: TaskDialogProps) {
	const canUpdate = canDo(tasks.update);
	// TRADE-OFF: found in the list the board already holds — tasks.get would read the note again on every vault event
	const task = rows.find((row) => row.ref === openedRef) ?? null;
	const isOpen = Boolean(openedRef) && Boolean(task);
	const names = properties?.length ? properties : STARTING_PROPERTIES;
	const props = task?.props ?? {};
	const people = useMemo(() => [...valuesAcross(rows, "members"), ...valuesAcross(rows, "assignees")], [rows]);
	const tagRoster = useMemo(() => valuesAcross(rows, "tags"), [rows]);

	const setProperties = (patch: Record<string, unknown>) => {
		if (!canUpdate || !task) return;
		tasks.update({ ref: task.ref, data: { props: patch } });
	};

	const setProperty = (key: string, value: unknown) => setProperties({ [key]: value });
	const shownTitle = String(props.title ?? task?.name ?? "");

	const rename = (title: string | null) => {
		const wanted = String(title ?? "").trim();
		if (!task || wanted === "" || wanted === (props.title ?? task.name)) return;
		setProperty(keyFor(props, "title"), wanted);
	};

	return (
		<Dialog isOpen={isOpen} onOpenChange={(next: boolean) => !next && opened.update(null)}>
				<DialogContent className="orbi orbi-task-dialog">
					<div className="otd-top">
						<span className="otd-where">
							<Glyph name="task" />
							Card
							{onBoard ? ` · ${onBoard}` : ""}
						</span>
						<div className="otd-corner">
							<IconButton
								size="s"
								label="Open the note"
								title="Open the note"
								onClick={() => navigator?.navigate?.(`/${task?.ref ?? ""}`)}
							>
								<Glyph name="expand" />
							</IconButton>
							<IconButton size="s" label="Close" title="Close" onClick={() => opened.update(null)}>
								<Glyph name="close" />
							</IconButton>
						</div>
					</div>

					<div className="otd-body">
						<div className="otd-left">
							<h2
								className="otd-title"
								contentEditable={canUpdate ? "true" : undefined}
								suppressContentEditableWarning
								onKeyDown={(event) => {
									if (event.key === "Enter") {
										event.preventDefault();
										event.currentTarget.blur();
									}
									if (event.key === "Escape") {
										event.currentTarget.textContent = shownTitle;
										event.currentTarget.blur();
									}
								}}
								onBlur={(event) => rename(event.currentTarget.textContent)}
							>
								{shownTitle}
							</h2>

							<TagRow
								tags={toTrimmedList(props[keyFor(props, "tags")])}
								tones={toToneMap(props[keyFor(props, "tagTones")])}
								roster={tagRoster}
								onWrite={(next, tones) =>
									setProperties({ [keyFor(props, "tags")]: next, [keyFor(props, "tagTones")]: tones })
								}
							/>

							{task && tasks.get.can().can ? (
								<Description
									key={task.ref}
									path={task.ref}
									read={(given: { path: string }) => tasks.get(given.path).then((row) => (row ? row.value : null))}
									write={(given: { path: string }, patch: { body: string }) => tasks.update({ ref: given.path, data: patch }).then((row) => (row ? row.value : null))}
									render={host?.ui?.renderMarkdown}
									canPreview={Boolean(host?.can?.renderMarkdown && host?.ui?.renderMarkdown)}
									canEdit={canUpdate}
								/>
							) : null}
						</div>

						<aside className="otd-right">
							<Sidebar mode="minimal" className="otd-props">
								<div className="otd-plate-head">
									<h4>Properties</h4>
								</div>
								<SidebarGroup>
								{names.map((name) => (
									<PropertyRow
										key={name}
										name={name}
										props={props}
										columns={columns}
										roster={people}
										today={today}
										onWrite={setProperty}
									/>
								))}
								</SidebarGroup>
								{onAddProperty ? (
									<AddProperty
										taken={names}
										onAdd={(name) => onAddProperty([...names, name])}
									/>
								) : null}
							</Sidebar>
						</aside>
					</div>
				</DialogContent>
		</Dialog>
	);
}

export default createWidget(function KanbanBoard({ board, groupBy: grouping, slots, tasks, boards, selection, opened, host, navigator }: KanbanProps) {
	// CONTEXT: one clock for the whole board, so two cards cannot disagree about which year it is
	const today = useMemo(() => new Date(), []);
	const onBoard = pickedValue(useData(selection.get).data);
	const openedRef = useData(opened.get).data;
	const tasksData = useData(tasks.list);
	const boardsData = useData(boards.list);
	const allTasks: TaskRow[] = useMemo(() => flatRows(tasksData.rows), [tasksData.rows]);
	const record = useData(board.get).data;
	const boardColumns: BoardColumn[] = useMemo(() => columnsOf(record), [record]);
	const archivedColumns = archivedColumnsOf(boardColumns);
	const authoredColumns = boardColumns.map((column) => column.name);
	const saveColumns = (columns: BoardColumn[]) => board.update(columnsWritten(columns));
	const canEditColumns = canDo(board.update);
	const shownColumns = shownColumnsOf(boardColumns);
	// CONTEXT: a board with no columns is not a board — the last one out leaves a fresh one behind
	const columnNames = shownColumns.length > 0 ? shownColumns : [freeUntitled([...authoredColumns, ...archivedColumns])];
	const groupBy = String(useData(grouping.get).data ?? "") || "status";
	const rows = allTasks;
	const canCreateTask = canDo(tasks.create);
	const canUpdateTask = canDo(tasks.update);
	const columns = toColumns(rows, columnNames, groupBy, archivedColumns);
	const [archiving, setArchiving] = useState<string | null>(null);
	const heldByArchiving = columns.find((column) => column.title === archiving)?.rows.length ?? 0;

	// CONTEXT: found on the read and only reported — the re-mint is this press
	const duplicates = boardsData.data?.duplicates ?? [];
	const remintCount = duplicates.reduce((count, entry) => count + entry.remints.length, 0);
	const canRepairIds = canDo(boards.repairIds) && remintCount > 0;
	const [isRepairingIds, setRepairingIds] = useState(false);

	const repairIds = async () => {
		setRepairingIds(false);
		await boards.repairIds();
	};

	// CONTEXT: a column is a setting, not a task — adding one must not invent a note
	// CONTEXT: naming an archived list is how it is restored, or the added one would never show
	const addList = (name: string) => {
		const trimmed = String(name ?? "").trim();
		if (!trimmed || shownColumns.includes(trimmed)) return;
		if (archivedColumns.includes(trimmed)) {
			saveColumns(columnPatched(boardColumns, trimmed, restored));
			return;
		}
		saveColumns([...boardColumns, { name: trimmed }]);
	};

	const columnsAfterRename = (was: string, name: string) =>
		authoredColumns.includes(was) ? columnPatched(boardColumns, was, (column: BoardColumn) => ({ ...column, name })) : [...boardColumns, { name }];

	const refileTasksUnder = async (was: string, name: string) => {
		if (!canUpdateTask) return;
		for (const row of rows.filter((held) => (held.props?.[groupBy] ?? "") === was)) {
			await tasks.update({ ref: row.ref, data: { props: { [groupBy]: name } } });
		}
	};

	const renameList = async (was: string, next: string | null) => {
		const name = String(next ?? "").trim();
		if (!name || name === was) return;
		if (columnNames.includes(name) || archivedColumns.includes(name)) return host?.ui?.notify(`"${name}" is already a list`);
		saveColumns(columnsAfterRename(was, name));
		await refileTasksUnder(was, name);
	};

	// CONTEXT: the one place a column leaves the board; nothing is unnamed, so a restore is lossless
	const archiveList = (name: string) => {
		saveColumns(columnPatched(boardColumns, name, archived));
		setArchiving(null);
	};

	// CONTEXT: a joined string, not the array — a fresh array every render notifies forever
	const [carried, setCarried] = useState<TaskRow | null>(null);
	const dragging: Dragging = {
		row: carried,
		pick: (row: TaskRow) => setCarried(row),
		drop: () => setCarried(null),
	};

	const boardRef = useRef<HTMLDivElement | null>(null);
	const [reorder, setReorder] = useState<Reorder | null>(null);

	// TRADE-OFF: one step and one origin, not a rect per column — every column is the same width
	const grabColumn = (from: number) => (event: DragEvent<HTMLElement>) => {
		const strip = boardRef.current;
		if (!strip) return;
		const lists = [...strip.querySelectorAll(".ok-list")];
		const [firstList] = lists;
		const carriedList = lists[from];
		if (!firstList || !carriedList) return;
		const first = firstList.getBoundingClientRect();
		const carriedRect = carriedList.getBoundingClientRect();
		event.dataTransfer?.setDragImage?.(carriedList, event.clientX - carriedRect.left, event.clientY - carriedRect.top);
		const carrying = {
			from,
			to: from,
			step: lists[1] ? lists[1].getBoundingClientRect().left - first.left : first.width,
			origin: first.left - strip.getBoundingClientRect().left + strip.scrollLeft,
		};
		// CONTEXT: the browser paints the drag image after this handler, so the column empties a frame later
		requestAnimationFrame(() => setReorder(carrying));
	};

	// CONTEXT: content coordinates, so scrolling the board mid-drag does not shift the aim
	const aimColumn = (event: DragEvent<HTMLElement>) => {
		if (!reorder) return;
		event.preventDefault();
		const strip = boardRef.current;
		if (!strip) return;
		const x = event.clientX - strip.getBoundingClientRect().left + strip.scrollLeft;
		const wanted = Math.floor((x - reorder.origin) / reorder.step);
		const to = Math.max(0, Math.min(columnNames.length - 1, wanted));
		if (to !== reorder.to) setReorder({ ...reorder, to });
	};

	const dropColumn = () => {
		if (!reorder) return;
		if (reorder.to !== reorder.from) {
			saveColumns(afterColumnMoves(boardColumns, columnNames, reorder.from, reorder.to));
		}
		setReorder(null);
	};

	const shiftOf = (index: number) => {
		if (!reorder) return undefined;
		if (index === reorder.from) return (reorder.to - reorder.from) * reorder.step;
		if (index > reorder.from && index <= reorder.to) return -reorder.step;
		if (index < reorder.from && index >= reorder.to) return reorder.step;
		return 0;
	};

	const addTask = async (column: string, title: string) => {
		if (!canCreateTask) return;
		// CONTEXT: without an order of its own a new task sorts last by accident, and the first edit moves it
		const lastOrder = rows.reduce((highest, row) => Math.max(highest, Number(row.props?.order) || 0), 0);
		await tasks.create({
			props: {
				title,
				[groupBy]: column,
				board: onBoard,
				order: lastOrder + 1,
				progress: 0,
				priority: "P2",
			},
		});
	};

	// CONTEXT: the vault's own subscription brings the board back updated
	const moveTask = async (column: string) => {
		if (!carried || !canUpdateTask) return;
		if ((carried.props?.[groupBy] ?? "") === column) return;
		await tasks.update({ ref: carried.ref, data: { props: { [groupBy]: column } } });
		setCarried(null);
	};

	if (tasksData.isLoading && rows.length === 0) {
		return (
			<WidgetRoot className="orbi orbi-kanban" defaultBackgroundType="none">
				<style>{CSS}</style>
				<p className="ok-empty">Loading tasks…</p>
			</WidgetRoot>
		);
	}

	return (
		<WidgetRoot className="orbi orbi-kanban" defaultBackgroundType="none">
			<style>{CSS}</style>
			<div
				className={`ok-board${reorder ? " is-dragging" : ""}`}
				ref={boardRef}
				onDragOver={aimColumn}
				onDrop={dropColumn}
			>
				{columns.map((column, index) => (
					<KanbanList
						key={column.title}
						title={column.title}
						rows={column.rows}
						cards={column.rows.map((row) => toCard(row, today))}
						CardSlot={slots?.card ?? null}
						canWrite={canCreateTask}
						dragging={dragging}
						shift={shiftOf(index)}
						placeholder={reorder?.from === index}
						onGrab={canEditColumns && index < columnNames.length ? grabColumn(index) : undefined}
						onRelease={() => setReorder(null)}
						onAdd={(title) => addTask(column.title, title)}
						onArchive={canEditColumns ? () => setArchiving(column.title) : undefined}
						onRename={canEditColumns ? (next) => renameList(column.title, next) : undefined}
						onOpen={(row) => opened.update(row.ref)}
						onDropTask={() => moveTask(column.title)}
						opened={openedRef}
					/>
				))}
				{canEditColumns ? <AddList onAdd={addList} /> : null}
				{canRepairIds ? (
					<Plate asChild>
						<button type="button" className="ok-add-list-rest ok-repair-ids" onClick={() => setRepairingIds(true)}>
							<Icon name="folder" size={16} />
							<span>{REPAIR_BOARDS}</span>
						</button>
					</Plate>
				) : null}
			</div>

			<ConfirmDialog
				isOpen={Boolean(archiving)}
				onOpenChange={() => setArchiving(null)}
				className="ok-archive"
				variant="accent"
				confirmLabel={ARCHIVE}
				title={ARCHIVE_TITLE.replace("{name}", archiving ?? "")}
				description={
					<>
						The list leaves the board. Its {heldByArchiving} task{heldByArchiving === 1 ? "" : "s"} keep their{" "}
						{groupBy} property, so nothing in the notes changes and restoring the list brings them all back.
					</>
				}
				onConfirm={() => archiveList(archiving ?? "")}
			/>

			<ConfirmDialog
				isOpen={isRepairingIds}
				onOpenChange={() => setRepairingIds(false)}
				className="ok-repair-ids-ask"
				variant="accent"
				confirmLabel={REPAIR}
				title={REPAIR_TITLE}
				description={remintCount === 1 ? REPAIR_ONE : REPAIR_MANY.replace("{count}", String(remintCount))}
				onConfirm={repairIds}
			/>

			<TaskDialog
				tasks={tasks}
				rows={rows}
				columns={shownColumns}
				properties={propertiesOf(record)}
				onBoard={onBoard}
				opened={opened}
				openedRef={openedRef}
				today={today}
				onAddProperty={canEditColumns ? (names: string[]) => board.update({ properties: names }) : undefined}
				host={host}
				navigator={navigator}
			/>
		</WidgetRoot>
	);
}, {
	props: {
		tasks: {
			label: "Tasks",
			default: {
				path: "Orbitask/Tasks",
				sort: [{ prop: "order", dir: "asc" }],
				where: [
					{ prop: "board", op: "is", value: { wants: "@core/editable-tabs/selection" } },
					{ spread: { wants: "@core/filter-panel/chosen" } },
				],
			},
		},
		boards: {
			label: "Boards",
			default: { path: "Orbitask/Boards" },
		},
		selection: {
			label: "Shown board",
			hint: "Which board this draws. Bind a tab strip and the two move together.",
			of: "boards",
			field: "board",
			fallback: "first",
			wants: "@core/editable-tabs/selection",
		},
		board: {
			label: "Board",
			hint: "The board this draws: its columns, their order and which of them are archived.",
			picks: "selection",
			of: "boards",
			wasSettings: { columns: "columns", archivedColumns: "archivedColumns" },
			default: { value: { columns: [{ name: "To Do" }, { name: "Doing" }, { name: "Done" }] } },
		},
		opened: {
			label: "Opened task",
			hint: "Which card is open, as a box. The board draws it full size itself.",
			of: "tasks",
		},
		groupBy: {
			wasSetting: true,
			type: "text",
			label: "Group tasks by property",
			default: { value: "status" },
		},
	},
});
