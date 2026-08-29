import { Fragment, h, cloneElement, toChildArray } from "preact";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "preact/hooks";

export function cx(...parts) {
	return parts.flat(Infinity).filter(Boolean).join(" ");
}

export function variants(base, groups, fallback = {}) {
	return (props = {}) => {
		const chosen = Object.keys(groups).map((name) => groups[name][props[name] ?? fallback[name]]);
		return cx(base, chosen, props.class, props.className);
	};
}

// CONTEXT: shadcn's asChild — lets a Button become an <a> without a prop per case
// CONTEXT: variant props are the kit's own vocabulary — left in, preact writes them as attributes
const OWN_PROPS = ["variant", "size", "tone", "block", "selected", "pressable"];

function render(tag, props, resolvedClass) {
	const { asChild, children, class: cls, className, ...rest } = props;
	for (const name of OWN_PROPS) delete rest[name];
	if (!asChild) return h(tag, { ...rest, class: resolvedClass }, children);
	const only = toChildArray(children)[0];
	if (!only || typeof only !== "object") return h(tag, { ...rest, class: resolvedClass }, children);
	return cloneElement(only, { ...rest, class: cx(resolvedClass, only.props.class, only.props.className) });
}

// CONTEXT: paths copied verbatim from docs/reference/orbitask-converted.html:456-464, on its 20 grid.
// Six widgets had each redrawn the same glyphs; identical today, forked at the next hand-edit.
const GLYPHS = {
	chevron: '<path d="M8 5l5 5-5 5"/>',
	fold: '<path d="M12 5l-5 5 5 5"/>',
	search: '<circle cx="9" cy="9" r="5.4"/><path d="M13 13l3.5 3.5"/>',
	filter: '<path d="M3 5h14l-5.2 6V16l-3.6-2v-3z"/>',
	plus: '<path d="M10 4v12M4 10h12"/>',
	clock: '<circle cx="10" cy="10" r="6"/><path d="M10 6v4l2.4 1.4"/>',
	chat: '<path d="M3 4h14v9H7l-4 3z"/>',
	folder: '<path d="M3 5h4l1.4 2H17v8H3z"/>',
	check: '<rect x="4" y="4" width="12" height="12" rx="3"/><path d="M7 10l2 2 4-4"/>',
	tick: '<path d="M4 10.5l4 4 8-9"/>',
	pencil: '<path d="M4 16l1-4 8-8 3 3-8 8z"/>',
	// CONTEXT: r below half the 1.8 stroke, or the stroke leaves a hole and the dots read as rings
	dots: '<circle cx="10" cy="4.5" r="0.8"/><circle cx="10" cy="10" r="0.8"/><circle cx="10" cy="15.5" r="0.8"/>',
	menu: '<path d="M4 6h12M4 10h12M4 14h12"/>',
	archive: '<rect x="3" y="4" width="14" height="4" rx="1.2"/><path d="M4.6 8v6.8a1.2 1.2 0 001.2 1.2h8.4a1.2 1.2 0 001.2-1.2V8"/><path d="M8.2 11.2h3.6"/>',
	close: '<path d="M6 6l8 8M14 6l-8 8"/>',
};

export function Icon({ name, size = 16, class: cls }) {
	const glyph = GLYPHS[name];
	if (!glyph) return null;
	return h("svg", {
		class: cx("wg-kit-icon-glyph", cls),
		viewBox: "0 0 20 20",
		width: size,
		height: size,
		"aria-hidden": "true",
		dangerouslySetInnerHTML: { __html: glyph },
	});
}

// CONTEXT: which colour a priority or an approval reads as — presentation, so the kit owns it
export const PRIORITY_TONES = { P1: "error", P2: "warning", P3: "success" };
export const APPROVAL_TONES = { approve: "success", check: "warning", reject: "error", review: "accent" };

export function toneOf(table, value) {
	return table[String(value ?? "").toLowerCase()] ?? table[value] ?? "neutral";
}

