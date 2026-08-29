import { h, cloneElement, toChildArray } from "preact";
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

export const ICON_NAMES = Object.keys(GLYPHS);

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

export const fieldClass = variants("wg-kit-field", { size: { m: "", s: "is-s" }, block: { true: "is-block" } }, { size: "m" });

// TRADE-OFF: the field owns its <input> rather than taking children — three widgets had each
// re-reset Obsidian's input styling by hand, and each got a different subset of it right
export function Field({ icon, value, onInput, placeholder, type = "text", ...rest }) {
	return h(
		"label",
		{ class: fieldClass(rest) },
		icon,
		h("input", { class: "wg-kit-field-input", type, value, placeholder, onInput }),
	);
}

export function Segmented({ items, value, onChange, size = "m", class: cls }) {
	const { listRef, thumbProps } = useSegmentedThumb(value, items);

	return h(
		"div",
		{ class: cx("wg-kit-seg", size === "l" && "is-l", cls), ref: listRef, role: "tablist" },
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

function placePanel(panel, rect) {
	panel.style.transition = "none";
	panel.style.transform = "none";
	panel.style.left = "0px";
	panel.style.top = "0px";
	// CONTEXT: a transform, filter, contain or will-change on ANY ancestor re-anchors position:fixed
	const zero = panel.getBoundingClientRect();
	const marginPx = 8;
	let left = rect.left;
	let top = rect.top;
	if (left + zero.width > window.innerWidth - marginPx) left = Math.max(marginPx, rect.right - zero.width);
	if (top + zero.height > window.innerHeight - marginPx) top = Math.max(marginPx, rect.bottom - zero.height);
	panel.style.left = `${left - zero.left}px`;
	panel.style.top = `${top - zero.top}px`;
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

function enterPanel(panel, anchor) {
	clearExit(panel);
	placePanel(panel, anchor.getBoundingClientRect());
	anchor.style.visibility = "hidden";
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

export function Popover({ trigger, children, open: openProp, onOpenChange, class: cls }) {
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
			return enterPanel(panel, anchor);
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
				class: cx("wg-kit-pop", (open || exiting) && "is-open", exiting && "is-exiting", cls),
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
	);
}

export function PopoverSeparator(props) {
	return h("div", { ...props, role: "separator", class: cx("wg-kit-pop-sep", props.class) });
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
	ICON_NAMES,
	PRIORITY_TONES,
	APPROVAL_TONES,
	toneOf,
	Segmented,
	useSegmentedThumb,
	Popover,
	PopoverItem,
	PopoverSeparator,
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
