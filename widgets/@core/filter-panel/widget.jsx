import { createWidget, WidgetRoot } from "widgetarium";
import { Button, ButtonLabel, Icon, Popover, PopoverItem, PopoverSearch, useRoomForLabel } from "widgetarium/kit";
import { useRef, useState } from "react";

const CSS = `
/* CONTEXT: a control fills the tile it was given — centred at intrinsic width it read as
   a small thing lost in a hole, which is what the cell size was blamed for */
.orbi-filter { justify-content: flex-start; align-items: stretch; }

.orbi-filter .ofp-open { gap: var(--size-4-2, 8px); }
.orbi-filter .ofp-open.is-on { color: var(--interactive-accent); }
.orbi-filter .ofp-open.is-on::before { background: var(--wg-kit-accent-wash); }
.orbi-filter .ofp-open .ofp-icon { width: 17px; height: 17px; }
.orbi-filter .ofp-count { flex: none; }

.orbi-filter .ofp-icon { width: 16px; height: 16px; flex: none; }

/* CONTEXT: the kit hides the anchor while open, and visibility inherits */
.orbi-filter .ofp-pop {
	visibility: visible;
	width: 320px;
	max-width: min(320px, calc(100vw - 32px));
}

.orbi-filter .ofp-panel {
	display: flex;
	flex-direction: column;
	gap: var(--size-4-3, 12px);
	max-height: 70vh;
	overflow-y: auto;
}

.orbi-filter .ofp-group { display: flex; flex-direction: column; }

/* CONTEXT: the suite's button reset skips the kit's subtree */
.orbi-filter .ofp-group-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--size-4-2, 8px);
	width: 100%;
	appearance: none;
	-webkit-appearance: none;
	margin: 0;
	padding: var(--size-2-2, 4px) var(--size-4-2, 8px);
	border: none;
	border-radius: 0;
	background: none;
	box-shadow: none;
	font-family: inherit;
	font-size: var(--font-ui-small, 14px);
	font-weight: var(--font-semibold, 600);
	color: var(--text-normal);
	text-align: left;
	cursor: pointer;
}

/* CONTEXT: a plain button gets its corner from the host, so the fill rides the reset's pseudo */
.orbi-filter .ofp-group-head::before { border-radius: var(--wg-kit-item); }
.orbi-filter .ofp-group-head:hover::before { background: var(--background-modifier-hover); }

.orbi-filter .ofp-chev {
	color: var(--text-faint);
	transition: transform var(--wg-quick) var(--wg-ease);
}

.orbi-filter .ofp-group-head.is-on .ofp-chev { transform: rotate(90deg); }

.orbi-filter .ofp-option { width: 100%; justify-content: flex-start; }

.orbi-filter .ofp-av {
	display: grid;
	place-content: center;
	flex: none;
	width: 28px;
	height: 28px;
	border-radius: var(--wg-kit-pill, 999px);
	font-size: var(--font-ui-smaller, 12px);
	font-weight: var(--font-semibold, 600);
}

.orbi-filter .ofp-av.is-accent { background: var(--wg-kit-accent-wash); color: var(--interactive-accent); }
.orbi-filter .ofp-av.is-ok { background: var(--wg-kit-success-wash); color: var(--text-success); }
.orbi-filter .ofp-av.is-warn { background: var(--wg-kit-warning-wash); color: var(--wg-kit-warning); }
.orbi-filter .ofp-av.is-err { background: var(--wg-kit-error-wash); color: var(--text-error); }

.orbi-filter .ofp-name {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.orbi-filter .ofp-empty {
	margin: 0;
	padding: var(--size-4-2, 8px) var(--size-4-3, 12px);
	font-size: var(--font-ui-smaller, 12px);
	color: var(--text-faint);
}

.orbi-filter .ofp-foot {
	display: flex;
	align-items: center;
	gap: var(--size-4-2, 8px);
	padding: var(--size-4-2, 8px) var(--size-2-2, 4px) var(--size-2-2, 4px);
}

.orbi-filter .ofp-reset { flex: 1; }
.orbi-filter .ofp-apply { flex: 2; }

/* CONTEXT: the word is gone, the tile is not — the control keeps every cell it was given;
   doubled root class so it outranks the kit's own padding without relying on file order */
.orbi.orbi-filter .ofp-open.is-tight { justify-content: center; padding: 0; }
`;

