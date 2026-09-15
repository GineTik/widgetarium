import { JSDOM } from "jsdom";
import { buildMirror } from "./mirror.mjs";
import { TEXT_LOADERS } from "../build.mjs";

buildMirror();

const dom = new JSDOM('<!doctype html><body><div id="host"></div></body>', { pretendToBeVisual: true });
for (const key of [
	"window",
	"document",
	"Node",
	"Element",
	"HTMLElement",
	"SVGElement",
	"getComputedStyle",
	"requestAnimationFrame",
	"cancelAnimationFrame",
	"MouseEvent",
	"KeyboardEvent",
	"TransitionEvent",
]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}
// jsdom has no ResizeObserver and lays nothing out; the kit must survive both
globalThis.ResizeObserver = class {
	observe() {}
	disconnect() {}
};

const { createElement: h } = await import("react");
const { render } = await import("./.mjs-cache/engine/render.mjs");
const {
	Kit,
	APPROVAL_TONES,
	PRIORITY_TONES,
	TONE_NAMES,
	buttonClass,
	cardClass,
	sidebarClass,
	toneClass,
	variants,
	cx,
} = await import("./.mjs-cache/kit.mjs");

// preact defers useEffect a frame, so a test that acts immediately acts before the component
// has finished listening. Wait for the frame rather than guessing at a sleep.
const settle = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

