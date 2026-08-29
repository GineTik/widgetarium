import { createWidget, WidgetRoot, Dialog, DialogContent } from "widgetarium";
import {
	APPROVAL_TONES,
	Calendar,
	Field,
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
	toneOf,
} from "widgetarium/kit";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";

const CSS = `
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

.orbi-task-dialog .otd-body {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 316px;
	align-items: start;
	gap: var(--size-4-5, 20px);
	min-height: 0;
	overflow: auto;
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

.orbi-task-dialog .otd-md > * { margin: 0 0 var(--size-4-3, 12px); }
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

.orbi-task-dialog .otd-md pre {
	padding: var(--size-4-3, 12px) var(--size-4-4, 16px);
	border-radius: var(--wg-kit-item);
	background: var(--wg-kit-fill);
	overflow-x: auto;
}

.orbi-task-dialog .otd-md pre code {
	font-family: var(--font-monospace);
	font-size: var(--font-ui-smaller, 12px);
	line-height: 1.7;
	color: var(--text-muted);
	white-space: pre;
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
.orbi-task-dialog .otd-editor { min-height: 160px; }

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

.orbi-task-dialog .otd-props { gap: var(--size-2-3, 6px); }

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

/* CONTEXT: pressed, the row lifts off the plate onto a raised surface of its own */
.orbi-task-dialog .otd-row.is-open::before,
.orbi-task-dialog .otd-row:focus-within::before {
	background: var(--wg-kit-raise);
	box-shadow: var(--wg-kit-shadow);
}

.orbi-task-dialog .otd-name {
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

.orbi-task-dialog .otd-row.is-unset .otd-name { color: var(--text-faint); }

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

.orbi-task-dialog .otd-name .otd-glyph { color: var(--text-faint); }
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

// CONTEXT: paths copied from docs/reference/task-dialog.html, on its 16 grid
const GLYPHS = {
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
};

function Glyph({ name, className }) {
	return (
		<svg
			class={`otd-glyph${className ? ` ${className}` : ""}`}
			viewBox="0 0 16 16"
			aria-hidden="true"
			dangerouslySetInnerHTML={{ __html: GLYPHS[name] }}
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
const ANCHORS = {
	status: { kind: "choice", icon: "columns", word: "one of the board's columns" },
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

function anchorOf(name) {
	// CONTEXT: a property called "constructor" would otherwise reach Object's own prototype
	const wanted = String(name ?? "").trim().toLowerCase();
	return Object.hasOwn(ANCHORS, wanted) ? ANCHORS[wanted] : TEXT_ANCHOR;
}

function toList(value) {
	if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
	return String(value ?? "")
		.split(",")
		.map((entry) => entry.trim())
		.filter(Boolean);
}

// CONTEXT: names compare case-insensitively, and a note keeps the key it already spells
function keyFor(props, name) {
	const wanted = String(name ?? "").toLowerCase();
	return Object.keys(props ?? {}).find((key) => key.toLowerCase() === wanted) ?? name;
}

function isUnset(value) {
	if (value === undefined || value === null || value === "") return true;
	return Array.isArray(value) && value.length === 0;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;
const DAY_MS = 24 * 60 * 60 * 1000;

// TRADE-OFF: only ISO parses — anything else is shown verbatim rather than reinterpreted
function toDate(value) {
	if (value instanceof Date) return value;
	const found = ISO_DATE.exec(String(value ?? ""));
	if (!found) return null;
	return new Date(Number(found[1]), Number(found[2]) - 1, Number(found[3]));
}

function isoOf(date) {
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}

function dateLabel(value) {
	const date = toDate(value);
	if (!date) return String(value ?? "");
	return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function nextMonday(today) {
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
function toneForPerson(name) {
	let hash = 0;
	for (const letter of String(name)) hash = (hash * 31 + letter.charCodeAt(0)) % 100000;
	return AVATAR_TONES[hash % AVATAR_TONES.length];
}

function initialsOf(name) {
	return String(name)
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((word) => word.charAt(0).toUpperCase())
		.join("");
}

function Avatar({ person }) {
	return (
		<i class="otd-avatar" style={toneForPerson(person)} title={person}>
			{initialsOf(person)}
		</i>
	);
}

function RowFrame({ anchor, name, unset, open, children, asButton, onClick }) {
	const className = `otd-row${unset ? " is-unset" : ""}${open ? " is-open" : ""}`;
	const label = (
		<span class="otd-name">
			<Glyph name={anchor.icon} />
			{name}
		</span>
	);
	if (!asButton) {
		return (
			<div class={className}>
				{label}
				{children}
			</div>
		);
	}
	return (
		<button type="button" class={className} onClick={onClick}>
			{label}
			{children}
		</button>
	);
}

function ChoiceRow({ anchor, name, value, choices, onPick }) {
	const [open, setOpen] = useState(false);
	const unset = isUnset(value);

	const shown = unset ? (
		<span class="otd-value is-empty">Empty</span>
	) : (
		<span class="otd-value">
			<Pill tone={anchor.tones ? toneOf(anchor.tones, value) : "neutral"}>{String(value)}</Pill>
			<Glyph name="caret" className="otd-caret" />
		</span>
	);

	const pick = (next) => {
		setOpen(false);
		onPick(next);
	};

	return (
		<Popover
			placement="below"
			open={open}
			onOpenChange={setOpen}
			trigger={
				<RowFrame anchor={anchor} name={name} unset={unset} open={open} asButton>
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
					{choice.note ? <span class="otd-item-note">{choice.note}</span> : null}
				</PopoverItem>
			))}
			<PopoverSeparator />
			<PopoverItem onClick={() => pick("")}>
				<Glyph name="close" />
				Clear
			</PopoverItem>
		</Popover>
	);
}

function ProgressRow({ anchor, name, value, onPick }) {
	const number = Number(value);
	return (
		<RowFrame anchor={anchor} name={name} unset={isUnset(value)}>
			<span class="otd-value">
				<Progress value={Number.isFinite(number) ? number : 0} label={name} onChange={onPick} />
			</span>
		</RowFrame>
	);
}

function DeadlineRow({ anchor, name, value, today, onPick }) {
	const [open, setOpen] = useState(false);
	const unset = isUnset(value);

	const shown = unset ? (
		<span class="otd-value is-empty">Empty</span>
	) : (
		<span class="otd-value">
			{dateLabel(value)}
			<Glyph name="caret" className="otd-caret" />
		</span>
	);

	const pick = (date) => {
		setOpen(false);
		onPick(date === null ? "" : isoOf(date));
	};

	return (
		<Popover
			placement="below"
			open={open}
			onOpenChange={setOpen}
			trigger={
				<RowFrame anchor={anchor} name={name} unset={unset} open={open} asButton>
					{shown}
				</RowFrame>
			}
		>
			<Calendar selected={toDate(value) ?? undefined} today={today} onSelect={pick} />
			<PopoverSeparator />
			<PopoverItem onClick={() => pick(today)}>
				Today
				<span class="otd-item-note">{dateLabel(isoOf(today))}</span>
			</PopoverItem>
			<PopoverItem onClick={() => pick(nextMonday(today))}>
				Next Monday
				<span class="otd-item-note">{dateLabel(isoOf(nextMonday(today)))}</span>
			</PopoverItem>
			<PopoverSeparator />
			<PopoverItem onClick={() => pick(null)}>
				<Glyph name="close" />
				Clear
			</PopoverItem>
		</Popover>
	);
}

function MembersRow({ anchor, name, value, roster, onPick }) {
	const [open, setOpen] = useState(false);
	const held = toList(value);
	const unset = held.length === 0;

	const toggle = (person) => {
		onPick(held.includes(person) ? held.filter((entry) => entry !== person) : [...held, person]);
	};

	const shown = (
		<span class={`otd-value${unset ? " is-empty" : ""}`}>
			{unset ? (
				"Empty"
			) : (
				<span class="otd-avatars">
					{held.map((person) => (
						<Avatar key={person} person={person} />
					))}
					<i class="otd-avatar otd-avatar-add">
						<Glyph name="plus" />
					</i>
				</span>
			)}
		</span>
	);

	return (
		<Popover
			placement="below"
			open={open}
			onOpenChange={setOpen}
			trigger={
				<RowFrame anchor={anchor} name={name} unset={unset} open={open} asButton>
					{shown}
				</RowFrame>
			}
		>
			<PopoverSearch placeholder="Find a person">
				{(needle) => [
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
function TextRow({ anchor, name, value, onPick }) {
	const [draft, setDraft] = useState(String(value ?? ""));

	useEffect(() => {
		setDraft(String(value ?? ""));
	}, [value]);

	return (
		<RowFrame anchor={anchor} name={name} unset={isUnset(value)}>
			<span class="otd-value">
				<input
					class="otd-text"
					placeholder="Empty"
					value={draft}
					onInput={(event) => setDraft(event.target.value)}
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

function PropertyRow({ name, props, columns, roster, today, onWrite }) {
	const anchor = anchorOf(name);
	const key = keyFor(props, name);
	const value = props?.[key];
	const write = (next) => onWrite(key, next);

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
function AddProperty({ taken, onAdd }) {
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState("");
	const anchor = anchorOf(draft);
	const clash = taken.some((name) => name.toLowerCase() === draft.trim().toLowerCase());

	const commit = () => {
		const name = draft.trim();
		setDraft("");
		setOpen(false);
		if (name !== "" && !clash) onAdd(name);
	};

	return (
		<Popover
			placement="below"
			open={open}
			onOpenChange={setOpen}
			trigger={
				<button type="button" class="otd-add">
					<Glyph name="plus" />
					Add property
				</button>
			}
		>
			<div class="otd-pop-field" onKeyDown={(event) => event.key === "Enter" && commit()}>
				<Field
					block
					size="s"
					placeholder="Name it"
					value={draft}
					onInput={(event) => setDraft(event.target.value)}
				/>
			</div>
			<span class="otd-hint">
				<Glyph name={anchor.icon} />
				{clash
					? "This board already has a property with that name"
					: "Recognised — this will be {kind}".replace("{kind}", anchor.word)}
			</span>
		</Popover>
	);
}

const PREVIEW = "preview";
const DETAIL = "detail";

// CONTEXT: the host renders read mode, post-processors included; we own the element and nothing else
function Preview({ markdown, render }) {
	const holder = useRef(null);
	useEffect(() => render(holder.current, markdown), [markdown]);
	return <div class="otd-md" ref={holder} />;
}

// TRADE-OFF: fetched when the note opens — listing re-runs on every vault event, so rows carry no body
function Description({ path, read, write, render, canPreview, canEdit }) {
	const [saved, setSaved] = useState("");
	const [draft, setDraft] = useState("");
	const [refused, setRefused] = useState(false);
	const [wanted, setWanted] = useState(PREVIEW);

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
		<div class="otd-desc" onBlur={save}>
			<div class="otd-desc-head">
				<span class="otd-cap">Description</span>
				{offered.length > 1 ? (
					<Segmented
						items={[
							{ value: PREVIEW, label: [<Glyph key="glyph" name="eye" />, "Preview"] },
							{ value: DETAIL, label: [<Glyph key="glyph" name="brackets" />, "Detail"] },
						]}
						size="s"
						value={mode}
						onChange={setWanted}
					/>
				) : null}
			</div>
			{refused ? (
				<p class="otd-refused">
					<Glyph name="alert" />
					Not saved. This would turn the note's first line into its properties.
				</p>
			) : null}
			{mode === PREVIEW ? (
				<Preview markdown={draft} render={render} />
			) : (
				<MarkdownEditor class="otd-editor" value={draft} placeholder="Say what this task is" onInput={setDraft} />
			)}
		</div>
	);
}

function TagRow({ tags, roster, onWrite }) {
	const [open, setOpen] = useState(false);

	const toggle = (tag) => {
		onWrite(tags.includes(tag) ? tags.filter((entry) => entry !== tag) : [...tags, tag]);
	};

	return (
		<div class="otd-tags">
			{tags.map((tag) => (
				<Pill key={tag}>{`#${tag}`}</Pill>
			))}
			<Popover
				placement="below"
				open={open}
				onOpenChange={setOpen}
				trigger={
					<button type="button" class="otd-tag-add">
						<Glyph name="plus" />
						Tag
					</button>
				}
			>
				<PopoverSearch placeholder="Find a tag">
					{(needle) => [
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
function valuesAcross(rows, name) {
	const seen = new Set();
	for (const row of rows) {
		for (const entry of toList(row.props?.[keyFor(row.props, name)])) seen.add(entry);
	}
	return [...seen];
}

export default createWidget(function OrbiTaskDialog({ settings, data, actions, board, configureBoard, context, host }) {
	const opened = context?.get("task");
	const [dismissed, setDismissed] = useState(null);
	const rows = data?.tasks?.rows ?? [];
	const task = rows.find((row) => row.path === opened?.path) ?? null;
	// CONTEXT: the opener hands over a fresh ref per press, so reopening what was just closed is a change
	const isOpen = Boolean(task) && dismissed !== opened;

	// CONTEXT: a dialog opened outside a board has no list to read, and an empty plate is no dialog
	const names = board?.properties?.length ? board.properties : STARTING_PROPERTIES;
	const columns = toList(context?.get("columns") ?? settings.columns);
	const write = actions?.tasks;
	const props = task?.props ?? {};
	const today = useMemo(() => new Date(), []);
	const people = useMemo(() => [...valuesAcross(rows, "members"), ...valuesAcross(rows, "assignees")], [rows]);
	const tagRoster = useMemo(() => valuesAcross(rows, "tags"), [rows]);

	const setProperty = (key, value) => {
		if (!write?.canUpdate || !task) return;
		write.update({ path: task.path }, { props: { [key]: value } });
	};

	const rename = (title) => {
		const wanted = String(title ?? "").trim();
		if (wanted === "" || wanted === (props.title ?? task.name)) return;
		setProperty(keyFor(props, "title"), wanted);
	};

	return (
		<WidgetRoot defaultRounded="none" className="orbi" defaultBackgroundType="none">
			<style>{CSS}</style>
			<Dialog open={isOpen} onOpenChange={(next) => !next && setDismissed(opened)}>
				<DialogContent class="orbi orbi-task-dialog">
					<div class="otd-top">
						<span class="otd-where">
							<Glyph name="task" />
							Task
							{context?.get("board") ? ` · ${context.get("board")}` : ""}
						</span>
						<div class="otd-corner">
							<IconButton
								size="s"
								label="Open the note"
								title="Open the note"
								onClick={() => write?.open?.({ path: task.path })}
							>
								<Glyph name="expand" />
							</IconButton>
							<IconButton size="s" label="Close" title="Close" onClick={() => setDismissed(opened)}>
								<Glyph name="close" />
							</IconButton>
						</div>
					</div>

					<div class="otd-body">
						<div class="otd-left">
							<h2
								class="otd-title"
								contenteditable={write?.canUpdate ? "true" : undefined}
								suppressContentEditableWarning
								onKeyDown={(event) => {
									if (event.key === "Enter") {
										event.preventDefault();
										event.currentTarget.blur();
									}
									if (event.key === "Escape") {
										event.currentTarget.textContent = props.title ?? task.name;
										event.currentTarget.blur();
									}
								}}
								onBlur={(event) => rename(event.currentTarget.textContent)}
							>
								{props.title ?? task?.name ?? ""}
							</h2>

							<TagRow
								tags={toList(props[keyFor(props, "tags")])}
								roster={tagRoster}
								onWrite={(next) => setProperty(keyFor(props, "tags"), next)}
							/>

							{task && write?.get ? (
								<Description
									key={task.path}
									path={task.path}
									read={write.get}
									write={write.update}
									render={host?.ui?.renderMarkdown}
									canPreview={Boolean(host?.can?.renderMarkdown && host?.ui?.renderMarkdown)}
									canEdit={Boolean(write.canUpdate)}
								/>
							) : null}
						</div>

						<aside class="otd-right">
							<Plate class="otd-props">
								<div class="otd-plate-head">
									<h4>Properties</h4>
								</div>
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
								{configureBoard ? (
									<AddProperty
										taken={names}
										onAdd={(name) => configureBoard({ properties: [...names, name] })}
									/>
								) : null}
							</Plate>
						</aside>
					</div>
				</DialogContent>
			</Dialog>
		</WidgetRoot>
	);
});