export const buttonClass = variants(
	"wg-kit-btn",
	{
		variant: { accent: "is-accent", neutral: "", plain: "is-plain", danger: "is-danger" },
		size: { l: "is-l", m: "is-m", s: "is-s" },
		block: { true: "is-block" },
	},
	{ variant: "neutral", size: "m" },
);

export const iconButtonClass = variants(
	"wg-kit-icon",
	{
		variant: { accent: "is-accent", neutral: "", glass: "wg-kit-glass" },
		size: { l: "is-l", m: "is-m", s: "is-s" },
	},
	{ variant: "neutral", size: "m" },
);

export const pillClass = variants(
	"wg-kit-pill",
	{ tone: { neutral: "", accent: "is-accent", success: "is-ok", warning: "is-warn", error: "is-err" } },
	{ tone: "neutral" },
);

export const plateClass = variants("wg-kit-plate", {});
export const cardClass = variants("wg-kit-card", { selected: { true: "is-selected" } });
export const listClass = variants("wg-kit-list", {});
// TRADE-OFF: pressable is a variant, not a second component — the same row is a label with a
// button beside it in one list and the whole tappable thing in the next
export const rowClass = variants("wg-kit-row", { pressable: { true: "is-pressable" } });
export const glassClass = variants("wg-kit-glass", {});

export function Button(props) {
	return render("button", { type: "button", ...props }, buttonClass(props));
}

export function IconButton(props) {
	const { label, ...rest } = props;
	return render("button", { type: "button", "aria-label": label, ...rest }, iconButtonClass(props));
}

export function Pill(props) {
	return render("span", props, pillClass(props));
}

export function Plate(props) {
	return render("div", props, plateClass(props));
}

export function Card(props) {
	return render("div", props, cardClass(props));
}

// CONTEXT: the group carries the corner and clips the rows into it, so the row has none
export function List(props) {
	return render("div", props, listClass(props));
}

export function Row(props) {
	return render("div", props, rowClass(props));
}

// the row's anatomy: badge, label, value — a chevron is a bare <Icon> the row styles itself
function rowPart(baseClass, name) {
	function Part(props) {
		return render("span", props, cx(baseClass, props.class, props.className));
	}
	Part.displayName = name;
	return Part;
}

export const RowBadge = rowPart("wg-kit-row-badge", "RowBadge");
export const RowLabel = rowPart("wg-kit-row-label", "RowLabel");
export const RowValue = rowPart("wg-kit-row-value", "RowValue");

export function Count({ children, ...rest }) {
	return h("span", { ...rest, class: cx("wg-kit-count", rest.class) }, children);
}

// TRADE-OFF: headless, so a tab bar that needs its own children — a rename field, an
// affordance — is still the kit and not a second implementation of it
export function useSegmentedThumb(value, items) {
	const listRef = useRef(null);
	const [thumb, setThumb] = useState(null);
	// TRADE-OFF: a list identity would re-run the effect every render — a caller that builds its
	// items inline hands over a NEW array each time, and the resulting setState/re-render loop
	// froze the whole app rather than merely flickering
	const count = Array.isArray(items) ? items.length : items;

	useLayoutEffect(() => {
		const list = listRef.current;
		if (!list) return;
		const measure = () => {
			const active = list.querySelector('[aria-selected="true"]');
			if (!active) return;
			// TRADE-OFF: rects, not offsetLeft — offsetLeft is measured from the nearest POSITIONED
			// ancestor, so a tab wrapped in a relative slot reported a left of nearly zero
			const activeRect = active.getBoundingClientRect();
			// CONTEXT: a widget is laid out after its first paint, so an early read is all zeroes
			if (!activeRect.width) return;
			const listRect = list.getBoundingClientRect();
			// CONTEXT: an absolute child is offset from the PADDING box, whose left edge is the INNER
			// BORDER edge — padding lies inside that box and must NOT be subtracted, or the thumb
			// leaves the container by exactly the padding. It scrolls with the content, hence scrollLeft.
			const borderLeftPx = parseFloat(getComputedStyle(list).borderLeftWidth) || 0;
			const left = activeRect.left - listRect.left - borderLeftPx + list.scrollLeft;
			// the same numbers must keep the same object, or every measure schedules a render
			setThumb((was) => (was && was.left === left && was.width === activeRect.width ? was : { left, width: activeRect.width }));
		};
		measure();
		if (typeof ResizeObserver !== "function") return;
		const watcher = new ResizeObserver(measure);
		watcher.observe(list);
		return () => watcher.disconnect();
	}, [value, count]);

	return {
		listRef,
		thumbProps: {
			class: "wg-kit-seg-thumb",
			style: thumb ? { transform: `translateX(${thumb.left}px)`, width: `${thumb.width}px` } : { opacity: 0 },
		},
	};
}