// CONTEXT: "prop:control:Label", authored by the board
function parseGroups(text) {
	return String(text ?? "")
		.split(",")
		.map((entry) => entry.trim())
		.filter(Boolean)
		.map((entry) => {
			const [prop, control = "checkbox", ...rest] = entry.split(":").map((part) => part.trim());
			return { prop, control, label: rest.join(":") || prop };
		});
}

// THE FIELDS ARE THE BOARD'S, the way the choices are the data's. Held as a colon-separated
// string, the list had to be edited by hand every time a board gained a property — so a board
// could name a property, the dialog could write it, and it was still not filterable.
const PEOPLE_NAMES = ["assignees", "members", "people", "owner", "owners"];
// CONTEXT: bookkeeping, or a fact the board already shows — a title is unique, a board is the board
// CONTEXT: status is the COLUMNS on a kanban, so filtering by it hides the board inside itself
const NEVER_FILTERED = ["title", "board", "status", "deadline", "due"];
// TRADE-OFF: a property nearly every note carries a DIFFERENT value for is an identifier, not a
// filter — ticking it would leave one row, which is a search, and the bar has a search already
const MOST_DISTINCT_SHARE = 0.75;

// A NUMBER IS NOT A CATEGORY. The bar offers tick lists, and "checklistDone: 3" ticked against
// "4" answers a question nobody asks — a number wants a range. Left in, the demo data's dead
// counters (comments, files, a checklist nothing writes) all showed up as filters.
function isCounted(rows, prop) {
	const values = valuesFor(rows, prop);
	return values.length > 0 && values.every((value) => value !== "" && Number.isFinite(Number(value)));
}

// A BOARD THAT NAMES NOTHING STILL FILTERS. Falling back to an empty list left the bar with no
// groups at all on every board authored before property lists existed — which is most of them.
function groupsFromData(rows) {
	const seen = new Map();
	for (const row of rows) {
		for (const key of Object.keys(row.props ?? {})) seen.set(key.toLowerCase(), key);
	}
	return [...seen.values()]
		.filter((key) => !NEVER_FILTERED.includes(key.toLowerCase()))
		.filter((key) => !isCounted(rows, key))
		.filter((key) => {
			const values = valuesFor(rows, key);
			return values.length > 1 && values.length <= Math.max(2, rows.length * MOST_DISTINCT_SHARE);
		})
		.sort()
		.map((key) => ({
			prop: key,
			control: PEOPLE_NAMES.includes(key.toLowerCase()) ? "people" : "checkbox",
			label: `${key.charAt(0).toUpperCase()}${key.slice(1)}`,
		}));
}

function groupsFromBoard(names, rows) {
	return names
		.map((name) => {
			const prop = keyCarrying(rows, name) ?? String(name).toLowerCase();
			const control = PEOPLE_NAMES.includes(prop.toLowerCase()) ? "people" : "checkbox";
			return { prop, control, label: String(name) };
		})
		// a property no note has ever carried offers nothing to tick, and an empty group is noise
		.filter((group) => valuesFor(rows, group.prop).length > 0)
		.filter((group) => !NEVER_FILTERED.includes(group.prop.toLowerCase()));
}

// CONTEXT: a board names "Assignees", a note spells "assignees" — the note's spelling is the key
function keyCarrying(rows, name) {
	const wanted = String(name).toLowerCase();
	for (const row of rows) {
		const found = Object.keys(row.props ?? {}).find((key) => key.toLowerCase() === wanted);
		if (found) return found;
	}
	return null;
}

// CONTEXT: the choices are the data's, never a list kept here
function valuesFor(rows, prop) {
	const seen = new Set();
	for (const row of rows) {
		const held = row.props?.[prop];
		for (const value of Array.isArray(held) ? held : [held]) {
			if (value !== undefined && value !== null && value !== "") seen.add(String(value));
		}
	}
	return [...seen].sort();
}

function initialOf(value) {
	return String(value ?? "?").trim().charAt(0).toUpperCase() || "?";
}

const TONES = ["is-accent", "is-ok", "is-warn", "is-err"];

// TRADE-OFF: hashed, so there is no palette to maintain
function toneOf(value) {
	let sum = 0;
	for (const letter of String(value)) sum += letter.charCodeAt(0);
	return TONES[sum % TONES.length];
}

// CONTEXT: radio holds one string, checkbox an array
function countOf(chosen) {
	return Object.values(chosen ?? {}).reduce((total, values) => total + (Array.isArray(values) ? values.length : 1), 0);
}

