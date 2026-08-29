import { createWidget, WidgetRoot } from "widgetarium";
import { Field, Popover } from "widgetarium/kit";
import { useState } from "preact/hooks";

const CSS = `
/* CONTEXT: a control fills the tile it was given — centred at intrinsic width it read as
   a small thing lost in a hole, which is what the cell size was blamed for */
.orbi-filter { justify-content: flex-start; align-items: stretch; }

.orbi-filter .ofp-open { gap: var(--size-4-2, 8px); width: 100%; }
.orbi-filter .ofp-open.is-on { color: var(--interactive-accent); }
.orbi-filter .ofp-open.is-on::before { background: var(--wg-kit-accent-wash); }
.orbi-filter .ofp-open .ofp-icon { width: 17px; height: 17px; }
.orbi-filter .ofp-count { flex: none; }

.orbi-filter .ofp-icon { width: 16px; height: 16px; flex: none; }

.orbi-filter .ofp-icon path,
.orbi-filter .ofp-icon circle {
	fill: none;
	stroke: currentColor;
	stroke-width: 1.8;
	stroke-linecap: round;
	stroke-linejoin: round;
}

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

.orbi-filter .ofp-field {
	display: flex;
	flex-direction: column;
	gap: var(--size-4-2, 8px);
	padding: var(--size-2-2, 4px) var(--size-2-2, 4px) 0;
}

.orbi-filter .ofp-hint {
	padding: 0 var(--size-4-2, 8px);
	font-size: var(--font-ui-smaller, 12px);
	color: var(--text-muted);
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

.orbi-filter .ofp-tick { margin-left: auto; color: var(--interactive-accent); opacity: 0; }
.orbi-filter .ofp-option[aria-checked="true"] .ofp-tick { opacity: 1; }

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

@container widget (width < 150px) {
	.orbi-filter .ofp-open { width: 42px; padding: 0; gap: 0; }
	.orbi-filter .ofp-word { display: none; }
	.orbi-filter .ofp-count { display: none; }
}
`;

function FunnelIcon() {
	return (
		<svg class="ofp-icon" viewBox="0 0 20 20" aria-hidden="true">
			<path d="M3 5h14l-5.2 6V16l-3.6-2v-3z" />
		</svg>
	);
}

function SearchIcon() {
	return (
		<svg class="ofp-icon" viewBox="0 0 20 20" aria-hidden="true">
			<circle cx="9" cy="9" r="5.4" />
			<path d="M13 13l3.5 3.5" />
		</svg>
	);
}

function ChevronIcon() {
	return (
		<svg class="ofp-icon ofp-chev" viewBox="0 0 20 20" aria-hidden="true">
			<path d="M8 5l5 5-5 5" />
		</svg>
	);
}

function TickIcon() {
	return (
		<svg class="ofp-icon ofp-tick" viewBox="0 0 20 20" aria-hidden="true">
			<path d="M4 10.5l4 4 8-9" />
		</svg>
	);
}

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

export default createWidget(function OrbiTaskFilter({ settings, data, context }) {
	const rows = data?.tasks?.rows ?? [];
	const groups = parseGroups(settings.groups);
	// CONTEXT: two instances on one board need two keys
	const key = String(settings.key || "filters");
	const applied = context?.get(key) ?? {};

	const [open, setOpen] = useState(false);
	// TRADE-OFF: a draft until Apply, so ticking four boxes queries the vault once
	const [draft, setDraft] = useState(applied);
	const [keyword, setKeyword] = useState("");
	const [shown, setShown] = useState(settings.openGroup ?? "");

	const change = (next) => {
		if (next) {
			setDraft(context?.get(key) ?? {});
			setKeyword("");
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
	const needle = keyword.trim().toLowerCase();

	const trigger = (
		<button type="button" class={`wg-kit-btn is-m ofp-open${count > 0 ? " is-on" : ""}`}>
			<FunnelIcon />
			<span class="ofp-word">Filter</span>
			{count > 0 ? <span class="wg-kit-count ofp-count">{count}</span> : null}
		</button>
	);

	return (
		<WidgetRoot className="orbi orbi-filter" defaultRounded="none" defaultBackgroundType="none">
			<style>{CSS}</style>

			<Popover class="ofp-pop" trigger={trigger} open={open} onOpenChange={change}>
				<div class="ofp-panel">
						<div class="ofp-field">
							<Field
								block
								icon={<SearchIcon />}
								placeholder="Keyword"
								value={keyword}
								onInput={(event) => setKeyword(event.target.value)}
							/>
							<span class="ofp-hint">Narrows the choices below, not the board</span>
						</div>

						{groups.map((group) => {
							const values = valuesFor(rows, group.prop).filter((value) => needle === "" || value.toLowerCase().includes(needle));
							const isOpen = shown === group.prop;
							return (
								<div class="ofp-group" key={group.prop}>
									<button
										type="button"
										class={`ofp-group-head${isOpen ? " is-on" : ""}`}
										onClick={() => setShown(isOpen ? "" : group.prop)}
									>
										<span>{group.label}</span>
										<ChevronIcon />
									</button>

									{isOpen
										? values.length === 0
											? <p class="ofp-empty">Nothing to choose from yet.</p>
											: values.map((value) => (
													<button
														type="button"
														key={value}
														class="wg-kit-pop-item ofp-option"
														aria-checked={String(isChosen(group, value))}
														onClick={() => toggle(group, value)}
													>
														{group.control === "people" ? <span class={`ofp-av ${toneOf(value)}`}>{initialOf(value)}</span> : null}
														<span class="ofp-name">{value}</span>
														<TickIcon />
													</button>
											  ))
										: null}
								</div>
							);
						})}

						<div class="ofp-foot">
							<button type="button" class="wg-kit-btn is-m ofp-reset" onClick={reset}>
								Reset
							</button>
							<button type="button" class="wg-kit-btn is-m is-accent ofp-apply" onClick={apply}>
								Apply
							</button>
						</div>
					</div>
			</Popover>
		</WidgetRoot>
	);
});
