import { readFileSync } from "node:fs";
import type { TabStep } from "../packages/core/src/tab-rows.ts";
import type { TabStripFacts } from "../packages/core/src/tab-strip-verbs.ts";
import type { CalendarProps } from "../packages/kit/src/components/calendar.tsx";
import type { PlacementName } from "../packages/kit/src/constants/popover.ts";
import type { Mark } from "../packages/kit/src/utils/marks.ts";
import type { PlaceholderMarkProps } from "../packages/kit/src/components/placeholder-mark.tsx";
import type { SortOrder } from "../packages/kit/src/utils/data-table.ts";
import { JSDOM } from "jsdom";
import { TEXT_LOADERS } from "../apps/obsidian/build.mts";
import { byId, found, foundAs } from "./dom-find.ts";
import { standIn } from "./stand-in.ts";
import type { ReactNode } from "react";
import type { PlatesAbove } from "../packages/kit/src/utils/surface.ts";

const dom = new JSDOM('<!doctype html><body><div id="host"></div></body>', { pretendToBeVisual: true });
Object.assign(globalThis, {
	window: dom.window,
	document: dom.window.document,
	Node: dom.window.Node,
	Element: dom.window.Element,
	HTMLElement: dom.window.HTMLElement,
	SVGElement: dom.window.SVGElement,
	getComputedStyle: dom.window.getComputedStyle,
	requestAnimationFrame: dom.window.requestAnimationFrame,
	cancelAnimationFrame: dom.window.cancelAnimationFrame,
	MouseEvent: dom.window.MouseEvent,
	KeyboardEvent: dom.window.KeyboardEvent,
	TransitionEvent: memberOf(dom.window, "TransitionEvent"),
	Image: memberOf(dom.window, "Image"),
});
class InertObserver {
	observe() {}
	disconnect() {}
}
Object.assign(globalThis, {
	ResizeObserver: InertObserver,
	IntersectionObserver: class {
		observe() {}
		disconnect() {}
	},
});

const { createElement: h } = await import("react");
const { render } = await import("../packages/core/src/engine/render.js");
const {
	Kit,
	APPROVAL_TONES,
	PRIORITY_TONES,
	TONE_NAMES,
	MARK_SHAPE_NAMES,
	MARK_TONE_NAMES,
	PlaceholderMark,
	markOf,
	buttonClass,
	cardClass,
	sidebarClass,
	toneClass,
	variants,
	cn,
	cx,
} = await import("../packages/kit/src/index.ts");
const { PLATES_ABOVE } = await import("../packages/kit/src/utils/surface.ts");

// preact defers useEffect a frame, so a test that acts immediately acts before the component
// has finished listening. Wait for the frame rather than guessing at a sleep.
const settle = () => new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

function htmlOf(node: Node | null | undefined): HTMLElement | null {
	if (node === null || node === undefined) return null;
	if (!(node instanceof HTMLElement)) throw new Error(`${node.nodeName} is not an HTMLElement`);
	return node;
}
function htmlIn(root: ParentNode, selector: string): HTMLElement | null {
	return htmlOf(root.querySelector(selector));
}
function mustHtmlOf(node: Node | null | undefined): HTMLElement {
	const element = htmlOf(node);
	if (element === null) throw new Error("no element where one was expected");
	return element;
}
function isTag<K extends keyof HTMLElementTagNameMap>(element: Element, tag: K): element is HTMLElementTagNameMap[K] {
	return element.tagName.toLowerCase() === tag;
}
function tagIn<K extends keyof HTMLElementTagNameMap>(
	root: ParentNode,
	selector: string,
	tag: K,
): HTMLElementTagNameMap[K] | null {
	const element = root.querySelector(selector);
	if (element === null) return null;
	if (!isTag(element, tag)) throw new Error(`${selector} is not a ${tag}`);
	return element;
}
function foundTag<K extends keyof HTMLElementTagNameMap>(
	root: ParentNode,
	selector: string,
	tag: K,
): HTMLElementTagNameMap[K] {
	const element = found(root, selector);
	if (!isTag(element, tag)) throw new Error(`${selector} is not a ${tag}`);
	return element;
}
function present<T>(value: T | null | undefined): T {
	if (value === null || value === undefined) throw new TypeError("nothing where a value was expected");
	return value;
}
function inputEvent(): Event {
	const typing = document.createEvent("Event");
	typing.initEvent("input", true, false);
	return typing;
}
function mustElement(node: Element | null | undefined): Element {
	if (node === null || node === undefined) throw new TypeError("no element where one was expected");
	return node;
}
function nth<T>(list: readonly T[], index: number): T {
	const item = list.at(index);
	if (item === undefined) throw new TypeError(`nothing at ${index}`);
	return item;
}
function captured(pattern: RegExp, text: string): string {
	const match = pattern.exec(text);
	if (match === null) throw new TypeError(`${pattern} matched nothing`);
	return match[1] ?? "";
}
function memberOf(holder: unknown, name: string): unknown {
	if (typeof holder !== "object" || holder === null) throw new TypeError(`cannot read ${name} of ${String(holder)}`);
	return Reflect.get(holder, name);
}
function domRect(left: number, top: number, width: number, height: number): DOMRect {
	const box = { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top };
	return { ...box, toJSON: () => box };
}
function stubComputedStyle(stub: (node: Element, pseudo?: string | null) => object): void {
	Object.assign(globalThis, { getComputedStyle: stub });
}
function htmlsIn(root: ParentNode, selector: string): HTMLElement[] {
	return [...root.querySelectorAll(selector)].map(mustHtmlOf);
}

interface SideFrameSeen {
	readonly padding: string;
	readonly radius: string;
	readonly background: string;
	readonly edge: string;
	readonly gap: string;
	readonly blur: string;
}
interface CardFrameSeen {
	readonly fill: string;
	readonly corner: string;
	readonly pad: string;
	readonly edge: string;
	readonly cast: number;
}
interface RectSeen {
	readonly top: number;
	readonly bottom: number;
	readonly left?: number;
	readonly right: number;
	readonly height: number;
}
interface TwoLineSeen {
	readonly bareHeight: number;
	readonly subHeight: number;
	readonly barePad: string;
	readonly subPad: string;
	readonly name: RectSeen;
	readonly note: RectSeen;
	readonly noteLine: number;
	readonly noteColour: string;
	readonly nameColour: string;
	readonly noteFont: string;
	readonly labelFits: boolean;
	readonly noteFits: boolean;
	readonly noteText: string;
	readonly isTwo: boolean;
	readonly bareIsTwo: boolean;
	readonly bareValue: number;
	readonly subValue: number;
}
interface OverrunSeen {
	readonly nameOver: number;
	readonly noteOver: number;
	readonly valueRight: number;
	readonly rowRight: number;
}
interface GroundSeen {
	readonly ground: string;
	readonly cast: readonly string[];
}
interface MirrorPage {
	readonly mirrorStyle: Readonly<Record<string, string>>;
	readonly inputStyle: Readonly<Record<string, string>>;
	readonly mirrorBox: unknown;
	readonly inputBox: unknown;
	readonly mirrorScroll: number;
	readonly inputScroll: number;
	readonly pageHeight: number;
	readonly inputOverflow: string;
	readonly inputColour: string;
	readonly inputCaret: string;
	readonly sidebar: {
		readonly full: SideFrameSeen;
		readonly lean: SideFrameSeen;
		readonly glass: SideFrameSeen;
		readonly sheet: SideFrameSeen;
		readonly sheetIsSidebar: boolean;
		readonly fullDivider: string;
		readonly leanDivider: string;
		readonly bareDivider: string;
		readonly rowsAreSiblings: number;
		readonly fullIsCard: boolean;
		readonly groupFill: string;
	};
	readonly cards: {
		readonly tile: CardFrameSeen;
		readonly solid: CardFrameSeen;
		readonly lifted: CardFrameSeen;
		readonly plate: CardFrameSeen;
		readonly list: CardFrameSeen;
		readonly greyControl: string;
	};
	readonly lift: { readonly light: GroundSeen; readonly dark: GroundSeen };
	readonly picked: {
		readonly marks: readonly (string | null)[];
		readonly states: readonly boolean[];
		readonly washes: readonly string[];
		readonly labels: readonly string[];
	};
	readonly rowHeights: { readonly full: readonly number[]; readonly lean: readonly number[] };
	readonly rowBuild: { readonly tile: number; readonly top: number; readonly bottom: number };
	readonly twoLine: {
		readonly full: TwoLineSeen;
		readonly lean: TwoLineSeen;
		readonly unbroken: OverrunSeen;
		readonly faint: string;
	};
	readonly setTwo: {
		readonly height: number;
		readonly name: RectSeen;
		readonly note: RectSeen;
		readonly noteOver: number;
		readonly noteLine: number;
		readonly fits: boolean;
		readonly valueRight: number;
		readonly rowRight: number;
	};
	readonly setLong: { readonly nameOver: number; readonly valueRight: number; readonly rowRight: number };
	readonly popSeed: string;
	readonly popSeam?: {
		readonly trigger?: string;
		readonly panel?: string;
		readonly seed?: string;
		readonly origin?: string;
	};
	readonly popGrow?: {
		readonly panel?: readonly string[];
		readonly trigger?: readonly string[];
		readonly touched?: string;
		readonly pinned?: string;
	};
	readonly popCurve?: {
		readonly start?: string;
		readonly peak?: string;
		readonly rest?: string;
		readonly span?: number;
	} | null;
}
function mirrorPageOf(parsed: unknown): MirrorPage {
	if (typeof parsed !== "object" || parsed === null) throw new TypeError("the mirror page reported no object");
	return standIn<MirrorPage>(
		parsed,
		[
			"mirrorStyle",
			"inputStyle",
			"sidebar",
			"cards",
			"lift",
			"picked",
			"rowHeights",
			"rowBuild",
			"twoLine",
			"setTwo",
			"setLong",
		],
		"mirror page",
	);
}
function isDrawable(value: unknown): value is (props: Record<string, unknown>) => ReactNode {
	return typeof value === "function";
}
function drawableOf(value: unknown): (props: Record<string, unknown>) => ReactNode {
	if (!isDrawable(value)) throw new TypeError("not a component");
	return value;
}
function calledAsFunction(component: unknown, props: object): unknown {
	if (typeof component !== "function") throw new TypeError("not callable");
	const result: unknown = Reflect.apply(component, undefined, [props]);
	return result;
}
function isNumberList(value: unknown): value is number[] {
	return Array.isArray(value) && value.every((item) => typeof item === "number");
}

