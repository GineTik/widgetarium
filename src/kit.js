import { Fragment, createElement as h, cloneElement, Children } from "react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";

export function cx(...parts) {
	return parts.flat(Infinity).filter(Boolean).join(" ");
}

export function variants(base, groups, fallback = {}) {
	return (props = {}) => {
		const chosen = Object.keys(groups).map((name) => groups[name][props[name] ?? fallback[name]]);
		return cx(base, chosen, props.className);
	};
}

// CONTEXT: shadcn's asChild — lets a Button become an <a> without a prop per case
// CONTEXT: variant props are the kit's own vocabulary — left in, preact writes them as attributes
const OWN_PROPS = ["variant", "size", "tone", "block", "selected", "pressable", "mode", "surface", "lift"];

function render(tag, props, resolvedClass) {
	const { asChild, children, className: cls, ...rest } = props;
	for (const name of OWN_PROPS) delete rest[name];
	if (!asChild) return h(tag, { ...rest, className: resolvedClass }, children);
	const only = Children.toArray(children)[0];
	if (!only || typeof only !== "object") return h(tag, { ...rest, className: resolvedClass }, children);
	return cloneElement(only, { ...rest, className: cx(resolvedClass, only.props.className) });
}

// CONTEXT: paths copied verbatim from docs/reference/orbitask-converted.html:456-464, on its 20 grid.
// Six widgets had each redrawn the same glyphs; identical today, forked at the next hand-edit.
const GLYPHS = {
	chevron: '<path d="M8.25 5.5l4.5 4.5-4.5 4.5"/>',
	fold: '<path d="M11.75 5.5l-4.5 4.5 4.5 4.5"/>',
	expand: '<path d="M11.8 4.6h3.6v3.6"/><path d="M8.2 15.4H4.6v-3.6"/><path d="M15.4 4.6l-4.4 4.4M4.6 15.4l4.4-4.4"/>',
	collapse: '<path d="M15 9.2h-3.6V5.6"/><path d="M5 10.8h3.6v3.6"/><path d="M11.4 9.2l4-4M8.6 10.8l-4 4"/>',
	search: '<circle cx="9.25" cy="9.25" r="4.75"/><path d="M12.9 12.9l3.35 3.35"/>',
	filter: '<path d="M3.6 5.4h12.8l-4.9 5.7v4.5l-3-1.7v-2.8z"/>',
	curve: '<path d="M3.6 13.2l3.5-4.3 3 2.6 3.2-4.6 3.1 3"/>',
	bars: '<path d="M5 14.4V9.8M10 14.4V5.6M15 14.4v-2.9"/>',
	plus: '<path d="M10 4.9v10.2M4.9 10h10.2"/>',
	"arrow-up": '<path d="M10 15.4V5.5M5.7 9.8L10 5.5l4.3 4.3"/>',
	download: '<path d="M10 4.6v7.6M6.4 8.8L10 12.4l3.6-3.6"/><path d="M4.9 15.4h10.2"/>',
	update: '<path d="M15.6 9.4a5.7 5.7 0 10-1.6 3.8"/><path d="M15.6 5v4.4h-4.4"/>',
	retry: '<path d="M4.4 10.6a5.7 5.7 0 111.6 3.8"/><path d="M4.4 15v-4.4h4.4"/>',
	clock: '<circle cx="10" cy="10" r="5.6"/><path d="M10 6.6V10l2.2 1.3"/>',
	chat: '<path d="M3.7 4.5h12.6v8.3H7.3l-3.6 2.7z"/>',
	folder: '<path d="M3.7 5.3h3.8l1.3 1.9h7.5v7.5H3.7z"/>',
	check: '<rect x="4.2" y="4.2" width="11.6" height="11.6" rx="3.4"/><path d="M7.3 10.1l2 2 3.5-4"/>',
	tick: '<path d="M5 10.4l3.3 3.3 6.7-7.1"/>',
	pencil: '<path d="M4.6 15.4l1-3.7 7.4-7.4 2.7 2.7-7.4 7.4z"/>',
	// CONTEXT: r below half the 1.8 stroke, or the stroke leaves a hole and the dots read as rings
	dots: '<circle cx="10" cy="5.2" r="0.8"/><circle cx="10" cy="10" r="0.8"/><circle cx="10" cy="14.8" r="0.8"/>',
	menu: '<path d="M4.6 6.3h10.8M4.6 10h10.8M4.6 13.7h10.8"/>',
	archive: '<rect x="3.8" y="4.3" width="12.4" height="3.6" rx="1.4"/><path d="M5.1 7.9v6.4a1.4 1.4 0 001.4 1.4h7a1.4 1.4 0 001.4-1.4V7.9"/><path d="M8.5 11.1h3"/>',
	close: '<path d="M6.4 6.4l7.2 7.2M13.6 6.4l-7.2 7.2"/>',
	widget: '<rect x="4" y="4" width="12" height="12" rx="3.4"/><path d="M7.4 8.2h5.2M7.4 11.6h3.2"/>',
	"sidebar-left": '<rect x="3.4" y="4.2" width="13.2" height="11.6" rx="3.2"/><path d="M8.2 4.2v11.6"/>',
	"sidebar-right": '<rect x="3.4" y="4.2" width="13.2" height="11.6" rx="3.2"/><path d="M11.8 4.2v11.6"/>',
	copy: '<rect x="7.4" y="7.4" width="8.4" height="8.4" rx="2.4"/><path d="M12.6 4.2H6.6a2.4 2.4 0 00-2.4 2.4v6"/>',
	link: '<path d="M8.5 11.5a2.8 2.8 0 000 4l.5.5a2.8 2.8 0 004 0l2.5-2.5a2.8 2.8 0 000-4l-.5-.5"/><path d="M11.5 8.5a2.8 2.8 0 000-4L11 4a2.8 2.8 0 00-4 0L4.5 6.5a2.8 2.8 0 000 4l.5.5"/>',
};