// CONTEXT: a bare text node cannot ellipsize — the label needs a box of its own to clip in
export function ButtonLabel(props) {
	return render("span", props, cx("wg-kit-btn-label", props.class, props.className));
}

// CONTEXT: measured, not a constant — Filter's word fits at 100px, the constant dropped it at 150
export function useRoomForLabel(controlRef) {
	const [fits, setFits] = useState(true);
	// TRADE-OFF: remembered — a collapsed control no longer holds the label to re-measure
	const needed = useRef(0);

	useLayoutEffect(() => {
		const control = controlRef.current;
		if (!control) return;

		const measure = () => {
			const room = control.clientWidth;
			// CONTEXT: before the first layout every box is zero, which is not "no room"
			if (room === 0) return;
			// TRADE-OFF: found, not handed over — preact strips `ref` off a function component
			const label = control.querySelector(".wg-kit-btn-label");
			if (label) needed.current = room - label.clientWidth + label.scrollWidth;
			if (needed.current === 0) return;
			setFits(room >= needed.current);
		};

		measure();
		if (typeof ResizeObserver !== "function") return;
		const watcher = new ResizeObserver(measure);
		watcher.observe(control);
		return () => watcher.disconnect();
	}, []);

	return fits;
}

export const fieldClass = variants("wg-kit-field", { size: { m: "", s: "is-s" }, block: { true: "is-block" } }, { size: "m" });

// TRADE-OFF: the field owns its <input> rather than taking children — three widgets had each
// re-reset Obsidian's input styling by hand, and each got a different subset of it right
// The label carries the LOOK, the input carries the BEHAVIOUR — anything else handed in reaches
// the input. Keeping it all on the label silently swallowed an onKeyDown, so Enter did nothing
// in a search field and there was no error anywhere to say why.
const FIELD_LOOK = ["size", "block", "class", "className"];

export function Field({ icon, value, onInput, placeholder, type = "text", ...rest }) {
	const forInput = { ...rest };
	for (const name of FIELD_LOOK) delete forInput[name];
	return h(
		"label",
		{ class: fieldClass(rest) },
		icon,
		h("input", { ...forInput, class: "wg-kit-field-input", type, value, placeholder, onInput }),
	);
}

export function Segmented({ items, value, onChange, size = "m", class: cls }) {
	const { listRef, thumbProps } = useSegmentedThumb(value, items);

	return h(
		"div",
		{ class: cx("wg-kit-seg", size === "l" && "is-l", size === "s" && "is-s", cls), ref: listRef, role: "tablist" },
		h("span", thumbProps),
		items.map((item) =>
			h(
				"button",
				{
					type: "button",
					key: item.value,
					role: "tab",
					"aria-selected": String(item.value === value),
					onClick: () => onChange?.(item.value),
				},
				item.label,
			),
		),
	);
}

// CONTEXT: the corner may be painted by the wrapper, by the control inside it, or by that
// control's ::before — asking only the wrapper returned 0 and the panel grew from a square
function paintedRadius(node) {
	if (!node) return 0;
	const own = parseFloat(getComputedStyle(node).borderRadius) || 0;
	const before = parseFloat(getComputedStyle(node, "::before").borderRadius) || 0;
	return Math.max(own, before);
}