let failed = 0;
let checks = 0;
function check(name: string, got: unknown, want: unknown): void {
	checks += 1;
	const ok = same(got, want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${name}${ok ? "" : `  got ${show(got)}, want ${show(want)}`}`);
}
function same(got: unknown, want: unknown): boolean {
	if (Object.is(got, want)) return true;
	if (!plain(got) || !plain(want)) return false;
	return JSON.stringify(got) === JSON.stringify(want);
}
function plain(value: unknown): value is object {
	if (value === null || typeof value !== "object") return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === Array.prototype || proto === null;
}
function show(value: unknown): string {
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
check("cn drops the falsy and flattens", cn("a", false, ["b", null], "c"), "a b c");
check(
	"CX STAYS THE SAME FUNCTION AS CN FOR WIDGETS PUBLISHED BEFORE THE RENAME",
	[cx === cn, Kit.cx === cn],
	[true, true],
);

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
] as const) {
	const strays = Object.entries(table).filter(([, tone]) => !TONE_NAMES.some((name) => name === tone));
	check(`${name} still names tones the kit has`, strays.map(([key, tone]) => `${key}->${tone}`).join(", ") || 0, 0);
}

// A SECONDARY IS NOT A SECOND ACCENT: the quiet one must not carry the accent's own class.
check("the quiet button is the kit's neutral", buttonClass({ variant: "neutral", size: "s" }), "wg-kit-btn is-s");

const host = byId(document, "host");
render(h(Kit.Button, { variant: "accent", size: "l" }, "Create"), host);
check("Button renders a real button", host.querySelector("button.wg-kit-btn.is-accent.is-l")?.textContent, "Create");
check("type=button, so it never submits a form it lands in", found(host, "button").getAttribute("type"), "button");

// AN ICON THE KIT DOES NOT KNOW RENDERS NOTHING AT ALL — no error, no box, an empty button.
render(h(Kit.Icon, { name: "dots" }), host);
check("the three-dot menu has a glyph", host.querySelectorAll("svg.wg-kit-icon-glyph circle").length, 3);
// the glyph is STROKED, so a radius over half the stroke width leaves a hole and the dots read as rings
check(
	"and they are dots, not rings",
	[...host.querySelectorAll("circle")].every((dot) => parseFloat(dot.getAttribute("r") ?? "") <= 0.9),
	true,
);

render(h(Kit.Button, { asChild: true, variant: "plain" }, h("a", { href: "#x" }, "Go")), host);
check(
	"asChild pours the button onto somebody else's element",
	host.querySelector("a")?.getAttribute("class"),
	"wg-kit-btn is-plain is-m",
);
check("and a slotted anchor is given no button type", host.querySelector("a")?.hasAttribute("type"), false);
check("and keeps that element's own props", host.querySelector("a")?.getAttribute("href"), "#x");

{
	const { cn } = await import("../packages/kit/src/index.ts");
	check("CN, AS IN SHADCN: a caller's class wins a conflict with the kit's", cn("p-plate", "p-2"), "p-2");
	check("and the kit's own sizes and colours are told apart", cn("text-h3", "text-muted"), "text-h3 text-muted");
	check("and a kit class is never taken for a utility", cn("wg-kit-btn is-m", "is-l"), "wg-kit-btn is-m is-l");
}

{
	const { Slot, Slottable } = await import("../packages/kit/src/index.ts");
	const heard: string[] = [];
	const slotRef = { current: null };
	const childRef = { current: null };
	render(
		h(
			Slot,
			{
				className: "from-slot",
				title: "slot",
				style: { color: "red", margin: "1px" },
				onClick: () => heard.push("slot"),
				ref: slotRef,
			},
			h("a", {
				className: "from-child",
				title: "child",
				style: { color: "blue" },
				onClick: () => heard.push("child"),
				ref: childRef,
			}),
		),
		host,
	);
	const slotted = host.querySelector("a");
	check("SLOT, AS IN RADIX: the classes of both are kept", slotted?.getAttribute("class"), "from-slot from-child");
	check("the child's own prop wins over the slot's", slotted?.getAttribute("title"), "child");
	check("styles merge with the child on top", [slotted?.style.color, slotted?.style.margin], ["blue", "1px"]);
	slotted?.click();
	check("both handlers run, the child's first", heard, ["child", "slot"]);
	check("both refs reach the element", [slotRef.current === slotted, childRef.current === slotted], [true, true]);

	render(h(Slot, { className: "outer" }, h("i", null, "before"), h(Slottable, null, h("b", null, "held"))), host);
	const bold = host.querySelector("b");
	check(
		"Slottable names the child that takes the props, the rest are drawn inside it",
		[bold?.getAttribute("class"), bold?.textContent],
		["outer", "beforeheld"],
	);
}

{
	const kit = await import("../packages/kit/src/index.ts");
	const press = (node: Element | null | undefined, key: string) =>
		node?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));

	const chosen: unknown[] = [];
	render(
		h(
			kit.Select,
			{ defaultValue: "b", onValueChange: (next: unknown) => chosen.push(next) },
			h(kit.SelectTrigger, null, h(kit.SelectValue, { placeholder: "Pick" })),
			h(
				kit.SelectContent,
				null,
				h(kit.SelectItem, { value: "a" }, "Apple"),
				h(kit.SelectItem, { value: "b" }, "Banana"),
			),
		),
		host,
	);
	await settle();
	const selectTrigger = htmlIn(host, ".wg-kit-select-trigger");
	check(
		"SELECT, AS IN RADIX: the trigger shows the chosen item's label",
		host.querySelector(".wg-kit-select-value")?.textContent,
		"Banana",
	);
	check(
		"and says it opens a list, closed for now",
		[selectTrigger?.getAttribute("aria-haspopup"), selectTrigger?.dataset["state"]],
		["listbox", "closed"],
	);
	selectTrigger?.click();
	await settle();
	check(
		"pressing the trigger opens it",
		[selectTrigger?.dataset["state"], htmlIn(host, ".wg-kit-pop")?.dataset["state"]],
		["open", "open"],
	);
	check(
		"and the chosen option is marked",
		host.querySelector('[role="option"][aria-selected="true"]')?.textContent,
		"Banana",
	);
	htmlsIn(host, '[role="option"]')
		.find((option) => option.textContent === "Apple")
		?.click();
	await settle();
	check("choosing an option tells the caller and closes", [chosen, selectTrigger?.dataset["state"]], [["a"], "closed"]);
	check("and the trigger shows the new label", host.querySelector(".wg-kit-select-value")?.textContent, "Apple");

	render(
		h(
			kit.Popover,
			{ placement: "below" },
			h(kit.PopoverTrigger, null, "Open"),
			h(kit.PopoverContent, null, h(kit.PopoverItem, null, "one"), h(kit.PopoverItem, null, "two")),
		),
		host,
	);
	await settle();
	const opener = htmlIn(host, "button[aria-haspopup]");
	opener?.click();
	await settle();
	const panel = htmlIn(host, ".wg-kit-pop");
	check(
		"POPOVER PARTS: the trigger opens the content",
		[opener?.dataset["state"], panel?.dataset["state"]],
		["open", "open"],
	);
	check(
		"and the content says where it may grow, for plain CSS to read",
		["--wg-kit-pop-available-height", "--wg-kit-pop-available-width", "--wg-kit-pop-origin"].every(
			(name) => panel?.style.getPropertyValue(name) !== "",
		),
		true,
	);
	const items = htmlsIn(host, ".wg-kit-pop-item");
	items[0]?.focus();
	press(items[0], "ArrowDown");
	await settle();
	check("arrow keys walk the items", document.activeElement === items[1], true);
	check("and the focused item is highlighted", items[1]?.hasAttribute("data-highlighted"), true);
	press(items[1], "ArrowDown");
	check("and wrap past the last", document.activeElement === items[0], true);
	document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
	await settle();
	check(
		"Escape closes it and gives focus back to the trigger",
		[opener?.dataset["state"], document.activeElement === opener],
		["closed", true],
	);

	const tabbed: unknown[] = [];
	render(
		h(kit.Segmented, {
			items: ["a", "b", "c"].map((value) => ({ value, label: value.toUpperCase() })),
			defaultValue: "a",
			onValueChange: (next: unknown) => tabbed.push(next),
		}),
		host,
	);
	const tabs = () => htmlsIn(host, '[role="tab"]');
	tabs()[0]?.focus();
	press(tabs()[0], "ArrowRight");
	await settle();
	check(
		"SEGMENTED: an arrow key moves the choice and the focus",
		[tabbed, document.activeElement === tabs()[1]],
		[["b"], true],
	);
	check(
		"and only the chosen tab is in the tab order",
		tabs().map((tab) => tab.tabIndex),
		[-1, 0, -1],
	);
	press(tabs()[1], "End");
	await settle();
	check(
		"End goes to the last, and the state is in the data",
		tabs().map((tab) => tab.dataset["state"]),
		["inactive", "inactive", "active"],
	);

	render(h(kit.Switch, { label: "Wrap" }), host);
	const toggle = htmlIn(host, '[role="switch"]');
	toggle?.click();
	await settle();
	check(
		"SWITCH: nobody controls it and it still switches",
		[toggle?.dataset["state"], toggle?.getAttribute("aria-checked")],
		["checked", "true"],
	);

	render(h(kit.Calendar, { defaultMonth: new Date(2026, 8, 1), today: new Date(2026, 8, 30) }), host);
	const focused = () => htmlOf(document.activeElement)?.dataset?.["date"];
	htmlIn(host, '[data-date="2026-8-30"]')?.focus();
	press(document.activeElement, "ArrowRight");
	await settle();
	check(
		"CALENDAR: stepping past the month's last day turns the page and keeps the focus",
		[focused(), host.querySelector(".wg-kit-cal-month")?.textContent],
		["2026-9-1", "October 2026"],
	);
	press(document.activeElement, "ArrowUp");
	await settle();
	check("and a week back crosses the page again", focused(), "2026-8-24");
}

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
check("and it is the one asked for", found(host, '[aria-selected="true"]').textContent, "B");
// THE THUMB MUST NOT BE DRAWN ON A GUESS. jsdom reports every width as zero, which is what a
// widget looks like before its first layout — the thumb has to stay hidden, not collapse.
check(
	"with no layout yet, the thumb is hidden rather than wrong",
	foundAs(host, ".wg-kit-seg-thumb", HTMLElement).style.opacity,
	"0",
);
Reflect.deleteProperty(globalThis, "ResizeObserver");
render(h(Kit.Segmented, { items: [{ value: "a", label: "A" }], value: "a" }), host);
check("and a host without ResizeObserver still renders", Boolean(host.querySelector(".wg-kit-seg")), true);
Object.assign(globalThis, {
	ResizeObserver: class {
		observe() {}
		disconnect() {}
	},
});

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
found(host, ".wg-kit-anchor").dispatchEvent(new MouseEvent("click", { bubbles: true }));
await settle();
check("pressing the trigger opens it", host.querySelector(".wg-kit-pop")?.classList.contains("is-open"), true);
// CONTEXT: a real kit control, so the law is proved on what a caller actually hands over
check(
	"the trigger LEAVES at once, because the panel is it now",
	foundAs(host, ".wg-kit-anchor", HTMLElement).style.visibility,
	"hidden",
);
check("and is never touched on the way out", foundAs(host, ".wg-kit-icon", HTMLElement).style.scale, "");
check("the panel is anchored, not centred", foundAs(host, ".wg-kit-pop", HTMLElement).style.left !== "", true);
// jsdom runs no transitions, so the exit is ended the way a browser ends it
const endExit = (panel: Element) =>
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
check(
	"and the trigger stays away until it has",
	foundAs(host, ".wg-kit-anchor", HTMLElement).style.visibility,
	"hidden",
);
endExit(found(host, ".wg-kit-pop"));
await settle();
check("when the fold ends the panel is gone", host.querySelector(".wg-kit-pop")?.classList.contains("is-open"), false);
check("and the trigger comes back exactly then", foundAs(host, ".wg-kit-anchor", HTMLElement).style.visibility, "");
check(
	"UNTOUCHED, as it was throughout",
	`${foundAs(host, ".wg-kit-icon", HTMLElement).style.scale}|${foundAs(host, ".wg-kit-icon", HTMLElement).style.opacity}`,
	"|",
);

const flipped: { value: boolean | null } = { value: null };
render(
	h(Kit.Switch, {
		checked: false,
		onChange: (value: boolean) => {
			flipped.value = value;
		},
		label: "Live",
	}),
	host,
);
found(host, ".wg-kit-switch").dispatchEvent(new MouseEvent("click", { bubbles: true }));
check("Switch reports the new value rather than holding one", flipped.value, true);

const ticked: { value: boolean | null } = { value: null };
render(
	h(Kit.Checkbox, {
		checked: false,
		onCheckedChange: (value: boolean) => {
			ticked.value = value;
		},
		label: "Keep",
	}),
	host,
);
check(
	"CHECKBOX: with a handler it is a checkbox the keyboard reaches",
	found(host, ".wg-kit-check").getAttribute("role"),
	"checkbox",
);
found(host, ".wg-kit-check").dispatchEvent(new MouseEvent("click", { bubbles: true }));
check("and it reports the new value rather than holding one", ticked.value, true);
const FORM_SPEC = [
	{ name: "word", label: "Word", isRequired: true },
	{ name: "count", label: "Count", kind: "number" as const },
	{ name: "examples", label: "Examples", kind: "lines" as const },
];
check(
	"FORM: a record becomes a draft of text, a list one line per item",
	Kit.draftOfRecord(FORM_SPEC, { word: "nuance", count: 3, examples: ["a", "b"] }),
	{ word: "nuance", count: "3", examples: "a\nb" },
);
check(
	"and a draft becomes values typed by each field's kind",
	Kit.valuesOfDraft(FORM_SPEC, { word: " nuance ", count: "3", examples: "a\n\n b " }),
	{ word: "nuance", count: 3, examples: ["a", "b"] },
);
check(
	"an edit writes only the fields the person changed, so an untouched value keeps its type",
	Kit.changedValues(
		FORM_SPEC,
		{ word: "nuance", count: "3", examples: "a" },
		{ word: "nuance", count: "4", examples: "a" },
	),
	{ count: 4 },
);
check(
	"a number field holding no number leaves the draft incomplete",
	Kit.isDraftComplete(FORM_SPEC, { word: "x", count: "3 cups" }),
	false,
);
check(
	"a draft is complete only once every required field holds text",
	[Kit.isDraftComplete(FORM_SPEC, { word: "  " }), Kit.isDraftComplete(FORM_SPEC, { word: "x" })],
	[false, true],
);
const typedInto: { name: string; value: string }[] = [];
render(
	h(Kit.FormFields, {
		fields: FORM_SPEC,
		draft: { word: "nuance" },
		onChange: (name: string, value: string) => typedInto.push({ name, value }),
	}),
	host,
);
check(
	"FormFields draws one labelled kit control per field, a list as a text area",
	[...host.querySelectorAll(".wg-kit-form-label")]
		.map((label) => label.textContent)
		.concat(String(host.querySelectorAll("textarea").length)),
	["Word", "Count", "Examples", "1"],
);
render(h(Kit.Checkbox, { checked: true }), host);
check(
	"without a handler it is only the drawing, so the row around it stays the one control",
	[
		found(host, ".wg-kit-check").tagName,
		found(host, ".wg-kit-check").getAttribute("aria-hidden"),
		found(host, ".wg-kit-check").getAttribute("data-state"),
	],
	["SPAN", "true", "checked"],
);
check("a checked box draws the tick", host.querySelectorAll(".wg-kit-check svg").length, 1);

const plated = (said: string) => [...host.querySelectorAll(".wg-kit-surface")].map((one) => one.getAttribute(said));
const seeded = (value: PlatesAbove, drawn: ReactNode) => render(h(PLATES_ABOVE.Provider, { value }, drawn), host);
const ONE_PLATE_ABOVE: PlatesAbove = { surface: "group", levels: 1, ownPlates: 0 };

render(h(Kit.Card, null, "plain"), host);
check("a card nobody typed is a group plate", plated("data-surface"), ["group"]);
render(h(Kit.Card, { type: "none" }, "bare"), host);
check("and one told none paints nothing", plated("data-surface"), [null]);
check("Surface is the same component, kept for widgets published before the rename", Kit.Surface, Kit.Card);

render(h(Kit.Card, { type: "group" }, h(Kit.Card, { type: "group" }, h(Kit.Card, { type: "group" }))), host);
check("on the page a group holds a group, and the third is refused", plated("data-surface"), ["group", "group", null]);
check("the corner steps inward with each plate", plated("style"), [
	"--wg-surface-corner: var(--wg-kit-plate);",
	"--wg-surface-corner: var(--wg-kit-item);",
	null,
]);

render(h(Kit.Card, { type: "group" }, h(Kit.Card, { type: "object" })), host);
check("an old object is drawn as the group it became", plated("data-surface"), ["group", "group"]);

seeded(ONE_PLATE_ABOVE, h(Kit.Card, { type: "group" }, h(Kit.Card, { type: "group" })));
check("a tile already wearing a group leaves the widget one plate", plated("data-surface"), ["group", null]);

seeded(ONE_PLATE_ABOVE, h(Kit.Card, { type: "chartreuse" }));
check("and a surface the kit never had is refused under it", plated("data-surface"), [null]);

render(h(Kit.Card, { type: "apart", side: "start", across: "row" }), host);
check(
	"a divider says which edge and which way it stands",
	plated("data-surface").concat(plated("data-side"), plated("data-across")),
	["apart", "start", "row"],
);

render(h(Kit.Card, { type: "group", tone: "warning" }), host);
check("a tone is a state of the plate", plated("class"), ["wg-kit-surface wg-kit-tone is-warn"]);

render(h(Kit.Card, { type: "apart", side: "sideways", across: "diagonal" }), host);
check(
	"a divider given words the kit never had falls back rather than mis-painting",
	plated("data-side").concat(plated("data-across")),
	["end", "column"],
);

const toneNeverHad: Record<string, unknown> = { type: "group", tone: "danger" };
render(h(Kit.Card, toneNeverHad), host);
check("and a tone it never had is drawn neutral", plated("class"), ["wg-kit-surface"]);

const plateNamedByHand: Record<string, unknown> = { type: "group", "data-surface": "object" };
render(h(Kit.Card, plateNamedByHand), host);
check("a plate named by hand cannot outrank the law", plated("data-surface"), ["group"]);

const heldBySurface: { node: Element | null } = { node: null };
render(h(Kit.Card, { type: "group", ref: (node: Element | null) => void (heldBySurface.node = node) }), host);
check("a surface hands its element back to the widget", heldBySurface.node?.className, "wg-kit-surface");

render(h(Kit.Card, { type: "chartreuse" }), host);
check("a type the kit never had paints nothing", plated("data-surface"), [null]);

render(h(Kit.Card, { tone: "success" }, "done"), host);
check(
	"a card in a tone is the same plate in a state",
	[plated("data-surface"), plated("class")],
	[["group"], ["wg-kit-surface wg-kit-tone is-ok"]],
);

const itemsOf = () =>
	[...host.querySelectorAll(".wg-kit-layout-item")].map((one) => [one.getAttribute("data-surface"), one.className]);
render(
	h(
		Kit.Rows,
		null,
		h(Kit.LayoutHeader, { title: "Steps" }),
		h(Kit.LayoutItem, null, "one"),
		h(Kit.LayoutItem, { tone: "success" }, "two"),
	),
	host,
);
check("rows stand in the one plate", plated("data-surface"), ["group"]);
check("and every row stands bare on it, a tone washing only its own", itemsOf(), [
	[null, "wg-kit-layout-item"],
	[null, "wg-kit-layout-item wg-kit-tone is-ok"],
]);
await settle();
check(
	"THE HEADER STANDS OUTSIDE THE PLATE, above it",
	[
		host.querySelector(".wg-kit-layout .wg-kit-layout-head") === null,
		host.querySelector(".wg-kit-layout-block > .wg-kit-layout-heads + .wg-kit-layout")?.getAttribute("data-surface"),
		host.querySelector(".wg-kit-layout-heads > .wg-kit-layout-head h3.wg-kit-heading.is-h4")?.textContent,
	],
	[true, "group", "Steps"],
);
render(
	h(Kit.Rows, null, h(Kit.LayoutHeader, { title: "Steps", className: "mine" }), h(Kit.LayoutItem, null, "one")),
	host,
);
await settle();
check("and it still takes a caller's class", found(host, ".wg-kit-layout-head").classList.contains("mine"), true);

render(
	h(
		Kit.Rows,
		null,
		h(
			Kit.LayoutHeader,
			null,
			h(Kit.LayoutTitle, null, "Sessions"),
			h(Kit.LayoutActions, null, h(Kit.ActionButton, { icon: "plus", label: "Log a session" })),
		),
		h(Kit.LayoutItem, null, "one"),
	),
	host,
);
await settle();
const headOf = () => found(host, ".wg-kit-layout-heads > .wg-kit-layout-head");
check(
	"a header is a row: its title, then its actions at the end",
	[...headOf().children].map((part) => part.className),
	["wg-kit-heading is-h4 wg-kit-layout-title", "wg-kit-layout-actions"],
);
check(
	"an action with no words is a small grey icon button named for a reader",
	[found(headOf(), "button").className, found(headOf(), "button").getAttribute("aria-label")],
	["wg-kit-icon is-s wg-kit-action", "Log a session"],
);
render(
	h(Kit.Rows, null, h(Kit.LayoutHeader, { title: "Steps" }, h("button", null, "go")), h(Kit.LayoutItem, null, "one")),
	host,
);
await settle();
check(
	"the short form puts what it holds in the actions",
	[...headOf().children].map((part) => part.className),
	["wg-kit-heading is-h4 wg-kit-layout-title", "wg-kit-layout-actions"],
);
render(h(Kit.ActionButton, { icon: "plus" }, "Add"), host);
check(
	"with words it is a small grey button carrying both",
	[mustHtmlOf(host.firstChild).className, mustHtmlOf(host.firstChild).textContent],
	["wg-kit-btn is-s wg-kit-action", "Add"],
);
check("tabs are the segmented tablist", Kit.Tabs, Kit.Segmented);

let pressed = 0;
render(h(Kit.Button, { isLoading: true, onClick: () => (pressed += 1) }, "Save"), host);
const loading = foundTag(host, "button", "button");
check(
	"A LOADING BUTTON CARRIES THE KIT'S OWN SPINNER, and says it is busy",
	[loading.className, Boolean(loading.querySelector(".wg-kit-spinner")), loading.getAttribute("aria-busy")],
	["wg-kit-btn is-m is-loading", true, "true"],
);
check("it keeps its words", loading.textContent, "Save");
check("AND IT CANNOT BE PRESSED WHILE IT LOADS", loading.disabled, true);
loading.click();
check("so a press does nothing", pressed, 0);

render(h(Kit.Button, { isDone: true, onClick: () => (pressed += 1) }, "Saved"), host);
const done = foundTag(host, "button", "button");
check(
	"a finished button wears the tick instead",
	[done.className, Boolean(done.querySelector(".wg-kit-btn-mark")), done.disabled],
	["wg-kit-btn is-m is-done", true, false],
);
done.click();
check("and it is a button again, pressable", pressed, 1);

render(h(Kit.IconButton, { label: "Save", isLoading: true }, h(Kit.Icon, { name: "plus" })), host);
check(
	"an icon button loads the same way, its icon stepping aside",
	[Boolean(host.querySelector(".wg-kit-spinner")), foundTag(host, "button", "button").disabled],
	[true, true],
);
render(h(Kit.Button, { disabled: true }, "Off"), host);
check(
	"a disabled button is still just disabled",
	[foundTag(host, "button", "button").disabled, found(host, "button").className],
	[true, "wg-kit-btn is-m"],
);
render(null, host);

{
	const { diceBearUrl, diceBearVerdict } = await import("../packages/kit/src/utils/dicebear.ts");
	const { DICEBEAR_STYLES, ALLOWED_LICENSES } = await import("../packages/kit/src/constants/dicebear.ts");
	check(
		"a DiceBear address carries the style, the seed and every option, arrays joined",
		diceBearUrl("notionists", "Anna Lee", { backgroundColor: ["b6e3f4", "c0aede"], flip: true }),
		"https://api.dicebear.com/10.x/notionists/svg?seed=Anna+Lee&backgroundColor=b6e3f4%2Cc0aede&flip=true",
	);
	check(
		"AN OPTION NAME THAT COULD BREAK THE QUERY IS DROPPED",
		diceBearUrl("shapes", "x", { "a&b": 1, "../x": 2 }),
		"https://api.dicebear.com/10.x/shapes/svg?seed=x",
	);
	check("a CC0 style is allowed and credited", diceBearVerdict("blobs").credit, "blobs by DiceBear, CC0 1.0");
	check("A STYLE UNDER A LICENCE OFF THE LIST IS REFUSED", Boolean(diceBearVerdict("avataaars").refusal), true);
	check("and so is a style that does not exist", Boolean(diceBearVerdict("../../evil").refusal), true);
	check(
		"every style the table allows names an allowed licence",
		Object.values(DICEBEAR_STYLES).filter((one) => !ALLOWED_LICENSES.includes(one.license)).length,
		4,
	);

	render(
		h(
			Kit.Emblem,
			{ label: "Anna" },
			h(Kit.EmblemDiceBear, { style: "bottts", seed: "Anna" }),
			h(Kit.EmblemFallback, null, "AL"),
		),
		host,
	);
	await settle();
	check(
		"A REFUSED STYLE SAYS WHY IN PLACE OF THE PICTURE, and the fallback steps aside",
		[
			htmlIn(host, ".wg-kit-emblem-refused")?.title.startsWith("Unavailable for licensing reasons"),
			host.querySelector(".wg-kit-emblem-fallback") === null,
		],
		[true, true],
	);
	render(
		h(
			Kit.Emblem,
			{ size: "l", shape: "rounded" },
			h(Kit.EmblemImage, { src: "x.png" }),
			h(Kit.EmblemFallback, null, "AL"),
		),
		host,
	);
	await settle();
	check(
		"until the picture has loaded the fallback stands",
		[host.querySelector(".wg-kit-emblem-fallback")?.textContent, host.querySelector("img") === null],
		["AL", true],
	);
	check(
		"the size is the kit's step, the shape a class",
		[
			mustHtmlOf(host.firstChild).style.getPropertyValue("--wg-emblem-size"),
			mustHtmlOf(host.firstChild).classList.contains("is-rounded"),
		],
		["64px", true],
	);
	render(h(Kit.Emblem, null, h(Kit.EmblemFallback, { seed: "Acme" })), host);
	check("with nothing to show it draws the seeded placeholder mark", Boolean(host.querySelector(".wg-kit-mark")), true);
	render(null, host);
}

render(h(Kit.Grid, { min: 180 }, h(Kit.LayoutItem, null, "a"), h(Kit.LayoutItem, { tone: "warning" }, "b")), host);
check(
	"a grid gives every cell its own plate",
	itemsOf().map(([worn]) => worn),
	["group", "group"],
);
check("and itself paints none", found(host, ".wg-kit-layout").getAttribute("data-surface"), null);
check(
	"it wraps at the narrowest a cell may be",
	found(host, ".wg-kit-layout").getAttribute("style"),
	"--wg-kit-layout-min: 180px;",
);

render(h(Kit.Layout, { kind: "row" }, h(Kit.LayoutItem, null, "a")), host);
check(
	"a row is cards across",
	itemsOf().map(([worn]) => worn),
	["group"],
);
render(h(Kit.Layout, { kind: "stack" }, h(Kit.LayoutItem, null, "a")), host);
check("a stack paints nothing at all", [plated("data-surface"), itemsOf().map(([worn]) => worn)], [[], [null]]);
const layoutNeverHad: Record<string, unknown> = { kind: "masonry" };
render(h(Kit.Layout, layoutNeverHad, h(Kit.LayoutItem, null, "a")), host);
check(
	"a layout the kit never had is drawn as a stack",
	found(host, ".wg-kit-layout").className,
	"wg-kit-layout is-stack",
);
check("the four layouts are named in one place", Kit.LAYOUT_KINDS, ["stack", "row", "grid", "rows"]);

render(h(Kit.Card, null, h(Kit.Rows, null, h(Kit.LayoutItem, null, "x"))), host);
check(
	"rows already on a plate paint no second one, only their lines",
	[plated("data-surface"), found(host, ".wg-kit-layout").className],
	[["group"], "wg-kit-layout is-rows is-on-plate"],
);
const flushOf = () => host.querySelector('[data-surface="group"]')?.getAttribute("data-rows-flush") ?? null;
check("rows alone in a card take its padding on every side", flushOf(), "inline top bottom");
render(
	h(Kit.Card, null, h("style", null, ".x{}"), h("div", null, h(Kit.Rows, null, h(Kit.LayoutItem, null, "x")))),
	host,
);
check("a sheet and a wrapper before them are not content, so the top is still theirs", flushOf(), "inline top bottom");
render(h(Kit.Card, null, h("p", null, "Above"), h(Kit.Rows, null, h(Kit.LayoutItem, null, "x"))), host);
check("something above them leaves the card its top", flushOf(), "inline bottom");
render(h(Kit.Card, null, h(Kit.Rows, null, h(Kit.LayoutItem, null, "x")), h(Kit.Button, null, "More")), host);
check("something below them leaves the card its bottom", flushOf(), "inline top");
render(h(Kit.Card, null, "plain"), host);
check("a card with no rows keeps every edge", flushOf(), null);
seeded(ONE_PLATE_ABOVE, h(Kit.Rows, null, h(Kit.LayoutItem, null, "x")));
check("and so do rows in a tile the board already plated", plated("data-surface"), []);

const surface = [
	"Button",
	"IconButton",
	"Badge",
	"Spinner",
	"Emblem",
	"Heading",
	"ActionButton",
	"Tabs",
	"Pill",
	"ShowMore",
	"Count",
	"Plate",
	"Card",
	"Surface",
	"Layout",
	"Rows",
	"Grid",
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
	"ProgressBar",
	"StatusProgress",
	"MarkdownEditor",
	"Switch",
	"PlaceholderMark",
	"markOf",
	"MARK_SHAPE_NAMES",
	"MARK_TONE_NAMES",
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
check("every piece is reachable from one object", surface.filter((name) => !memberOf(Kit, name)).join(", ") || 0, 0);

// THE TWO SPECIFIERS, and what each one is FOR. A widget must have "widgetarium"; it may
// take "widgetarium/kit". Proving them through the host's own resolver, not by reading api.js.
const { ENGINE_SCOPE } = await import("../packages/core/src/registry.js");
const { api: widgetarium, kit: kitModule } = ENGINE_SCOPE;
check(
	'import { Button } from "widgetarium/kit" — flat, and it says where it came from',
	memberOf(kitModule, "Button") === Kit.Button,
	true,
);
check(
	"every piece is reachable from the subpath",
	surface.filter((name) => memberOf(kitModule, name) !== memberOf(Kit, name)).join(", ") || 0,
	0,
);
check(
	"the core is still whole",
	["createWidget", "Dialog", "EditableTabs", "ConfirmDialog"].filter((name) => !widgetarium[name]).join(", ") || 0,
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
	const { useSegmentedThumb } = await import("../packages/kit/src/index.ts");
	const { useState } = await import("react");
	const was = Element.prototype.getBoundingClientRect;
	Element.prototype.getBoundingClientRect = function (this: Element): DOMRect {
		if (this.classList.contains("wg-kit-seg")) return domRect(0, 0, 300, 38);
		if (this.tagName !== "BUTTON") return domRect(0, 0, 0, 38);
		if (this.parentNode === null) throw new TypeError("a button with no parent");
		const row: Element[] = [...this.parentNode.querySelectorAll("button")];
		return domRect(4 + row.indexOf(this) * 100, 0, 100, 38);
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

	const host = byId(document, "host");
	render(h(Bar, {}), host);
	await settle();
	await settle();
	check("a derived list does not send the thumb into a render loop", renders < 10, true);
	check(
		"the thumb lands on the selected tab",
		foundAs(host, ".wg-kit-seg-thumb", HTMLElement).style.transform,
		"translateX(104px)",
	);

	// THE PADDING MUST NOT MOVE IT. An absolute child is offset from the padding box, whose left
	// edge is the inner BORDER edge — subtracting the padding pushed the thumb out of the capsule.
	const realStyle = globalThis.getComputedStyle;
	stubComputedStyle((node) => ({ ...realStyle(node), paddingLeft: "4px", borderLeftWidth: "0px" }));
	render(null, host);
	renders = 0;
	render(h(Bar, {}), host);
	await settle();
	await settle();
	check(
		"and a padded container does not push it out",
		foundAs(host, ".wg-kit-seg-thumb", HTMLElement).style.transform,
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
	const widgetSource = (id: string) => {
		for (const ext of ["tsx", "ts", "jsx", "js"]) {
			const at = `registry/${id}/widget.${ext}`;
			if (fs.existsSync(at)) return fs.readFileSync(at, "utf8");
		}
		throw new Error(`${id}: no widget source found`);
	};
	const tokens = fs.readFileSync("registry/@default/tokens.css", "utf8");
	check(
		"the plate fill has ONE owner, so no second fallback can drift",
		/--orbi-plate:\s*var\(--wg-kit-fill\)/.test(tokens),
		true,
	);

	const strip = fs.readFileSync("packages/core/src/editable-tabs.ts", "utf8");
	check("the tab strip builds on the kit rather than restating it", /from "\.\/kit\.js"|wg-kit-/.test(strip), true);
	check("the tab strip does not paint its own plate", /background:\s*var\(--orbi-plate\)/.test(strip), false);
	check(
		"and the widget holding it draws no strip of its own",
		/wg-kit-seg|role="tablist"/.test(widgetSource("@default/editable-tabs")),
		false,
	);

	for (const id of ["@default/filter-panel", "@default/view-tabs"]) {
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
	const { EditableTabs } = await import("../packages/core/src/editable-tabs.js");
	const host = byId(document, "host");
	render(null, host);

	const steps: TabStep[] = [];
	function Strip() {
		const [held, setHeld] = useState<Pick<TabStripFacts, "tabs" | "archived" | "selected">>({
			tabs: ["Marketing Team"],
			archived: ["Ux Team", "Sales"],
			selected: "Marketing Team",
		});
		return h(EditableTabs, {
			...held,
			onChange: (step: TabStep) => {
				steps.push(step);
				setHeld({ tabs: step.tabs, archived: step.archived, selected: step.selected });
			},
		});
	}

	const press = async (node: Element | null | undefined) => {
		mustElement(node).dispatchEvent(new MouseEvent("click", { bubbles: true }));
		await settle();
	};
	const inBody = (selector: string) => [...document.body.querySelectorAll(selector)];
	const rows = () => inBody(".wg-tabs-archive .wg-kit-row");
	const names = () => rows().map((row) => found(row, ".wg-kit-row-label").textContent.trim());
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

	await press(nth(rows(), 0).querySelector(".wg-tabs-delete"));
	check("pressing Delete asks first", Boolean(confirm()), true);
	check("and names the tab it is asking about", /Ux Team/.test(mustElement(confirm()).textContent), true);
	check("nothing has left the list yet", names(), ["Ux Team", "Sales"]);
	check("and the caller has been told nothing", steps.length, 0);

	await press(mustElement(confirm()).querySelector(".wg-dialog-cancel"));
	check("dismissing closes the question", Boolean(confirm()), false);
	check("and leaves the entry exactly as it was", names(), ["Ux Team", "Sales"]);
	check("still telling the caller nothing", steps.length, 0);

	await press(nth(rows(), 0).querySelector(".wg-tabs-delete"));
	await press(mustElement(confirm()).querySelector(".wg-dialog-confirm"));
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

	await press(nth(rows(), 0).querySelector(".wg-tabs-restore"));
	check("Restore still empties the list", names(), []);
	check(
		"by putting the tab back on the strip",
		[...host.querySelectorAll(".wg-tabs-tab")].map((node) => node.textContent.trim()),
		["Marketing Team", "Sales"],
	);

	render(null, host);
	for (const stray of inBody(".wg-dialog-overlay")) stray.remove();

	const strayed: TabStep[] = [];
	render(
		h(EditableTabs, {
			tabs: ["A", "B"],
			archived: [],
			selected: "Gone",
			onChange: (step: TabStep) => strayed.push(step),
		}),
		host,
	);
	await settle();
	await press(host.querySelector(".wg-tabs-more"));
	await press(inBody(".wg-kit-pop-item").find((item) => item.textContent.trim() === "Archive"));
	check("archiving a selection the strip does not hold still selects a tab it does", strayed.at(-1)?.selected, "A");
	render(null, host);
	for (const stray of inBody(".wg-dialog-overlay")) stray.remove();
}

// THE PANEL MUST BE CLOSABLE, and the press that closes it never reaches `document`.
// packages/core/src/editor-shield.js wraps EVERY widget block and stops mousedown/pointerdown in the bubble
// phase, so CodeMirror cannot move the caret under a live widget. A document-level bubble
// listener is therefore never called for a press landing on any widget on the board.
{
	const { useState } = await import("react");
	const host = byId(document, "host");
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
	document.addEventListener = (
		name: string,
		fn: EventListenerOrEventListenerObject,
		opts?: boolean | AddEventListenerOptions,
	) => {
		if (name === "keydown") effectRuns += 1;
		if (name === "pointerdown" || name === "mousedown") listening += 1;
		return realAdd(name, fn, opts);
	};
	document.removeEventListener = (
		name: string,
		fn: EventListenerOrEventListenerObject,
		opts?: boolean | EventListenerOptions,
	) => {
		if (name === "pointerdown" || name === "mousedown") listening -= 1;
		return realRemove(name, fn, opts);
	};

	let bump = (): void => {
		throw new TypeError("the harness never rendered");
	};
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
				onOpenChange: (next: boolean) => setOpen(next),
			},
			open ? h("button", { className: "harness-inside" }, "Tick") : null,
		);
	}

	// an exiting panel is still marked open — it is on screen folding away, not open
	const isOpen = () => {
		const pop = host.querySelector(".wg-kit-pop");
		return pop !== null && pop.classList.contains("is-open") && !pop.classList.contains("is-exiting");
	};
	const fire = (node: Element | null, names: string[]) => {
		for (const name of names)
			mustElement(node).dispatchEvent(new MouseEvent(name, { bubbles: true, cancelable: true }));
	};
	// a real mouse press, in the order a browser sends it
	const press = (node: Element | null) => fire(node, ["pointerdown", "mousedown", "click"]);
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
		const node = foundAs(host, ".harness-trigger", HTMLElement);
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
	const host = byId(document, "host");
	render(null, host);

	// jsdom lays nothing out, and a fold measured from zeroes is a fold of NaN
	const wasRect = Element.prototype.getBoundingClientRect;
	// CONTEXT: a measurement forces a style flush, and a browser starts or misses transitions there
	const flushes: { open: boolean; opacity: string; transition: string }[] = [];
	Element.prototype.getBoundingClientRect = function (this: Element): DOMRect {
		if (this.classList.contains("wg-kit-pop")) {
			flushes.push({
				open: this.classList.contains("is-open"),
				opacity: mustHtmlOf(this).style.opacity,
				transition: mustHtmlOf(this).style.transition,
			});
			return domRect(0, 0, 240, 180);
		}
		if (this.classList.contains("wg-kit-anchor")) return domRect(40, 60, 100, 40);
		return domRect(0, 0, 0, 0);
	};
	// THE CORNER LIVES ON ::before, so that is where the trigger's radius has to be read from
	const realStyle = globalThis.getComputedStyle;
	let pseudoReads = 0;
	stubComputedStyle((node, pseudo) => {
		if (pseudo) pseudoReads += 1;
		return { ...realStyle(node), borderRadius: pseudo ? "999px" : "0px", borderLeftWidth: "0px" };
	});
	const realMatchMedia = window.matchMedia;

	const pop = () => htmlIn(host, ".wg-kit-pop");
	const anchor = () => htmlIn(host, ".wg-kit-anchor");
	const has = (name: string) => Boolean(pop()?.classList.contains(name));
	const show = async (open: boolean) => {
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
	check("the enter has landed, leaving the opacity to the stylesheet", mustHtmlOf(pop()).style.opacity, "");
	flushes.length = 0;
	await show(false);
	check(
		"the exit folds the panel back onto the trigger",
		/^translate\(40px, 60px\) scale\(0\.41/.test(mustHtmlOf(pop()).style.transform),
		true,
	);
	// A RADIUS IS SCALED BY THE TRANSFORM: the trigger's real 20px corner, divided by the scale it
	// is about to be multiplied by, per axis — or the panel squares off as it shrinks.
	check("AND THE RADIUS TRAVELS WITH IT", Math.round(parseFloat(mustHtmlOf(pop()).style.borderRadius)), 48);
	check("on the other axis too", Math.round(parseFloat(mustHtmlOf(pop()).style.borderRadius.split("/")[1] ?? "")), 90);
	check("measured from the ::before where the corner is painted", pseudoReads > 0, true);
	check("the content fades out ahead of the panel", mustHtmlOf(mustHtmlOf(pop()).firstElementChild).style.opacity, "0");
	check(
		"and the closing curve is the ease, never the spring",
		/--wg-spring/.test(mustHtmlOf(pop()).style.transition),
		false,
	);

	// CONTEXT: a fade whose start value is resolved as 0 plays nothing — the panel is gone in one frame
	const measured = nth(flushes, 0);
	const folding = nth(flushes, -1);
	check("the exit measures a panel `is-open` has already left", measured.open, false);
	check("SO IT HOLDS THE OPACITY UP BEFORE MEASURING", measured.opacity, "1");
	check("because opacity is not in the curve still in force there", /opacity/.test(measured.transition), false);
	check("only then is it sent to nothing", folding.opacity, "0");
	check("on a curve that names opacity", /opacity var\(--wg-press\)/.test(folding.transition), true);

	// A PANEL THAT EMPTIES CANNOT FOLD. A caller writes `{open ? … : null}` because it is the
	// obvious thing to write; the panel then collapses to its padding and the fold plays from a
	// flattened line. So the kit keeps the last children, and pins the box before it measures.
	check(
		"the children it had are still there while it folds",
		Boolean(mustHtmlOf(pop()).querySelector(".wg-kit-pop-item")),
		true,
	);
	check(
		"and the box is pinned in pixels so it cannot collapse",
		/^[\d.]+px$/.test(mustHtmlOf(pop()).style.width),
		true,
	);
	check("in both directions", /^[\d.]+px$/.test(mustHtmlOf(pop()).style.height), true);

	// RE-ENTRANCY. Pressing again mid-exit must re-open, not leave a half-applied fold behind.
	check("the exit is running", has("is-exiting"), true);
	await show(true);
	check("re-opening cancels the exit", has("is-exiting"), false);
	check("and the panel is open again", has("is-open"), true);
	check("the trigger is hidden again, not stuck visible", mustHtmlOf(anchor()).style.visibility, "hidden");
	check("nothing of the fold is left on the panel", mustHtmlOf(pop()).style.opacity, "");
	check(
		"the exit's pinned box is released, and the enter never pins one",
		`${mustHtmlOf(pop()).style.width}|${mustHtmlOf(pop()).style.height}`,
		"|",
	);
	check(
		"and its content is fading IN again, not out",
		mustHtmlOf(mustHtmlOf(pop()).firstElementChild).style.opacity,
		"1",
	);
	endExit(mustElement(pop()));
	await settle();
	check("A LATE transitionend FROM THE CANCELLED EXIT DOES NOT CLOSE IT", has("is-open"), true);
	check("and does not take the trigger back", mustHtmlOf(anchor()).style.visibility, "hidden");

	// THE GUARD. A transition that never starts must not strand the panel on screen forever.
	await show(false);
	check("the exit is waiting on a transition that will not come", has("is-exiting"), true);
	await new Promise((resolve) => setTimeout(resolve, 460));
	await settle();
	check("the guard ends it anyway", has("is-open"), false);
	check("and the trigger is not stranded hidden", mustHtmlOf(anchor()).style.visibility, "");

	// REDUCED MOTION. No animation at all, and nothing left lingering.
	Object.assign(window, { matchMedia: () => ({ matches: true }) });
	await show(true);
	await show(false);
	check("reduced motion skips the exit entirely", has("is-exiting"), false);
	check("the panel is gone at once", has("is-open"), false);
	check("the trigger comes back at once", mustHtmlOf(anchor()).style.visibility, "");
	check("and no fold was painted on the way", mustHtmlOf(pop()).style.transform, "");
	window.matchMedia = realMatchMedia;

	globalThis.getComputedStyle = realStyle;
	Element.prototype.getBoundingClientRect = wasRect;
	render(null, host);
}

// CONTEXT: THE PANEL SEEDS AT THE TRIGGER'S BOX AND SCALES OUT — beats are sampled as written
{
	const host = byId(document, "host");
	render(null, host);

	const wasRect = Element.prototype.getBoundingClientRect;
	Element.prototype.getBoundingClientRect = function (this: Element): DOMRect {
		if (this.classList.contains("wg-kit-pop")) return domRect(0, 0, 240, 180);
		if (this.classList.contains("wg-kit-anchor")) return domRect(40, 60, 100, 40);
		return domRect(0, 0, 0, 0);
	};
	// CONTEXT: a grey row under a white panel — the pair the trigger's own paint has to be read from
	const ROW_FILL = "rgb(240, 240, 240)";
	const ROW_EDGE = "rgb(200, 200, 200)";
	const PANEL_FILL = "rgb(255, 255, 255)";
	const PANEL_EDGE = "inset 0 0 0 1px rgba(0, 0, 0, 0.12)";
	const realStyle = globalThis.getComputedStyle;
	stubComputedStyle((node, pseudo) => {
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
	});
	const realMatchMedia = window.matchMedia;

	const pop = () => htmlIn(host, ".wg-kit-pop");
	const anchor = () => htmlIn(host, ".wg-kit-anchor");
	const row = () => htmlIn(host, ".enter-trigger") ?? htmlIn(host, ".enter-ghost");
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
	const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
	const snap = () => {
		const node = mustHtmlOf(pop());
		const inner = mustHtmlOf(node.firstElementChild);
		const trigger = mustHtmlOf(row());
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
			gone: mustHtmlOf(anchor()).style.visibility,
			// CONTEXT: the fold is gone, so ANY inline style on the trigger is now a defect
			rowTouched: `${trigger.style.scale}|${trigger.style.opacity}|${trigger.style.transform}|${trigger.style.transition}|${trigger.style.transformOrigin}`,
		};
	};
	const numbers = (value: unknown) => String(value).trim().split(/\s+/).map(parseFloat);
	const partsOf = (state: { transition: string }) => state.transition.split(",").map((part) => part.trim());
	const drivenIn = (state: { transition: string }) => partsOf(state).map((part) => part.split(/\s+/)[0]);

	// TRADE-OFF: the law's numbers are read off the source, so one changed there fails here
	const { readFileSync: readSource } = await import("node:fs");
	const source = ["constants/popover.ts", "utils/popover-motion.ts"]
		.map((file) => readSource(`packages/kit/src/${file}`, "utf8"))
		.join("\n");
	const constant = (name: string) => Number(captured(new RegExp(`const ${name} = ([\\d.]+)`), source));
	const growMs = constant("GROW_MS");
	const contentMs = constant("CONTENT_MS");
	const contentDelayMs = constant("CONTENT_DELAY_MS");
	const landMarginMs = constant("LAND_MARGIN_MS");

	const pollUntil = async (ready: () => boolean, tries = 400) => {
		for (let round = 0; round < tries; round += 1) {
			if (ready()) break;
			await sleep(5);
		}
	};

	open();
	const seated = snap();
	await pollUntil(() => mustHtmlOf(pop()).style.animation.includes("wg-kit-pop-bloom"));
	const growing = snap();
	await pollUntil(() => mustHtmlOf(pop()).style.animation === "");
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
	const css = (await import("node:fs")).readFileSync("apps/obsidian/styles.css", "utf8");
	const frames = captured(/@keyframes wg-kit-pop-bloom \{([\s\S]*?)\n\}/, css);
	const stopAt = (label: string) => numbers(captured(new RegExp(`${label}\\s*\\{\\s*scale:\\s*([^;]+);`), frames));
	const peakStop = Number(captured(/(\d+)%\s*\{\s*scale:/, frames)) / 100;
	const peak = stopAt(`${peakStop * 100}%`);
	const rest = stopAt("to");
	const seedStop = /from\s*\{\s*scale:\s*var\(--wg-kit-pop-seed-x,\s*1\)\s*var\(--wg-kit-pop-seed-y,\s*1\);\s*\}/.test(
		frames,
	);
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
	const landsAt: unknown = new Function(
		"GROW_MS",
		"CONTENT_MS",
		"CONTENT_DELAY_MS",
		"LAND_MARGIN_MS",
		`return ${captured(/landPanel\(panel\), ([^)]+)\)/, source)};`,
	)(growMs, contentMs, contentDelayMs, landMarginMs);
	check(
		"and the landing is scheduled past every curve",
		`${Number(landsAt) > growMs} ${Number(landsAt) > contentDelayMs + contentMs}`,
		"true true",
	);

	// CONTEXT: a panel that opens the other way must grow the other way, or it slides out of nowhere
	render(null, host);
	Element.prototype.getBoundingClientRect = function (this: Element): DOMRect {
		if (this.classList.contains("wg-kit-pop")) return domRect(0, 0, 240, 180);
		if (this.classList.contains("wg-kit-anchor")) return domRect(900, 700, 100, 40);
		return domRect(0, 0, 0, 0);
	};
	open();
	check("PUSHED OFF THE SCREEN, IT GROWS FROM THE CORNER IT ACTUALLY LANDED ON", snap().origin, "right bottom");
	Element.prototype.getBoundingClientRect = function (this: Element): DOMRect {
		if (this.classList.contains("wg-kit-pop")) return domRect(0, 0, 240, 180);
		if (this.classList.contains("wg-kit-anchor")) return domRect(40, 60, 100, 40);
		return domRect(0, 0, 0, 0);
	};

	// CONTEXT: the panel is the only thing the enter ever staged, so it is the only thing to hand back
	render(null, host);
	open();
	await pollUntil(() => mustHtmlOf(pop()).style.animation.includes("wg-kit-pop-bloom"));
	shut();
	check("A DISMISSAL MID-GROWTH TAKES THE ANIMATION OFF, or it fights the fold", mustHtmlOf(pop()).style.animation, "");
	check("and the seed with it", mustHtmlOf(pop()).style.getPropertyValue("--wg-kit-pop-seed-x"), "");
	endExit(mustElement(pop()));
	await settle();
	check(
		"after the close the trigger is back, and was never altered",
		`${mustHtmlOf(anchor()).style.visibility}|${snap().rowTouched}`,
		"|||||",
	);

	// CONTEXT: reduced motion returns before the seat, so there is no movement to skip a beat of
	render(null, host);
	Object.assign(window, { matchMedia: () => ({ matches: true }) });
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
	const host = byId(document, "host");
	render(null, host);

	const wasRect = Element.prototype.getBoundingClientRect;
	Element.prototype.getBoundingClientRect = function (this: Element): DOMRect {
		if (this.classList.contains("wg-kit-pop")) return domRect(0, 0, 240, 180);
		if (this.classList.contains("wg-kit-anchor")) return domRect(40, 60, 100, 40);
		return domRect(0, 0, 0, 0);
	};
	const realStyle = globalThis.getComputedStyle;
	stubComputedStyle((node, pseudo) => ({
		...realStyle(node),
		borderRadius: pseudo ? "999px" : "0px",
		borderLeftWidth: "0px",
	}));

	const pop = () => htmlIn(host, ".wg-kit-pop");
	const anchor = () => htmlIn(host, ".wg-kit-anchor");
	const show = async (open: boolean, placement: PlacementName) => {
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
	check("the default placement still takes the trigger's place", mustHtmlOf(pop()).style.top, "60px");
	check("and the trigger still leaves for it", mustHtmlOf(anchor()).style.visibility, "hidden");
	check("it is not marked as the other placement", mustHtmlOf(pop()).classList.contains("is-below"), false);

	render(null, host);
	await show(true, "below");
	// CONTEXT: 60 top + 40 tall + the 6px gap the design draws
	check("BELOW puts the panel under the trigger", mustHtmlOf(pop()).style.top, "106px");
	check("and lines it up with the trigger's left edge", mustHtmlOf(pop()).style.left, "40px");
	check("THE TRIGGER STAYS ON SCREEN", mustHtmlOf(anchor()).style.visibility, "");
	check(
		"AND IS NEVER TOUCHED, whichever way the panel opens",
		`${foundAs(host, ".place-trigger", HTMLElement).style.scale}|${foundAs(host, ".place-trigger", HTMLElement).style.opacity}`,
		"|",
	);
	check(
		"the panel says which placement it is, so a caller can style it",
		mustHtmlOf(pop()).classList.contains("is-below"),
		true,
	);
	check(
		"the trigger's width is handed to the CSS",
		mustHtmlOf(pop()).style.getPropertyValue("--wg-kit-anchor-width"),
		"100px",
	);

	await show(false, "below");
	check(
		"the exit still folds back onto the trigger",
		/^translate\(40px, 60px\) scale\(0\.41/.test(mustHtmlOf(pop()).style.transform),
		true,
	);
	check("and the radius still travels with it", Math.round(parseFloat(mustHtmlOf(pop()).style.borderRadius)), 48);
	check("the trigger was never hidden, so there is nothing to give back", mustHtmlOf(anchor()).style.visibility, "");
	endExit(mustElement(pop()));
	await settle();
	check("and it closes", mustHtmlOf(pop()).classList.contains("is-open"), false);

	globalThis.getComputedStyle = realStyle;
	Element.prototype.getBoundingClientRect = wasRect;
	render(null, host);
}

// CONTEXT: registry/@default/filter-panel builds this by hand today
{
	const host = byId(document, "host");
	render(null, host);

	const people = ["Denis S.", "Maria K.", "Roman N."];
	const seen: string[] = [];
	render(
		h(Kit.PopoverSearch, {
			placeholder: "Find a person",
			hint: "Narrows the choices below, not the board",
			children: (needle: string) => {
				seen.push(needle);
				return people
					.filter((name) => name.toLowerCase().includes(needle))
					.map((name) => h(Kit.PopoverItem, { key: name }, name));
			},
		}),
		host,
	);

	check(
		"the search field is the kit's own Field",
		Boolean(host.querySelector(".wg-kit-pop-search .wg-kit-field")),
		true,
	);
	check("with a search glyph in it", Boolean(host.querySelector(".wg-kit-pop-search .wg-kit-icon-glyph")), true);
	check("its placeholder is the caller's", found(host, "input").getAttribute("placeholder"), "Find a person");
	check(
		"the hint says what is being narrowed",
		host.querySelector(".wg-kit-pop-search-hint")?.textContent,
		"Narrows the choices below, not the board",
	);
	check("every choice is shown before anything is typed", host.querySelectorAll(".wg-kit-pop-item").length, 3);
	check("and the needle starts empty", seen[seen.length - 1], "");

	const input = foundTag(host, "input", "input");
	input.value = "MAR";
	input.dispatchEvent(inputEvent());
	await settle();
	check("TYPING NARROWS THE CHOICES", host.querySelectorAll(".wg-kit-pop-item").length, 1);
	check("and it is the one that matched", found(host, ".wg-kit-pop-item").textContent, "Maria K.");
	check("the needle arrives folded and trimmed, so the caller does not redo it", seen[seen.length - 1], "mar");

	render(null, host);
}

// CONTEXT: the caller draws the day; the kit owns the month arithmetic and the state on a cell
{
	const host = byId(document, "host");
	render(null, host);

	const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
	const picked: { date: Date | null } = { date: null };
	let month = new Date(2026, 8, 1);
	const draw = (extra: Partial<CalendarProps> = {}) =>
		render(
			h(Kit.Calendar, {
				month,
				onMonthChange: (next: Date) => {
					month = next;
					draw();
				},
				selected: new Date(2026, 8, 12),
				today: new Date(2026, 8, 3),
				onSelect: (date: Date) => {
					picked.date = date;
				},
				...extra,
			}),
			host,
		);

	draw();
	check("seven weekday heads", host.querySelectorAll(".wg-kit-cal-weekday").length, 7);
	check("the week starts on Monday", found(host, ".wg-kit-cal-weekday").textContent, "M");
	// TRADE-OFF: always six rows, so the panel does not change height month to month
	check("always six rows of days", host.querySelectorAll(".wg-kit-cal-day").length, 42);
	check("the month is named in English", found(host, ".wg-kit-cal-month").textContent, "September 2026");
	check("the picked day is marked once", host.querySelectorAll(".wg-kit-cal-day.is-picked").length, 1);
	check("and it is the twelfth", found(host, ".wg-kit-cal-day.is-picked").textContent, "12");
	check("today is marked", host.querySelectorAll(".wg-kit-cal-day.is-today").length, 1);
	check(
		"the days that belong to the neighbouring months say so",
		host.querySelectorAll(".wg-kit-cal-day.is-outside").length,
		12,
	);

	mustElement(host.querySelectorAll(".wg-kit-cal-day")[8]).dispatchEvent(new MouseEvent("click", { bubbles: true }));
	check(
		"pressing a day reports a real date",
		picked.date instanceof Date
			? `${picked.date.getFullYear()}-${picked.date.getMonth()}-${picked.date.getDate()}`
			: picked.date,
		"2026-8-8",
	);

	found(host, '[aria-label="Next month"]').dispatchEvent(new MouseEvent("click", { bubbles: true }));
	await settle();
	check("the step moves the month", found(host, ".wg-kit-cal-month").textContent, "October 2026");
	found(host, '[aria-label="Previous month"]').dispatchEvent(new MouseEvent("click", { bubbles: true }));
	found(host, '[aria-label="Previous month"]').dispatchEvent(new MouseEvent("click", { bubbles: true }));
	await settle();
	check(
		"and back across the year without arithmetic bugs",
		found(host, ".wg-kit-cal-month").textContent,
		"August 2026",
	);

	month = new Date(2026, 8, 1);
	draw({ renderDay: (day) => (day.outside ? "" : (ROMAN[day.date.getDate()] ?? day.date.getDate())) });
	check(
		"THE DAY CELL IS THE CALLER'S TO DRAW",
		mustElement(host.querySelectorAll(".wg-kit-cal-day")[1]).textContent,
		"I",
	);
	check("and the kit still owns the state on it", host.querySelectorAll(".wg-kit-cal-day.is-picked").length, 1);

	render(null, host);
}

// CONTEXT: a track, a knob, and the exact number beside it
{
	const host = byId(document, "host");
	render(null, host);

	const wasRect = Element.prototype.getBoundingClientRect;
	Element.prototype.getBoundingClientRect = function (this: Element): DOMRect {
		if (this.classList.contains("wg-kit-progress-track")) return domRect(100, 0, 200, 6);
		return domRect(0, 0, 0, 0);
	};

	let value = 65;
	const draw = () =>
		render(
			h(Kit.Progress, {
				value,
				label: "Progress",
				onChange: (next: number) => {
					value = next;
					draw();
				},
			}),
			host,
		);
	draw();

	check(
		"the track carries the value so the plate reads at a glance",
		foundAs(host, ".wg-kit-progress-fill", HTMLElement).style.width,
		"65%",
	);
	check("the knob sits on it", foundAs(host, ".wg-kit-progress-knob", HTMLElement).style.left, "65%");
	check("and the digits are there for the exact one", found(host, ".wg-kit-progress-num").textContent, "65%");
	check("it announces itself as what it is", found(host, ".wg-kit-progress").getAttribute("role"), "slider");
	check("with the value a reader can hear", found(host, ".wg-kit-progress").getAttribute("aria-valuenow"), "65");

	const control = () => found(host, ".wg-kit-progress");
	control().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
	check("an arrow moves it one", value, 66);
	control().dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
	check("End takes it to the top", value, 100);
	control().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
	check("AND IT CANNOT GO PAST IT", value, 100);
	control().dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
	control().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
	check("nor below the bottom", value, 0);

	const track = () => found(host, ".wg-kit-progress-track");
	const pointer = (node: Element, name: string, clientX: number) => {
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

{
	const host = byId(document, "host");
	render(null, host);

	render(h(Kit.Badge, { tone: "success", variant: "solid" }, "done"), host);
	check(
		"a solid badge wears its tone filled",
		mustHtmlOf(host.firstChild).className,
		"wg-kit-pill wg-kit-inked is-ok is-solid",
	);
	check("and Pill is the same component", Kit.Pill, Kit.Badge);
	check(
		"every variant has its own class",
		Kit.BADGE_VARIANTS.map((variant) => Kit.pillClass({ variant })),
		[
			"wg-kit-pill wg-kit-inked",
			"wg-kit-pill wg-kit-inked is-solid",
			"wg-kit-pill wg-kit-inked is-outline",
			"wg-kit-pill wg-kit-inked is-dot",
			"wg-kit-pill wg-kit-inked is-text",
		],
	);
	render(h(Kit.Badge, { color: "purple", size: "s", className: "mine" }, "implementing"), host);
	check(
		"a palette colour becomes the ink both fills are mixed from",
		mustHtmlOf(host.firstChild).style.getPropertyValue("--wg-badge-ink"),
		"var(--wg-kit-purple)",
	);
	check(
		"a caller's class rides along with the kit's",
		mustHtmlOf(host.firstChild).className,
		"wg-kit-pill wg-kit-inked is-s mine",
	);
	render(h(Kit.Badge, { color: "#123456" }, "own"), host);
	check(
		"any other colour is taken as it is",
		mustHtmlOf(host.firstChild).style.getPropertyValue("--wg-badge-ink"),
		"#123456",
	);
	render(h(Kit.Badge, { color: { light: "#0a5c46", dark: "mint" } }, "brand"), host);
	check(
		"a pair names one ink per theme",
		["--wg-badge-ink-light", "--wg-badge-ink-dark"].map((name) =>
			mustHtmlOf(host.firstChild).style.getPropertyValue(name),
		),
		["#0a5c46", "mint"],
	);
	check("and says it is themed", mustHtmlOf(host.firstChild).classList.contains("is-themed"), true);
	render(h(Kit.Badge, { color: { light: "blue" } }, "one"), host);
	check(
		"a pair missing its dark half wears the light one in both",
		mustHtmlOf(host.firstChild).style.getPropertyValue("--wg-badge-ink-dark"),
		"var(--wg-kit-blue)",
	);

	render(h(Kit.Heading, null, "Plain"), host);
	check(
		"a heading in a widget is an h3 unless asked",
		mustHtmlOf(host.firstChild).outerHTML,
		'<h3 class="wg-kit-heading is-h3">Plain</h3>',
	);
	render(h(Kit.Heading, { level: 2, size: 4, className: "mine" }, "Small"), host);
	check(
		"the level is the outline, the size is the look",
		mustHtmlOf(host.firstChild).outerHTML,
		'<h2 class="wg-kit-heading is-h4 mine">Small</h2>',
	);
	const levelNoHeadingHas: Record<string, unknown> = { level: 9 };
	render(h(Kit.Heading, levelNoHeadingHas, "Far"), host);
	check("A LEVEL NO HEADING HAS FALLS BACK", mustHtmlOf(host.firstChild).tagName, "H3");
	render(h(Kit.Switch, { checked: true, className: "mine" }), host);
	check("a switch takes a caller's class too", mustHtmlOf(host.firstChild).className, "wg-kit-switch mine");

	let pressed = 0;
	render(h(Kit.ShowMore, { remaining: 12, onMore: () => (pressed += 1) }), host);
	check("show more says how many are left", host.textContent, "Show 12 more");
	foundAs(host, "button", HTMLElement).click();
	check("and a press asks for them", pressed, 1);
	render(h(Kit.ShowMore, { remaining: 0, onMore: () => {} }), host);
	check("NOTHING LEFT DRAWS NO BUTTON", host.innerHTML, "");
	render(h(Kit.ShowMore, { remaining: Number.NaN, onMore: () => {} }), host);
	check("NOR DOES A COUNT THAT IS NO NUMBER", host.innerHTML, "");
	check("a value that is no number draws an empty bar", Kit.barGeometry(400, "soon").active, null);
	render(h(Kit.ShowMore, { isLoading: true, onMore: () => {} }), host);
	check("a load under way cannot be asked twice", foundTag(host, "button", "button").disabled, true);

	const { barGeometry } = Kit;
	const wavy = barGeometry(400, 50);
	check("the wave stands in M3's 10px container", wavy.height, 10);
	check("the wave moves off its middle", /L\S+ (?!5L)/.test(String(wavy.active)), true);
	check(
		"THE WAVE RUNS THE WHOLE LENGTH, at a sliver and near the end alike",
		[5, 97].map((percent) =>
			present(barGeometry(400, percent).active)
				.split("L")
				.every((at) => at.endsWith(" 5")),
		),
		[false, false],
	);
	check("the track starts one stroke and one gap after the active end", present(wavy.track).startsWith("M208 "), true);
	check(
		"at zero only the track is drawn",
		[barGeometry(400, 0).active, present(barGeometry(400, 0).track).startsWith("M2 ")],
		[null, true],
	);
	check("at a hundred the track is gone", barGeometry(400, 100).track, null);

	const { circleGeometry, progressState } = Kit;
	check(
		"a ring names the three states by its value",
		[0, 1, 99, 100].map((percent) => progressState(percent)),
		["empty", "running", "running", "done"],
	);
	const ring = circleGeometry(48, 50);
	check(
		"an empty ring is all track and no active",
		[circleGeometry(48, 0).active, Boolean(circleGeometry(48, 0).track)],
		[null, true],
	);
	check(
		"a full ring is all active and no track",
		[Boolean(circleGeometry(48, 100).active), circleGeometry(48, 100).track],
		[true, null],
	);
	check("a half ring carries both", [Boolean(ring.active), Boolean(ring.track)], [true, true]);
	check(
		"A SMALL RING DRAWS A THIN STROKE: 2px at a row's 22 and 28, 3 between, the full 4 from 48",
		[22, 28, 36, 48, 96].map((size) => circleGeometry(size, 50).stroke),
		[2, 2, 3, 4, 4],
	);
	const gapPx = (size: number): number => {
		const drawn = circleGeometry(size, 50, { isWavy: false });
		const end = (present(drawn.active).split("L").at(-1) ?? "").split(" ").map(Number);
		const start = present(drawn.track).slice(1).split("L")[0]?.split(" ").map(Number) ?? [];
		return Math.hypot((end[0] ?? 0) - (start[0] ?? 0), (end[1] ?? 0) - (start[1] ?? 0));
	};
	check("and its gap shrinks with it, so a thin ring is not mostly gap", gapPx(22) < gapPx(48) * 0.6, true);
	render(h(Kit.ProgressBar, { shape: "circle", value: 50, size: 22 }), host);
	check(
		"the drawn ring wears the stroke its size asks for",
		[...host.querySelectorAll(".wg-kit-ring path")].map((path) => path.getAttribute("stroke-width")),
		["2", "2"],
	);
	check(
		"THE RING WAVES AROUND ITS RADIUS, and stands still when asked to",
		[ring, circleGeometry(48, 50, { isWavy: false })]
			.map(
				(drawn) =>
					new Set(
						present(drawn.active)
							.slice(1)
							.split("L")
							.map((point) => {
								const [x, y] = point.split(" ").map(Number);
								return (
									Math.round(Math.hypot((x ?? Number.NaN) - drawn.middle, (y ?? Number.NaN) - drawn.middle) * 2) / 2
								);
							}),
					).size,
			)
			.map((reaches) => reaches > 1),
		[true, false],
	);

	render(h(Kit.StatusProgress, { shape: "circle", value: 100, label: "Done" }), host);
	await settle();
	check(
		"A FINISHED StatusProgress WEARS THE SUCCESS INK AND A TICK",
		[
			host.querySelector(".wg-kit-ring")?.className,
			Boolean(host.querySelector(".wg-kit-ring-value .wg-kit-icon-glyph")),
		],
		["wg-kit-ring wg-kit-inked is-ok wg-kit-status is-done", true],
	);
	render(h(Kit.StatusProgress, { shape: "circle", value: 0 }), host);
	await settle();
	check(
		"an empty one is the neutral ink and says which state it is in",
		found(host, ".wg-kit-ring").className,
		"wg-kit-ring wg-kit-inked wg-kit-status is-empty",
	);
	render(h(Kit.StatusProgress, { value: 40 }), host);
	await settle();
	check(
		"and a running line is the accent, on the very same base",
		found(host, ".wg-kit-bar").className,
		"wg-kit-bar wg-kit-inked is-accent wg-kit-status is-running",
	);
	render(h(Kit.StatusProgress, { shape: "circle", value: 100, tones: { done: "info" } }), host);
	await settle();
	check(
		"the tones it paints each state with are the caller's to change",
		found(host, ".wg-kit-ring").className.includes("is-info"),
		true,
	);
	render(h(Kit.StatusProgress, { shape: "circle", value: 100, displayValue: "done!" }), host);
	await settle();
	check("a displayValue of its own outranks the tick", found(host, ".wg-kit-ring-value").textContent, "done!");
	render(h(Kit.ProgressBar, { shape: "circle", value: 100 }), host);
	await settle();
	check("THE BASE COMPONENT KNOWS NOTHING OF STATES", found(host, ".wg-kit-ring-value").textContent, "");
	render(
		h(Kit.ProgressBar, { shape: "circle", value: 42, displayValue: ({ value, state }) => `${value}·${state}` }),
		host,
	);
	await settle();
	check("displayValue is handed the value and the state", found(host, ".wg-kit-ring-value").textContent, "42·running");
	render(h(Kit.ProgressBar, { value: 30, displayValue: "30 of 100" }), host);
	await settle();
	check(
		"on a line the value stands in its own room at the end",
		[
			host.querySelector(".wg-kit-bar-said")?.textContent,
			htmlIn(host, ".wg-kit-bar")?.style.getPropertyValue("--wg-bar-value-room"),
		],
		["30 of 100", "8px"],
	);
	render(h(Kit.ProgressBar, { value: 30 }), host);
	await settle();
	check(
		"WITH NO displayValue THE ROOM IS NOTHING, so the line runs the whole width",
		[
			found(host, ".wg-kit-bar").classList.contains("has-value"),
			foundAs(host, ".wg-kit-bar", HTMLElement).style.getPropertyValue("--wg-bar-value-room"),
		],
		[false, "0px"],
	);
	check("and no stop mark is drawn unless it is asked for", host.querySelector(".wg-kit-bar-stop") === null, true);
	render(h(Kit.ProgressBar, { value: 30, displayValue: () => null }), host);
	await settle();
	check(
		"A displayValue THAT ANSWERS WITH NOTHING TAKES NO ROOM EITHER",
		[
			found(host, ".wg-kit-bar").classList.contains("has-value"),
			foundAs(host, ".wg-kit-bar", HTMLElement).style.getPropertyValue("--wg-bar-value-room"),
		],
		[false, "0px"],
	);
	render(h(Kit.StatusProgress, { value: 100 }), host);
	await settle();
	check(
		"A FINISHED STATUS LINE MAKES ROOM FOR ITS MARK",
		found(host, ".wg-kit-bar").classList.contains("has-value"),
		true,
	);
	render(null, host);
	const cursored = barGeometry(400, 50, { isCursorVisible: true });
	check("a cursor makes the bar as tall as itself", cursored.height, 20);
	check(
		"and stands a gap from the wave on both sides",
		[present(cursored.cursor).x, present(cursored.track).startsWith("M208 ")],
		[198, true],
	);
	check("no cursor is drawn unless asked", wavy.cursor, null);

	render(h(Kit.ProgressBar, { value: 40, label: "Loaded", onChange: () => {} }), host);
	const bar = found(host, ".wg-kit-bar");
	check(
		"UNCONTROLLED IT IS A PROGRESSBAR, and carries no cursor, onChange or not",
		[
			bar.getAttribute("role"),
			bar.classList.contains("is-settable"),
			host.querySelector(".wg-kit-bar-cursor") === null,
		],
		["progressbar", false, true],
	);
	check("with the value a reader can hear", bar.getAttribute("aria-valuenow"), "40");

	let moved = 0;
	render(h(Kit.ProgressBar, { value: 40, isControlled: true, onChange: (next: number) => (moved = next) }), host);
	await settle();
	const settable = found(host, ".wg-kit-bar");
	check(
		"CONTROLLED IT IS A SLIDER a person can take hold of",
		[settable.getAttribute("role"), settable.classList.contains("is-settable")],
		["slider", true],
	);
	check(
		"and the drawing it asks for carries the cursor, which an uncontrolled one never has",
		[Boolean(barGeometry(400, 40, { isCursorVisible: true }).cursor), barGeometry(400, 40).cursor],
		[true, null],
	);
	check("a reader can reach it by keyboard", settable.getAttribute("tabindex"), "0");
	settable.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
	check("and an end key carries it to the far edge", moved, 100);
	settable.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
	check("and home back to the near one", moved, 0);
	render(null, host);
}

// CONTEXT: reading B — inline code is plain, not bold
{
	const host = byId(document, "host");
	render(null, host);

	const NOTE =
		"## Why one surface\n\nRead the same **frontmatter** and drew it three *different* ways.\n\n`properties: Status, Priority`\n\nSee [[Property anchoring]] #orbitask\n";
	const typed: { text: string | null } = { text: null };
	render(
		h(Kit.MarkdownEditor, {
			value: NOTE,
			onInput: (next: string) => {
				typed.text = next;
			},
		}),
		host,
	);

	const mirror = found(host, ".wg-kit-md-mirror");
	const input = foundTag(host, "textarea.wg-kit-md-input", "textarea");
	check("NOTHING IS HIDDEN — the mirror is the note, character for character", mirror.textContent, NOTE);
	check("and the textarea holds the same string", input.value, NOTE);
	check("the mirror is not read out twice by a screen reader", mirror.getAttribute("aria-hidden"), "true");

	const marked = (name: string) =>
		[...host.querySelectorAll(`.wg-kit-md-mirror .${name}`)].map((node) => node.textContent);
	check("the heading line is bold, hashes and all", marked("is-heading").join("|"), "## Why one surface");
	check("bold keeps its asterisks", marked("is-strong").join("|"), "**frontmatter**");
	check("italic keeps its asterisk", marked("is-em").join("|"), "*different*");
	check("a link keeps its brackets and takes the accent", marked("is-link").join("|"), "[[Property anchoring]]");
	check("INLINE CODE IS NOT STYLED", marked("is-code").length, 0);
	check("a hashtag stays an ordinary hashtag", host.querySelectorAll(".wg-kit-md-mirror span").length, 4);

	input.value = `${NOTE}x`;
	input.dispatchEvent(inputEvent());
	check("typing is reported, plain", typed.text, `${NOTE}x`);

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
		process.env["WG_CHROME"],
		"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
		"/Applications/Chromium.app/Contents/MacOS/Chromium",
		"/usr/bin/google-chrome",
		"/usr/bin/chromium",
	].filter((candidate): candidate is string => Boolean(candidate));

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
	const KIT_SOURCE = readFileSync("packages/kit/src/constants/popover.ts", "utf8");
	const kitNumber = (name: string) => Number(captured(new RegExp(`const ${name} = ([\\d.]+)`), KIT_SOURCE));

	const entry = [
		'import { createElement as h } from "react";',
		'import { render } from "./packages/core/src/engine/render.js";',
		'import { Button, cardClass, Icon, MarkdownEditor, List, Plate, Popover, PopoverItem, Row, RowLabel, RowValue, Sidebar, SidebarGroup, SidebarRow, SidebarSheet } from "./packages/kit/src/index.ts";',
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
		"render(h('div', null, [h('div', { key: 'tile', className: cardClass({}) }, 'tile'), h('div', { key: 'solid', className: cardClass({ variant: 'solid' }) }, 'solid'), h('div', { key: 'lifted', className: cardClass({ lift: true }) }, 'lifted'), h(Plate, { key: 'plate' }, 'plate'), h(List, { key: 'list' }, h(Row, null, h(RowLabel, null, 'row'))), h(Button, { key: 'grey' }, 'grey')]), cards);",
		"const cardFrame = (node) => { const s = getComputedStyle(node); return { fill: s.backgroundColor, corner: s.borderTopLeftRadius, pad: s.paddingTop, edge: s.boxShadow, cast: castOf(node).filter((part) => part !== 'none').length }; };",
		"payload.cards = { tile: cardFrame(cards.querySelector('.wg-kit-card:not(.is-solid):not(.is-lifted)')), solid: cardFrame(cards.querySelector('.wg-kit-card.is-solid:not(.wg-kit-plate):not(.wg-kit-list)')), lifted: cardFrame(cards.querySelector('.wg-kit-card.is-lifted')), plate: cardFrame(cards.querySelector('.wg-kit-plate')), list: cardFrame(cards.querySelector('.wg-kit-list')), greyControl: getComputedStyle(cards.querySelector('.wg-kit-btn'), '::before').backgroundColor };",
		"const onGround = (host) => ({ ground: getComputedStyle(host).backgroundColor, cast: castOf(host.querySelector('.wg-kit-side')) });",
		"for (const theme of ['light', 'dark']) { const host = document.querySelector('.wg-ground-' + theme); render(h(Sidebar, null, h(SidebarGroup, {}, rows(theme))), host); }",
		"payload.lift = { light: onGround(document.querySelector('.wg-ground-light')), dark: onGround(document.querySelector('.wg-ground-dark')) };",
		"const picked = document.querySelector('.wg-picked');",
		"const pickedRow = (key, extra) => h(SidebarRow, { key, label: 'row ' + key, value: 'v', ...extra });",
		"render(h(Sidebar, null, h(SidebarGroup, {}, [pickedRow(1, {}), pickedRow(2, { selected: true }), pickedRow(3, { state: { unset: true }, selected: true }), pickedRow(4, { state: { unset: true } })])), picked);",
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
		"render(h(Sidebar, null, h(SidebarGroup, null, h(Popover, { isOpen: true, trigger: h(SidebarRow, { state: { pressable: true }, label: 'A settings row', value: 'Something' }) }, h(PopoverItem, {}, 'Rename')))), pops);",
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
		`<!doctype html><html><head><meta charset="utf-8"><style>${readFileSync("apps/obsidian/styles.css", "utf8")}</style>` +
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
			`<script>${present(built.outputFiles[0]).text}</script></body></html>`,
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
			stdio: ["ignore", "pipe", process.env["WG_DEBUG"] ? "inherit" : "ignore"],
		},
	);
	const raw = dumped.match(/<script id="wg-measure" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
	if (!raw) {
		console.error(`mirror gate: the page never reported — file://${file}`);
		process.exit(1);
	}
	// CONTEXT: React 19 reports a render failure as a window error event, not a throw
	const reported: unknown = JSON.parse(raw.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
	const broke = memberOf(reported, "pageError");
	if (broke) {
		if (!Array.isArray(broke)) throw new TypeError("the page error is not a list");
		const messages: unknown[] = broke;
		for (const message of messages) console.error(`mirror gate: ${String(message)}`);
		console.error(`mirror gate: file://${file}`);
		process.exit(1);
	}
	const parsedPage: unknown = JSON.parse(raw.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
	const measured = mirrorPageOf(parsedPage);

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
	const frameOf = (side: SideFrameSeen) => `${side.padding} | ${side.radius} | ${side.background} | ${side.edge}`;
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
	check("its wash is a step on the group, not a hole", /^rgba\(0, 0, 0, 0\)$/.test(String(washes[1])), false);
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
	] as const) {
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
			Math.round((padTop ?? Number.NaN) + (padBottom ?? Number.NaN) + seen.name.height + 1 + seen.note.height),
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
	check(
		"even where the trigger is what sets the panel's width",
		Number(present(seam.trigger).split("x")[0]) > 200,
		true,
	);
	check(
		"THE GROWTH REALLY RUNS — an assigned value would list nothing",
		present(grow.panel).includes("wg-kit-pop-bloom:running"),
		true,
	);
	check(
		"and the paint really interpolates, it does not jump",
		`${present(grow.panel).some((one) => one.startsWith("background-color"))} ${present(grow.panel).some((one) => one.startsWith("border-top-left-radius"))}`,
		"true true",
	);
	check(
		"THE TRIGGER HAS NOTHING RUNNING ON IT, and nothing written to it",
		`${present(grow.trigger).length} ${grow.touched}`,
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
	const lightness = (luma: number) => {
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
	const SURFACES = { solid: undefined, glass: "glass" } as const;
	const SLOTS = Object.entries(GROUNDS).flatMap(([theme, ground]) =>
		Object.entries(SURFACES).map(([surface, surfaceWord]) => ({ theme, surface, ground, surfaceWord })),
	);
	const pageHeight = BLOCK.top + SLOTS.length * BLOCK.slot;
	const liftFile = nodePath.join(work, "lift.html");
	writeFileSync(
		liftFile,
		`<!doctype html><html><head><meta charset="utf-8"><style>${readFileSync("apps/obsidian/styles.css", "utf8")}</style>` +
			`<style>html, body { margin: 0; padding: 0; } body { width: 400px; height: ${pageHeight}px; }` +
			`.wg-ground { position: absolute; left: 0; width: 400px; height: ${BLOCK.slot}px; background: var(--wg-kit-raise); }` +
			`.wg-ground .wg-kit-side { position: absolute; left: ${BLOCK.left}px; top: ${BLOCK.top}px; width: ${BLOCK.width}px; height: ${BLOCK.height}px; }</style>` +
			`</head><body>` +
			// CONTEXT: a custom property is computed where it is declared, so the ground carries BOTH
			// the theme and .wg-root — on body, --wg-kit-raise would resolve once, against nothing
			SLOTS.map(
				({ ground, surfaceWord }, at) =>
					`<div class="wg-root wg-ground" style="top:${at * BLOCK.slot}px;${ground}"><div class="${sidebarClass({ surface: surfaceWord })}"></div></div>`,
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
		const column: unknown = JSON.parse(
			execFileSync(
				"/usr/bin/python3",
				["tools/png-column.py", liftPng, String(BLOCK.left + 100), String(edge), String(edge + 80)],
				{ encoding: "utf8" },
			),
		);
		if (!isNumberList(column)) throw new TypeError("png-column.py answered something other than a list of numbers");
		const ground = nth(column, -1);
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
					open,
					onOpenChange: (next: boolean) => {
						open = next;
						draw();
					},
					height: { peekPx: 100, maxPx: 500 },
				},
				"body",
			),
			stage,
		);
	draw();

	const sheet = () => foundAs(stage, ".wg-kit-sheet", HTMLElement);
	const grip = () => found(stage, ".wg-kit-sheet-grip");
	// CONTEXT: preact commits a state change on a microtask, so a drag is read one tick later
	const at = async (type: string, clientY: number) => {
		grip().dispatchEvent(new MouseEvent(type, { bubbles: true, clientY }));
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

{
	const stage = dom.window.document.createElement("div");
	dom.window.document.body.appendChild(stage);
	const drawnBy = (name: string) => {
		render(h(Kit.Icon, { name }), stage);
		const svg = stage.querySelector("svg");
		return svg ? svg.getAttribute("viewBox") : null;
	};

	render(h(Kit.PopoverItem, { checked: false, onClick: () => {} }, "Plain"), stage);
	check(
		"a popover item is one line unless it is given a second",
		Boolean(stage.querySelector(".wg-kit-pop-sub")),
		false,
	);

	render(h(Kit.PopoverItem, { checked: true, sub: "What it draws.", onClick: () => {} }, "Told"), stage);
	check(
		"a sentence handed to it stands under the label, inside the item",
		[stage.querySelector(".wg-kit-pop-sub")?.textContent, Boolean(stage.querySelector(".wg-kit-pop-item.is-two"))],
		["What it draws.", true],
	);

	check("a name the kit draws itself is drawn on the kit's grid", drawnBy("menu"), "0 0 20 20");
	check("a name only lucide draws is drawn on lucide's", drawnBy("anchor"), "0 0 24 24");
	check(
		"and it says so, so the stroke can be scaled to it",
		stage.querySelector("svg")?.classList.contains("is-lucide"),
		true,
	);
	check("a name nobody draws draws nothing", drawnBy("no-such-icon-anywhere"), null);
	check(
		"nor does a name every object answers to, which no table ever held",
		["constructor", "hasOwnProperty", "toString", "valueOf", "__proto__"].map(drawnBy),
		[null, null, null, null, null],
	);

	render(null, stage);
	stage.remove();
}

{
	const stage = dom.window.document.createElement("div");
	dom.window.document.body.appendChild(stage);
	const drawn = (props: PlaceholderMarkProps) => {
		render(h(PlaceholderMark, props), stage);
		const worn = htmlIn(stage, ".wg-kit-mark");
		return {
			classes: worn ? worn.className.split(" ") : [],
			hidden: worn ? worn.getAttribute("aria-hidden") : null,
			width: worn ? worn.style.width : null,
			d: stage.querySelector("path")?.getAttribute("d") ?? null,
		};
	};
	const said = (mark: Mark) => `${mark.shape}/${mark.tone}`;

	const repeated = new Set<string>();
	for (let again = 0; again < 1000; again += 1) repeated.add(said(markOf("Kind of Blue")));
	check("a seed hashed a thousand times comes back the one mark", [...repeated], ["quatrefoil/warning"]);
	check("and a different seed disagrees", said(markOf("In Rainbows")) !== said(markOf("Kind of Blue")), true);
	check("as do two seeds a character apart", said(markOf("Album 1")) !== said(markOf("Album 2")), true);

	const PEOPLE = [
		"Ada Lovelace",
		"Miles Davis",
		"Grace Hopper",
		"Jonny Greenwood",
		"Nina Simone",
		"Kurt Godel",
		"Alan Kay",
		"Barbara Liskov",
		"Sofia Gubaidulina",
		"Rich Hickey",
		"Leslie Lamport",
		"Joni Mitchell",
		"Hedy Lamarr",
		"Brian Eno",
	];
	const ALBUMS = [
		"Kind of Blue",
		"In Rainbows",
		"Blue",
		"Music for Airports",
		"Spirit of Eden",
		"Pet Sounds",
		"Remain in Light",
		"Selected Ambient Works",
		"Loveless",
		"OK Computer",
		"The Koln Concert",
		"Blonde",
		"Bitches Brew",
		"Talk Talk",
	];
	const PROJECTS = [
		"widgetarium",
		"brairhealth",
		"shido-app",
		"Obsidian Plugins",
		"Second Brain",
		"Q4 Planning",
		"Home Renovation",
		"Thesis",
		"Invoices 2026",
		"Reading List",
		"Garden",
		"Taxes",
		"Trip to Japan",
		"Band Practice",
	];
	const seeds = [
		...new Set([
			...PEOPLE,
			...ALBUMS,
			...PROJECTS,
			...PROJECTS.flatMap((project) => ALBUMS.map((album) => `Projects/${project}/${album}.md`)),
			...PEOPLE.flatMap((person) => PROJECTS.map((project) => `${person} - ${project}`)),
		]),
	];
	const marks = seeds.map(markOf);
	const markOfAnyArity: (...seeds: unknown[]) => Mark = markOf;
	const countedBy = (pick: (mark: Mark) => string) => {
		const counted = new Map<string, number>();
		for (const mark of marks) counted.set(pick(mark), (counted.get(pick(mark)) ?? 0) + 1);
		return counted;
	};
	const evenly = (counted: Map<string, number>, names: readonly string[]) => {
		const fair = seeds.length / names.length;
		const counts = names.map((name) => counted.get(name) ?? 0);
		return [Math.min(...counts) >= fair / 2, Math.max(...counts) <= fair * 2];
	};
	const shapes = countedBy((mark) => mark.shape);
	const tones = countedBy((mark) => mark.tone);

	check("the corpus is wide enough to measure a spread over", seeds.length, 434);
	check("every shape in the vocabulary is drawn by it", shapes.size, MARK_SHAPE_NAMES.length);
	check("every tone too", tones.size, MARK_TONE_NAMES.length);
	check("no shape is starved, none hogs", evenly(shapes, MARK_SHAPE_NAMES), [true, true]);
	check("no tone is starved, none hogs", evenly(tones, MARK_TONE_NAMES), [true, true]);
	check("and the pairs reach nearly the whole vocabulary", new Set(marks.map(said)).size, 83);

	check(
		"no seed at all is the empty seed, and it is one mark rather than a new one each time",
		[markOfAnyArity(), markOf(null), markOf(undefined)].map(said),
		[said(markOf("")), said(markOf("")), said(markOf(""))],
	);

	check("a mark is decorative, so the caller carries the label", drawn({ seed: "Blue" }).hidden, "true");
	check("it is painted by the kit's own tone plate", drawn({ seed: "Blue" }).classes, [
		"wg-kit-mark",
		"wg-kit-tone",
		toneClass(markOf("Blue").tone),
	]);
	check("it fills what it stands in unless it is given a size", drawn({ seed: "Blue" }).width, "100%");
	check("a size makes it an avatar", drawn({ seed: "Blue", size: 24 }).width, "24px");
	check(
		"a seeded mark draws the very shape its seed names",
		drawn({ seed: "Blue" }).d,
		drawn({ seed: "Blue", shape: markOf("Blue").shape }).d,
	);
	check(
		"every name in the vocabulary draws a form of its own",
		new Set(MARK_SHAPE_NAMES.map((shape) => drawn({ seed: "Blue", shape }).d)).size,
		MARK_SHAPE_NAMES.length,
	);
	check(
		"an asked tone outranks the seeded one",
		drawn({ seed: "Blue", tone: "error" }).classes.includes("is-err"),
		true,
	);
	check(
		"a shape no table holds falls back to the seed's, prototype keys included",
		["constructor", "__proto__", "toString", "no-such-shape"].map((shape) => drawn({ seed: "Blue", shape }).d),
		Array(4).fill(drawn({ seed: "Blue" }).d),
	);

	render(null, stage);
	stage.remove();
}

{
	const host = byId(document, "host");
	const PROBE = "probe-class";
	const NEEDED_TO_DRAW: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
		Popover: { trigger: h("button", null, "open"), isOpen: true },
		FormFields: { fields: [], draft: {}, onChange: () => undefined },
		Calendar: { month: new Date(2026, 8, 1), today: new Date(2026, 8, 21) },
		Segmented: { items: [{ value: "a", label: "A" }], value: "a" },
		Tabs: { items: [{ value: "a", label: "A" }], value: "a" },
		SlotList: { slot: () => h("i"), rows: [1], give: () => ({}) },
		Icon: { name: "search" },
		Pagination: { count: 3 },
		DataTable: { columns: [{ key: "a" }], rows: [{ a: 1 }] },
		ShowMore: { remaining: 2 },
		Emblem: { label: "probe" },
		StatusProgress: { value: 50 },
		Spinner: { size: 16 },
		SidebarRow: { label: "row" },
		SidebarGroup: { label: "group" },
		DiffBar: { added: 2, removed: 1 },
		Ceiling: { total: 501, tone: "inherit" },
		Line: { tone: "inherit", text: "line" },
		RenderedMarkdown: { host: { can: { renderMarkdown: false }, ui: {} }, markdown: "text" },
		MoreWhenSeen: { onSeen: () => {} },
	};
	const PART_OF: Readonly<Record<string, string>> = {
		EmblemImage: "Emblem",
		EmblemDiceBear: "Emblem",
		EmblemFallback: "Emblem",
		PopoverTrigger: "Popover",
		PopoverContent: "Popover",
		SelectTrigger: "Select",
		SelectValue: "Select",
		SelectContent: "Select",
		SelectItem: "Select",
		SparklineLine: "Sparkline",
		SparklineArea: "Sparkline",
		SparklineBars: "Sparkline",
		SparklineDot: "Sparkline",
	};
	const PART_NEEDS: Readonly<Record<string, Readonly<Record<string, unknown>>>> = { SelectItem: { value: "a" } };
	const DRAWN_ONLY_ONCE_AN_IMAGE_LOADS = new Set(["EmblemImage"]);
	const DRAWS_NO_ELEMENT_OF_ITS_OWN = new Set(["Select"]);
	const PARENT_NEEDS: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
		Emblem: { label: "probe" },
		Popover: { defaultOpen: true },
		Select: { defaultOpen: true },
		Sparkline: { data: [1, 2] },
	};
	const withoutClass: string[] = [];
	for (const [name, drawn] of Object.entries(Kit)) {
		if (
			!isDrawable(drawn) ||
			!/^[A-Z]/.test(name) ||
			DRAWN_ONLY_ONCE_AN_IMAGE_LOADS.has(name) ||
			DRAWS_NO_ELEMENT_OF_ITS_OWN.has(name)
		)
			continue;
		render(null, host);
		const part = h(drawn, { ...NEEDED_TO_DRAW[name], ...PART_NEEDS[name], className: PROBE });
		const parent = PART_OF[name];
		render(parent ? h(drawableOf(memberOf(Kit, parent)), PARENT_NEEDS[parent], part) : part, host);
		await settle();
		if (!document.querySelector(`.${PROBE}`)) withoutClass.push(name);
	}
	render(null, host);
	check("EVERY KIT COMPONENT TAKES A CALLER'S CLASS", withoutClass, []);
}

{
	const { valuesOf, sparkSpots, linePath, areaPath, sparkBars, spotAt, highlightedIndex } =
		await import("../packages/kit/src/utils/sparkline.ts");
	const { chartColorOf, seriesColorName } = await import("../packages/kit/src/utils/chart-colors.ts");
	check(
		"A SPARKLINE READS NUMBERS AND NUMERIC TEXT, AND ANYTHING ELSE IS A GAP",
		valuesOf([1, "2", "", "x", null, 3]),
		[1, 2, null, null, null, 3],
	);
	check(
		"THE LOWEST POINT SITS ON THE FLOOR AND THE HIGHEST ON THE CEILING, INSIDE THE INSET",
		sparkSpots([0, 10], 108, 40).map((spot) => [present(spot).x, present(spot).y]),
		[
			[4, 36],
			[104, 4],
		],
	);
	check(
		"A FLAT SERIES IS DRAWN THROUGH THE MIDDLE",
		sparkSpots([5, 5], 108, 40).map((spot) => present(spot).y),
		[20, 20],
	);
	check(
		"A GAP BREAKS THE LINE INTO TWO RUNS",
		(linePath(sparkSpots([1, 2, null, 3, 4], 108, 40)).match(/M/g) ?? []).length,
		2,
	);
	check("AN AREA CLOSES ON ITS BASE", areaPath(sparkSpots([0, 10], 108, 40), 36), "M4 36L4 36L104 4L104 36Z");
	check("A DOT MARKS THE HIGHEST POINT WHEN ASKED", spotAt(sparkSpots([3, 9, 1], 108, 40), "max")?.value, 9);
	check(
		"A PLACE THE SPARKLINE NEVER HAD MARKS THE LAST POINT",
		spotAt(sparkSpots([3, 9, 1], 108, 40), "middle")?.value,
		1,
	);
	check("THE LAST DRAWN BAR IS THE HIGHLIGHTED ONE", highlightedIndex([1, 2, null], "last"), 1);
	check("A BAR AT ZERO STAYS VISIBLE", present(sparkBars([0, 4], 100, 40)[0]).height, 1.5);
	check("A NUMBERED CHART COLOUR IS ITS TOKEN", chartColorOf(3, 0), "var(--wg-kit-chart-3)");
	check("A PALETTE NAME IS THE KIT'S INK", chartColorOf("purple", 0), "var(--wg-kit-purple)");
	check("A SERIES WITH NO COLOUR TAKES ITS PLACE'S TOKEN", chartColorOf(undefined, 6), "var(--wg-kit-chart-2)");
	check("A HAND-WRITTEN COLOUR IS REFUSED FOR THE PLACE'S TOKEN", chartColorOf("#ff0000", 0), "var(--wg-kit-chart-1)");
	check("A SERIES KEY BECOMES A SAFE PROPERTY NAME", seriesColorName("notes per day"), "--color-notes-per-day");

	const { Sparkline, SparklineArea, SparklineLine, SparklineDot } = await import("../packages/kit/src/index.ts");
	render(
		h(
			Sparkline,
			{ data: [1, 5, 3], label: "Notes", color: "green" },
			h(SparklineArea),
			h(SparklineLine),
			h(SparklineDot, { at: "max" }),
		),
		host,
	);
	await settle();
	const spark = htmlIn(host, ".wg-kit-spark");
	check(
		"A SPARKLINE WEARS ITS COLOUR AS A TOKEN",
		spark?.style.getPropertyValue("--wg-kit-spark"),
		"var(--wg-kit-green)",
	);
	check(
		"A LABELLED SPARKLINE IS AN IMAGE WITH A NAME",
		[spark?.querySelector("svg")?.getAttribute("role"), spark?.querySelector("svg")?.getAttribute("aria-label")],
		["img", "Notes"],
	);
	check(
		"A SPARKLINE DRAWS ITS PARTS IN THE ORDER GIVEN",
		[...(spark?.querySelectorAll("path, circle") ?? [])].map((part) => part.getAttribute("class")),
		["wg-kit-spark-area", "wg-kit-spark-line", "wg-kit-spark-dot"],
	);
	render(null, host);

	const charts = await import("../packages/kit/src/charts/index.ts");
	const measured = HTMLElement.prototype.getBoundingClientRect;
	HTMLElement.prototype.getBoundingClientRect = () => domRect(0, 0, 320, 180);
	render(
		h(
			charts.ChartContainer,
			{ config: { s0: { label: "Notes" }, s1: { label: "Links", color: "cyan" } } },
			h(charts.ChartTooltipContent, {
				active: true,
				label: "Feb",
				indicator: "line",
				payload: [
					{ dataKey: "s0", name: "s0", value: 1305, color: "var(--color-s0)" },
					{ dataKey: "s1", name: "s1", value: 200, color: "var(--color-s1)" },
				],
			}),
		),
		host,
	);
	await settle();
	const chartBox = htmlIn(host, ".wg-kit-chart");
	check(
		"A CHART'S SERIES TAKE THEIR COLOURS FROM ITS CONFIG",
		[chartBox?.style.getPropertyValue("--color-s0"), chartBox?.style.getPropertyValue("--color-s1")],
		["var(--wg-kit-chart-1)", "var(--wg-kit-cyan)"],
	);
	const tip = host.querySelector(".wg-kit-chart-tip");
	check("THE CHART TOOLTIP IS THE KIT'S GLASS", tip?.classList.contains("wg-kit-glass"), true);
	check(
		"THE TOOLTIP NAMES A SERIES BY ITS CONFIG LABEL",
		[...(tip?.querySelectorAll(".wg-kit-chart-tip-name") ?? [])].map((name) => name.textContent),
		["Notes", "Links"],
	);
	check(
		"THE TOOLTIP HEADS WITH THE POINT IT STANDS AT",
		tip?.querySelector(".wg-kit-chart-tip-label")?.textContent,
		"Feb",
	);
	check(
		"A TOOLTIP VALUE IS WRITTEN FOR A PERSON",
		tip?.querySelector(".wg-kit-chart-tip-value")?.textContent,
		(1305).toLocaleString(),
	);
	check(
		"THE TOOLTIP MARK IS THE ASKED INDICATOR",
		tip?.querySelector(".wg-kit-chart-mark")?.getAttribute("data-indicator"),
		"line",
	);
	render(null, host);
	HTMLElement.prototype.getBoundingClientRect = measured;
	check(
		"A CHART MARK STANDS STILL ON LOAD UNLESS ASKED TO MOVE",
		[
			memberOf(memberOf(calledAsFunction(charts.Area, { dataKey: "x" }), "props"), "isAnimationActive"),
			memberOf(
				memberOf(calledAsFunction(charts.Bar, { dataKey: "x", isAnimationActive: true }), "props"),
				"isAnimationActive",
			),
		],
		[false, true],
	);
	check(
		"RECHARTS' RAW TOOLTIP AND LEGEND ARE HANDED OVER ONLY AS THE KIT'S OWN",
		[
			memberOf(charts, "Tooltip"),
			memberOf(charts, "Legend"),
			charts.ChartTooltip !== undefined,
			charts.ChartLegend !== undefined,
		],
		[undefined, undefined, true, true],
	);
}

{
	const { paginationItems, PaginationLink, Skeleton, Table, TableBody, TableCaption, TableCell, TableRow } =
		await import("../packages/kit/src/index.ts");
	const shownPages = (page: number, count: number) =>
		paginationItems(page, count)
			.map((entry) => (entry.kind === "gap" ? "…" : entry.page))
			.join(" ");
	check("A SHORT RUN OF PAGES IS SHOWN WHOLE", shownPages(3, 7), "1 2 3 4 5 6 7");
	check("NEAR THE START ONE GAP STANDS BEFORE THE LAST PAGE", shownPages(1, 10), "1 2 3 4 5 … 10");
	check("THE LAST PAGE BEFORE THE FIRST GAP OPENS STILL READS FROM ONE", shownPages(4, 10), "1 2 3 4 5 … 10");
	check("THE FIRST PAGE AFTER THE LAST GAP CLOSES STILL READS TO THE END", shownPages(7, 10), "1 … 6 7 8 9 10");
	check("IN THE MIDDLE A GAP STANDS ON EACH SIDE OF THE CURRENT PAGE", shownPages(5, 10), "1 … 4 5 6 … 10");
	check("NEAR THE END ONE GAP STANDS AFTER THE FIRST PAGE", shownPages(10, 10), "1 … 6 7 8 9 10");
	check("NO PAGES DRAWS NOTHING", shownPages(1, 0), "");

	render(h(PaginationLink, { isActive: true }, "3"), host);
	await settle();
	check(
		"THE CURRENT PAGE IS ANNOUNCED AS THE CURRENT PAGE",
		[
			host.querySelector("button")?.getAttribute("aria-current"),
			host.querySelector("button")?.hasAttribute("data-active"),
		],
		["page", true],
	);

	const { Pagination } = await import("../packages/kit/src/index.ts");
	render(h(Pagination, { count: 1 }), host);
	await settle();
	check("A SINGLE PAGE DRAWS NO PAGINATION", host.querySelector("nav"), null);
	render(null, host);
	render(h(Pagination, { count: 5, defaultPage: 2 }), host);
	await settle();
	const currentPage = () => host.querySelector('[aria-current="page"]')?.textContent;
	check("THE READY PAGINATION MARKS THE PAGE IT STARTS ON", currentPage(), "2");
	htmlIn(host, '[aria-label="Go to the next page"]')?.click();
	await settle();
	check("NEXT MOVES THE READY PAGINATION ONE PAGE ON", currentPage(), "3");
	check(
		"THE PAGE IT STANDS ON IS SPOKEN FOR A NARROW REGION",
		host.querySelector('[role="status"]')?.getAttribute("aria-label"),
		"Page 3 of 5",
	);
	const moved: number[] = [];
	render(null, host);
	render(h(Pagination, { count: 5, page: 5, onPageChange: (next: number) => moved.push(next) }), host);
	await settle();
	check(
		"ON THE LAST PAGE NEXT IS OFF AND PREVIOUS ASKS FOR THE PAGE BEFORE",
		[
			tagIn(host, '[aria-label="Go to the next page"]', "button")?.disabled,
			(htmlIn(host, '[aria-label="Go to the previous page"]')?.click(), moved[0]),
		],
		[true, 4],
	);
	check(
		"A PAGE IS THE KIT'S GHOST ICON BUTTON AND A STEP IS ITS GHOST BUTTON",
		[
			host.querySelector('[aria-current="page"]')?.className,
			host.querySelector('[aria-label="Go to the next page"]')?.className,
		],
		[
			"wg-kit-icon is-ghost is-s wg-kit-pagination-link",
			"wg-kit-btn is-ghost is-s wg-kit-pagination-link wg-kit-pagination-step",
		],
	);
	const variantNeverHad: Record<string, unknown> = { count: 5, variant: "tiny" };
	render(h(Pagination, variantNeverHad), host);
	await settle();
	check(
		"A VARIANT PAGINATION NEVER HAD DRAWS IN FULL",
		host.querySelector("nav")?.getAttribute("data-variant"),
		"full",
	);
	render(null, host);

	const { DataTable } = await import("../packages/kit/src/index.ts");
	const invoices = [
		{ ref: "a", client: "Halden & Co", amount: 1860 },
		{ ref: "b", client: "Northwind", amount: null },
	];
	const invoiceColumns = [
		{ key: "client", label: "Client" },
		{ key: "amount", label: "Amount", type: "number" },
	];
	const asked: { sorts: SortOrder[]; picks: string[] } = { sorts: [], picks: [] };
	render(null, host);
	render(
		h(DataTable, {
			rows: invoices,
			columns: [
				...invoiceColumns,
				{
					key: "badge",
					label: "Mark",
					render: (row: Readonly<Record<string, unknown>>) => h("b", null, String(row["ref"])),
				},
			],
			sort: { key: "amount", direction: "asc" },
			onSortChange: (next: SortOrder) => asked.sorts.push(next),
			selected: "b",
			onSelect: (key: string) => asked.picks.push(key),
		}),
		host,
	);
	await settle();
	const heads = [...host.querySelectorAll("th")];
	const firstCells = [...host.querySelectorAll("tbody tr:first-child td")];
	check(
		"A NUMBER COLUMN STANDS AT THE END IN ITS HEAD AND ITS CELLS ALIKE",
		[
			heads[1]?.getAttribute("data-align"),
			firstCells[1]?.getAttribute("data-align"),
			heads[0]?.getAttribute("data-align"),
		],
		["end", "end", "start"],
	);
	check(
		"A CELL SHOWS ITS NUMBER FOR A PERSON AND A DASH FOR NOTHING",
		[firstCells[1]?.textContent, host.querySelectorAll("tbody tr")[1]?.querySelectorAll("td")[1]?.textContent],
		[(1860).toLocaleString(), "—"],
	);
	check("A COLUMN'S RENDER DRAWS ITS CELL", firstCells[2]?.innerHTML, "<b>a</b>");
	check("THE SORTED COLUMN SAYS SO TO A SCREEN READER", heads[1]?.getAttribute("aria-sort"), "ascending");
	check(
		"AN END COLUMN'S HEAD ENDS IN ITS WORD, SO THE WORD LINES UP WITH THE VALUES UNDER IT",
		[heads[1]?.querySelector("button")?.lastChild?.nodeName, heads[0]?.querySelector("button")?.lastChild?.nodeName],
		["#text", "svg"],
	);
	heads[1]?.querySelector("button")?.click();
	heads[0]?.querySelector("button")?.click();
	check("PRESSING THE SORTED HEAD TURNS THE ORDER, ANOTHER HEAD STARTS ASCENDING", asked.sorts, [
		{ key: "amount", direction: "desc" },
		{ key: "client", direction: "asc" },
	]);
	check(
		"THE SELECTED ROW IS MARKED BY ITS REF",
		[...host.querySelectorAll("tbody tr")].map((row) => row.getAttribute("data-state")),
		[null, "selected"],
	);
	htmlIn(host, "tbody tr")?.click();
	check("PRESSING A ROW SELECTS IT BY ITS REF", asked.picks, ["a"]);

	render(null, host);
	render(h(DataTable, { rows: [], columns: invoiceColumns, isLoading: true }), host);
	await settle();
	check(
		"A TABLE STILL READING DRAWS SKELETON ROWS",
		host.querySelectorAll("tbody tr .wg-kit-skeleton-group").length,
		10,
	);
	render(h(DataTable, { rows: [], columns: invoiceColumns }), host);
	await settle();
	check(
		"AN EMPTY TABLE SAYS SO ACROSS EVERY COLUMN",
		[host.querySelector("tbody td")?.textContent, host.querySelector("tbody td")?.getAttribute("colspan")],
		["Nothing here yet.", "2"],
	);
	render(h(DataTable, { rows: invoices, columns: invoiceColumns, count: 4, page: 2 }), host);
	await settle();
	check(
		"A TABLE OF MANY PAGES DRAWS THE KIT'S PAGINATION UNDER IT",
		host.querySelector('[aria-current="page"]')?.textContent,
		"2",
	);
	render(null, host);

	const { CodeBlock } = await import("../packages/kit/src/index.ts");
	render(h(CodeBlock, { code: "<Button />", label: "Usage" }), host);
	await settle();
	check(
		"A CODE BLOCK HOLDS ITS CODE AS TEXT, NEVER AS MARKUP",
		[host.querySelector("pre.wg-kit-code-block > code")?.textContent, host.querySelector("button")],
		["<Button />", null],
	);
	render(null, host);

	const sheet = readFileSync("apps/obsidian/styles.css", "utf8");
	const heightOf = (selector: string) =>
		new RegExp(`${selector.replace(/[.[\]"=]/g, "\\$&")} \\{[^}]*height: ([^;]+);`).exec(sheet)?.[1];
	check(
		"A BUTTON, A FIELD, AN ICON BUTTON AND THEIR SKELETONS READ ONE HEIGHT TOKEN PER SIZE",
		[
			heightOf(".wg-kit-btn.is-s"),
			heightOf(".wg-kit-field.is-s"),
			heightOf(".wg-kit-icon.is-s"),
			heightOf('.wg-kit-skeleton[data-kind="button"][data-size="s"]'),
			heightOf(".wg-kit-btn.is-m"),
			heightOf(".wg-kit-icon.is-m"),
			heightOf('.wg-kit-skeleton[data-kind="field"]'),
		],
		[
			"var(--wg-kit-control-s)",
			"var(--wg-kit-control-s)",
			"var(--wg-kit-control-s)",
			"var(--wg-kit-control-s)",
			"var(--wg-kit-control-m)",
			"var(--wg-kit-control-m)",
			"var(--wg-kit-control-m)",
		],
	);

	render(h(Skeleton, { kind: "text", lines: 4 }), host);
	await settle();
	check(
		"A TEXT SKELETON DRAWS ITS LINES, THE LAST ONE SHORT",
		[...host.querySelectorAll('[data-part="line"]')].map((line) => line.hasAttribute("data-last")),
		[false, false, false, true],
	);
	render(h(Skeleton, { kind: "emblem", size: "l" }), host);
	await settle();
	check(
		"AN EMBLEM SKELETON TAKES THE EMBLEM'S OWN SIZE",
		htmlIn(host, ".wg-kit-skeleton")?.style.getPropertyValue("--wg-kit-skeleton-size"),
		"64px",
	);
	render(h(Skeleton, { kind: "button", size: "xl" }), host);
	await settle();
	check(
		"A BUTTON SKELETON OF A SIZE NO BUTTON HAS IS DRAWN MEDIUM",
		host.querySelector(".wg-kit-skeleton")?.getAttribute("data-size"),
		"m",
	);
	const kindNeverHad: Record<string, unknown> = { kind: "sonar" };
	render(h(Skeleton, kindNeverHad), host);
	await settle();
	check(
		"A KIND THE SKELETON NEVER HAD DRAWS A BLOCK",
		host.querySelector(".wg-kit-skeleton")?.getAttribute("data-kind"),
		"block",
	);
	check(
		"A SKELETON IS HIDDEN FROM A SCREEN READER",
		host.querySelector(".wg-kit-skeleton")?.getAttribute("aria-hidden"),
		"true",
	);

	const selectedRow: Record<string, unknown> = { "data-state": "selected" };
	render(
		h(
			Table,
			null,
			h(TableCaption, null, "Sample"),
			h(TableBody, null, h(TableRow, selectedRow, h(TableCell, null, "one"))),
		),
		host,
	);
	await settle();
	check(
		"A TABLE STANDS IN ITS OWN SIDEWAYS SCROLL",
		host.querySelector(".wg-kit-table-scroll > table.wg-kit-table") !== null,
		true,
	);
	check(
		"A SELECTED ROW SAYS SO ON THE ELEMENT",
		host.querySelector("tr.wg-kit-table-row")?.getAttribute("data-state"),
		"selected",
	);
	render(null, host);
}

console.log(failed ? `\n${failed} failed` : `\nall passed (${checks} checks)`);
process.exit(failed ? 1 : 0);