let failed = 0;
let checks = 0;
function check(name, got, want) {
	checks += 1;
	const ok = same(got, want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${name}${ok ? "" : `  got ${show(got)}, want ${show(want)}`}`);
}
// CONTEXT: String() joins an array, so a missing mark and an empty one read the same
function same(got, want) {
	if (Object.is(got, want)) return true;
	if (!plain(got) || !plain(want)) return false;
	return JSON.stringify(got) === JSON.stringify(want);
}
function plain(value) {
	if (value === null || typeof value !== "object") return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === Array.prototype || proto === null;
}
function show(value) {
	return plain(value) ? JSON.stringify(value) : String(value);
}

// A WIDGET MAY SKIP THE COMPONENTS ENTIRELY. The class builders are the kit's real surface;
// the components are a convenience over them.
check("a default button", buttonClass({}), "wg-kit-btn is-m");
check(
	"accent, large, full width",
	buttonClass({ variant: "accent", size: "l", block: true }),
	"wg-kit-btn is-accent is-l is-block",
);
check(
	"a caller's own class survives",
	buttonClass({ variant: "plain", className: "mine" }),
	"wg-kit-btn is-plain is-m mine",
);
check(
	"variants() builds a widget's OWN component too",
	variants("x", { tone: { hot: "is-hot" } })({ tone: "hot" }),
	"x is-hot",
);
check("cx drops the falsy and flattens", cx("a", false, ["b", null], "c"), "a b c");

// A CARD IS THE PLATE EVERY SURFACE IS BUILT FROM, so the pieces built on it must SAY so in their
// class list — a sidebar that only looks like a card is the block spelled twice again.
check("a card is the light plate by default", cardClass({}), "wg-kit-card");
check("solid is the grey well", cardClass({ variant: "solid" }), "wg-kit-card is-solid");
check("and the lift is asked for, never inherited", cardClass({ lift: true }), "wg-kit-card is-lifted");
check("a sidebar IS a light card that lifts", sidebarClass({}), "wg-kit-side wg-kit-card is-lifted");
check(
	"a glass sidebar is the same card",
	sidebarClass({ surface: "glass" }),
	"wg-kit-side wg-kit-card is-lifted is-glass",
);
check("a plate is a solid card", Kit.plateClass({}), "wg-kit-plate wg-kit-card is-solid");
check("and so is the grouped list a sidebar group is made of", Kit.listClass({}), "wg-kit-list wg-kit-card is-solid");

// A TONE IS A ROLE THE KIT OWNS. Two tones sharing a class is one colour wearing two names, and
// a table pointing at a name the kit dropped paints the thing neutral grey with nothing failing.
const classes = TONE_NAMES.map(toneClass);
check("every tone has a class of its own", new Set(classes).size, classes.length);
check("a tone the kit never had is the neutral one", toneClass("chartreuse"), toneClass("neutral"));
for (const [table, name] of [
	[PRIORITY_TONES, "PRIORITY_TONES"],
	[APPROVAL_TONES, "APPROVAL_TONES"],
]) {
	const strays = Object.entries(table).filter(([, tone]) => !TONE_NAMES.includes(tone));
	check(`${name} still names tones the kit has`, strays.map(([key, tone]) => `${key}->${tone}`).join(", ") || 0, 0);
}

// A SECONDARY IS NOT A SECOND ACCENT: the quiet one must not carry the accent's own class.
check("the quiet button is the kit's neutral", buttonClass({ variant: "neutral", size: "s" }), "wg-kit-btn is-s");

const host = document.getElementById("host");
render(h(Kit.Button, { variant: "accent", size: "l" }, "Create"), host);
check("Button renders a real button", host.querySelector("button.wg-kit-btn.is-accent.is-l")?.textContent, "Create");
check(
	"type=button, so it never submits a form it lands in",
	host.querySelector("button").getAttribute("type"),
	"button",
);

// AN ICON THE KIT DOES NOT KNOW RENDERS NOTHING AT ALL — no error, no box, an empty button.
render(h(Kit.Icon, { name: "dots" }), host);
check("the three-dot menu has a glyph", host.querySelectorAll("svg.wg-kit-icon-glyph circle").length, 3);
// the glyph is STROKED, so a radius over half the stroke width leaves a hole and the dots read as rings
check(
	"and they are dots, not rings",
	[...host.querySelectorAll("circle")].every((dot) => parseFloat(dot.getAttribute("r")) <= 0.9),
	true,
);

render(h(Kit.Button, { asChild: true, variant: "plain" }, h("a", { href: "#x" }, "Go")), host);
check(
	"asChild pours the button onto somebody else's element",
	host.querySelector("a")?.getAttribute("class"),
	"wg-kit-btn is-plain is-m",
);
check("and keeps that element's own props", host.querySelector("a")?.getAttribute("href"), "#x");

render(
	h(Kit.Segmented, {
		items: [
			{ value: "a", label: "A" },
			{ value: "b", label: "B" },
		],
		value: "b",
	}),
	host,
);
check("Segmented marks exactly one tab", host.querySelectorAll('[aria-selected="true"]').length, 1);
check("and it is the one asked for", host.querySelector('[aria-selected="true"]').textContent, "B");
// THE THUMB MUST NOT BE DRAWN ON A GUESS. jsdom reports every width as zero, which is what a
// widget looks like before its first layout — the thumb has to stay hidden, not collapse.
check(
	"with no layout yet, the thumb is hidden rather than wrong",
	host.querySelector(".wg-kit-seg-thumb").style.opacity,
	"0",
);
delete globalThis.ResizeObserver;
render(h(Kit.Segmented, { items: [{ value: "a", label: "A" }], value: "a" }), host);
check("and a host without ResizeObserver still renders", Boolean(host.querySelector(".wg-kit-seg")), true);
globalThis.ResizeObserver = class {
	observe() {}
	disconnect() {}
};

render(
	h(
		Kit.Popover,
		{ trigger: h(Kit.IconButton, { label: "More" }, "…") },
		h(Kit.PopoverItem, { checked: true }, "Rename"),
	),
	host,
);
check("Popover renders its trigger", host.querySelector(".wg-kit-icon")?.getAttribute("aria-label"), "More");
check("and starts closed", host.querySelector(".wg-kit-pop")?.classList.contains("is-open"), false);
host.querySelector(".wg-kit-anchor").dispatchEvent(new MouseEvent("click", { bubbles: true }));
await settle();
check("pressing the trigger opens it", host.querySelector(".wg-kit-pop")?.classList.contains("is-open"), true);
// CONTEXT: a real kit control, so the law is proved on what a caller actually hands over
check(
	"the trigger LEAVES at once, because the panel is it now",
	host.querySelector(".wg-kit-anchor").style.visibility,
	"hidden",
);
check("and is never touched on the way out", host.querySelector(".wg-kit-icon").style.scale, "");
check("the panel is anchored, not centred", host.querySelector(".wg-kit-pop").style.left !== "", true);
// jsdom runs no transitions, so the exit is ended the way a browser ends it
const endExit = (panel) =>
	panel.dispatchEvent(new TransitionEvent("transitionend", { bubbles: true, propertyName: "transform" }));

document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
await settle();
// THE PANEL MUST OUTLIVE `open`. Preact drops `is-open` the instant the prop turns false, and a
// panel that is already hidden cannot animate — which is why closing used to be a disappearance.
check(
	"Escape STARTS the exit, it does not end it",
	host.querySelector(".wg-kit-pop")?.classList.contains("is-exiting"),
	true,
);
check(
	"the panel is still on screen while it folds",
	host.querySelector(".wg-kit-pop")?.classList.contains("is-open"),
	true,
);
check("and the trigger stays away until it has", host.querySelector(".wg-kit-anchor").style.visibility, "hidden");
endExit(host.querySelector(".wg-kit-pop"));
await settle();
check("when the fold ends the panel is gone", host.querySelector(".wg-kit-pop")?.classList.contains("is-open"), false);
check("and the trigger comes back exactly then", host.querySelector(".wg-kit-anchor").style.visibility, "");
check(
	"UNTOUCHED, as it was throughout",
	`${host.querySelector(".wg-kit-icon").style.scale}|${host.querySelector(".wg-kit-icon").style.opacity}`,
	"|",
);

let flipped = null;
render(
	h(Kit.Switch, {
		checked: false,
		onChange: (value) => {
			flipped = value;
		},
		label: "Live",
	}),
	host,
);
host.querySelector(".wg-kit-switch").dispatchEvent(new MouseEvent("click", { bubbles: true }));
check("Switch reports the new value rather than holding one", flipped, true);

const surface = [
	"Button",
	"IconButton",
	"Pill",
	"Count",
	"Plate",
	"Card",
	"Row",
	"List",
	"RowBadge",
	"RowLabel",
	"RowValue",
	"Segmented",
	"Popover",
	"PopoverItem",
	"PopoverSearch",
	"PopoverSeparator",
	"Calendar",
	"Progress",
	"MarkdownEditor",
	"Switch",
	"cx",
	"variants",
	"toneClass",
	"TONE_NAMES",
	"buttonClass",
	"iconButtonClass",
	"pillClass",
	"plateClass",
	"cardClass",
	"rowClass",
	"listClass",
	"glassClass",
	"sidebarClass",
];
check("every piece is reachable from one object", surface.filter((name) => !Kit[name]).join(", ") || 0, 0);

// THE TWO SPECIFIERS, and what each one is FOR. A widget must have "widgetarium"; it may
// take "widgetarium/kit". Proving them through the host's own resolver, not by reading api.js.
const { ENGINE_SCOPE } = await import("./.mjs-cache/registry.mjs");
const { api: widgetarium, kit: kitModule } = ENGINE_SCOPE;
check('import { Kit } from "widgetarium" — for <Kit.Button/> in JSX', widgetarium.Kit === Kit, true);
check(
	'import { Button } from "widgetarium/kit" — flat, and it says where it came from',
	kitModule.Button === Kit.Button,
	true,
);
check(
	"every piece is reachable from the subpath",
	surface.filter((name) => kitModule[name] !== Kit[name]).join(", ") || 0,
	0,
);
check(
	"the core is still whole",
	["createWidget", "WidgetRoot", "Dialog", "useAction"].filter((name) => !widgetarium[name]).join(", ") || 0,
	0,
);
// THE KIT IS OPTIONAL, so it must not be sitting in the core surface pretending otherwise
check(
	"the kit does not leak into the core namespace",
	surface.filter((name) => name !== "cx" && name !== "variants" && widgetarium[name]).join(", ") || 0,
	0,
);

// THE MEASURING HOOK MUST NOT DRIVE ITSELF. jsdom lays nothing out, so every rect is zero and
// the measure returns early — which is why a render loop that froze the real app passed here.
// Give the DOM believable rects and the loop becomes reproducible.
{
	const { useSegmentedThumb } = await import("./.mjs-cache/kit.mjs");
	const { useState } = await import("react");
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
			{ className: "wg-kit-seg", ref: thumb.listRef },
			h("span", thumb.thumbProps),
			items.map((item) => h("button", { key: item.value, "aria-selected": String(item.value === value) }, item.label)),
		);
	}

	const host = document.getElementById("host");
	render(h(Bar, {}), host);
	await settle();
	await settle();
	check("a derived list does not send the thumb into a render loop", renders < 10, true);
	check(
		"the thumb lands on the selected tab",
		host.querySelector(".wg-kit-seg-thumb").style.transform,
		"translateX(104px)",
	);

	// THE PADDING MUST NOT MOVE IT. An absolute child is offset from the padding box, whose left
	// edge is the inner BORDER edge — subtracting the padding pushed the thumb out of the capsule.
	const realStyle = globalThis.getComputedStyle;
	globalThis.getComputedStyle = (node) => ({ ...realStyle(node), paddingLeft: "4px", borderLeftWidth: "0px" });
	render(null, host);
	renders = 0;
	render(h(Bar, {}), host);
	await settle();
	await settle();
	check(
		"and a padded container does not push it out",
		host.querySelector(".wg-kit-seg-thumb").style.transform,
		"translateX(104px)",
	);
	globalThis.getComputedStyle = realStyle;
	render(null, host);
	Element.prototype.getBoundingClientRect = was;
}

// A CONTROL THE KIT ALREADY DRAWS MUST NOT BE DRAWN AGAIN BY A WIDGET. Two tab bars shipped
// side by side in different greys: both said base-20, but one fell back to --background-secondary
// and the other to a literal, so a theme without the ramp drove them apart.
{
	const fs = await import("node:fs");
	const widgetSource = (id) => {
		for (const ext of ["tsx", "ts", "jsx", "js"]) {
			const at = `widgets/${id}/widget.${ext}`;
			if (fs.existsSync(at)) return fs.readFileSync(at, "utf8");
		}
		throw new Error(`${id}: no widget source found`);
	};
	const tokens = fs.readFileSync("widgets/@task/tokens.css", "utf8");
	check(
		"the plate fill has ONE owner, so no second fallback can drift",
		/--orbi-plate:\s*var\(--wg-kit-fill\)/.test(tokens),
		true,
	);

	// CONTEXT: the tab strip left the widget for src/editable-tabs.js, so that is where it is checked
	const strip = fs.readFileSync("src/editable-tabs.js", "utf8");
	check("the tab strip builds on the kit rather than restating it", /from "\.\/kit\.js"|wg-kit-/.test(strip), true);
	check("the tab strip does not paint its own plate", /background:\s*var\(--orbi-plate\)/.test(strip), false);
	check(
		"and the widget holding it draws no strip of its own",
		/wg-kit-seg|role="tablist"/.test(widgetSource("@core/editable-tabs")),
		false,
	);

	for (const id of ["@core/filter-panel", "@task/view-tabs"]) {
		const name = id.slice(id.indexOf("/") + 1);
		const src = widgetSource(id);
		// either form counts: the kit is importable as components AND wearable as classes
		check(`${name} builds on the kit rather than restating it`, /widgetarium\/kit|wg-kit-/.test(src), true);
		check(`${name} does not paint its own plate`, /background:\s*var\(--orbi-plate\)/.test(src), false);
	}
}

// A DESTRUCTIVE CONTROL IS PROVED BY WHAT IT DRAWS. The archived list asserted a Delete in its
// source and drew Restore alone for a whole session — a declared control nobody can press.
{
	const { useState } = await import("react");
	const { EditableTabs } = await import("./.mjs-cache/editable-tabs.mjs");
	const host = document.getElementById("host");
	render(null, host);

	const steps = [];
	function Strip() {
		const [held, setHeld] = useState({
			tabs: ["Marketing Team"],
			archived: ["Ux Team", "Sales"],
			selected: "Marketing Team",
		});
		return h(EditableTabs, {
			...held,
			onChange: (step) => {
				steps.push(step);
				setHeld({ tabs: step.tabs, archived: step.archived, selected: step.selected });
			},
		});
	}

	const press = async (node) => {
		node.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		await settle();
	};
	const inBody = (selector) => [...document.body.querySelectorAll(selector)];
	const rows = () => inBody(".wg-tabs-archive .wg-kit-row");
	const names = () => rows().map((row) => row.querySelector(".wg-kit-row-label").textContent.trim());
	const confirm = () => document.body.querySelector(".wg-tabs-confirm");

	render(h(Strip, {}), host);
	await settle();
	await press(host.querySelector(".wg-tabs-more"));
	await press(inBody(".wg-kit-pop-item").find((item) => item.textContent.includes("Archived list")));

	check("the archived list draws a row per archived tab", names(), ["Ux Team", "Sales"]);
	check(
		"and every row draws a Restore beside a Delete",
		rows().map((row) => [...row.querySelectorAll("button")].map((node) => node.textContent.trim())),
		[
			["Restore", "Delete"],
			["Restore", "Delete"],
		],
	);

	await press(rows()[0].querySelector(".wg-tabs-delete"));
	check("pressing Delete asks first", Boolean(confirm()), true);
	check("and names the tab it is asking about", /Ux Team/.test(confirm().textContent), true);
	check("nothing has left the list yet", names(), ["Ux Team", "Sales"]);
	check("and the caller has been told nothing", steps.length, 0);

	await press(confirm().querySelector(".wg-dialog-cancel"));
	check("dismissing closes the question", Boolean(confirm()), false);
	check("and leaves the entry exactly as it was", names(), ["Ux Team", "Sales"]);
	check("still telling the caller nothing", steps.length, 0);

	await press(rows()[0].querySelector(".wg-tabs-delete"));
	await press(confirm().querySelector(".wg-dialog-confirm"));
	check("confirming takes the entry off the list", names(), ["Sales"]);
	check("and hands the caller the whole archive after it", steps.at(-1), {
		verb: "delete",
		tabs: ["Marketing Team"],
		archived: ["Sales"],
		selected: "Marketing Team",
		name: "Ux Team",
		was: null,
	});
	check(
		"the strip itself is untouched",
		[...host.querySelectorAll(".wg-tabs-tab")].map((node) => node.textContent.trim()),
		["Marketing Team"],
	);

	await press(rows()[0].querySelector(".wg-tabs-restore"));
	check("Restore still empties the list", names(), []);
	check(
		"by putting the tab back on the strip",
		[...host.querySelectorAll(".wg-tabs-tab")].map((node) => node.textContent.trim()),
		["Marketing Team", "Sales"],
	);

	render(null, host);
	for (const stray of inBody(".wg-dialog-overlay")) stray.remove();
}

// THE PANEL MUST BE CLOSABLE, and the press that closes it never reaches `document`.
// src/editor-shield.js wraps EVERY widget block and stops mousedown/pointerdown in the bubble
// phase, so CodeMirror cannot move the caret under a live widget. A document-level bubble
// listener is therefore never called for a press landing on any widget on the board.
{
	const { useState } = await import("react");
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
				className: "harness-pop",
				trigger: h("button", { className: "harness-trigger" }, "Filter"),
				isOpen: open,
				// a NEW identity every render, which is what the filter panel hands over
				onOpenChange: (next) => setOpen(next),
			},
			open ? h("button", { className: "harness-inside" }, "Tick") : null,
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
	// CONTEXT: an outside press is the one close nobody can repair by pressing the row again
	const folded = () => {
		const node = host.querySelector(".harness-trigger");
		return `${node.style.scale}|${node.style.opacity}`;
	};
	check("AND HAND THE ROW BACK WHOLE, never leaving it folded", folded(), "|");

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
	check("and leaves the row whole as well", folded(), "|");

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
	const box = (left, top, width, height) => ({
		left,
		top,
		width,
		height,
		right: left + width,
		bottom: top + height,
		x: left,
		y: top,
	});
	// CONTEXT: a measurement forces a style flush, and a browser starts or misses transitions there
	const flushes = [];
	Element.prototype.getBoundingClientRect = function () {
		if (this.classList.contains("wg-kit-pop")) {
			flushes.push({
				open: this.classList.contains("is-open"),
				opacity: this.style.opacity,
				transition: this.style.transition,
			});
			return box(0, 0, 240, 180);
		}
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
		render(
			h(
				Kit.Popover,
				{ isOpen: open, trigger: h("button", { className: "exit-trigger" }, "T") },
				h(Kit.PopoverItem, {}, "Rename"),
			),
			host,
		);
		await settle();
	};

	await show(true);
	// CONTEXT: the enter is let LAND first, so its inline opacity is gone and the hold below is the only one
	await new Promise((resolve) => setTimeout(resolve, 600));
	check("the enter has landed, leaving the opacity to the stylesheet", pop().style.opacity, "");
	flushes.length = 0;
	await show(false);
	check(
		"the exit folds the panel back onto the trigger",
		/^translate\(40px, 60px\) scale\(0\.41/.test(pop().style.transform),
		true,
	);
	// A RADIUS IS SCALED BY THE TRANSFORM: the trigger's real 20px corner, divided by the scale it
	// is about to be multiplied by, per axis — or the panel squares off as it shrinks.
	check("AND THE RADIUS TRAVELS WITH IT", Math.round(parseFloat(pop().style.borderRadius)), 48);
	check("on the other axis too", Math.round(parseFloat(pop().style.borderRadius.split("/")[1])), 90);
	check("measured from the ::before where the corner is painted", pseudoReads > 0, true);
	check("the content fades out ahead of the panel", pop().firstElementChild.style.opacity, "0");
	check("and the closing curve is the ease, never the spring", /--wg-spring/.test(pop().style.transition), false);

	// CONTEXT: a fade whose start value is resolved as 0 plays nothing — the panel is gone in one frame
	const measured = flushes[0];
	const folding = flushes[flushes.length - 1];
	check("the exit measures a panel `is-open` has already left", measured.open, false);
	check("SO IT HOLDS THE OPACITY UP BEFORE MEASURING", measured.opacity, "1");
	check("because opacity is not in the curve still in force there", /opacity/.test(measured.transition), false);
	check("only then is it sent to nothing", folding.opacity, "0");
	check("on a curve that names opacity", /opacity var\(--wg-press\)/.test(folding.transition), true);

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
	check(
		"the exit's pinned box is released, and the enter never pins one",
		`${pop().style.width}|${pop().style.height}`,
		"|",
	);
	check("and its content is fading IN again, not out", pop().firstElementChild.style.opacity, "1");
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

// CONTEXT: THE PANEL SEEDS AT THE TRIGGER'S BOX AND SCALES OUT — beats are sampled as written
{
	const host = document.getElementById("host");
	render(null, host);

	const wasRect = Element.prototype.getBoundingClientRect;
	const box = (left, top, width, height) => ({
		left,
		top,
		width,
		height,
		right: left + width,
		bottom: top + height,
		x: left,
		y: top,
	});
	Element.prototype.getBoundingClientRect = function () {
		if (this.classList.contains("wg-kit-pop")) return box(0, 0, 240, 180);
		if (this.classList.contains("wg-kit-anchor")) return box(40, 60, 100, 40);
		return box(0, 0, 0, 0);
	};
	// CONTEXT: a grey row under a white panel — the pair the trigger's own paint has to be read from
	const ROW_FILL = "rgb(240, 240, 240)";
	const ROW_EDGE = "rgb(200, 200, 200)";
	const PANEL_FILL = "rgb(255, 255, 255)";
	const PANEL_EDGE = "inset 0 0 0 1px rgba(0, 0, 0, 0.12)";
	const realStyle = globalThis.getComputedStyle;
	globalThis.getComputedStyle = (node, pseudo) => {
		const base = {
			...realStyle(node),
			borderRadius: pseudo ? "999px" : "0px",
			borderLeftWidth: "0px",
			borderTopWidth: "0px",
			backgroundColor: "rgba(0, 0, 0, 0)",
			boxShadow: "none",
		};
		if (node.classList?.contains("wg-kit-pop")) return { ...base, backgroundColor: PANEL_FILL, boxShadow: PANEL_EDGE };
		if (node.classList?.contains("enter-trigger"))
			return { ...base, backgroundColor: ROW_FILL, borderTopWidth: "1px", borderTopColor: ROW_EDGE };
		// CONTEXT: the kit's own controls are bare and paint their fill on ::before
		if (node.classList?.contains("enter-ghost")) return pseudo ? { ...base, backgroundColor: ROW_FILL } : base;
		return base;
	};
	const realMatchMedia = window.matchMedia;

	const pop = () => host.querySelector(".wg-kit-pop");
	const anchor = () => host.querySelector(".wg-kit-anchor");
	const row = () => host.querySelector(".enter-trigger") ?? host.querySelector(".enter-ghost");
	// CONTEXT: the seat is written in the layout effect, so it is gone by the first await
	const open = (mark = "enter-trigger") =>
		render(
			h(
				Kit.Popover,
				{ isOpen: true, trigger: h("button", { className: mark }, "T") },
				h(Kit.PopoverItem, {}, "Rename"),
			),
			host,
		);
	const shut = (mark = "enter-trigger") =>
		render(
			h(
				Kit.Popover,
				{ isOpen: false, trigger: h("button", { className: mark }, "T") },
				h(Kit.PopoverItem, {}, "Rename"),
			),
			host,
		);
	const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
	const snap = () => {
		const node = pop();
		const inner = node.firstElementChild;
		const trigger = row();
		return {
			translate: node.style.translate,
			scale: node.style.scale,
			origin: node.style.transformOrigin,
			seed: `${node.style.getPropertyValue("--wg-kit-pop-seed-x")}|${node.style.getPropertyValue("--wg-kit-pop-seed-y")}`,
			motion: node.style.animation,
			width: node.style.width,
			height: node.style.height,
			floor: node.style.minWidth,
			radius: node.style.borderRadius,
			fill: node.style.backgroundColor,
			edge: node.style.boxShadow,
			fade: node.style.opacity,
			transition: node.style.transition,
			innerScale: inner.style.scale,
			innerFade: inner.style.opacity,
			innerTransition: inner.style.transition,
			gone: anchor().style.visibility,
			// CONTEXT: the fold is gone, so ANY inline style on the trigger is now a defect
			rowTouched: `${trigger.style.scale}|${trigger.style.opacity}|${trigger.style.transform}|${trigger.style.transition}|${trigger.style.transformOrigin}`,
		};
	};
	const numbers = (value) => String(value).trim().split(/\s+/).map(parseFloat);
	const partsOf = (state) => state.transition.split(",").map((part) => part.trim());
	const drivenIn = (state) => partsOf(state).map((part) => part.split(/\s+/)[0]);

	// TRADE-OFF: the law's numbers are read off the source, so one changed there fails here
	const source = (await import("node:fs")).readFileSync("src/kit.js", "utf8");
	const constant = (name) => Number(new RegExp(`const ${name} = ([\\d.]+)`).exec(source)[1]);
	const growMs = constant("GROW_MS");
	const contentMs = constant("CONTENT_MS");
	const contentDelayMs = constant("CONTENT_DELAY_MS");
	const landMarginMs = constant("LAND_MARGIN_MS");

	const pollUntil = async (ready, tries = 400) => {
		for (let round = 0; round < tries; round += 1) {
			if (ready()) break;
			await sleep(5);
		}
	};

	open();
	const seated = snap();
	await pollUntil(() => pop().style.animation.includes("wg-kit-pop-bloom"));
	const growing = snap();
	await pollUntil(() => pop().style.animation === "");
	const landed = snap();
	const beats = [seated, growing, landed];
	console.log(`   the enter: seed ${seated.scale} out of the trigger's box, about ${seated.origin}`);
	console.log(
		`              -> ${growing.motion}, paint on ${drivenIn(growing).join(" ")} -> land ${landed.scale || "auto"}`,
	);

	// CONTEXT: a 100x40 trigger under a 240x180 panel — the seed is one box over the other, per axis
	check("THE SEED IS THE TRIGGER'S BOX OVER THE PANEL'S", seated.scale, `${100 / 240} ${40 / 180}`);
	check(
		"and the two axes DIFFER, because a button and a panel share no aspect",
		numbers(seated.scale)[0] === numbers(seated.scale)[1],
		false,
	);
	check(
		"handed to the keyframes, which is the only place the seed can be read",
		seated.seed,
		`${100 / 240}|${40 / 180}`,
	);
	check("it grows out of the corner it meets the trigger on", seated.origin, "left top");
	check(
		"wearing the row's corner, divided per axis by the scale it is multiplied by",
		seated.radius,
		`${20 / (100 / 240)}px / ${20 / (40 / 180)}px`,
	);
	check("THE COLOUR COMES OUT OF THE TRIGGER, not out of the panel", seated.fill, ROW_FILL);
	check("and so does the edge, so no border exists from frame one", seated.edge, `inset 0 0 0 1px ${ROW_EDGE}`);
	check("neither is the panel's own yet", `${seated.fill === PANEL_FILL} ${seated.edge === PANEL_EDGE}`, "false false");
	check("nothing is armed on the seat itself", `${seated.transition}|${seated.motion}`, "none|none");
	check("the content waits, and is never counter-scaled", `${seated.innerScale}|${seated.innerFade}`, "|0");
	check("THE TRIGGER IS NOT TOUCHED — the fold is gone", seated.rowTouched, "||||");
	check("it simply leaves, because the panel is the panel now", seated.gone, "hidden");

	check("ONE ANIMATION CARRIES THE WHOLE GROWTH", growing.motion, `wg-kit-pop-bloom ${growMs}ms var(--wg-ease) both`);
	check("and the inline seed is handed over to it, so the two cannot disagree", growing.scale, "");
	check(
		"SCALING IS THE ONLY THING THAT MOVES: no position, no laid-out box",
		`${growing.translate}|${growing.width}|${growing.height}|${growing.floor}`,
		"|||",
	);
	check(
		"so position cannot pass the resting point — there is none to pass",
		beats.map((state) => state.translate).join(""),
		"",
	);
	check(
		"the transition is left carrying the paint alone",
		drivenIn(growing).sort().join(" "),
		"background-color border-radius box-shadow",
	);
	check(
		"the panel's own fill and edge arrive on it",
		`${growing.fill} | ${growing.edge}`,
		`${PANEL_FILL} | ${PANEL_EDGE}`,
	);
	check("and the corner travels to the panel's own", growing.radius, "");
	check(
		"the content fades in while the panel grows",
		growing.innerTransition,
		`opacity ${contentMs}ms var(--wg-ease) ${contentDelayMs}ms`,
	);
	check("to fully visible, at true size", `${growing.innerFade}|${growing.innerScale}`, "1|");
	check("THE TRIGGER IS STILL NOT TOUCHED", growing.rowTouched, "||||");

	check(
		"it ends with nothing of its own left on it",
		`${landed.scale}|${landed.motion}|${landed.origin}|${landed.seed}`,
		"||||",
	);
	check("and its paint handed back to the stylesheet", `${landed.fill}|${landed.edge}`, "|");
	check(
		"the box was never pinned, so a list that filters can still resize it",
		beats.map((state) => `${state.width}${state.height}${state.floor}`).join(""),
		"",
	);
	check("AND THE CONTENT IS NEVER COUNTER-SCALED, at any beat", beats.map((state) => state.innerScale).join(""), "");
	check("nor the trigger touched, at any beat", beats.map((state) => state.rowTouched).join(""), "||||||||||||");

	// TRADE-OFF: the peak is READ OFF the keyframes, because that is where it is authored
	const css = (await import("node:fs")).readFileSync("styles.css", "utf8");
	const frames = /@keyframes wg-kit-pop-bloom \{([\s\S]*?)\n\}/.exec(css)[1];
	const stopAt = (label) => numbers(new RegExp(`${label}\\s*\\{\\s*scale:\\s*([^;]+);`).exec(frames)[1]);
	const peakStop = Number(/(\d+)%\s*\{\s*scale:/.exec(frames)[1]) / 100;
	const peak = stopAt(`${peakStop * 100}%`);
	const rest = stopAt("to");
	const seedStop = /from\s*\{\s*scale:\s*var\(--wg-kit-pop-seed-x,\s*1\)\s*var\(--wg-kit-pop-seed-y,\s*1\);\s*\}/.test(frames);
	console.log(
		`   the curve: seed -> ${peak.join(" ")} at ${peakStop * 100}% (${peakStop * growMs}ms) -> ${rest.join(" ")}`,
	);
	check("0% -> 105% -> 100%: THE PEAK IS 105% OF THE FINAL SIZE", peak.join(" "), "1.05 1.05");
	check("ON BOTH AXES EQUALLY, whatever the seed underneath was", peak[0] === peak[1], true);
	check("and it comes to rest at exactly 1", rest.join(" "), "1 1");
	check("starting from the seed the panel was handed", seedStop, true);
	// CONTEXT: the seed's non-uniform squash lives in the first frames, so the hold covers only those
	check(
		"THE CONTENT IS HELD OFF THE RAW SEED, but starts inside the growth",
		contentDelayMs > 0 && contentDelayMs < peakStop * growMs,
		true,
	);
	check("AND IS FULLY READABLE BY THE TIME THE GROWTH SETTLES", contentDelayMs + contentMs <= growMs, true);
	// TRADE-OFF: the SCHEDULE is parsed, not recomputed — a recomputed inequality cannot see a bad timer
	const landsAt = new Function(
		"GROW_MS",
		"CONTENT_MS",
		"CONTENT_DELAY_MS",
		"LAND_MARGIN_MS",
		`return ${/landPanel\(panel\), ([^)]+)\)/.exec(source)[1]};`,
	)(growMs, contentMs, contentDelayMs, landMarginMs);
	check(
		"and the landing is scheduled past every curve",
		`${landsAt > growMs} ${landsAt > contentDelayMs + contentMs}`,
		"true true",
	);

	// CONTEXT: a panel that opens the other way must grow the other way, or it slides out of nowhere
	render(null, host);
	Element.prototype.getBoundingClientRect = function () {
		if (this.classList.contains("wg-kit-pop")) return box(0, 0, 240, 180);
		if (this.classList.contains("wg-kit-anchor")) return box(900, 700, 100, 40);
		return box(0, 0, 0, 0);
	};
	open();
	check("PUSHED OFF THE SCREEN, IT GROWS FROM THE CORNER IT ACTUALLY LANDED ON", snap().origin, "right bottom");
	Element.prototype.getBoundingClientRect = function () {
		if (this.classList.contains("wg-kit-pop")) return box(0, 0, 240, 180);
		if (this.classList.contains("wg-kit-anchor")) return box(40, 60, 100, 40);
		return box(0, 0, 0, 0);
	};

	// CONTEXT: the panel is the only thing the enter ever staged, so it is the only thing to hand back
	render(null, host);
	open();
	await pollUntil(() => pop().style.animation.includes("wg-kit-pop-bloom"));
	shut();
	check("A DISMISSAL MID-GROWTH TAKES THE ANIMATION OFF, or it fights the fold", pop().style.animation, "");
	check("and the seed with it", pop().style.getPropertyValue("--wg-kit-pop-seed-x"), "");
	endExit(pop());
	await settle();
	check(
		"after the close the trigger is back, and was never altered",
		`${anchor().style.visibility}|${snap().rowTouched}`,
		"|||||",
	);

	// CONTEXT: reduced motion returns before the seat, so there is no movement to skip a beat of
	render(null, host);
	window.matchMedia = () => ({ matches: true });
	open();
	const still = snap();
	await sleep(200);
	const later = snap();
	check("reduced motion never seeds the panel", `${still.scale}|${still.seed}|${still.origin}|${still.motion}`, "||||");
	check("nor paints it as the row", `${still.fill}|${still.edge}`, "|");
	check("nor leaves it waiting at nothing", still.fade, "");
	check("the trigger is simply gone, as it always was", still.gone, "hidden");
	check("and untouched, as it always was", still.rowTouched, "||||");
	check("nothing lands afterwards", `${later.scale}|${later.motion}|${later.rowTouched}`, "||||||");
	window.matchMedia = realMatchMedia;

	// TRADE-OFF: measured in Chrome — a kit Button is transparent and its whole fill is on ::before
	render(null, host);
	open("enter-ghost");
	check("A BARE TRIGGER IS READ OFF ITS ::before, or the panel wears nothing of it", snap().fill, ROW_FILL);

	globalThis.getComputedStyle = realStyle;
	Element.prototype.getBoundingClientRect = wasRect;
	render(null, host);
}

// CONTEXT: the second placement — panel under the trigger, trigger still on screen
{
	const host = document.getElementById("host");
	render(null, host);

	const wasRect = Element.prototype.getBoundingClientRect;
	const box = (left, top, width, height) => ({
		left,
		top,
		width,
		height,
		right: left + width,
		bottom: top + height,
		x: left,
		y: top,
	});
	Element.prototype.getBoundingClientRect = function () {
		if (this.classList.contains("wg-kit-pop")) return box(0, 0, 240, 180);
		if (this.classList.contains("wg-kit-anchor")) return box(40, 60, 100, 40);
		return box(0, 0, 0, 0);
	};
	const realStyle = globalThis.getComputedStyle;
	globalThis.getComputedStyle = (node, pseudo) => ({
		...realStyle(node),
		borderRadius: pseudo ? "999px" : "0px",
		borderLeftWidth: "0px",
	});

	const pop = () => host.querySelector(".wg-kit-pop");
	const anchor = () => host.querySelector(".wg-kit-anchor");
	const show = async (open, placement) => {
		render(
			h(
				Kit.Popover,
				{ isOpen: open, placement, trigger: h("button", { className: "place-trigger" }, "T") },
				h(Kit.PopoverItem, {}, "Rename"),
			),
			host,
		);
		await settle();
	};

	await show(true, "over");
	check("the default placement still takes the trigger's place", pop().style.top, "60px");
	check("and the trigger still leaves for it", anchor().style.visibility, "hidden");
	check("it is not marked as the other placement", pop().classList.contains("is-below"), false);

	render(null, host);
	await show(true, "below");
	// CONTEXT: 60 top + 40 tall + the 6px gap the design draws
	check("BELOW puts the panel under the trigger", pop().style.top, "106px");
	check("and lines it up with the trigger's left edge", pop().style.left, "40px");
	check("THE TRIGGER STAYS ON SCREEN", anchor().style.visibility, "");
	check(
		"AND IS NEVER TOUCHED, whichever way the panel opens",
		`${host.querySelector(".place-trigger").style.scale}|${host.querySelector(".place-trigger").style.opacity}`,
		"|",
	);
	check("the panel says which placement it is, so a caller can style it", pop().classList.contains("is-below"), true);
	check("the trigger's width is handed to the CSS", pop().style.getPropertyValue("--wg-kit-anchor-width"), "100px");

	await show(false, "below");
	check(
		"the exit still folds back onto the trigger",
		/^translate\(40px, 60px\) scale\(0\.41/.test(pop().style.transform),
		true,
	);
	check("and the radius still travels with it", Math.round(parseFloat(pop().style.borderRadius)), 48);
	check("the trigger was never hidden, so there is nothing to give back", anchor().style.visibility, "");
	endExit(pop());
	await settle();
	check("and it closes", pop().classList.contains("is-open"), false);

	globalThis.getComputedStyle = realStyle;
	Element.prototype.getBoundingClientRect = wasRect;
	render(null, host);
}

// CONTEXT: widgets/@core/filter-panel builds this by hand today
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

	check(
		"the search field is the kit's own Field",
		Boolean(host.querySelector(".wg-kit-pop-search .wg-kit-field")),
		true,
	);
	check("with a search glyph in it", Boolean(host.querySelector(".wg-kit-pop-search .wg-kit-icon-glyph")), true);
	check("its placeholder is the caller's", host.querySelector("input").getAttribute("placeholder"), "Find a person");
	check(
		"the hint says what is being narrowed",
		host.querySelector(".wg-kit-pop-search-hint")?.textContent,
		"Narrows the choices below, not the board",
	);
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
				onMonthChange: (next) => {
					month = next;
					draw();
				},
				selected: new Date(2026, 8, 12),
				today: new Date(2026, 8, 3),
				onSelect: (date) => {
					picked = date;
				},
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
	check(
		"the days that belong to the neighbouring months say so",
		host.querySelectorAll(".wg-kit-cal-day.is-outside").length,
		12,
	);

	host.querySelectorAll(".wg-kit-cal-day")[8].dispatchEvent(new MouseEvent("click", { bubbles: true }));
	check(
		"pressing a day reports a real date",
		picked instanceof Date ? `${picked.getFullYear()}-${picked.getMonth()}-${picked.getDate()}` : picked,
		"2026-8-8",
	);

	host.querySelector('[aria-label="Next month"]').dispatchEvent(new MouseEvent("click", { bubbles: true }));
	await settle();
	check("the step moves the month", host.querySelector(".wg-kit-cal-month").textContent, "October 2026");
	host.querySelector('[aria-label="Previous month"]').dispatchEvent(new MouseEvent("click", { bubbles: true }));
	host.querySelector('[aria-label="Previous month"]').dispatchEvent(new MouseEvent("click", { bubbles: true }));
	await settle();
	check(
		"and back across the year without arithmetic bugs",
		host.querySelector(".wg-kit-cal-month").textContent,
		"August 2026",
	);

	month = new Date(2026, 8, 1);
	draw({ renderDay: (day) => (day.outside ? "" : (ROMAN[day.date.getDate()] ?? day.date.getDate())) });
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
		if (this.classList.contains("wg-kit-progress-track"))
			return { left: 100, top: 0, width: 200, height: 6, right: 300, bottom: 6, x: 100, y: 0 };
		return { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0, x: 0, y: 0 };
	};

	let value = 65;
	const draw = () =>
		render(
			h(Kit.Progress, {
				value,
				label: "Progress",
				onChange: (next) => {
					value = next;
					draw();
				},
			}),
			host,
		);
	draw();

	check(
		"the track carries the value so the plate reads at a glance",
		host.querySelector(".wg-kit-progress-fill").style.width,
		"65%",
	);
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

	const NOTE =
		"## Why one surface\n\nRead the same **frontmatter** and drew it three *different* ways.\n\n`properties: Status, Priority`\n\nSee [[Property anchoring]] #orbitask\n";
	let typed = null;
	render(
		h(Kit.MarkdownEditor, {
			value: NOTE,
			onInput: (next) => {
				typed = next;
			},
		}),
		host,
	);

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

	const NOTE =
		"## Why one surface\\n\\nThree widgets read the same **frontmatter** separately and drew the same status three *different* ways, which is a long enough sentence that it has to wrap more than once inside a narrow column.\\n\\nSee [[Property anchoring]] #orbitask\\n";
	const PROPS = [
		"fontFamily",
		"fontSize",
		"fontWeight",
		"fontStyle",
		"lineHeight",
		"letterSpacing",
		"wordSpacing",
		"paddingTop",
		"paddingRight",
		"paddingBottom",
		"paddingLeft",
		"borderTopWidth",
		"borderRightWidth",
		"borderBottomWidth",
		"borderLeftWidth",
		"whiteSpace",
		"overflowWrap",
		"wordBreak",
		"tabSize",
		"textIndent",
		"textTransform",
		"boxSizing",
		"direction",
	];
	const DESC =
		"a new note lands in Orbitask/Tasks and keeps the folder it came from, which is long enough to have to wrap over several lines inside a narrow panel";
	const UNBROKEN = "Averylongsettingnamenobodycanbreakanywhere";
	const UNBROKEN_PATH = "Orbitask/Tasks/Archive/Another-Very-Long-Folder-Segment-With-No-Spaces-At-All";

	// TRADE-OFF: the numbers the page is measured against are read off the source, never guessed at
	const KIT_SOURCE = readFileSync("src/kit.js", "utf8");
	const kitNumber = (name) => Number(new RegExp(`const ${name} = ([\\d.]+)`).exec(KIT_SOURCE)[1]);

	const entry = [
		'import { createElement as h } from "react";',
		'import { render } from "./src/engine/render.js";',
		'import { Button, Card, Icon, MarkdownEditor, List, Plate, Popover, PopoverItem, Row, RowLabel, RowValue, Sidebar, SidebarGroup, SidebarRow, SidebarSheet } from "./src/kit.js";',
		"const host = document.querySelector('.wg-root');",
		`render(h(MarkdownEditor, { value: "${NOTE}" }), host);`,
		"const mirror = host.querySelector('.wg-kit-md-mirror');",
		"const input = host.querySelector('.wg-kit-md-input');",
		"const page = host.querySelector('.wg-kit-md-page');",
		`const props = ${JSON.stringify(PROPS)};`,
		"const read = (node) => { const style = getComputedStyle(node); const out = {}; for (const name of props) out[name] = style[name]; return out; };",
		"const rect = (node) => { const box = node.getBoundingClientRect(); return { left: Math.round(box.left * 100) / 100, top: Math.round(box.top * 100) / 100, width: Math.round(box.width * 100) / 100, height: Math.round(box.height * 100) / 100 }; };",
		"const payload = { mirrorStyle: read(mirror), inputStyle: read(input), mirrorBox: rect(mirror), inputBox: rect(input), mirrorScroll: mirror.scrollHeight, inputScroll: input.scrollHeight, pageHeight: page.getBoundingClientRect().height, inputOverflow: getComputedStyle(input).overflowY, inputColour: getComputedStyle(input).color, inputCaret: getComputedStyle(input).caretColor };",
		"const sides = document.querySelector('.wg-sides');",
		"const rows = (prefix) => [1, 2, 3].map((n) => h(SidebarRow, { key: n, label: prefix + ' ' + n, value: 'v' }));",
		"render(h('div', null, [h(Sidebar, { key: 'full' }, h(SidebarGroup, { label: 'Group' }, rows('full'))), h(Sidebar, { key: 'lean', mode: 'minimal' }, h(SidebarGroup, {}, rows('lean'))), h(Sidebar, { key: 'glass', surface: 'glass' }, h(SidebarGroup, {}, rows('glass'))), h(SidebarSheet, { key: 'sheet' }, h(SidebarGroup, {}, rows('sheet'))), h(List, { key: 'bare' }, [1, 2, 3].map((n) => h(Row, { key: n }, h(RowLabel, null, 'bare ' + n))))]), sides);",
		"const frame = (node) => { const s = getComputedStyle(node); return { padding: s.paddingTop + ' ' + s.paddingLeft, radius: s.borderTopLeftRadius, background: s.backgroundColor, edge: s.boxShadow, gap: s.rowGap, blur: s.backdropFilter }; };",
		"const divider = (node) => getComputedStyle(node, '::after').content;",
		"const fullSide = sides.querySelector('.wg-kit-side:not(.is-minimal):not(.is-glass)');",
		"const leanSide = sides.querySelector('.wg-kit-side.is-minimal');",
		"const glassSide = sides.querySelector('.wg-kit-side.is-glass');",
		"const sheetSide = sides.querySelector('.wg-kit-sheet');",
		"const bareList = sides.querySelector('.wg-kit-list:not(.wg-kit-side-list)');",
		"payload.sidebar = { full: frame(fullSide), lean: frame(leanSide), glass: frame(glassSide), sheetIsSidebar: sheetSide.classList.contains('wg-kit-side'), sheet: frame(sheetSide), fullDivider: divider(fullSide.querySelectorAll('.wg-kit-side-row')[1]), leanDivider: divider(leanSide.querySelectorAll('.wg-kit-side-row')[1]), bareDivider: divider(bareList.querySelectorAll('.wg-kit-row')[1]), rowsAreSiblings: fullSide.querySelectorAll('.wg-kit-side-row + .wg-kit-side-row').length };",
		"const castOf = (node) => (getComputedStyle(node).boxShadow.split(/,(?![^(]*\\))/).map((part) => part.trim()).filter((part) => !part.includes('inset')));",
		"payload.sidebar.fullIsCard = fullSide.classList.contains('wg-kit-card') && fullSide.classList.contains('is-lifted');",
		"payload.sidebar.groupFill = getComputedStyle(fullSide.querySelector('.wg-kit-side-list')).backgroundColor;",
		"const cards = document.querySelector('.wg-cards');",
		"render(h('div', null, [h(Card, { key: 'tile' }, 'tile'), h(Card, { key: 'solid', variant: 'solid' }, 'solid'), h(Card, { key: 'lifted', lift: true }, 'lifted'), h(Plate, { key: 'plate' }, 'plate'), h(List, { key: 'list' }, h(Row, null, h(RowLabel, null, 'row'))), h(Button, { key: 'grey' }, 'grey')]), cards);",
		"const cardFrame = (node) => { const s = getComputedStyle(node); return { fill: s.backgroundColor, corner: s.borderTopLeftRadius, pad: s.paddingTop, edge: s.boxShadow, cast: castOf(node).filter((part) => part !== 'none').length }; };",
		"payload.cards = { tile: cardFrame(cards.querySelector('.wg-kit-card:not(.is-solid):not(.is-lifted)')), solid: cardFrame(cards.querySelector('.wg-kit-card.is-solid:not(.wg-kit-plate):not(.wg-kit-list)')), lifted: cardFrame(cards.querySelector('.wg-kit-card.is-lifted')), plate: cardFrame(cards.querySelector('.wg-kit-plate')), list: cardFrame(cards.querySelector('.wg-kit-list')), greyControl: getComputedStyle(cards.querySelector('.wg-kit-btn'), '::before').backgroundColor };",
		"const onGround = (host) => ({ ground: getComputedStyle(host).backgroundColor, cast: castOf(host.querySelector('.wg-kit-side')) });",
		"for (const theme of ['light', 'dark']) { const host = document.querySelector('.wg-ground-' + theme); render(h(Sidebar, null, h(SidebarGroup, {}, rows(theme))), host); }",
		"payload.lift = { light: onGround(document.querySelector('.wg-ground-light')), dark: onGround(document.querySelector('.wg-ground-dark')) };",
		"const picked = document.querySelector('.wg-picked');",
		"const pickedRow = (key, extra) => h(SidebarRow, { key, label: 'row ' + key, value: 'v', ...extra });",
		"render(h(Sidebar, null, h(SidebarGroup, {}, [pickedRow(1, {}), pickedRow(2, { selected: true }), pickedRow(3, { unset: true, selected: true }), pickedRow(4, { unset: true })])), picked);",
		"const pickedRows = [...picked.querySelectorAll('.wg-kit-side-row')];",
		"const labelOf = (node) => { const s = getComputedStyle(node.querySelector('.wg-kit-row-label')); return s.fontWeight + ' ' + s.color; };",
		"payload.picked = { marks: pickedRows.map((node) => node.getAttribute('aria-current')), states: pickedRows.map((node) => node.classList.contains('is-selected')), washes: pickedRows.map((node) => getComputedStyle(node, '::before').backgroundColor), labels: pickedRows.map(labelOf) };",
		"const heights = document.querySelector('.wg-heights');",
		"const tallRow = (key, extra) => h(SidebarRow, { key, label: 'row ' + key, value: 'v', ...extra });",
		"const heightPair = (mode) => h(Sidebar, { key: mode, mode }, h(SidebarGroup, {}, [tallRow(mode + '-icon', { icon: h(Icon, { name: 'search' }) }), tallRow(mode + '-bare', {})]));",
		"render(h('div', null, [heightPair('full'), heightPair('minimal')]), heights);",
		"const heightsOf = (side) => [...heights.querySelectorAll(side + ' .wg-kit-side-row')].map((node) => Math.round(node.getBoundingClientRect().height * 100) / 100);",
		"payload.rowHeights = { full: heightsOf('.wg-kit-side:not(.is-minimal)'), lean: heightsOf('.wg-kit-side.is-minimal') };",
		"const builtRow = heights.querySelector('.wg-kit-side:not(.is-minimal) .wg-kit-side-row');",
		"const builtStyle = getComputedStyle(builtRow);",
		"payload.rowBuild = { tile: Math.round(builtRow.querySelector('.wg-kit-side-icon').getBoundingClientRect().height), top: Math.round(parseFloat(builtStyle.paddingTop)), bottom: Math.round(parseFloat(builtStyle.paddingBottom)) };",
		`const DESC = ${JSON.stringify(DESC)};`,
		`const UNBROKEN = ${JSON.stringify(UNBROKEN)}; const UNBROKEN_PATH = ${JSON.stringify(UNBROKEN_PATH)};`,
		"const two = document.querySelector('.wg-two');",
		"const twoPair = (mode) => h(Sidebar, { key: mode, mode }, h(SidebarGroup, {}, [h(SidebarRow, { key: 'bare', label: 'Create', value: 'On' }), h(SidebarRow, { key: 'sub', label: 'Create', sub: DESC, value: 'On' }), h(SidebarRow, { key: 'long', label: UNBROKEN, sub: UNBROKEN_PATH, value: 'On' })]));",
		"render(h('div', null, [twoPair('full'), twoPair('minimal')]), two);",
		"const round = (n) => Math.round(n * 100) / 100;",
		"const rectOf = (node) => { const b = node.getBoundingClientRect(); return { top: round(b.top), bottom: round(b.bottom), left: round(b.left), right: round(b.right), height: round(b.height) }; };",
		"const nameRect = (label) => { const range = document.createRange(); range.selectNodeContents(label.firstChild); const b = range.getBoundingClientRect(); return { top: round(b.top), bottom: round(b.bottom), right: round(b.right), height: round(b.height) }; };",
		"const readTwo = (side) => { const rows = [...two.querySelectorAll(side + ' .wg-kit-side-row')]; const [bare, sub] = rows; const label = sub.querySelector('.wg-kit-row-label'); const note = sub.querySelector('.wg-kit-side-sub'); const pad = (row) => { const s = getComputedStyle(row); return round(parseFloat(s.paddingTop)) + ' ' + round(parseFloat(s.paddingBottom)); }; return { bareHeight: round(bare.getBoundingClientRect().height), subHeight: round(sub.getBoundingClientRect().height), barePad: pad(bare), subPad: pad(sub), name: nameRect(label), note: rectOf(note), noteLine: round(parseFloat(getComputedStyle(note).lineHeight)), noteColour: getComputedStyle(note).color, nameColour: getComputedStyle(label).color, noteFont: getComputedStyle(note).fontSize, labelFits: label.scrollWidth <= label.clientWidth + 1 && label.scrollHeight <= label.clientHeight + 1, noteFits: note.scrollWidth <= note.clientWidth + 1, noteText: note.textContent, isTwo: sub.classList.contains('is-two'), bareIsTwo: bare.classList.contains('is-two'), bareValue: round(bare.querySelector('.wg-kit-side-value').getBoundingClientRect().right), subValue: round(sub.querySelector('.wg-kit-side-value').getBoundingClientRect().right) }; };",
		"const swatch = document.createElement('span'); swatch.style.color = 'var(--text-faint)'; two.appendChild(swatch);",
		"const panel = document.querySelector('.wg-panel');",
		"render(h(Sidebar, { className: 'wg-set-panel' }, h(SidebarGroup, { className: 'wg-set-group' }, h(Row, { className: 'wg-set-row' }, [h(RowLabel, { className: 'wg-set-two', key: 'label' }, ['Create', h('span', { className: 'wg-set-sub', key: 'sub' }, DESC)]), h(RowValue, { className: 'wg-set-value', key: 'value' }, 'On')]))), panel);",
		"const panelLong = document.querySelector('.wg-panel-long');",
		"render(h(Sidebar, { className: 'wg-set-panel' }, h(SidebarGroup, { className: 'wg-set-group' }, h(Row, { className: 'wg-set-row' }, [h(RowLabel, { className: 'wg-set-two', key: 'label' }, [UNBROKEN, h('span', { className: 'wg-set-sub', key: 'sub' }, UNBROKEN_PATH)]), h(RowValue, { className: 'wg-set-value', key: 'value' }, 'On')]))), panelLong);",
		"{ const row = panel.querySelector('.wg-set-row'); const label = panel.querySelector('.wg-set-two'); const note = panel.querySelector('.wg-set-sub'); payload.setTwo = { height: round(row.getBoundingClientRect().height), name: nameRect(label), note: rectOf(note), noteOver: round(rectOf(note).right - label.getBoundingClientRect().right), noteLine: round(parseFloat(getComputedStyle(note).lineHeight)), fits: label.scrollWidth <= label.clientWidth + 1, valueRight: round(panel.querySelector('.wg-set-value').getBoundingClientRect().right), rowRight: round(row.getBoundingClientRect().right) }; }",
		"{ const label = panelLong.querySelector('.wg-set-two'); const row = panelLong.querySelector('.wg-set-row'); payload.setLong = { nameOver: round(nameRect(label).right - label.getBoundingClientRect().right), valueRight: round(panelLong.querySelector('.wg-set-value').getBoundingClientRect().right), rowRight: round(row.getBoundingClientRect().right) }; }",
		"const unbroken = (side) => { const row = [...two.querySelectorAll(side + ' .wg-kit-side-row')][2]; const label = row.querySelector('.wg-kit-row-label'); const note = row.querySelector('.wg-kit-side-sub'); const edge = round(label.getBoundingClientRect().right); return { nameOver: round(nameRect(label).right - edge), noteOver: round(rectOf(note).right - edge), valueRight: round(row.querySelector('.wg-kit-side-value').getBoundingClientRect().right), rowRight: round(row.getBoundingClientRect().right) }; };",
		"payload.twoLine = { full: readTwo('.wg-kit-side:not(.is-minimal)'), lean: readTwo('.wg-kit-side.is-minimal'), unbroken: unbroken('.wg-kit-side:not(.is-minimal)'), faint: getComputedStyle(swatch).color };",
		"const pops = document.querySelector('.wg-pops');",
		"const stamp = (node) => { const r = node.getBoundingClientRect(); const to = (n) => Math.round(n * 100) / 100; return to(r.width) + 'x' + to(r.height) + '@' + to(r.left) + ',' + to(r.top); };",
		// TRADE-OFF: a WIDE trigger, because a narrow one hides a seed measured before the width floor lands
		"render(h(Sidebar, null, h(SidebarGroup, null, h(Popover, { isOpen: true, trigger: h(SidebarRow, { pressable: true, label: 'A settings row', value: 'Something' }) }, h(PopoverItem, {}, 'Rename')))), pops);",
		"const wideTrigger = pops.querySelector('.wg-kit-side-row');",
		"const widePanel = pops.querySelector('.wg-kit-pop');",
		// CONTEXT: the seat is written in the layout effect, so frame zero is readable the moment render returns
		"payload.popSeam = { trigger: stamp(wideTrigger), panel: stamp(widePanel), seed: widePanel.style.scale, origin: widePanel.style.transformOrigin };",
		// TRADE-OFF: a SECOND panel, never measured before the frames run — a rect read would flush its seat for it
		"const pops2 = document.querySelector('.wg-pops2');",
		"const realFrame = window.requestAnimationFrame; const realTimer = window.setTimeout;",
		"const frames = []; const timers = [];",
		"window.requestAnimationFrame = (fn) => frames.push(fn); window.setTimeout = (fn, ms) => timers.push({ fn, ms });",
		"render(h(Popover, { isOpen: true, trigger: h(Button, null, 'Trigger') }, h(PopoverItem, {}, 'Rename')), pops2);",
		"const popTrigger = pops2.querySelector('.wg-kit-btn');",
		"const popPanel = pops2.querySelector('.wg-kit-pop');",
		// CONTEXT: an inline read, never a rect — a rect here would flush the seat and hide a missing commit
		"payload.popSeed = popPanel.style.scale;",
		// CONTEXT: an assigned value gives an EMPTY list here; only a curve that actually started is listed
		"const runningOn = (node) => node.getAnimations().map((anim) => (anim.transitionProperty || anim.animationName) + ':' + anim.playState).sort();",
		"for (let round = 0; round < 4 && frames.length; round += 1) { for (const fn of frames.splice(0, frames.length)) fn(0); }",
		"void getComputedStyle(popPanel).opacity;",
		"payload.popGrow = { panel: runningOn(popPanel), trigger: runningOn(popTrigger), touched: popTrigger.style.scale + '|' + popTrigger.style.opacity + '|' + popTrigger.style.transform, seed: popPanel.style.scale, pinned: popPanel.style.width + '|' + popPanel.style.height + '|' + popPanel.style.translate };",
		"const bloom = popPanel.getAnimations().find((anim) => anim.animationName === 'wg-kit-pop-bloom');",
		// CONTEXT: the clock is frozen, so the growth is seeked by hand — the peak is read, never assumed
		"const at = (part) => { bloom.currentTime = part * bloom.effect.getTiming().duration; void getComputedStyle(popPanel).scale; return getComputedStyle(popPanel).scale; };",
		"payload.popCurve = bloom ? { start: at(0), peak: at(0.6), rest: at(1), span: bloom.effect.getTiming().duration } : null;",
		"window.requestAnimationFrame = realFrame; window.setTimeout = realTimer;",
		"document.getElementById('wg-measure').textContent = JSON.stringify(payload);",
	].join("\n");

	const built = await esbuild.build({
		stdin: { contents: entry, resolveDir: process.cwd(), sourcefile: "mirror-page.js", loader: "js" },
		bundle: true,
		loader: TEXT_LOADERS,
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
		`<!doctype html><html><head><meta charset="utf-8"><style>${readFileSync("styles.css", "utf8")}</style>` +
			`<style>:root { --text-normal: #222; --text-muted: #707070; --text-faint: #ababab; --background-primary: #fff; --interactive-accent: #6d4ee0; --font-interface: -apple-system, "Segoe UI", sans-serif; --font-ui-small: 14px; --size-4-4: 16px; }` +
			`body { margin: 0; } .wg-root { width: 380px; }</style>` +
			`</head><body><div class="wg-root"></div><div class="wg-root wg-sides" style="width:300px"></div>` +
			`<div class="wg-root wg-ground-light" style="width:300px;padding:20px;background:var(--wg-kit-raise)"></div>` +
			`<div class="wg-root wg-ground-dark" style="width:300px;padding:20px;background:var(--wg-kit-raise);--background-primary:#1e1e1e;--text-normal:#dadada"></div>` +
			`<div class="wg-root wg-picked" style="width:300px"></div>` +
			`<div class="wg-root wg-heights" style="width:300px"></div>` +
			`<div class="wg-root wg-two" style="width:300px"></div>` +
			`<div class="wg-root wg-panel" style="width:300px"></div>` +
			`<div class="wg-root wg-panel-long" style="width:300px"></div>` +
			`<div class="wg-root wg-pops" style="width:300px"></div>` +
			`<div class="wg-root wg-pops2" style="width:300px"></div>` +
			`<div class="wg-root wg-cards" style="width:300px"></div>` +
			`<script id="wg-measure" type="application/json"></script>` +
			`<script>window.__errs = []; addEventListener("error", (e) => { window.__errs.push(e.message + " @ " + e.lineno); document.getElementById("wg-measure").textContent = JSON.stringify({ pageError: window.__errs }); });</script>` +
			`<script>${built.outputFiles[0].text}</script></body></html>`,
	);

	const dumped = execFileSync(
		browser,
		[
			"--headless",
			"--disable-gpu",
			"--no-sandbox",
			"--hide-scrollbars",
			"--virtual-time-budget=4000",
			"--dump-dom",
			`file://${file}`,
		],
		{
			encoding: "utf8",
			maxBuffer: 64 * 1024 * 1024,
			stdio: ["ignore", "pipe", process.env.WG_DEBUG ? "inherit" : "ignore"],
		},
	);
	const raw = dumped.match(/<script id="wg-measure" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
	if (!raw) {
		console.error(`mirror gate: the page never reported — file://${file}`);
		process.exit(1);
	}
	// CONTEXT: React 19 reports a render failure as a window error event, not a throw
	const broke = JSON.parse(raw.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")).pageError;
	if (broke) {
		for (const message of broke) console.error(`mirror gate: ${message}`);
		console.error(`mirror gate: file://${file}`);
		process.exit(1);
	}
	const measured = JSON.parse(raw.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));

	const drifted = PROPS.filter((name) => measured.mirrorStyle[name] !== measured.inputStyle[name]);
	check(
		"EVERY METRIC MATCHES, or the characters separate",
		drifted.map((name) => `${name} ${measured.mirrorStyle[name]} vs ${measured.inputStyle[name]}`).join(" | ") || 0,
		0,
	);
	check(
		"the two boxes sit exactly on each other",
		JSON.stringify(measured.inputBox),
		JSON.stringify(measured.mirrorBox),
	);
	check("AND WRAP AT THE SAME POINTS", measured.inputScroll, measured.mirrorScroll);
	// TRADE-OFF: one scroller, so there is no pair of scroll offsets to keep in step
	check("the textarea never scrolls on its own", measured.inputOverflow, "hidden");
	check("a trailing newline still has a line to sit on", measured.pageHeight >= measured.inputScroll, true);
	check("the typed text is invisible, because the mirror is what is read", measured.inputColour, "rgba(0, 0, 0, 0)");
	check("but the caret is not", measured.inputCaret === "rgba(0, 0, 0, 0)", false);

	// CONTEXT: measured — the settings panel and the properties plate are both 8px-padded edged blocks
	const { full, lean, glass, sheet, sheetIsSidebar, fullDivider, leanDivider, bareDivider, rowsAreSiblings } =
		measured.sidebar;
	console.log(`   a full sidebar: padding ${full.padding} · radius ${full.radius} · ${full.background} · ${full.edge}`);
	check("a sidebar pads itself the way a plate does", full.padding, "8px 8px");
	check("and carries the plate's corner", full.radius, "14px");
	check("it is a surface, not a hole in one", /^rgba\(0, 0, 0, 0\)$/.test(full.background), false);
	// CONTEXT: one lift under every sidebar, no rim around any — the edge is a shadow, never an inset ring
	check("and it ends with a lift, not a rim", /inset/.test(full.edge), false);
	check("and the lift is really there", full.edge !== "none" && full.edge !== "", true);

	// CONTEXT: minimal used to clear the frame because a Plate wrapped it — the block, spelled twice
	const frameOf = (side) => `${side.padding} | ${side.radius} | ${side.background} | ${side.edge}`;
	console.log(
		`   a minimal sidebar: padding ${lean.padding} · radius ${lean.radius} · gap ${lean.gap} against the full one's ${full.gap}`,
	);
	check("a minimal sidebar is the SAME block", frameOf(lean), frameOf(full));
	check("and differs only in how tight it is", parseFloat(lean.gap) < parseFloat(full.gap), true);

	// CONTEXT: glass is what the block is MADE OF — the playground panel floats over a board
	console.log(`   a glass sidebar: ${glass.background} · ${glass.blur} · ${glass.edge}`);
	check(
		"a glass sidebar keeps the block's padding and corner",
		`${glass.padding} | ${glass.radius}`,
		`${full.padding} | ${full.radius}`,
	);
	check(
		"it is blurred, because it floats over something",
		/blur\(/.test(glass.blur) && /saturate/.test(glass.blur),
		true,
	);
	// CONTEXT: a sidebar is READ — the thin chrome tint showed the board through every row of it
	check(
		"its fill is dense enough to read on",
		Number(/\/\s*([\d.]+)\s*\)/.exec(glass.background)?.[1] ?? 1) >= 0.9,
		true,
	);
	check(
		"and it still casts the lift",
		glass.edge.split(/,(?![^(]*\))/).filter((part) => !part.includes("inset")).length > 0,
		true,
	);

	// CONTEXT: a sheet is a sidebar that follows the finger, so it wears the block, not a copy
	check("a sheet IS a sidebar", sheetIsSidebar, true);
	check("so it carries the same block", frameOf(sheet), frameOf(full));

	// THE BLOCK IS ONE COMPONENT NOW, so the pieces built on it must be MADE of it and not merely
	// resemble it — a plate, a grouped list and a panel were the same rules written out four times.
	const cardSeen = measured.cards;
	console.log(
		`   a tile ${cardSeen.tile.fill} · a solid card ${cardSeen.solid.fill} · a neutral control ${cardSeen.greyControl}`,
	);
	check("the sidebar wears the card, it does not merely look like one", measured.sidebar.fullIsCard, true);
	check("a solid card is the grey a neutral control is filled with", cardSeen.solid.fill, cardSeen.greyControl);
	check("and being a well, it carries no edge and no cast", `${cardSeen.solid.edge} ${cardSeen.solid.cast}`, "none 0");
	check(
		"a plain light card carries no edge — the lift is the only thing that draws one",
		`${cardSeen.tile.edge} | ${/inset/.test(cardSeen.lifted.edge)}`,
		"none | true",
	);
	check("but it does not float unless it is asked to", cardSeen.tile.cast, 0);
	check("asked, it casts", cardSeen.lifted.cast > 0, true);
	// CONTEXT: the lift is the ONLY difference — a variant that also moved the fill would be a second block
	check(
		"and the lift is the only thing it changes",
		`${cardSeen.lifted.fill} ${cardSeen.lifted.corner} ${cardSeen.lifted.pad}`,
		`${cardSeen.tile.fill} ${cardSeen.tile.corner} ${cardSeen.tile.pad}`,
	);
	check(
		"a plate is that solid card, at the plate's own size",
		`${cardSeen.plate.fill} ${cardSeen.plate.edge}`,
		`${cardSeen.solid.fill} ${cardSeen.solid.edge}`,
	);
	check(
		"and a grouped list is one with no padding of its own",
		`${cardSeen.list.fill} ${cardSeen.list.pad}`,
		`${cardSeen.solid.fill} 0px`,
	);
	// MEASURED: the group inside a panel steps toward the INK, the plain list steps off the page —
	// the two greys are near neighbours but not one colour, so the card cannot be told they are
	check(
		"a sidebar group's grey is its own, not the plain list's",
		cardSeen.list.fill === measured.sidebar.groupFill,
		false,
	);

	// CONTEXT: the row being edited is a sidebar state, not a look each screen paints for itself
	const { marks, states, washes, labels } = measured.picked;
	console.log(`   a picked row: ${washes[1]} against ${washes[0]} · ${labels[1]}`);
	check("a row nobody picked carries no mark", marks, [null, "true", "true", null]);
	check("and the kit's own state is what says which", states, [false, true, true, false]);
	check(
		"the picked row is washed, the others are not",
		`${washes[0] === washes[3]} ${washes[0] !== washes[1]}`,
		"true true",
	);
	check("its wash is a step on the group, not a hole", /^rgba\(0, 0, 0, 0\)$/.test(washes[1]), false);
	check("its label steps up out of the list", labels[0] === labels[1], false);
	// CONTEXT: picking an empty row must not make it read as filled
	check("an unset row stays unset when it is the one picked", labels[2], labels[3]);

	// A ROW'S HEIGHT IS THE COMPONENT'S, NOT A COUNT OF WHAT THE CALLER PUT IN IT. Two lists of
	// the same rows read as two different components the moment one of them carries icons.
	console.log(
		`   a full row: ${measured.rowHeights.full.join(" / ")}px · a minimal one: ${measured.rowHeights.lean.join(" / ")}px`,
	);
	check(
		"A SIDEBAR ROW IS THE SAME HEIGHT WITH AN ICON AND WITHOUT ONE",
		measured.rowHeights.full[0],
		measured.rowHeights.full[1],
	);
	check("and it is the height the settings panel already draws", measured.rowHeights.full[0], 40);
	// CONTEXT: the two are only the same height because the ROW ADDS UP to it — a min-height cannot
	// shrink a tile, so a number that does not match the build leaves the icon rows behind
	const rowBuild = measured.rowBuild;
	console.log(`   built from: ${rowBuild.top} + ${rowBuild.tile} tile + ${rowBuild.bottom}`);
	check(
		"the tile and the row's padding add up to that height",
		rowBuild.top + rowBuild.tile + rowBuild.bottom,
		measured.rowHeights.full[0],
	);
	check("the minimal row keeps its own, shorter height", measured.rowHeights.lean.join(" "), "34 34");

	// CONTEXT: that floor is not a ceiling — a row with a description grows by the lines it wraps to
	for (const [mode, floor] of [
		["full", 40],
		["lean", 34],
	]) {
		const seen = measured.twoLine[mode];
		console.log(
			`   a ${mode} two-line row: ${seen.bareHeight} -> ${seen.subHeight}px · note ${seen.note.height}px over ${seen.noteLine}px lines · ${seen.noteColour}`,
		);
		check(`a ${mode} row with a name only keeps the floor`, seen.bareHeight, floor);
		check(
			`${mode}: only the row with a description is marked two-line`,
			`${seen.bareIsTwo} ${seen.isTwo}`,
			"false true",
		);
		check(`a ${mode} row with a description is taller than that`, seen.subHeight > seen.bareHeight, true);
		const [padTop, padBottom] = seen.subPad.split(" ").map(Number);
		check(
			`${mode}: its height IS the two lines plus the padding`,
			Math.round(seen.subHeight),
			Math.round(padTop + padBottom + seen.name.height + 1 + seen.note.height),
		);
		check(`${mode}: the note really did wrap`, seen.note.height > seen.noteLine * 1.5, true);
		check(`${mode}: the name and the note are not on the same line`, seen.note.top >= seen.name.bottom, true);
		check(`${mode}: nothing is clipped, so no ellipsis is drawn`, `${seen.labelFits} ${seen.noteFits}`, "true true");
		check(`${mode}: the note is the whole sentence`, seen.noteText, DESC);
		check(
			`${mode}: the note is muted and the name is not`,
			`${seen.noteColour === measured.twoLine.faint} ${seen.nameColour === seen.noteColour}`,
			"true false",
		);
		check(`${mode}: and it is the smaller type`, seen.noteFont, "11px");
		// TRADE-OFF: the value is centred, not first-line aligned — it answers the row, not the name
		check(`${mode}: the value still ends hard right`, seen.subValue, seen.bareValue);
	}
	// CONTEXT: full pads 8/8 already, so only the minimal row has to find room it never had
	check(
		"a full row needs no extra padding to hold two lines",
		measured.twoLine.full.subPad,
		measured.twoLine.full.barePad,
	);
	check(
		"the minimal row finds the room it had none of",
		`${measured.twoLine.lean.barePad} -> ${measured.twoLine.lean.subPad}`,
		"0 0 -> 8 8",
	);

	// CONTEXT: a folder path and a long setting name have no space to break at
	const unbroken = measured.twoLine.unbroken;
	console.log(
		`   unbroken text runs past its label by ${unbroken.nameOver}px (name) and ${unbroken.noteOver}px (path)`,
	);
	check("a name that cannot break anywhere still fits its row", unbroken.nameOver <= 1, true);
	check("and so does a path with no spaces in it", unbroken.noteOver <= 1, true);
	check("neither pushes the value off the row", unbroken.valueRight < unbroken.rowRight, true);

	// CONTEXT: the settings panel spells its own two-line row, and its rule hung off a class nothing emits
	const setTwo = measured.setTwo;
	console.log(
		`   a settings two-line row: ${setTwo.height}px · note ${setTwo.note.height}px · value ends at ${setTwo.valueRight} of ${setTwo.rowRight}`,
	);
	check("the settings panel's description sits under its name too", setTwo.note.top >= setTwo.name.bottom, true);
	check("and that row grew to hold it", setTwo.height > 40, true);
	check("its description does not run past the label either", setTwo.noteOver <= 1, true);
	check(
		"and it wraps over several lines rather than being cut at one",
		setTwo.note.height > setTwo.noteLine * 1.5,
		true,
	);
	check("and its value did not get pushed off the row", setTwo.valueRight < setTwo.rowRight, true);
	console.log(`   the settings unbroken name runs past its label by ${measured.setLong.nameOver}px`);
	check("a settings name that cannot break still fits its row", measured.setLong.nameOver <= 1, true);
	check("and its value stays on the row too", measured.setLong.valueRight < measured.setLong.rowRight, true);

	// TRADE-OFF: getAnimations is the only thing that tells a RUNNING curve from an assigned value
	const seam = measured.popSeam ?? {};
	const grow = measured.popGrow ?? {};
	const curve = measured.popCurve ?? {};
	console.log(`   frame zero: trigger ${seam.trigger} · panel ${seam.panel} · seed ${seam.seed} about ${seam.origin}`);
	console.log(`   running: panel [${grow.panel}] trigger [${grow.trigger}]`);
	console.log(`   seeked: ${curve.start} -> ${curve.peak} -> ${curve.rest} over ${curve.span}ms`);
	check("NO SIZE STEP AT FRAME ZERO: the panel IS the trigger's rendered rect", seam.panel, seam.trigger);
	// CONTEXT: this trigger is wider than the panel's 200px floor, so a stale measurement shows up here
	check("even where the trigger is what sets the panel's width", Number(seam.trigger.split("x")[0]) > 200, true);
	check(
		"THE GROWTH REALLY RUNS — an assigned value would list nothing",
		grow.panel.includes("wg-kit-pop-bloom:running"),
		true,
	);
	check(
		"and the paint really interpolates, it does not jump",
		`${grow.panel.some((one) => one.startsWith("background-color"))} ${grow.panel.some((one) => one.startsWith("border-top-left-radius"))}`,
		"true true",
	);
	check(
		"THE TRIGGER HAS NOTHING RUNNING ON IT, and nothing written to it",
		`${grow.trigger.length} ${grow.touched}`,
		"0 ||",
	);
	check("SCALING IS THE ONLY THING THAT MOVES: no box, no position", grow.pinned, "||");
	// CONTEXT: seeked by hand, because the clock is frozen — these are the values the eye would get
	check("SEEKED IN THE BROWSER, THE GROWTH STARTS AT THE SEED", curve.start, measured.popSeed);
	check("PEAKS AT 105% ON BOTH AXES", curve.peak, "1.05");
	check("and rests at exactly 1", curve.rest, "1");
	check("over the span the source names", curve.span, kitNumber("GROW_MS"));

	check("the rows really are adjacent, so a divider could be drawn", rowsAreSiblings, 2);
	check("a sidebar group draws no line between its rows", fullDivider, "none");
	check("nor does the minimal one", leanDivider, "none");
	check("a plain kit list still separates its rows", bareDivider, '""');

	// CONTEXT: measured — a fixed black shadow moves a dark ground by 3 of 255, which is no separation at all
	check("the sidebar casts something, not only its inset edge", measured.lift.light.cast.length > 0, true);

	// THE LIFT IS JUDGED IN PIXELS, because the number that was gated on before — the alpha times
	// the shadow colour's distance from the ground — is not a quantity anybody can see. It read 11
	// while the rendered edge moved 13 of 255, and 13 is what the person looking at it called
	// invisible. So: render the block on its real ground, shoot at scale 1, walk the column down
	// from its bottom edge.
	//
	// AND IT IS JUDGED IN L*, not in raw luma, because the two grounds are 255 and 57 apart and
	// the same raw step means nothing alike on them: the dark halo moves 18 of 57, which by ratio
	// would read as loud as Material's, and by eye is quiet. L* is the scale on which an equal
	// step is an equal amount of visible, so one pair of bounds can hold for both grounds.
	//
	// MEASURED IN THIS SAME PROBE, as dL*:
	//   tailwind sm 3.1 · the old 3/5% lift 4.5 light and 3.6 dark   ← reported as nothing
	//   tailwind DEFAULT 7.7 · md 10.5 · lg 11.2 · an iOS notification stack 11.2   ← plainly there
	//   material elevation 1 28.9   ← a drawn shadow, a shape you look at
	// FLOOR: under the weakest shadow anyone ships as visible, over what a person called invisible.
	// CEILING: clear of the loudest soft reference, nowhere near a drawn one.
	// REACH: lg spreads 20px, the iOS stack 25px — past that it stops being a halo under the block.
	const LIFT_SEEN = 7;
	const LIFT_SHOUTS = 18;
	const LIFT_REACH_PX = 32;
	// CONTEXT: ink is the summed dL* down the column — the peak says a lift is there, the ink how loud
	// CONTEXT: verdicts on the light ground — 17 "cannot see it", 59 "still pulls the eye", 71 "too strong"
	const LIFT_INK_SEEN = 22;
	const LIFT_INK_SHOUTS = 50;
	const lightness = (luma) => {
		const channel = luma / 255;
		const linear = channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
		return linear > 0.008856 ? 116 * Math.cbrt(linear) - 16 : 903.3 * linear;
	};
	const BLOCK = { left: 60, width: 200, height: 120, slot: 300, top: 60 };
	const GROUNDS = {
		light: "--background-primary:#ffffff;--text-normal:#222222;",
		dark: "--background-primary:#1e1e1e;--text-normal:#dadada;",
	};
	// CONTEXT: the panel is a glass sidebar, so the surface it is made of is shot on the same grounds
	const SURFACES = { solid: undefined, glass: "glass" };
	const SLOTS = Object.keys(GROUNDS).flatMap((theme) => Object.keys(SURFACES).map((surface) => ({ theme, surface })));
	const pageHeight = BLOCK.top + SLOTS.length * BLOCK.slot;
	const liftFile = nodePath.join(work, "lift.html");
	writeFileSync(
		liftFile,
		`<!doctype html><html><head><meta charset="utf-8"><style>${readFileSync("styles.css", "utf8")}</style>` +
			`<style>html, body { margin: 0; padding: 0; } body { width: 400px; height: ${pageHeight}px; }` +
			`.wg-ground { position: absolute; left: 0; width: 400px; height: ${BLOCK.slot}px; background: var(--wg-kit-raise); }` +
			`.wg-ground .wg-kit-side { position: absolute; left: ${BLOCK.left}px; top: ${BLOCK.top}px; width: ${BLOCK.width}px; height: ${BLOCK.height}px; }</style>` +
			`</head><body>` +
			// CONTEXT: a custom property is computed where it is declared, so the ground carries BOTH
			// the theme and .wg-root — on body, --wg-kit-raise would resolve once, against nothing
			SLOTS.map(
				({ theme, surface }, at) =>
					`<div class="wg-root wg-ground" style="top:${at * BLOCK.slot}px;${GROUNDS[theme]}"><div class="${sidebarClass({ surface: SURFACES[surface] })}"></div></div>`,
			).join("") +
			`</body></html>`,
	);
	const liftPng = nodePath.join(work, "lift.png");
	execFileSync(
		browser,
		[
			"--headless",
			"--disable-gpu",
			"--no-sandbox",
			"--hide-scrollbars",
			"--force-device-scale-factor=1",
			`--window-size=400,${pageHeight}`,
			"--virtual-time-budget=4000",
			`--screenshot=${liftPng}`,
			`file://${liftFile}`,
		],
		{ stdio: "ignore" },
	);

	for (const [at, slot] of SLOTS.entries()) {
		const theme = `${slot.surface} sidebar on a ${slot.theme}`;
		const edge = at * BLOCK.slot + BLOCK.top + BLOCK.height;
		const column = JSON.parse(
			execFileSync(
				"/usr/bin/python3",
				["tools/png-column.py", liftPng, String(BLOCK.left + 100), String(edge), String(edge + 80)],
				{ encoding: "utf8" },
			),
		);
		const ground = column[column.length - 1];
		const extreme = column.reduce(
			(far, value) => (Math.abs(value - ground) > Math.abs(far - ground) ? value : far),
			ground,
		);
		const step = Math.round((extreme - ground) * 10) / 10;
		const seen = Math.round(Math.abs(lightness(extreme) - lightness(ground)) * 10) / 10;
		const reach = column.findIndex((value) => Math.abs(value - ground) < 0.5);
		const ink = Math.round(column.reduce((sum, value) => sum + Math.abs(lightness(value) - lightness(ground)), 0));
		console.log(
			`   the lift on a ${theme} ground: ${ground} → ${extreme}, a step of ${step} — ${seen} of L* — over ${reach}px — ${ink} of ink`,
		);
		check(`${theme}: the lift is there to be seen, not merely present`, seen >= LIFT_SEEN, true);
		check(`${theme}: and it never shouts — it is separation, not elevation`, seen <= LIFT_SHOUTS, true);
		check(`${theme}: it stays a halo under the block, not a band beside it`, reach > 0 && reach <= LIFT_REACH_PX, true);
		check(`${theme}: it underlines the block rather than being a thing of its own`, ink <= LIFT_INK_SHOUTS, true);
		check(`${theme}: and there is enough of it to underline anything`, ink >= LIFT_INK_SEEN, true);
	}
}

// ── the sheet: a sidebar that follows the finger ─────────────────────────────────────────
{
	const stage = dom.window.document.createElement("div");
	dom.window.document.body.appendChild(stage);
	let open = false;
	const draw = () =>
		render(
			h(
				Kit.SidebarSheet,
				{
					isOpen: open,
					onOpen: (next) => {
						open = next;
						draw();
					},
					peekPx: 100,
					maxPx: 500,
				},
				"body",
			),
			stage,
		);
	draw();

	const sheet = () => stage.querySelector(".wg-kit-sheet");
	const grip = () => stage.querySelector(".wg-kit-sheet-grip");
	// CONTEXT: preact commits a state change on a microtask, so a drag is read one tick later
	const at = async (type, clientY) => {
		grip().dispatchEvent(new dom.window.MouseEvent(type, { bubbles: true, clientY }));
		await new Promise((resolve) => setTimeout(resolve, 0));
	};

	check("a sheet rests at its peek height", sheet().style.height, "100px");
	await at("pointerdown", 500);
	await at("pointermove", 400);
	check("dragging it up follows the pointer", sheet().style.height, "200px");
	check("and it does not animate while a finger is on it", sheet().classList.contains("is-dragging"), true);
	await at("pointermove", -60);
	check("past its full height it stops, rather than growing", sheet().style.height, "500px");
	await at("pointermove", 700);
	check("and below its peek it stops too", sheet().style.height, "100px");

	await at("pointermove", 300);
	await at("pointerup", 300);
	check("let go past the point of no return, it goes all the way", [open, sheet().style.height], [true, "500px"]);

	await at("pointerdown", 100);
	await at("pointermove", 400);
	await at("pointerup", 400);
	check("dragged back down, it settles at the peek", [open, sheet().style.height], [false, "100px"]);

	await at("pointerdown", 300);
	await at("pointerup", 300);
	check("a press that never moved still toggles it", open, true);

	render(null, stage);
	stage.remove();
}

console.log(failed ? `\n${failed} failed` : `\nall passed (${checks} checks)`);
process.exit(failed ? 1 : 0);