function anchorRadius(anchor, rect, scaleX, scaleY) {
	// CONTEXT: a radius is scaled by the transform, so 999px on a shrunk panel renders as ~4px
	const raw = Math.max(paintedRadius(anchor), paintedRadius(anchor.firstElementChild));
	const real = Math.min(raw, Math.min(rect.width, rect.height) / 2);
	return `${real / scaleX}px / ${real / scaleY}px`;
}

const PRESS_EVENTS = ["pointerdown", "mousedown"];
// TRADE-OFF: twice the exit, so a transition that never starts cannot strand the panel on screen
const EXIT_GUARD_MS = 400;

function prefersReducedMotion() {
	return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

// CONTEXT: the design draws 6px between a row and the panel under it
const ANCHOR_GAP_PX = 6;

// TRADE-OFF: a table, not a second component — only the origin and the trigger's fate differ
const PLACEMENTS = {
	over: {
		panelClass: "",
		hidesTrigger: true,
		origin: (rect) => ({ left: rect.left, top: rect.top }),
		flipped: (rect, size) => ({ left: rect.right - size.width, top: rect.bottom - size.height }),
	},
	below: {
		panelClass: "is-below",
		hidesTrigger: false,
		origin: (rect) => ({ left: rect.left, top: rect.bottom + ANCHOR_GAP_PX }),
		flipped: (rect, size) => ({ left: rect.right - size.width, top: rect.top - ANCHOR_GAP_PX - size.height }),
	},
};

function placePanel(panel, rect, placement) {
	panel.style.transition = "none";
	panel.style.transform = "none";
	panel.style.left = "0px";
	panel.style.top = "0px";
	// CONTEXT: a transform, filter, contain or will-change on ANY ancestor re-anchors position:fixed
	const zero = panel.getBoundingClientRect();
	const marginPx = 8;
	const wanted = placement.origin(rect, zero);
	const away = placement.flipped(rect, zero);
	let { left, top } = wanted;
	if (left + zero.width > window.innerWidth - marginPx) left = Math.max(marginPx, away.left);
	if (top + zero.height > window.innerHeight - marginPx) top = Math.max(marginPx, away.top);
	panel.style.left = `${left - zero.left}px`;
	panel.style.top = `${top - zero.top}px`;
	// CONTEXT: only the kit has measured the trigger, and a menu under a row usually matches it
	panel.style.setProperty("--wg-kit-anchor-width", `${rect.width}px`);
}

function fold(panel, anchor) {
	const rect = anchor.getBoundingClientRect();
	const box = panel.getBoundingClientRect();
	const scaleX = rect.width / box.width;
	const scaleY = rect.height / box.height;
	panel.style.transform = `translate(${rect.left - box.left}px, ${rect.top - box.top}px) scale(${scaleX}, ${scaleY})`;
	panel.style.borderRadius = anchorRadius(anchor, rect, scaleX, scaleY);
}

function clearExit(panel) {
	panel.style.opacity = "";
	panel.style.width = "";
	panel.style.height = "";
	const inner = panel.firstElementChild;
	if (!inner) return;
	inner.style.transition = "";
	inner.style.opacity = "";
}

function restPanel(panel, anchor) {
	panel.style.transition = "";
	panel.style.transform = "";
	panel.style.borderRadius = "";
	clearExit(panel);
	anchor.style.visibility = "";
}

function enterPanel(panel, anchor, placement) {
	clearExit(panel);
	placePanel(panel, anchor.getBoundingClientRect(), placement);
	anchor.style.visibility = placement.hidesTrigger ? "hidden" : "";
	if (prefersReducedMotion()) return;
	fold(panel, anchor);

	const frame = requestAnimationFrame(() => {
		panel.style.transition = "transform var(--wg-grow) var(--wg-spring), border-radius var(--wg-grow) var(--wg-spring)";
		panel.style.transform = "none";
		panel.style.borderRadius = "";
	});
	return () => cancelAnimationFrame(frame);
}

// TRADE-OFF: the ease, not the spring — a panel folding away that bounces reads as indecision
function exitPanel(panel, anchor, done) {
	// CONTEXT: the fold's scale is read off this box, so it is pinned before any measurement
	const held = panel.getBoundingClientRect();
	panel.style.width = `${held.width}px`;
	panel.style.height = `${held.height}px`;

	const inner = panel.firstElementChild;
	if (inner) {
		// TRADE-OFF: the fold's own duration — at 120ms the content blinked out ahead of the box
		inner.style.transition = "opacity var(--wg-quick) var(--wg-ease)";
		inner.style.opacity = "0";
	}
	panel.style.transition = "transform var(--wg-quick) var(--wg-ease), border-radius var(--wg-quick) var(--wg-ease), opacity var(--wg-press) var(--wg-ease) 80ms";
	panel.style.opacity = "0";
	fold(panel, anchor);

	const finish = (event) => {
		if (event && (event.target !== panel || event.propertyName !== "transform")) return;
		stop();
		done();
	};
	const guard = setTimeout(() => finish(), EXIT_GUARD_MS);
	const stop = () => {
		clearTimeout(guard);
		panel.removeEventListener("transitionend", finish);
	};
	panel.addEventListener("transitionend", finish);
	return stop;
}

export function Popover({ trigger, children, open: openProp, onOpenChange, class: cls, placement = "over" }) {
	const where = PLACEMENTS[placement] ?? PLACEMENTS.over;
	const [openState, setOpenState] = useState(false);
	const open = openProp ?? openState;
	const triggerRef = useRef(null);
	const panelRef = useRef(null);
	const id = useId();

	// CONTEXT: one press fires pointerdown AND mousedown — report the transition once
	const reported = useRef(open);
	reported.current = open;

	const setOpen = useCallback(
		(next) => {
			if (reported.current === next) return;
			reported.current = next;
			if (openProp === undefined) setOpenState(next);
			onOpenChange?.(next);
		},
		[openProp, onOpenChange],
	);

	// TRADE-OFF: a ref, so the listener below depends on `open` alone — a caller handing over
	// a fresh onOpenChange each render would otherwise re-hang it on every render
	const latestSetOpen = useRef(setOpen);
	latestSetOpen.current = setOpen;

	// CONTEXT: preact drops `is-open` the instant `open` turns false, so the exit needs its own state
	const [exiting, setExiting] = useState(false);
	const wasOpen = useRef(false);
	const stopExit = useRef(null);

	// CONTEXT: a caller writes `{open ? <panel/> : null}`, so the children go before the fold is measured
	const held = useRef(null);
	if (open) held.current = children;
	// CONTEXT: wasOpen is still true on the closing render, the one render `exiting` cannot cover
	const shown = open || exiting || wasOpen.current;

	useLayoutEffect(() => {
		const panel = panelRef.current;
		const anchor = triggerRef.current;
		if (!panel || !anchor) return;
		const closing = wasOpen.current && !open;
		wasOpen.current = open;
		stopExit.current?.();
		stopExit.current = null;

		if (open) {
			setExiting(false);
			return enterPanel(panel, anchor, where);
		}
		if (!closing || prefersReducedMotion()) {
			setExiting(false);
			restPanel(panel, anchor);
			return;
		}

		setExiting(true);
		stopExit.current = exitPanel(panel, anchor, () => {
			stopExit.current = null;
			setExiting(false);
			restPanel(panel, anchor);
		});
		return () => {
			stopExit.current?.();
			stopExit.current = null;
		};
	}, [open]);

	// CONTEXT: src/editor-shield.js stops pointerdown/mousedown in the BUBBLE phase on every
	// widget root, so a press on the board never reached a bubble listener here — capture does
	useEffect(() => {
		if (!open) return;
		const closeOnOutsidePress = (event) => {
			if (panelRef.current?.contains(event.target)) return;
			if (triggerRef.current?.contains(event.target)) return;
			latestSetOpen.current(false);
		};
		const closeOnEscape = (event) => {
			if (event.key === "Escape") latestSetOpen.current(false);
		};
		// CONTEXT: pointerdown carries touch and pen; mousedown covers a host without it
		for (const name of PRESS_EVENTS) document.addEventListener(name, closeOnOutsidePress, true);
		document.addEventListener("keydown", closeOnEscape, true);
		return () => {
			for (const name of PRESS_EVENTS) document.removeEventListener(name, closeOnOutsidePress, true);
			document.removeEventListener("keydown", closeOnEscape, true);
		};
	}, [open]);

	// TRADE-OFF: measure the WRAPPER, not the trigger — a ref does not reach a DOM node
	// through a function component, so any component trigger would have gone unmeasured
	return h(
		"span",
		{
			class: "wg-kit-anchor",
			ref: triggerRef,
			"aria-expanded": String(open),
			"aria-controls": id,
			// CONTEXT: the panel is a child of the anchor, so only the trigger may toggle
			onClick: (event) => {
				if (panelRef.current?.contains(event.target)) return;
				setOpen(!open);
			},
		},
		trigger,
		h(
			"div",
			{
				id,
				ref: panelRef,
				class: cx("wg-kit-pop", where.panelClass, (open || exiting) && "is-open", exiting && "is-exiting", cls),
				role: "dialog",
				// CONTEXT: a tile is a stacking context, so styles.css lifts the one holding this
				"data-wg-overlay": shown ? "" : undefined,
			},
			h("div", { class: "wg-kit-pop-inner" }, shown ? held.current : null),
		),
	);
}

export function PopoverItem({ checked, children, ...rest }) {
	return h(
		"button",
		{
			type: "button",
			...rest,
			"aria-checked": checked === undefined ? undefined : String(checked),
			class: cx("wg-kit-pop-item", rest.class),
		},
		children,
		checked === undefined ? null : h(Icon, { name: "tick", class: "wg-kit-pop-tick" }),
	);
}

export function PopoverSeparator(props) {
	return h("div", { ...props, role: "separator", class: cx("wg-kit-pop-sep", props.class) });
}

// TRADE-OFF: the needle is handed down, not the list taken away — matching is the caller's rule
export function PopoverSearch({ placeholder, hint, children, class: cls }) {
	const [keyword, setKeyword] = useState("");
	const needle = keyword.trim().toLowerCase();
	const listRef = useRef(null);

	// CONTEXT: whatever the caller drew first is what Enter means — the kit does not know the list
	const takeFirst = (event) => {
		if (event.key !== "Enter") return;
		const first = listRef.current?.querySelector(".wg-kit-pop-item:not([disabled])");
		if (!first) return;
		event.preventDefault();
		first.click();
		setKeyword("");
	};

	return h(
		Fragment,
		null,
		h(
			"div",
			{ class: cx("wg-kit-pop-search", cls) },
			h(Field, {
				block: true,
				size: "s",
				class: "wg-kit-pop-search-field",
				icon: h(Icon, { name: "search" }),
				placeholder,
				value: keyword,
				onInput: (event) => setKeyword(event.target.value),
				onKeyDown: takeFirst,
			}),
			hint ? h("span", { class: "wg-kit-pop-search-hint" }, hint) : null,
		),
		h("div", { class: "wg-kit-pop-list", ref: listRef }, typeof children === "function" ? children(needle) : children),
	);
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
// CONTEXT: Monday first, the way the design draws it
const WEEKDAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];
// TRADE-OFF: always six rows, so the panel does not change height between two months
const CALENDAR_CELLS = 42;

function startOfCalendar(year, month) {
	const first = new Date(year, month, 1);
	const lead = (first.getDay() + 6) % 7;
	return new Date(year, month, 1 - lead);
}

function sameDay(one, other) {
	if (!one || !other) return false;
	return one.getFullYear() === other.getFullYear() && one.getMonth() === other.getMonth() && one.getDate() === other.getDate();
}

// TRADE-OFF: the kit owns the month and the state on a cell, never what the cell says
export function Calendar({ month, onMonthChange, selected, today, onSelect, renderDay, class: cls }) {
	const [ownMonth, setOwnMonth] = useState(() => month ?? selected ?? today ?? new Date());
	const shown = month ?? ownMonth;
	const year = shown.getFullYear();
	const index = shown.getMonth();
	const now = today ?? new Date();
	const first = startOfCalendar(year, index);

	const step = (by) => {
		const next = new Date(year, index + by, 1);
		if (month === undefined) setOwnMonth(next);
		onMonthChange?.(next);
	};

	const cells = [];
	for (let offset = 0; offset < CALENDAR_CELLS; offset += 1) {
		const date = new Date(first.getFullYear(), first.getMonth(), first.getDate() + offset);
		const day = { date, outside: date.getMonth() !== index, today: sameDay(date, now), selected: sameDay(date, selected) };
		cells.push(
			h(
				"button",
				{
					type: "button",
					key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
					class: cx("wg-kit-cal-day", day.outside && "is-outside", day.today && "is-today", day.selected && "is-picked"),
					"aria-pressed": String(day.selected),
					onClick: () => onSelect?.(date),
				},
				renderDay ? renderDay(day) : String(date.getDate()),
			),
		);
	}

	return h(
		"div",
		{ class: cx("wg-kit-cal", cls) },
		h(
			"div",
			{ class: "wg-kit-cal-head" },
			h(IconButton, { size: "s", label: "Previous month", onClick: () => step(-1) }, h(Icon, { name: "fold" })),
			h("span", { class: "wg-kit-cal-month" }, `${MONTH_NAMES[index]} ${year}`),
			h(IconButton, { size: "s", label: "Next month", onClick: () => step(1) }, h(Icon, { name: "chevron" })),
		),
		h(
			"div",
			{ class: "wg-kit-cal-grid" },
			WEEKDAY_INITIALS.map((initial, at) => h("span", { key: at, class: "wg-kit-cal-weekday" }, initial)),
			cells,
		),
	);
}

const PROGRESS_MAX = 100;
const PROGRESS_STEPS = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 };