function dropped(chosen, prop) {
	const { [prop]: gone, ...rest } = chosen;
	return rest;
}

export default createWidget(function OrbiTaskFilter({ settings, data, board, context }) {
	const rows = data?.tasks?.rows ?? [];
	// TRADE-OFF: the setting still wins where somebody has written one — a board that wants a
	// different order, a label of its own or a property nothing carries yet says so explicitly
	const authored = parseGroups(settings.groups);
	const fromBoard = groupsFromBoard(board?.properties ?? [], rows);
	const groups = authored.length > 0 ? authored : fromBoard.length > 0 ? fromBoard : groupsFromData(rows);
	// CONTEXT: two instances on one board need two keys
	const key = String(settings.key || "filters");
	const applied = context?.get(key) ?? {};

	const triggerRef = useRef(null);
	// CONTEXT: the word goes only when the word does not fit, which only a measurement knows
	const roomForWord = useRoomForLabel(triggerRef);

	const [open, setOpen] = useState(false);
	// TRADE-OFF: a draft until Apply, so ticking four boxes queries the vault once
	const [draft, setDraft] = useState(applied);
	const [shown, setShown] = useState(settings.openGroup ?? "");

	const change = (next) => {
		if (next) {
			setDraft(context?.get(key) ?? {});
		}
		setOpen(next);
	};

	const isChosen = (group, value) =>
		group.control === "radio" ? draft[group.prop] === value : (draft[group.prop] ?? []).includes(value);

	const toggle = (group, value) => {
		if (group.control === "radio") {
			setDraft(draft[group.prop] === value ? dropped(draft, group.prop) : { ...draft, [group.prop]: value });
			return;
		}
		const held = draft[group.prop] ?? [];
		const next = held.includes(value) ? held.filter((item) => item !== value) : [...held, value];
		setDraft(next.length > 0 ? { ...draft, [group.prop]: next } : dropped(draft, group.prop));
	};

	const apply = () => {
		context?.set(key, draft);
		setOpen(false);
	};

	const reset = () => {
		setDraft({});
		context?.set(key, {});
	};

	const count = countOf(applied);

	const trigger = (
		<button
			type="button"
			ref={triggerRef}
			className={`wg-kit-btn is-m is-block ofp-open${count > 0 ? " is-on" : ""}${roomForWord ? "" : " is-tight"}`}
		>
			<Icon name="filter" className="ofp-icon" />
			{roomForWord ? <ButtonLabel>Filter</ButtonLabel> : null}
			{count > 0 ? <span className="wg-kit-count ofp-count">{count}</span> : null}
		</button>
	);

	return (
		<WidgetRoot className="orbi orbi-filter" defaultRounded="none" defaultBackgroundType="none">
			<style>{CSS}</style>

			<Popover className="ofp-pop" trigger={trigger} open={open} onOpenChange={change}>
				<div className="ofp-panel">
					<PopoverSearch placeholder="Keyword" hint="Narrows the choices below, not the board">
						{(needle) =>
							groups.map((group) => {
								const values = valuesFor(rows, group.prop).filter((value) => needle === "" || value.toLowerCase().includes(needle));
								const isOpen = shown === group.prop;
								return (
									<div className="ofp-group" key={group.prop}>
										<button
											type="button"
											className={`ofp-group-head${isOpen ? " is-on" : ""}`}
											onClick={() => setShown(isOpen ? "" : group.prop)}
										>
											<span>{group.label}</span>
											<Icon name="chevron" className="ofp-chev" />
										</button>

										{isOpen
											? values.length === 0
												? <p className="ofp-empty">Nothing to choose from yet.</p>
												: values.map((value) => (
														<PopoverItem
															key={value}
															className="ofp-option"
															checked={isChosen(group, value)}
															onClick={() => toggle(group, value)}
														>
															{group.control === "people" ? <span className={`ofp-av ${toneOf(value)}`}>{initialOf(value)}</span> : null}
															<span className="ofp-name">{value}</span>
														</PopoverItem>
												  ))
											: null}
									</div>
								);
							})
						}
					</PopoverSearch>

					<div className="ofp-foot">
						<Button className="ofp-reset" onClick={reset}>
							Reset
						</Button>
						<Button className="ofp-apply" variant="accent" onClick={apply}>
							Apply
						</Button>
					</div>
				</div>
			</Popover>
		</WidgetRoot>
	);
});
