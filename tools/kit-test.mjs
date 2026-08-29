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

const surface = ["Button", "IconButton", "Pill", "Count", "Plate", "Card", "Row", "List", "RowBadge", "RowLabel", "RowValue", "Segmented", "Popover", "PopoverItem", "Switch", "cx", "variants", "buttonClass", "iconButtonClass", "pillClass", "plateClass", "cardClass", "rowClass", "listClass", "glassClass"];
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

console.log(failed ? `\n${failed} failed` : `\nall passed (${checks} checks)`);
process.exit(failed ? 1 : 0);