export function Icon({ name, size = 16, className: cls }) {
	const glyph = GLYPHS[name];
	if (!glyph) return null;
	return h("svg", {
		className: cx("wg-kit-icon-glyph", cls),
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
		variant: { accent: "is-accent", neutral: "", ghost: "is-ghost", plain: "is-plain", danger: "is-danger" },
		size: { l: "is-l", m: "is-m", s: "is-s" },
		block: { true: "is-block" },
	},
	{ variant: "neutral", size: "m" },
);

// TRADE-OFF: xs is a real step, not a one-off width — a FILLED disc reads bigger than a ghost one
// of the same box, so an accent action beside a neutral close needs 28 to pair with its 32
export const iconButtonClass = variants(
	"wg-kit-icon",
	{
		variant: { accent: "is-accent", neutral: "", raised: "is-raised", ghost: "is-ghost", glass: "wg-kit-glass" },
		size: { l: "is-l", m: "is-m", s: "is-s", xs: "is-xs" },
	},
	{ variant: "neutral", size: "m" },
);

// CONTEXT: one table, so a tone means the same on a pill, on a swatch and on a card's own dash
// TRADE-OFF: five roles could not tell seven tags apart, and the three added here take the
// hue regions status and the theme accent leave free — blue, teal, magenta
const TONE_CLASSES = {
	neutral: "",
	accent: "is-accent",
	success: "is-ok",
	warning: "is-warn",
	error: "is-err",
	info: "is-info",
	note: "is-note",
	standout: "is-standout",
};

// TRADE-OFF: names, not classes — a picker must not know that "success" is spelled is-ok
export const TONE_NAMES = Object.keys(TONE_CLASSES);

export function toneClass(tone) {
	return TONE_CLASSES[tone] ?? TONE_CLASSES.neutral;
}

export const pillClass = variants("wg-kit-pill", { tone: TONE_CLASSES }, { tone: "neutral" });

// CONTEXT: the plate every surface is built from — light stands on the page, solid is the grey well
// TRADE-OFF: the lift is asked for, never inherited — a Card is a tile far oftener than a panel
export const cardClass = variants(
	"wg-kit-card",
	{ variant: { light: "", solid: "is-solid" }, lift: { true: "is-lifted" }, selected: { true: "is-selected" } },
	{ variant: "light" },
);
export const plateClass = variants(cx("wg-kit-plate", cardClass({ variant: "solid" })), {});
export const listClass = variants(cx("wg-kit-list", cardClass({ variant: "solid" })), {});
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
		return render("span", props, cx(baseClass, props.className));
	}
	Part.displayName = name;
	return Part;
}

export const RowBadge = rowPart("wg-kit-row-badge", "RowBadge");
export const RowLabel = rowPart("wg-kit-row-label", "RowLabel");
export const RowValue = rowPart("wg-kit-row-value", "RowValue");

// THE SIDEBAR IS ONE COMPONENT WITH TWO SIZES, because the settings panel and a card's
// properties are the same list of named values seen from two distances. `full` is the panel
// beside a board; `minimal` is the column inside a dialog — denser, smaller, and leaning on an
// icon per row where the full one leans on room.
// CONTEXT: a sidebar IS a Card — a light plate that floats, so it lifts
export const sidebarClass = variants(
	cx("wg-kit-side", cardClass({ variant: "light", lift: true })),
	{ mode: { full: "", minimal: "is-minimal" }, surface: { solid: "", glass: "is-glass" } },
	{ mode: "full", surface: "solid" },
);