function clampPercent(value) {
	return Math.min(PROGRESS_MAX, Math.max(0, Math.round(value)));
}

// TRADE-OFF: a track and the digits, not a stepper — the plate is skimmed more than it is set
export function Progress({ value = 0, onChange, label, class: cls }) {
	const trackRef = useRef(null);
	const [grabbed, setGrabbed] = useState(false);
	const held = useRef(false);
	const shown = clampPercent(value);

	const report = (next) => {
		if (next !== null && next !== shown) onChange?.(next);
	};

	const underPointer = (event) => {
		const box = trackRef.current?.getBoundingClientRect();
		// CONTEXT: before the first layout every box is zero, and a division by it is not a value
		if (!box?.width) return null;
		return clampPercent(((event.clientX - box.left) / box.width) * PROGRESS_MAX);
	};

	const grab = (event) => {
		held.current = true;
		setGrabbed(true);
		event.currentTarget.setPointerCapture?.(event.pointerId);
		report(underPointer(event));
	};

	const drag = (event) => {
		if (!held.current) return;
		report(underPointer(event));
	};

	const release = () => {
		held.current = false;
		setGrabbed(false);
	};

	const type = (event) => {
		if (event.key === "Home") return report(0);
		if (event.key === "End") return report(PROGRESS_MAX);
		const by = PROGRESS_STEPS[event.key];
		if (by === undefined) return;
		event.preventDefault();
		report(clampPercent(shown + by));
	};

	return h(
		"div",
		{
			class: cx("wg-kit-progress", grabbed && "is-grabbed", cls),
			role: "slider",
			tabIndex: 0,
			"aria-label": label,
			"aria-valuemin": "0",
			"aria-valuemax": String(PROGRESS_MAX),
			"aria-valuenow": String(shown),
			onkeydown: type,
		},
		h(
			"span",
			{
				class: "wg-kit-progress-track",
				ref: trackRef,
				onpointerdown: grab,
				onpointermove: drag,
				onpointerup: release,
				onpointercancel: release,
			},
			h("i", { class: "wg-kit-progress-fill", style: { width: `${shown}%` } }),
			h("span", { class: "wg-kit-progress-knob", style: { left: `${shown}%` } }),
		),
		h("span", { class: "wg-kit-progress-num" }, `${shown}%`),
	);
}

