import { JSDOM } from "jsdom";
import { buildMirror } from "./mirror.mjs";

buildMirror();

const dom = new JSDOM("<!doctype html><body><div id=\"host\"></div></body>", { pretendToBeVisual: true });
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "MouseEvent", "KeyboardEvent", "TransitionEvent"]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}
// jsdom has no ResizeObserver and lays nothing out; the kit must survive both
globalThis.ResizeObserver = class {
	observe() {}
	disconnect() {}
};

const { render, h } = await import("preact");
const { Kit, buttonClass, variants, cx } = await import("./.mjs-cache/kit.mjs");

// preact defers useEffect a frame, so a test that acts immediately acts before the component
// has finished listening. Wait for the frame rather than guessing at a sleep.
const settle = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

let failed = 0;
let checks = 0;
function check(name, got, want) {
	checks += 1;
	const ok = String(got) === String(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${name}${ok ? "" : `  got ${got}, want ${want}`}`);
}

// A WIDGET MAY SKIP THE COMPONENTS ENTIRELY. The class builders are the kit's real surface;
// the components are a convenience over them.
check("a default button", buttonClass({}), "wg-kit-btn is-m");
check("accent, large, full width", buttonClass({ variant: "accent", size: "l", block: true }), "wg-kit-btn is-accent is-l is-block");
check("a caller's own class survives", buttonClass({ variant: "plain", class: "mine" }), "wg-kit-btn is-plain is-m mine");
check("variants() builds a widget's OWN component too", variants("x", { tone: { hot: "is-hot" } })({ tone: "hot" }), "x is-hot");
check("cx drops the falsy and flattens", cx("a", false, ["b", null], "c"), "a b c");

const host = document.getElementById("host");
render(h(Kit.Button, { variant: "accent", size: "l" }, "Create"), host);
check("Button renders a real button", host.querySelector("button.wg-kit-btn.is-accent.is-l")?.textContent, "Create");
check("type=button, so it never submits a form it lands in", host.querySelector("button").getAttribute("type"), "button");

// AN ICON THE KIT DOES NOT KNOW RENDERS NOTHING AT ALL — no error, no box, an empty button.
render(h(Kit.Icon, { name: "dots" }), host);
check("the three-dot menu has a glyph", host.querySelectorAll("svg.wg-kit-icon-glyph circle").length, 3);
// the glyph is STROKED, so a radius over half the stroke width leaves a hole and the dots read as rings
check("and they are dots, not rings", [...host.querySelectorAll("circle")].every((dot) => parseFloat(dot.getAttribute("r")) <= 0.9), true);

render(h(Kit.Button, { asChild: true, variant: "plain" }, h("a", { href: "#x" }, "Go")), host);
check("asChild pours the button onto somebody else's element", host.querySelector("a")?.getAttribute("class"), "wg-kit-btn is-plain is-m");
check("and keeps that element's own props", host.querySelector("a")?.getAttribute("href"), "#x");

render(h(Kit.Segmented, { items: [{ value: "a", label: "A" }, { value: "b", label: "B" }], value: "b" }), host);
check("Segmented marks exactly one tab", host.querySelectorAll('[aria-selected="true"]').length, 1);
check("and it is the one asked for", host.querySelector('[aria-selected="true"]').textContent, "B");
// THE THUMB MUST NOT BE DRAWN ON A GUESS. jsdom reports every width as zero, which is what a
// widget looks like before its first layout — the thumb has to stay hidden, not collapse.
check("with no layout yet, the thumb is hidden rather than wrong", host.querySelector(".wg-kit-seg-thumb").style.opacity, "0");
delete globalThis.ResizeObserver;
render(h(Kit.Segmented, { items: [{ value: "a", label: "A" }], value: "a" }), host);
check("and a host without ResizeObserver still renders", Boolean(host.querySelector(".wg-kit-seg")), true);
globalThis.ResizeObserver = class { observe() {} disconnect() {} };

render(h(Kit.Popover, { trigger: h(Kit.IconButton, { label: "More" }, "…") }, h(Kit.PopoverItem, { checked: true }, "Rename")), host);
check("Popover renders its trigger", host.querySelector(".wg-kit-icon")?.getAttribute("aria-label"), "More");
check("and starts closed", host.querySelector(".wg-kit-pop")?.classList.contains("is-open"), false);
host.querySelector(".wg-kit-anchor").dispatchEvent(new MouseEvent("click", { bubbles: true }));
await settle();
check("pressing the trigger opens it", host.querySelector(".wg-kit-pop")?.classList.contains("is-open"), true);
check("the trigger LEAVES, because it is the panel now", host.querySelector(".wg-kit-anchor").style.visibility, "hidden");
check("the panel is anchored, not centred", host.querySelector(".wg-kit-pop").style.left !== "", true);
// jsdom runs no transitions, so the exit is ended the way a browser ends it
const endExit = (panel) => panel.dispatchEvent(new TransitionEvent("transitionend", { bubbles: true, propertyName: "transform" }));

document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
await settle();
// THE PANEL MUST OUTLIVE `open`. Preact drops `is-open` the instant the prop turns false, and a
// panel that is already hidden cannot animate — which is why closing used to be a disappearance.
check("Escape STARTS the exit, it does not end it", host.querySelector(".wg-kit-pop")?.classList.contains("is-exiting"), true);
check("the panel is still on screen while it folds", host.querySelector(".wg-kit-pop")?.classList.contains("is-open"), true);
check("and the trigger stays away until it has", host.querySelector(".wg-kit-anchor").style.visibility, "hidden");
endExit(host.querySelector(".wg-kit-pop"));
await settle();
check("when the fold ends the panel is gone", host.querySelector(".wg-kit-pop")?.classList.contains("is-open"), false);
check("and the trigger comes back exactly then", host.querySelector(".wg-kit-anchor").style.visibility, "");

let flipped = null;
render(h(Kit.Switch, { checked: false, onChange: (value) => { flipped = value; }, label: "Live" }), host);
host.querySelector(".wg-kit-switch").dispatchEvent(new MouseEvent("click", { bubbles: true }));
check("Switch reports the new value rather than holding one", flipped, true);

const surface = ["Button", "IconButton", "Pill", "Count", "Plate", "Card", "Row", "List", "RowBadge", "RowLabel", "RowValue", "Segmented", "Popover", "PopoverItem", "PopoverSearch", "PopoverSeparator", "Calendar", "Progress", "MarkdownEditor", "Switch", "cx", "variants", "buttonClass", "iconButtonClass", "pillClass", "plateClass", "cardClass", "rowClass", "listClass", "glassClass"];
check("every piece is reachable from one object", surface.filter((name) => !Kit[name]).join(", ") || 0, 0);

// THE TWO SPECIFIERS, and what each one is FOR. A widget must have "widgetarium"; it may
// take "widgetarium/kit". Proving them through the host's own resolver, not by reading api.js.
const { widgetarium, kitModule } = await import("./.mjs-cache/api.mjs");
check('import { Kit } from "widgetarium" — for <Kit.Button/> in JSX', widgetarium.Kit === Kit, true);
check('import { Button } from "widgetarium/kit" — flat, and it says where it came from', kitModule.Button === Kit.Button, true);
check("every piece is reachable from the subpath", surface.filter((name) => kitModule[name] !== Kit[name]).join(", ") || 0, 0);
check("the core is still whole", ["createWidget", "WidgetRoot", "Dialog", "useAction"].filter((name) => !widgetarium[name]).join(", ") || 0, 0);
// THE KIT IS OPTIONAL, so it must not be sitting in the core surface pretending otherwise
check("the kit does not leak into the core namespace", surface.filter((name) => name !== "cx" && name !== "variants" && widgetarium[name]).join(", ") || 0, 0);

// THE MEASURING HOOK MUST NOT DRIVE ITSELF. jsdom lays nothing out, so every rect is zero and
// the measure returns early — which is why a render loop that froze the real app passed here.
// Give the DOM believable rects and the loop becomes reproducible.
{
	const { useSegmentedThumb } = await import("./.mjs-cache/kit.mjs");
	const { useState } = await import("preact/hooks");
	const was = Element.prototype.getBoundingClientRect;
	const rect = (left, width) => ({ left, width, right: left + width, top: 0, bottom: 38, height: 38, x: left, y: 0 });
	Element.prototype.getBoundingClientRect = function () {
		if (this.classList.contains("wg-kit-seg")) return rect(0, 300);
		if (this.tagName !== "BUTTON") return rect(0, 0);
		const row = [...this.parentNode.querySelectorAll("button")];
		return rect(4 + row.indexOf(this) * 100, 100);
	};

	let renders = 0;
	function Bar() {
		renders += 1;
		const [value] = useState("b");
		// exactly what a widget does: the list is derived, so it is a NEW array every render
		const items = ["a", "b", "c"].map((name) => ({ value: name, label: name }));
		const thumb = useSegmentedThumb(value, renders > 40 ? 0 : items);
		return h(
			"div",
			{ class: "wg-kit-seg", ref: thumb.listRef },
			h("span", thumb.thumbProps),
			items.map((item) => h("button", { key: item.value, "aria-selected": String(item.value === value) }, item.label)),
		);
	}

	const host = document.getElementById("host");
	render(h(Bar, {}), host);
	await settle();
	await settle();
	check("a derived list does not send the thumb into a render loop", renders < 10, true);
	check("the thumb lands on the selected tab", host.querySelector(".wg-kit-seg-thumb").style.transform, "translateX(104px)");

	// THE PADDING MUST NOT MOVE IT. An absolute child is offset from the padding box, whose left
	// edge is the inner BORDER edge — subtracting the padding pushed the thumb out of the capsule.
	const realStyle = globalThis.getComputedStyle;
	globalThis.getComputedStyle = (node) => ({ ...realStyle(node), paddingLeft: "4px", borderLeftWidth: "0px" });
	render(null, host);
	renders = 0;
	render(h(Bar, {}), host);
	await settle();
	await settle();
	check("and a padded container does not push it out", host.querySelector(".wg-kit-seg-thumb").style.transform, "translateX(104px)");
	globalThis.getComputedStyle = realStyle;
	render(null, host);
	Element.prototype.getBoundingClientRect = was;
}

// A CONTROL THE KIT ALREADY DRAWS MUST NOT BE DRAWN AGAIN BY A WIDGET. Two tab bars shipped
// side by side in different greys: both said base-20, but one fell back to --background-secondary
// and the other to a literal, so a theme without the ramp drove them apart.
{
	const fs = await import("node:fs");
	const tokens = fs.readFileSync("widgets/@orbitask/tokens.css", "utf8");
	check("the plate fill has ONE owner, so no second fallback can drift", /--orbi-plate:\s*var\(--wg-kit-fill\)/.test(tokens), true);

	for (const name of ["board-tabs", "filter-panel", "view-tabs"]) {
		const src = fs.readFileSync(`widgets/@orbitask/${name}/widget.jsx`, "utf8");
		// either form counts: the kit is importable as components AND wearable as classes
		check(`${name} builds on the kit rather than restating it`, /widgetarium\/kit|wg-kit-/.test(src), true);
		check(`${name} does not paint its own plate`, /background:\s*var\(--orbi-plate\)/.test(src), false);
	}
}

// THE PANEL MUST BE CLOSABLE, and the press that closes it never reaches `document`.
// src/editor-shield.js wraps EVERY widget block and stops mousedown/pointerdown in the bubble
// phase, so CodeMirror cannot move the caret under a live widget. A document-level bubble
// listener is therefore never called for a press landing on any widget on the board.
{
	const { useState } = await import("preact/hooks");
	const host = document.getElementById("host");
	render(null, host);

	// exactly what shieldFromEditor does to a widget root
	const shielded = document.createElement("div");
	const elsewhere = document.createElement("button");
	shielded.appendChild(elsewhere);
	document.body.appendChild(shielded);
	for (const name of ["pointerdown", "mousedown", "click"]) {
		shielded.addEventListener(name, (event) => event.stopPropagation());
	}

	const bare = document.createElement("button");
	document.body.appendChild(bare);

	const realAdd = document.addEventListener.bind(document);
	const realRemove = document.removeEventListener.bind(document);
	let effectRuns = 0;
	let listening = 0;
	document.addEventListener = (name, fn, opts) => {
		if (name === "keydown") effectRuns += 1;
		if (name === "pointerdown" || name === "mousedown") listening += 1;
		return realAdd(name, fn, opts);
	};
	document.removeEventListener = (name, fn, opts) => {
		if (name === "pointerdown" || name === "mousedown") listening -= 1;
		return realRemove(name, fn, opts);
	};

	let bump = null;
	function Harness() {
		const [open, setOpen] = useState(false);
		const [, setTick] = useState(0);
		bump = () => setTick((count) => count + 1);
		return h(
			Kit.Popover,
			{
				class: "harness-pop",
				trigger: h("button", { class: "harness-trigger" }, "Filter"),
				open,
				// a NEW identity every render, which is what the filter panel hands over
				onOpenChange: (next) => setOpen(next),
			},
			open ? h("button", { class: "harness-inside" }, "Tick") : null,
		);
	}

	// an exiting panel is still marked open — it is on screen folding away, not open
	const isOpen = () => {
		const pop = host.querySelector(".wg-kit-pop");
		return Boolean(pop?.classList.contains("is-open")) && !pop.classList.contains("is-exiting");
	};
	const fire = (node, names) => {
		for (const name of names) node.dispatchEvent(new MouseEvent(name, { bubbles: true, cancelable: true }));
	};
	// a real mouse press, in the order a browser sends it
	const press = (node) => fire(node, ["pointerdown", "mousedown", "click"]);
	// preact hands its effect queue to a timeout AFTER the frame, so one settle can land
	// between the commit and the listener going up
	const flush = async () => {
		await settle();
		await settle();
	};
	const openIt = async () => {
		if (!isOpen()) press(host.querySelector(".harness-trigger"));
		await flush();
	};

	render(h(Harness, {}), host);
	await flush();
	await openIt();
	check("the harness popover opens", isOpen(), true);

	press(bare);
	await flush();
	check("a press on open page closes it", isOpen(), false);

	await openIt();
	check("reopened for the shielded press", isOpen(), true);
	press(elsewhere);
	await flush();
	check("A PRESS THE EDITOR SHIELD SWALLOWS STILL CLOSES IT", isOpen(), false);

	await openIt();
	fire(elsewhere, ["pointerdown"]);
	await flush();
	check("PEN AND TOUCH CLOSE IT — pointerdown alone, no mousedown", isOpen(), false);

	await openIt();
	press(host.querySelector(".harness-inside"));
	await flush();
	check("TICKING A BOX INSIDE THE PANEL DOES NOT DISMISS IT", isOpen(), true);

	// THE LISTENER MUST NOT BE TORN DOWN AND RE-ADDED ON EVERY RENDER, and the panel is open
	// here, so the counters are read while it is actually listening
	const runsWhileOpen = effectRuns;
	const heldWhileOpen = listening;
	check("it is listening while open", heldWhileOpen > 0, true);
	bump();
	await flush();
	bump();
	await flush();
	check("two re-renders do not re-hang the listener", effectRuns - runsWhileOpen, 0);
	check("and it is still attached, with no pair left dangling", listening, heldWhileOpen);

	press(host.querySelector(".harness-trigger"));
	await flush();
	check("the trigger closes an open panel", isOpen(), false);
	await flush();
	check("and it does not spring back open", isOpen(), false);

	press(host.querySelector(".harness-trigger"));
	await flush();
	check("the trigger opens it again", isOpen(), true);
	document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
	await flush();
	check("Escape still closes it", isOpen(), false);

	document.addEventListener = realAdd;
	document.removeEventListener = realRemove;
	shielded.remove();
	bare.remove();
	render(null, host);
}

// THE EXIT IS A STATE MACHINE, and jsdom runs no transitions — so the curve is not what is
// asserted here. The states are: the panel outliving `open`, the trigger held back until the
// fold ends, the radius travelling with it, and every way out of the machine.
{
	const host = document.getElementById("host");
	render(null, host);

	// jsdom lays nothing out, and a fold measured from zeroes is a fold of NaN
	const wasRect = Element.prototype.getBoundingClientRect;
	const box = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top });
	Element.prototype.getBoundingClientRect = function () {
		if (this.classList.contains("wg-kit-pop")) return box(0, 0, 240, 180);
		if (this.classList.contains("wg-kit-anchor")) return box(40, 60, 100, 40);
		return box(0, 0, 0, 0);
	};
	// THE CORNER LIVES ON ::before, so that is where the trigger's radius has to be read from
	const realStyle = globalThis.getComputedStyle;
	let pseudoReads = 0;
	globalThis.getComputedStyle = (node, pseudo) => {
		if (pseudo) pseudoReads += 1;
		return { ...realStyle(node), borderRadius: pseudo ? "999px" : "0px", borderLeftWidth: "0px" };
	};
	const realMatchMedia = window.matchMedia;

	const pop = () => host.querySelector(".wg-kit-pop");
	const anchor = () => host.querySelector(".wg-kit-anchor");
	const has = (name) => Boolean(pop()?.classList.contains(name));
	const show = async (open) => {
		render(h(Kit.Popover, { open, trigger: h("button", { class: "exit-trigger" }, "T") }, h(Kit.PopoverItem, {}, "Rename")), host);
		await settle();
	};

	await show(true);
	await show(false);
	check("the exit folds the panel back onto the trigger", /^translate\(40px, 60px\) scale\(0\.41/.test(pop().style.transform), true);
	// A RADIUS IS SCALED BY THE TRANSFORM: the trigger's real 20px corner, divided by the scale it
	// is about to be multiplied by, per axis — or the panel squares off as it shrinks.
	check("AND THE RADIUS TRAVELS WITH IT", Math.round(parseFloat(pop().style.borderRadius)), 48);
	check("on the other axis too", Math.round(parseFloat(pop().style.borderRadius.split("/")[1])), 90);
	check("measured from the ::before where the corner is painted", pseudoReads > 0, true);
	check("the content fades out ahead of the panel", pop().firstElementChild.style.opacity, "0");
	check("and the closing curve is the ease, never the spring", /--wg-spring/.test(pop().style.transition), false);

	// A PANEL THAT EMPTIES CANNOT FOLD. A caller writes `{open ? … : null}` because it is the
	// obvious thing to write; the panel then collapses to its padding and the fold plays from a
	// flattened line. So the kit keeps the last children, and pins the box before it measures.
	check("the children it had are still there while it folds", Boolean(pop().querySelector(".wg-kit-pop-item")), true);
	check("and the box is pinned in pixels so it cannot collapse", /^[\d.]+px$/.test(pop().style.width), true);
	check("in both directions", /^[\d.]+px$/.test(pop().style.height), true);

	// RE-ENTRANCY. Pressing again mid-exit must re-open, not leave a half-applied fold behind.
	check("the exit is running", has("is-exiting"), true);
	await show(true);
	check("re-opening cancels the exit", has("is-exiting"), false);
	check("and the panel is open again", has("is-open"), true);
	check("the trigger is hidden again, not stuck visible", anchor().style.visibility, "hidden");
	check("nothing of the fold is left on the panel", pop().style.opacity, "");
	check("and the pinned box is released", `${pop().style.width}${pop().style.height}`, "");
	check("nor on its content", pop().firstElementChild.style.opacity, "");
	endExit(pop());
	await settle();
	check("A LATE transitionend FROM THE CANCELLED EXIT DOES NOT CLOSE IT", has("is-open"), true);
	check("and does not take the trigger back", anchor().style.visibility, "hidden");

	// THE GUARD. A transition that never starts must not strand the panel on screen forever.
	await show(false);
	check("the exit is waiting on a transition that will not come", has("is-exiting"), true);
	await new Promise((resolve) => setTimeout(resolve, 460));
	await settle();
	check("the guard ends it anyway", has("is-open"), false);
	check("and the trigger is not stranded hidden", anchor().style.visibility, "");

	// REDUCED MOTION. No animation at all, and nothing left lingering.
	window.matchMedia = () => ({ matches: true });
	await show(true);
	await show(false);
	check("reduced motion skips the exit entirely", has("is-exiting"), false);
	check("the panel is gone at once", has("is-open"), false);
	check("the trigger comes back at once", anchor().style.visibility, "");
	check("and no fold was painted on the way", pop().style.transform, "");
	window.matchMedia = realMatchMedia;

	globalThis.getComputedStyle = realStyle;
	Element.prototype.getBoundingClientRect = wasRect;
	render(null, host);
}

// CONTEXT: the second placement — panel under the trigger, trigger still on screen
{
	const host = document.getElementById("host");
	render(null, host);

	const wasRect = Element.prototype.getBoundingClientRect;
	const box = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top });
	Element.prototype.getBoundingClientRect = function () {
		if (this.classList.contains("wg-kit-pop")) return box(0, 0, 240, 180);
		if (this.classList.contains("wg-kit-anchor")) return box(40, 60, 100, 40);
		return box(0, 0, 0, 0);
	};
	const realStyle = globalThis.getComputedStyle;
	globalThis.getComputedStyle = (node, pseudo) => ({ ...realStyle(node), borderRadius: pseudo ? "999px" : "0px", borderLeftWidth: "0px" });

	const pop = () => host.querySelector(".wg-kit-pop");
	const anchor = () => host.querySelector(".wg-kit-anchor");
	const show = async (open, placement) => {
		render(h(Kit.Popover, { open, placement, trigger: h("button", { class: "place-trigger" }, "T") }, h(Kit.PopoverItem, {}, "Rename")), host);
		await settle();
	};

	await show(true, "over");
	check("the default placement still takes the trigger's place", pop().style.top, "60px");
	check("and the trigger still leaves", anchor().style.visibility, "hidden");
	check("it is not marked as the other placement", pop().classList.contains("is-below"), false);

	render(null, host);
	await show(true, "below");
	// CONTEXT: 60 top + 40 tall + the 6px gap the design draws
	check("BELOW puts the panel under the trigger", pop().style.top, "106px");
	check("and lines it up with the trigger's left edge", pop().style.left, "40px");
	check("THE TRIGGER STAYS ON SCREEN", anchor().style.visibility, "");
	check("the panel says which placement it is, so a caller can style it", pop().classList.contains("is-below"), true);
	check("the trigger's width is handed to the CSS", pop().style.getPropertyValue("--wg-kit-anchor-width"), "100px");

	await show(false, "below");
	check("the exit still folds back onto the trigger", /^translate\(40px, 60px\) scale\(0\.41/.test(pop().style.transform), true);
	check("and the radius still travels with it", Math.round(parseFloat(pop().style.borderRadius)), 48);
	check("the trigger was never hidden, so there is nothing to give back", anchor().style.visibility, "");
	endExit(pop());
	await settle();
	check("and it closes", pop().classList.contains("is-open"), false);

	globalThis.getComputedStyle = realStyle;
	Element.prototype.getBoundingClientRect = wasRect;
	render(null, host);
}

// CONTEXT: widgets/@orbitask/filter-panel builds this by hand today
{
	const host = document.getElementById("host");
	render(null, host);

	const people = ["Denis S.", "Maria K.", "Roman N."];
	const seen = [];
	render(
		h(
			Kit.PopoverSearch,
			{ placeholder: "Find a person", hint: "Narrows the choices below, not the board" },
			(needle) => {
				seen.push(needle);
				return people
					.filter((name) => name.toLowerCase().includes(needle))
					.map((name) => h(Kit.PopoverItem, { key: name }, name));
			},
		),
		host,
	);

	check("the search field is the kit's own Field", Boolean(host.querySelector(".wg-kit-pop-search .wg-kit-field")), true);
	check("with a search glyph in it", Boolean(host.querySelector(".wg-kit-pop-search .wg-kit-icon-glyph")), true);
	check("its placeholder is the caller's", host.querySelector("input").getAttribute("placeholder"), "Find a person");
	check("the hint says what is being narrowed", host.querySelector(".wg-kit-pop-search-hint")?.textContent, "Narrows the choices below, not the board");
	check("every choice is shown before anything is typed", host.querySelectorAll(".wg-kit-pop-item").length, 3);
	check("and the needle starts empty", seen[seen.length - 1], "");

	const input = host.querySelector("input");
	input.value = "MAR";
	input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
	await settle();
	check("TYPING NARROWS THE CHOICES", host.querySelectorAll(".wg-kit-pop-item").length, 1);
	check("and it is the one that matched", host.querySelector(".wg-kit-pop-item").textContent, "Maria K.");
	check("the needle arrives folded and trimmed, so the caller does not redo it", seen[seen.length - 1], "mar");

	render(null, host);
}

// CONTEXT: the caller draws the day; the kit owns the month arithmetic and the state on a cell
{
	const host = document.getElementById("host");
	render(null, host);

	const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
	let picked = null;
	let month = new Date(2026, 8, 1);
	const draw = (extra = {}) =>
		render(
			h(Kit.Calendar, {
				month,
				onMonthChange: (next) => { month = next; draw(); },
				selected: new Date(2026, 8, 12),
				today: new Date(2026, 8, 3),
				onSelect: (date) => { picked = date; },
				...extra,
			}),
			host,
		);

	draw();
	check("seven weekday heads", host.querySelectorAll(".wg-kit-cal-weekday").length, 7);
	check("the week starts on Monday", host.querySelector(".wg-kit-cal-weekday").textContent, "M");
	// TRADE-OFF: always six rows, so the panel does not change height month to month
	check("always six rows of days", host.querySelectorAll(".wg-kit-cal-day").length, 42);
	check("the month is named in English", host.querySelector(".wg-kit-cal-month").textContent, "September 2026");
	check("the picked day is marked once", host.querySelectorAll(".wg-kit-cal-day.is-picked").length, 1);
	check("and it is the twelfth", host.querySelector(".wg-kit-cal-day.is-picked").textContent, "12");
	check("today is marked", host.querySelectorAll(".wg-kit-cal-day.is-today").length, 1);
	check("the days that belong to the neighbouring months say so", host.querySelectorAll(".wg-kit-cal-day.is-outside").length, 12);

	host.querySelectorAll(".wg-kit-cal-day")[8].dispatchEvent(new MouseEvent("click", { bubbles: true }));
	check("pressing a day reports a real date", picked instanceof Date ? `${picked.getFullYear()}-${picked.getMonth()}-${picked.getDate()}` : picked, "2026-8-8");

	host.querySelector('[aria-label="Next month"]').dispatchEvent(new MouseEvent("click", { bubbles: true }));
	await settle();
	check("the step moves the month", host.querySelector(".wg-kit-cal-month").textContent, "October 2026");
	host.querySelector('[aria-label="Previous month"]').dispatchEvent(new MouseEvent("click", { bubbles: true }));
	host.querySelector('[aria-label="Previous month"]').dispatchEvent(new MouseEvent("click", { bubbles: true }));
	await settle();
	check("and back across the year without arithmetic bugs", host.querySelector(".wg-kit-cal-month").textContent, "August 2026");

	month = new Date(2026, 8, 1);
	draw({ renderDay: (day) => (day.outside ? "" : ROMAN[day.date.getDate()] ?? day.date.getDate()) });
	check("THE DAY CELL IS THE CALLER'S TO DRAW", host.querySelectorAll(".wg-kit-cal-day")[1].textContent, "I");
	check("and the kit still owns the state on it", host.querySelectorAll(".wg-kit-cal-day.is-picked").length, 1);

	render(null, host);
}

// CONTEXT: a track, a knob, and the exact number beside it
{
	const host = document.getElementById("host");
	render(null, host);

	const wasRect = Element.prototype.getBoundingClientRect;
	Element.prototype.getBoundingClientRect = function () {
		if (this.classList.contains("wg-kit-progress-track")) return { left: 100, top: 0, width: 200, height: 6, right: 300, bottom: 6, x: 100, y: 0 };
		return { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0, x: 0, y: 0 };
	};

	let value = 65;
	const draw = () => render(h(Kit.Progress, { value, label: "Progress", onChange: (next) => { value = next; draw(); } }), host);
	draw();

	check("the track carries the value so the plate reads at a glance", host.querySelector(".wg-kit-progress-fill").style.width, "65%");
	check("the knob sits on it", host.querySelector(".wg-kit-progress-knob").style.left, "65%");
	check("and the digits are there for the exact one", host.querySelector(".wg-kit-progress-num").textContent, "65%");
	check("it announces itself as what it is", host.querySelector(".wg-kit-progress").getAttribute("role"), "slider");
	check("with the value a reader can hear", host.querySelector(".wg-kit-progress").getAttribute("aria-valuenow"), "65");

	const control = () => host.querySelector(".wg-kit-progress");
	control().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
	check("an arrow moves it one", value, 66);
	control().dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
	check("End takes it to the top", value, 100);
	control().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
	check("AND IT CANNOT GO PAST IT", value, 100);
	control().dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
	control().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
	check("nor below the bottom", value, 0);

	const track = () => host.querySelector(".wg-kit-progress-track");
	const pointer = (node, name, clientX) => {
		const event = new MouseEvent(name, { bubbles: true, cancelable: true });
		Object.defineProperty(event, "clientX", { value: clientX });
		Object.defineProperty(event, "pointerId", { value: 1 });
		node.dispatchEvent(event);
	};
	pointer(track(), "pointerdown", 250);
	check("pressing the track jumps to where the finger is", value, 75);
	check("and the control says it is being held", control().classList.contains("is-grabbed"), true);
	pointer(track(), "pointermove", 260);
	check("dragging follows it", value, 80);
	pointer(track(), "pointerup", 260);
	await settle();
	check("letting go lets go", control().classList.contains("is-grabbed"), false);
	pointer(track(), "pointermove", 120);
	check("AND A POINTER MOVING AFTERWARDS IS NOT A DRAG", value, 80);

	Element.prototype.getBoundingClientRect = wasRect;
	render(null, host);
}

// CONTEXT: reading B — inline code is plain, not bold
{
	const host = document.getElementById("host");
	render(null, host);

	const NOTE = "## Why one surface\n\nRead the same **frontmatter** and drew it three *different* ways.\n\n`properties: Status, Priority`\n\nSee [[Property anchoring]] #orbitask\n";
	let typed = null;
	render(h(Kit.MarkdownEditor, { value: NOTE, onInput: (next) => { typed = next; } }), host);

	const mirror = host.querySelector(".wg-kit-md-mirror");
	const input = host.querySelector("textarea.wg-kit-md-input");
	check("NOTHING IS HIDDEN — the mirror is the note, character for character", mirror.textContent, NOTE);
	check("and the textarea holds the same string", input.value, NOTE);
	check("the mirror is not read out twice by a screen reader", mirror.getAttribute("aria-hidden"), "true");

	const marked = (name) => [...host.querySelectorAll(`.wg-kit-md-mirror .${name}`)].map((node) => node.textContent);
	check("the heading line is bold, hashes and all", marked("is-heading").join("|"), "## Why one surface");
	check("bold keeps its asterisks", marked("is-strong").join("|"), "**frontmatter**");
	check("italic keeps its asterisk", marked("is-em").join("|"), "*different*");
	check("a link keeps its brackets and takes the accent", marked("is-link").join("|"), "[[Property anchoring]]");
	check("INLINE CODE IS NOT STYLED", marked("is-code").length, 0);
	check("a hashtag stays an ordinary hashtag", host.querySelectorAll(".wg-kit-md-mirror span").length, 4);

	input.value = `${NOTE}x`;
	input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
	check("typing is reported, plain", typed, `${NOTE}x`);

	render(null, host);
}

// CONTEXT: jsdom lays nothing out — the mirror's whole cost is geometry, so it is measured in Chrome
{
	const { execFileSync } = await import("node:child_process");
	const { mkdtempSync, readFileSync, writeFileSync } = await import("node:fs");
	const { tmpdir } = await import("node:os");
	const nodePath = (await import("node:path")).default;
	const esbuild = (await import("esbuild")).default;

	const CANDIDATES = [
		process.env.WG_CHROME,
		"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
		"/Applications/Chromium.app/Contents/MacOS/Chromium",
		"/usr/bin/google-chrome",
		"/usr/bin/chromium",
	].filter(Boolean);

	const browser = CANDIDATES.find((candidate) => {
		try {
			execFileSync(candidate, ["--version"], { stdio: "ignore" });
			return true;
		} catch {
			return false;
		}
	});
	if (!browser) {
		console.error("mirror gate: no Chrome found — set WG_CHROME to a Chromium binary");
		process.exit(1);
	}

	const NOTE = "## Why one surface\\n\\nThree widgets read the same **frontmatter** separately and drew the same status three *different* ways, which is a long enough sentence that it has to wrap more than once inside a narrow column.\\n\\nSee [[Property anchoring]] #orbitask\\n";
	const PROPS = ["fontFamily", "fontSize", "fontWeight", "fontStyle", "lineHeight", "letterSpacing", "wordSpacing", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth", "whiteSpace", "overflowWrap", "wordBreak", "tabSize", "textIndent", "textTransform", "boxSizing", "direction"];

	const entry = [
		'import { h, render } from "preact";',
		'import { MarkdownEditor } from "./src/kit.js";',
		"const host = document.querySelector('.wg-root');",
		`render(h(MarkdownEditor, { value: "${NOTE}" }), host);`,
		"const mirror = host.querySelector('.wg-kit-md-mirror');",
		"const input = host.querySelector('.wg-kit-md-input');",
		"const page = host.querySelector('.wg-kit-md-page');",
		`const props = ${JSON.stringify(PROPS)};`,
		"const read = (node) => { const style = getComputedStyle(node); const out = {}; for (const name of props) out[name] = style[name]; return out; };",
		"const rect = (node) => { const box = node.getBoundingClientRect(); return { left: Math.round(box.left * 100) / 100, top: Math.round(box.top * 100) / 100, width: Math.round(box.width * 100) / 100, height: Math.round(box.height * 100) / 100 }; };",
		"const payload = { mirrorStyle: read(mirror), inputStyle: read(input), mirrorBox: rect(mirror), inputBox: rect(input), mirrorScroll: mirror.scrollHeight, inputScroll: input.scrollHeight, pageHeight: page.getBoundingClientRect().height, inputOverflow: getComputedStyle(input).overflowY, inputColour: getComputedStyle(input).color, inputCaret: getComputedStyle(input).caretColor };",
		"document.getElementById('wg-measure').textContent = JSON.stringify(payload);",
	].join("\n");

	const built = await esbuild.build({
		stdin: { contents: entry, resolveDir: process.cwd(), sourcefile: "mirror-page.js", loader: "js" },
		bundle: true,
		write: false,
		format: "iife",
		platform: "browser",
		target: "es2020",
		logLevel: "warning",
	});

	const work = mkdtempSync(nodePath.join(tmpdir(), "wg-mirror-"));
	const file = nodePath.join(work, "mirror.html");
	writeFileSync(
		file,
		`<!doctype html><html><head><meta charset="utf-8"><style>${readFileSync("styles.css", "utf8")}</style>`
			+ `<style>:root { --text-normal: #222; --text-muted: #707070; --text-faint: #ababab; --background-primary: #fff; --interactive-accent: #6d4ee0; --font-interface: -apple-system, "Segoe UI", sans-serif; --font-ui-small: 14px; --size-4-4: 16px; }`
			+ `body { margin: 0; } .wg-root { width: 380px; }</style>`
			+ `</head><body><div class="wg-root"></div><script id="wg-measure" type="application/json"></script>`
			+ `<script>${built.outputFiles[0].text}</script></body></html>`,
	);

	const dumped = execFileSync(
		browser,
		["--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", "--virtual-time-budget=4000", "--dump-dom", `file://${file}`],
		{ encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", process.env.WG_DEBUG ? "inherit" : "ignore"] },
	);
	const raw = dumped.match(/<script id="wg-measure" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
	if (!raw) {
		console.error(`mirror gate: the page never reported — file://${file}`);
		process.exit(1);
	}
	const measured = JSON.parse(raw.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));

	const drifted = PROPS.filter((name) => measured.mirrorStyle[name] !== measured.inputStyle[name]);
	check("EVERY METRIC MATCHES, or the characters separate", drifted.map((name) => `${name} ${measured.mirrorStyle[name]} vs ${measured.inputStyle[name]}`).join(" | ") || 0, 0);
	check("the two boxes sit exactly on each other", JSON.stringify(measured.inputBox), JSON.stringify(measured.mirrorBox));
	check("AND WRAP AT THE SAME POINTS", measured.inputScroll, measured.mirrorScroll);
	// TRADE-OFF: one scroller, so there is no pair of scroll offsets to keep in step
	check("the textarea never scrolls on its own", measured.inputOverflow, "hidden");
	check("a trailing newline still has a line to sit on", measured.pageHeight >= measured.inputScroll, true);
	check("the typed text is invisible, because the mirror is what is read", measured.inputColour, "rgba(0, 0, 0, 0)");
	check("but the caret is not", measured.inputCaret === "rgba(0, 0, 0, 0)", false);
}

console.log(failed ? `\n${failed} failed` : `\nall passed (${checks} checks)`);
process.exit(failed ? 1 : 0);