export function Sidebar({ as = "div", ...props }) {
	return render(as, props, sidebarClass(props));
}

// A SHEET IS A SIDEBAR THAT FOLLOWS THE FINGER. It rests at a peek height, is dragged up by its
// grip, and past the point of no return it goes all the way — a sheet left resting between two
// heights is a height nobody chose. The spring overshoots once on the way, which is what makes it
// read as a thing with weight rather than a box being resized.
const SHEET_COMMIT = 0.4;

export function SidebarSheet({
	as = "div",
	mode,
	surface,
	isOpen,
	onOpen,
	onHeight,
	peekPx = 220,
	maxPx = 640,
	grip = "Raise the sheet",
	className: cls,
	style,
	children,
	...rest
}) {
	const [dragged, setDragged] = useState(null);
	const from = useRef(null);
	const latest = useRef(0);

	const height = dragged ?? (isOpen ? maxPx : peekPx);
	latest.current = height;

	// CONTEXT: the sheet OWNS its height, so anything that has to stand clear of it is told —
	// a second place computing the same number was what put the controls under the panel
	useEffect(() => {
		onHeight?.(height);
	}, [height]);

	const start = (event) => {
		from.current = { y: event.clientY, height: latest.current };
		event.currentTarget.setPointerCapture?.(event.pointerId);
		setDragged(latest.current);
	};

	const move = (event) => {
		if (!from.current) return;
		const wanted = from.current.height + (from.current.y - event.clientY);
		setDragged(Math.max(peekPx, Math.min(maxPx, wanted)));
	};

	// TRADE-OFF: a press that never moved still commits — the grip was a toggle before this, and
	// taking that away would cost a gesture people already have
	const finish = () => {
		if (!from.current) return;
		const settled = latest.current;
		const moved = Math.abs(settled - from.current.height) > 2;
		from.current = null;
		setDragged(null);
		onOpen?.(moved ? settled > peekPx + (maxPx - peekPx) * SHEET_COMMIT : !isOpen);
	};

	return h(
		as,
		{
			...rest,
			className: cx("wg-kit-sheet", sidebarClass({ mode, surface }), from.current && "is-dragging", cls),
			style: { ...style, height: `${Math.round(height)}px` },
		},
		[
			h("button", {
				key: "grip",
				type: "button",
				className: "wg-kit-sheet-grip",
				"aria-label": grip,
				"aria-pressed": String(Boolean(isOpen)),
				onPointerDown: start,
				onPointerMove: move,
				onPointerUp: finish,
				onPointerCancel: finish,
			}),
			children,
		],
	);
}

export function SidebarGroup({ label, hint, children, className: cls }) {
	return h("div", { className: cx("wg-kit-side-group", cls) }, [
		label ? h("span", { className: "wg-kit-side-label", key: "label" }, label) : null,
		h(List, { className: "wg-kit-side-list", key: "list" }, children),
		hint ? h("p", { className: "wg-kit-side-hint", key: "hint" }, hint) : null,
	]);
}

// TRADE-OFF: one row for both sizes, and `unset` is a state rather than a colour a caller picks —
// three files had each spelled "this property is empty" their own way
export function SidebarRow({
	as = "div",
	icon,
	label,
	sub,
	value,
	after,
	children,
	unset,
	isOpen,
	selected,
	pressable,
	onClick,
	className: cls,
	...rest
}) {
	const shown = value ?? children;
	// TRADE-OFF: the row owns its TAG, because a settings row is read and a property row is
	// pressed — and a pressable div is a button a keyboard cannot reach
	return h(
		as,
		{
			...rest,
			type: as === "button" ? "button" : undefined,
			onClick,
			// CONTEXT: aria-current is how a list says which of its rows is the one being read
			"aria-current": selected ? "true" : undefined,
			// CONTEXT: is-two is the row's own state — the height law reads it, not the caller's markup
			className: cx(
				rowClass({ pressable: pressable || as === "button" }),
				"wg-kit-side-row",
				sub && "is-two",
				unset && "is-unset",
				isOpen && "is-open",
				selected && "is-selected",
				cls,
			),
		},
		[
			// CONTEXT: a glyph, never RowBadge — a badge is a FILLED marker, and putting an icon in
			// one painted every property row with an accent tile
			icon ? h("span", { className: "wg-kit-side-icon", key: "icon" }, icon) : null,
			h(
				RowLabel,
				{ key: "label" },
				sub ? [label, h("span", { className: "wg-kit-side-sub", key: "sub" }, sub)] : label,
			),
			shown === undefined || shown === null
				? null
				: h(RowValue, { className: "wg-kit-side-value", key: "value" }, shown),
			after ?? null,
		],
	);
}