const HEADING_LINE = /^#{1,6}\s/;
// CONTEXT: reading B — a backticked span is consumed so its markers stay plain, and takes no class
const INLINE = /(`[^`\n]*`)|(\[\[[^\]\n]*\]\])|(\[[^\]\n]*\]\([^)\n]*\))|(\*\*[^*\n]+\*\*|__[^_\n]+__)|(\*[^*\n]+\*|_[^_\n]+_)/g;
const INLINE_CLASSES = [null, "is-link", "is-link", "is-strong", "is-em"];

function markLine(line) {
	if (HEADING_LINE.test(line)) return [h("span", { class: "is-heading" }, line)];
	const parts = [];
	let at = 0;
	INLINE.lastIndex = 0;
	for (let found = INLINE.exec(line); found; found = INLINE.exec(line)) {
		if (found.index > at) parts.push(line.slice(at, found.index));
		const group = [1, 2, 3, 4, 5].find((index) => found[index] !== undefined);
		const styled = INLINE_CLASSES[group - 1];
		parts.push(styled ? h("span", { class: styled }, found[0]) : found[0]);
		at = found.index + found[0].length;
	}
	if (at < line.length) parts.push(line.slice(at));
	return parts;
}

function markdownSpans(text) {
	const out = [];
	String(text ?? "").split("\n").forEach((line, at) => {
		if (at > 0) out.push("\n");
		out.push(...markLine(line));
	});
	return out;
}

// TRADE-OFF: a transparent textarea over a styled mirror — native editing, plain content
export function MarkdownEditor({ value = "", onInput, placeholder, class: cls }) {
	return h(
		"div",
		{ class: cx("wg-kit-md", cls) },
		h(
			"div",
			{ class: "wg-kit-md-page" },
			h("div", { class: "wg-kit-md-text wg-kit-md-mirror", "aria-hidden": "true" }, markdownSpans(value)),
			h("textarea", {
				class: "wg-kit-md-text wg-kit-md-input",
				spellcheck: true,
				placeholder,
				value,
				onInput: (event) => onInput?.(event.target.value),
			}),
		),
	);
}

export function Switch({ checked, onChange, label }) {
	return h("button", {
		type: "button",
		role: "switch",
		"aria-checked": String(Boolean(checked)),
		"aria-label": label,
		class: "wg-kit-switch",
		onClick: () => onChange?.(!checked),
	});
}

// CONTEXT: capitalised because it is read in JSX — <Kit.Button/>, the way Radix reads
export const Kit = {
	cx,
	variants,
	Button,
	ButtonLabel,
	IconButton,
	Pill,
	Count,
	Plate,
	Card,
	List,
	Row,
	RowBadge,
	RowLabel,
	RowValue,
	Field,
	fieldClass,
	Icon,
	PRIORITY_TONES,
	APPROVAL_TONES,
	toneOf,
	Segmented,
	useSegmentedThumb,
	useRoomForLabel,
	Popover,
	PopoverItem,
	PopoverSearch,
	PopoverSeparator,
	Calendar,
	Progress,
	MarkdownEditor,
	Switch,
	buttonClass,
	iconButtonClass,
	pillClass,
	plateClass,
	cardClass,
	listClass,
	rowClass,
	glassClass,
};
