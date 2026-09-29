export const MARKDOWN_CSS = `
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
	color: var(--wg-kit-text);
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
	color: var(--wg-kit-text);
}

.orbi-task-dialog .otd-md p { max-width: 66ch; color: var(--wg-kit-text-muted); }

.orbi-task-dialog .otd-md ul,
.orbi-task-dialog .otd-md ol {
	padding-left: 1.15em;
	color: var(--wg-kit-text-muted);
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
	color: var(--wg-kit-text-muted);
}

.orbi-task-dialog .otd-md th {
	font-weight: var(--font-semibold, 600);
	color: var(--wg-kit-text);
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
	color: var(--wg-kit-text-muted);
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
	color: var(--wg-kit-text);
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
`;