export function Count({ children, ...rest }) {
	return h("span", { ...rest, className: cx("wg-kit-count", rest.className) }, children);
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
			setThumb((was) =>
				was && was.left === left && was.width === activeRect.width ? was : { left, width: activeRect.width },
			);
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
			className: "wg-kit-seg-thumb",
			style: thumb ? { transform: `translateX(${thumb.left}px)`, width: `${thumb.width}px` } : { opacity: 0 },
		},
	};
}

// CONTEXT: a bare text node cannot ellipsize — the label needs a box of its own to clip in
export function ButtonLabel(props) {
	return render("span", props, cx("wg-kit-btn-label", props.className));
}

// CONTEXT: measured, not a constant — Filter's word fits at 100px, the constant dropped it at 150
export function useRoomForLabel(controlRef) {
	const [isFitting, setFitting] = useState(true);
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
			setFitting(room >= needed.current);
		};

		measure();
		if (typeof ResizeObserver !== "function") return;
		const watcher = new ResizeObserver(measure);
		watcher.observe(control);
		return () => watcher.disconnect();
	}, []);

	return isFitting;
}

export const fieldClass = variants(
	"wg-kit-field",
	{ size: { m: "", s: "is-s" }, block: { true: "is-block" } },
	{ size: "m" },
);

// TRADE-OFF: the field owns its <input> rather than taking children — three widgets had each
// re-reset Obsidian's input styling by hand, and each got a different subset of it right
// The label carries the LOOK, the input carries the BEHAVIOUR — anything else handed in reaches
// the input. Keeping it all on the label silently swallowed an onKeyDown, so Enter did nothing
// in a search field and there was no error anywhere to say why.
const FIELD_LOOK = ["size", "block", "className"];

export function Field({ icon, value, onInput, placeholder, type = "text", ...rest }) {
	const forInput = { ...rest };
	for (const name of FIELD_LOOK) delete forInput[name];
	return h(
		"label",
		{ className: fieldClass(rest) },
		icon,
		h("input", { ...forInput, className: "wg-kit-field-input", type, value, placeholder, onInput }),
	);
}

function commentAt(line) {
	let quoted = "";
	for (let at = 0; at < line.length; at += 1) {
		const letter = line[at];
		if (quoted) {
			if (letter === quoted) quoted = "";
			continue;
		}
		if (letter === '"' || letter === "'") quoted = letter;
		else if (letter === "#") return at;
	}
	return -1;
}

function yamlLine(line, at) {
	const cut = commentAt(line);
	const said = cut === -1 ? line : line.slice(0, cut);
	const note = cut === -1 ? "" : line.slice(cut);
	const named = /^(\s*)([\w.$-]+)(:)([\s\S]*)$/.exec(said);
	const out = named
		? [named[1], h("span", { className: "is-key", key: `k${at}` }, named[2]), named[3], named[4]]
		: [said];
	if (note) out.push(h("span", { className: "is-note", key: `n${at}` }, note));
	return out;
}

function yamlSpans(text) {
	const out = [];
	String(text ?? "")
		.split("\n")
		.forEach((line, at) => {
			if (at > 0) out.push("\n");
			out.push(...yamlLine(line, at));
		});
	return out;
}

export function CodeArea({ value = "", onInput, placeholder, className: cls }) {
	return h(
		"div",
		{ className: cx("wg-kit-md", "wg-kit-code", cls) },
		h(
			"div",
			{ className: "wg-kit-md-page" },
			h("div", { className: "wg-kit-md-text wg-kit-md-mirror", "aria-hidden": "true" }, yamlSpans(value)),
			h("textarea", { className: "wg-kit-md-text wg-kit-md-input", spellCheck: false, placeholder, value, onInput }),
		),
	);
}

