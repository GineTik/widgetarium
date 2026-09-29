export const DIALOG_CSS = `
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
	color: var(--wg-kit-text);
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

.orbi-task-dialog .otd-tag-add:hover { background: var(--wg-kit-fill); color: var(--wg-kit-text-muted); }

.orbi-task-dialog .otd-desc {
	display: flex;
	flex-direction: column;
	gap: var(--size-4-2, 8px);
	padding-top: var(--size-2-2, 4px);
}
`;
