export const PROPERTIES_CSS = `
.orbi-task-dialog .otd-plate-head h4 {
	margin: 0;
	font-size: var(--font-ui-small, 14px);
	font-weight: var(--font-semibold, 600);
	color: var(--wg-kit-text);
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
	color: var(--wg-kit-text);
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
	color: var(--wg-kit-text-muted);
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
	color: var(--wg-kit-text);
}

.orbi-task-dialog .otd-value.is-empty { color: var(--text-faint); }

/* CONTEXT: a neutral pill is the plate's own fill, so on the plate it has to lift to be seen */
.orbi-task-dialog .otd-value .wg-kit-pill:not(.is-accent):not(.is-ok):not(.is-warn):not(.is-err) {
	background: var(--wg-kit-raise);
	color: var(--wg-kit-text);
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
	color: var(--wg-kit-text);
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
	color: var(--wg-kit-text-muted);
	text-align: left;
	cursor: pointer;
}

.orbi-task-dialog .otd-add:hover { background: var(--background-modifier-hover); color: var(--wg-kit-text); }

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
	color: var(--wg-kit-text-muted);
}

@container taskdialog (width < 760px) {
	.orbi-task-dialog .otd-body { grid-template-columns: minmax(0, 1fr); }
	.orbi-task-dialog .otd-title { font-size: 21px; }
}
`;