export function Segmented({ items, value, onChange, size = "m", className: cls }) {
	const { listRef, thumbProps } = useSegmentedThumb(value, items);

	return h(
		"div",
		{ className: cx("wg-kit-seg", size === "l" && "is-l", size === "s" && "is-s", cls), ref: listRef, role: "tablist" },
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

// TRADE-OFF: durations here, the curve in styles.css — JS schedules the beats, so it owns the numbers
const GROW_MS = 420;
const CONTENT_MS = 240;
// CONTEXT: past the worst of the seed's squash, and fully readable before the growth settles
const CONTENT_DELAY_MS = 80;
// TRADE-OFF: the landing waits past the last curve, or it cancels the settle a few ms early
const LAND_MARGIN_MS = 40;

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
	// CONTEXT: only the kit has measured the trigger, and a menu under a row usually matches it
	panel.style.setProperty("--wg-kit-anchor-width", `${rect.width}px`);
	// CONTEXT: measured AFTER that floor lands, or the seed is scaled against a box the panel never wears
	const zero = panel.getBoundingClientRect();
	const marginPx = 8;
	const wanted = placement.origin(rect, zero);
	const away = placement.flipped(rect, zero);
	let { left, top } = wanted;
	let flippedX = false;
	let flippedY = false;
	if (left + zero.width > window.innerWidth - marginPx) {
		left = Math.max(marginPx, away.left);
		flippedX = true;
	}
	if (top + zero.height > window.innerHeight - marginPx) {
		top = Math.max(marginPx, away.top);
		flippedY = true;
	}
	panel.style.left = `${left - zero.left}px`;
	panel.style.top = `${top - zero.top}px`;
	// CONTEXT: the growth leans on the corner the panel actually ended up on, screen edge included
	return { flippedX, flippedY, width: zero.width, height: zero.height };
}

// CONTEXT: a panel opening down grows from its top edge, one pushed left grows from its right
function growthOrigin(placed) {
	return `${placed.flippedX ? "right" : "left"} ${placed.flippedY ? "bottom" : "top"}`;
}

function fold(panel, anchor) {
	const rect = anchor.getBoundingClientRect();
	const box = panel.getBoundingClientRect();
	const scaleX = rect.width / box.width;
	const scaleY = rect.height / box.height;
	panel.style.transform = `translate(${rect.left - box.left}px, ${rect.top - box.top}px) scale(${scaleX}, ${scaleY})`;
	panel.style.borderRadius = anchorRadius(anchor, rect, scaleX, scaleY);
}

// CONTEXT: `transform` is the exit's fold, so the enter drives the separate translate/scale pair
function unstage(panel) {
	panel.style.animation = "";
	panel.style.translate = "";
	panel.style.scale = "";
	panel.style.transformOrigin = "";
	panel.style.removeProperty("--wg-kit-pop-seed-x");
	panel.style.removeProperty("--wg-kit-pop-seed-y");
}

function clearMotion(panel) {
	panel.style.opacity = "";
	panel.style.width = "";
	panel.style.height = "";
	panel.style.backgroundColor = "";
	panel.style.boxShadow = "";
	unstage(panel);
	const inner = panel.firstElementChild;
	if (!inner) return;
	inner.style.transition = "";
	inner.style.opacity = "";
}

function restPanel(panel, anchor) {
	panel.style.transition = "";
	panel.style.transform = "";
	panel.style.borderRadius = "";
	clearMotion(panel);
	anchor.style.visibility = "";
}

// CONTEXT: the seed IS the trigger's box over the panel's, so the two axes rarely share a number
function seatOnAnchor(anchor, placed) {
	const rect = anchor.getBoundingClientRect();
	const scaleX = placed.width ? rect.width / placed.width : 1;
	const scaleY = placed.height ? rect.height / placed.height : 1;
	return { rect, scaleX, scaleY, radius: anchorRadius(anchor, rect, scaleX, scaleY) };
}

function edgeOf(skin) {
	const width = parseFloat(skin.borderTopWidth) || 0;
	if (width > 0) return `inset 0 0 0 ${width}px ${skin.borderTopColor}`;
	return skin.boxShadow && skin.boxShadow !== "none" ? skin.boxShadow : "none";
}

function skinPaint(node, pseudo) {
	const skin = getComputedStyle(node, pseudo);
	const paint = { background: skin.backgroundColor || "", edge: edgeOf(skin) };
	const bare =
		paint.edge === "none" &&
		(!paint.background || paint.background === "transparent" || /,\s*0\)\s*$/.test(paint.background));
	return bare ? null : paint;
}

// CONTEXT: the kit's controls paint their fill on ::before, so the element itself is bare
function paintOf(node) {
	if (!node) return null;
	return skinPaint(node, undefined) ?? skinPaint(node, "::before");
}

// CONTEXT: a trigger is grey or white, and paints on the wrapper or on the control inside it
function anchorPaint(anchor) {
	return paintOf(anchor.firstElementChild) ?? paintOf(anchor) ?? { background: "", edge: "none" };
}

function panelPaint(panel) {
	const skin = getComputedStyle(panel);
	return { background: skin.backgroundColor || "", edge: skin.boxShadow || "none" };
}

function wearPaint(panel, paint) {
	panel.style.backgroundColor = paint.background;
	panel.style.boxShadow = paint.edge;
}

// CONTEXT: the scale is a keyframed animation, so only the paint is left for a transition to carry
function enterTransition() {
	return ["border-radius", "background-color", "box-shadow"]
		.map((name) => `${name} ${GROW_MS}ms var(--wg-ease)`)
		.join(", ");
}

function contentTransition() {
	return `opacity ${CONTENT_MS}ms var(--wg-ease) ${CONTENT_DELAY_MS}ms`;
}

function sitOnAnchor(panel, seat, paint, origin) {
	panel.style.transition = "none";
	panel.style.animation = "none";
	// CONTEXT: the exit folds into a corner of its own, so the growth's corner is written here
	panel.style.transformOrigin = origin;
	// CONTEXT: the keyframes read the seed off the element, because only JS has measured the trigger
	panel.style.setProperty("--wg-kit-pop-seed-x", `${seat.scaleX}`);
	panel.style.setProperty("--wg-kit-pop-seed-y", `${seat.scaleY}`);
	panel.style.scale = `${seat.scaleX} ${seat.scaleY}`;
	panel.style.borderRadius = seat.radius;
	wearPaint(panel, paint);
	const inner = panel.firstElementChild;
	if (!inner) return;
	inner.style.transition = "none";
	inner.style.opacity = "0";
}

// CONTEXT: a transition needs its start COMPUTED — unread, the seat and the target land in one recalc
function commitSeat(panel) {
	void getComputedStyle(panel).opacity;
}

// CONTEXT: the animation owns the scale from here, so the inline seed is handed over to it
function growPanel(panel, paint) {
	panel.style.transition = enterTransition();
	panel.style.animation = `wg-kit-pop-bloom ${GROW_MS}ms var(--wg-ease) both`;
	panel.style.scale = "";
	panel.style.borderRadius = "";
	wearPaint(panel, paint);
	const inner = panel.firstElementChild;
	if (!inner) return;
	inner.style.transition = contentTransition();
	inner.style.opacity = "1";
}

// CONTEXT: an inline transform would outlive the enter and fight the exit's fold
function landPanel(panel) {
	panel.style.transition = "";
	clearMotion(panel);
}

function enterPanel(panel, anchor, placement) {
	clearMotion(panel);
	const placed = placePanel(panel, anchor.getBoundingClientRect(), placement);
	anchor.style.visibility = placement.hidesTrigger ? "hidden" : "";
	if (prefersReducedMotion()) return;
	const seat = seatOnAnchor(anchor, placed);
	const rest = panelPaint(panel);
	sitOnAnchor(panel, seat, anchorPaint(anchor), growthOrigin(placed));

	let landing = 0;
	const frame = requestAnimationFrame(() => {
		commitSeat(panel);
		growPanel(panel, rest);
		landing = setTimeout(() => landPanel(panel), GROW_MS + LAND_MARGIN_MS);
	});
	return () => {
		cancelAnimationFrame(frame);
		clearTimeout(landing);
	};
}

// TRADE-OFF: the ease, not the spring — a panel folding away that bounces reads as indecision
function exitPanel(panel, anchor, done) {
	// CONTEXT: the enter's own curves are still armed, and the hold below must not play on one
	panel.style.transition = "none";
	// CONTEXT: `is-open` held the opacity and is already gone — the measurement below would commit 1 -> 0 untransitioned
	panel.style.opacity = "1";
	// CONTEXT: a half-run enter leaves a centred origin and a scale the fold's corner maths cannot see
	unstage(panel);
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
	panel.style.transition =
		"transform var(--wg-quick) var(--wg-ease), border-radius var(--wg-quick) var(--wg-ease), opacity var(--wg-press) var(--wg-ease) 80ms";
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

export function Popover({ trigger, children, isOpen: isOpenAsked, onOpenChange, className: cls, placement = "over" }) {
	const where = PLACEMENTS[placement] ?? PLACEMENTS.over;
	const [isOpenHeld, setOpenHeld] = useState(false);
	const isOpen = isOpenAsked ?? isOpenHeld;
	const triggerRef = useRef(null);
	const panelRef = useRef(null);
	const id = useId();

	// CONTEXT: one press fires pointerdown AND mousedown — report the transition once
	const reported = useRef(isOpen);
	reported.current = isOpen;

	const setOpen = useCallback(
		(next) => {
			if (reported.current === next) return;
			reported.current = next;
			if (isOpenAsked === undefined) setOpenHeld(next);
			onOpenChange?.(next);
		},
		[isOpenAsked, onOpenChange],
	);

	// TRADE-OFF: a ref, so the listener below depends on `open` alone — a caller handing over
	// a fresh onOpenChange each render would otherwise re-hang it on every render
	const latestSetOpen = useRef(setOpen);
	latestSetOpen.current = setOpen;

	// CONTEXT: preact drops `is-open` the instant `open` turns false, so the exit needs its own state
	const [isExiting, setExiting] = useState(false);
	const wasOpen = useRef(false);
	const stopExit = useRef(null);

	// CONTEXT: a caller writes `{open ? <panel/> : null}`, so the children go before the fold is measured
	const held = useRef(null);
	if (isOpen) held.current = children;
	// CONTEXT: wasOpen is still true on the closing render, the one render `exiting` cannot cover
	const shown = isOpen || isExiting || wasOpen.current;

	useLayoutEffect(() => {
		const panel = panelRef.current;
		const anchor = triggerRef.current;
		if (!panel || !anchor) return;
		const closing = wasOpen.current && !isOpen;
		wasOpen.current = isOpen;
		stopExit.current?.();
		stopExit.current = null;

		if (isOpen) {
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
	}, [isOpen]);

	// CONTEXT: src/editor-shield.js stops pointerdown/mousedown in the BUBBLE phase on every
	// widget root, so a press on the board never reached a bubble listener here — capture does
	useEffect(() => {
		if (!isOpen) return;
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
	}, [isOpen]);

	// TRADE-OFF: measure the WRAPPER, not the trigger — a ref does not reach a DOM node
	// through a function component, so any component trigger would have gone unmeasured
	return h(
		"span",
		{
			className: "wg-kit-anchor",
			ref: triggerRef,
			"aria-expanded": String(isOpen),
			"aria-controls": id,
			// CONTEXT: the panel is a child of the anchor, so only the trigger may toggle
			onClick: (event) => {
				if (panelRef.current?.contains(event.target)) return;
				setOpen(!isOpen);
			},
		},
		trigger,
		h(
			"div",
			{
				id,
				ref: panelRef,
				className: cx(
					"wg-kit-pop",
					where.panelClass,
					(isOpen || isExiting) && "is-open",
					isExiting && "is-exiting",
					cls,
				),
				role: "dialog",
				// CONTEXT: a tile is a stacking context, so styles.css lifts the one holding this
				"data-wg-overlay": shown ? "" : undefined,
			},
			h("div", { className: "wg-kit-pop-inner" }, shown ? held.current : null),
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
			className: cx("wg-kit-pop-item", rest.className),
		},
		children,
		checked === undefined ? null : h(Icon, { name: "tick", className: "wg-kit-pop-tick" }),
	);
}

export function PopoverSeparator(props) {
	return h("div", { ...props, role: "separator", className: cx("wg-kit-pop-sep", props.className) });
}

// TRADE-OFF: the needle is handed down, not the list taken away — matching is the caller's rule
export function PopoverSearch({ placeholder, hint, children, className: cls }) {
	const [keyword, setKeyword] = useState("");
	const needle = keyword.trim().toLowerCase();
	const listRef = useRef(null);

	// CONTEXT: the list is capped in the stylesheet, so what is out of sight is measured, never counted
	const [reach, setReach] = useState({ up: false, down: false });
	const measureReach = useCallback(() => {
		const list = listRef.current;
		if (!list) return;
		const up = list.scrollTop > 1;
		const down = list.scrollTop + list.clientHeight < list.scrollHeight - 1;
		setReach((was) => (was.up === up && was.down === down ? was : { up, down }));
	}, []);
	// CONTEXT: a needle takes rows away, so the edges are re-measured after every render, not once
	useLayoutEffect(measureReach);

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
			{ className: cx("wg-kit-pop-search", cls) },
			h(Field, {
				block: true,
				size: "s",
				className: "wg-kit-pop-search-field",
				icon: h(Icon, { name: "search" }),
				placeholder,
				value: keyword,
				onInput: (event) => setKeyword(event.target.value),
				onKeyDown: takeFirst,
			}),
			hint ? h("span", { className: "wg-kit-pop-search-hint" }, hint) : null,
		),
		h(
			"div",
			{ className: "wg-kit-pop-scroll" },
			h(
				"div",
				{ className: "wg-kit-pop-list", ref: listRef, onScroll: measureReach },
				typeof children === "function" ? children(needle) : children,
			),
			reach.up ? h("span", { className: "wg-kit-pop-edge is-up" }, h(Icon, { name: "chevron", size: 12 })) : null,
			reach.down ? h("span", { className: "wg-kit-pop-edge is-down" }, h(Icon, { name: "chevron", size: 12 })) : null,
		),
	);
}

const MONTH_NAMES = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];
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
	return (
		one.getFullYear() === other.getFullYear() &&
		one.getMonth() === other.getMonth() &&
		one.getDate() === other.getDate()
	);
}

// TRADE-OFF: the kit owns the month and the state on a cell, never what the cell says
export function Calendar({ month, onMonthChange, selected, today, onSelect, renderDay, className: cls }) {
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
		const day = {
			date,
			outside: date.getMonth() !== index,
			today: sameDay(date, now),
			selected: sameDay(date, selected),
		};
		cells.push(
			h(
				"button",
				{
					type: "button",
					key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
					className: cx(
						"wg-kit-cal-day",
						day.outside && "is-outside",
						day.today && "is-today",
						day.selected && "is-picked",
					),
					"aria-pressed": String(day.selected),
					onClick: () => onSelect?.(date),
				},
				renderDay ? renderDay(day) : String(date.getDate()),
			),
		);
	}

	return h(
		"div",
		{ className: cx("wg-kit-cal", cls) },
		h(
			"div",
			{ className: "wg-kit-cal-head" },
			h(IconButton, { size: "s", label: "Previous month", onClick: () => step(-1) }, h(Icon, { name: "fold" })),
			h("span", { className: "wg-kit-cal-month" }, `${MONTH_NAMES[index]} ${year}`),
			h(IconButton, { size: "s", label: "Next month", onClick: () => step(1) }, h(Icon, { name: "chevron" })),
		),
		h(
			"div",
			{ className: "wg-kit-cal-grid" },
			WEEKDAY_INITIALS.map((initial, at) => h("span", { key: at, className: "wg-kit-cal-weekday" }, initial)),
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
export function Progress({ value = 0, onChange, label, className: cls }) {
	const trackRef = useRef(null);
	const [isGrabbed, setGrabbed] = useState(false);
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
			className: cx("wg-kit-progress", isGrabbed && "is-grabbed", cls),
			role: "slider",
			tabIndex: 0,
			"aria-label": label,
			"aria-valuemin": "0",
			"aria-valuemax": String(PROGRESS_MAX),
			"aria-valuenow": String(shown),
			onKeyDown: type,
		},
		h(
			"span",
			{
				className: "wg-kit-progress-track",
				ref: trackRef,
				onPointerDown: grab,
				onPointerMove: drag,
				onPointerUp: release,
				onPointerCancel: release,
			},
			h("i", { className: "wg-kit-progress-fill", style: { width: `${shown}%` } }),
			h("span", { className: "wg-kit-progress-knob", style: { left: `${shown}%` } }),
		),
		h("span", { className: "wg-kit-progress-num" }, `${shown}%`),
	);
}

const HEADING_LINE = /^#{1,6}\s/;
// CONTEXT: reading B — a backticked span is consumed so its markers stay plain, and takes no class
const INLINE =
	/(`[^`\n]*`)|(\[\[[^\]\n]*\]\])|(\[[^\]\n]*\]\([^)\n]*\))|(\*\*[^*\n]+\*\*|__[^_\n]+__)|(\*[^*\n]+\*|_[^_\n]+_)/g;
const INLINE_CLASSES = [null, "is-link", "is-link", "is-strong", "is-em"];

function markLine(line) {
	if (HEADING_LINE.test(line)) return [h("span", { className: "is-heading" }, line)];
	const parts = [];
	let at = 0;
	INLINE.lastIndex = 0;
	for (let found = INLINE.exec(line); found; found = INLINE.exec(line)) {
		if (found.index > at) parts.push(line.slice(at, found.index));
		const group = [1, 2, 3, 4, 5].find((index) => found[index] !== undefined);
		const styled = INLINE_CLASSES[group - 1];
		parts.push(styled ? h("span", { className: styled }, found[0]) : found[0]);
		at = found.index + found[0].length;
	}
	if (at < line.length) parts.push(line.slice(at));
	return parts;
}

function markdownSpans(text) {
	const out = [];
	String(text ?? "")
		.split("\n")
		.forEach((line, at) => {
			if (at > 0) out.push("\n");
			out.push(...markLine(line));
		});
	return out;
}

// TRADE-OFF: a transparent textarea over a styled mirror — native editing, plain content
export function MarkdownEditor({ value = "", onInput, placeholder, className: cls, focusAtStart = false }) {
	const input = useRef(null);

	// TRADE-OFF: opt-in — an editor that always grabbed the caret would steal it from whatever opened it
	useEffect(() => {
		if (!focusAtStart) return;
		input.current?.focus();
		input.current?.setSelectionRange(0, 0);
	}, [focusAtStart]);

	return h(
		"div",
		{ className: cx("wg-kit-md", cls) },
		h(
			"div",
			{ className: "wg-kit-md-page" },
			h("div", { className: "wg-kit-md-text wg-kit-md-mirror", "aria-hidden": "true" }, markdownSpans(value)),
			h("textarea", {
				ref: input,
				className: "wg-kit-md-text wg-kit-md-input",
				spellCheck: true,
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
		className: "wg-kit-switch",
		onClick: () => onChange?.(!checked),
	});
}

// CONTEXT: capitalised because it is read in JSX — <Kit.Button/>, the way Radix reads
export const Kit = {
	Sidebar,
	sidebarClass,
	SidebarSheet,
	SidebarGroup,
	SidebarRow,
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
	TONE_NAMES,
	toneOf,
	toneClass,
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
