import { JSDOM } from "jsdom";
import type { ReactNode } from "react";
import { found } from "./dom-find.ts";

const dom = new JSDOM('<!doctype html><body><div id="host"></div><button id="outside">outside</button></body>', {
	pretendToBeVisual: true,
});
Object.assign(globalThis, {
	window: dom.window,
	document: dom.window.document,
	Node: dom.window.Node,
	Element: dom.window.Element,
	HTMLElement: dom.window.HTMLElement,
	SVGElement: dom.window.SVGElement,
	Event: dom.window.Event,
	getComputedStyle: (node: Element) => dom.window.getComputedStyle(node),
	requestAnimationFrame: dom.window.requestAnimationFrame,
	cancelAnimationFrame: dom.window.cancelAnimationFrame,
	MouseEvent: dom.window.MouseEvent,
	KeyboardEvent: dom.window.KeyboardEvent,
	FocusEvent: dom.window.FocusEvent,
	ResizeObserver: class {
		observe(): void {}
		disconnect(): void {}
	},
});
const motion = { isReduced: false };
Object.assign(dom.window, { matchMedia: () => ({ matches: motion.isReduced }) });

const RECT_ATTRIBUTE = "data-test-rect";
const POP_SIZE = { width: 200, height: 100 };
const TRIGGER_AT: Readonly<Record<string, string>> = { [RECT_ATTRIBUTE]: "300,300,60,30" };
Object.assign(dom.window.Element.prototype, { getBoundingClientRect: stubbedRect });

const { createElement: h } = await import("react");
const { render } = await import("../packages/core/src/engine/render.ts");
const kit = await import("../packages/kit/src/index.ts");
const { placeFloating } = await import("../packages/kit/src/utils/floating-placement.ts");
const { openLayerCount } = await import("../packages/kit/src/utils/layer-stack.ts");
const snaps = await import("../packages/kit/src/utils/drawer-snaps.ts");

const host = found(document, "#host");
const outside = found(document, "#outside");
let failed = 0;
let checks = 0;

function check(name: string, got: unknown, want: unknown): void {
	checks += 1;
	const ok = shown(got) === shown(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${name}${ok ? "" : `  got ${shown(got)}, want ${shown(want)}`}`);
}

function shown(value: unknown): string {
	try {
		return JSON.stringify(value) ?? String(value);
	} catch {
		return String(value);
	}
}

function stubbedRect(this: Element): DOMRect {
	const said = this.getAttribute(RECT_ATTRIBUTE)?.split(",").map(Number);
	if (said) return rectOf(said[0] ?? 0, said[1] ?? 0, said[2] ?? 0, said[3] ?? 0);
	if (this.classList.contains("wg-kit-anchor") && this.firstElementChild)
		return stubbedRect.call(this.firstElementChild);
	if (this.classList.contains("wg-kit-pop") && this instanceof dom.window.HTMLElement)
		return rectOf(parseFloat(this.style.left) || 0, parseFloat(this.style.top) || 0, POP_SIZE.width, POP_SIZE.height);
	return rectOf(0, 0, 0, 0);
}

function rectOf(left: number, top: number, width: number, height: number): DOMRect {
	const box = { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top };
	return { ...box, toJSON: () => box };
}

const settle = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => setTimeout(done, 0)));
const wait = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));

async function draw(tree: ReactNode): Promise<void> {
	render(tree, host);
	await settle();
}

function fire(target: Element | Document, type: string, init: MouseEventInit = {}): void {
	target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, ...init }));
}

function key(target: Element | null, name: string): void {
	if (!target) throw new Error(`no element to press ${name} on`);
	target.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true }));
}

function hover(target: Element): void {
	fire(target, "pointerover", { relatedTarget: null });
}

function unhover(target: Element): void {
	fire(target, "pointerout", { relatedTarget: outside });
}

function slotted(slot: string): Element | null {
	return document.querySelector(`[data-slot="${slot}"]`);
}

function isDrawn(slot: string): boolean {
	return slotted(slot) !== null;
}

function stateOf(slot: string): string | null {
	return slotted(slot)?.getAttribute("data-state") ?? null;
}

function focusedText(): string {
	return document.activeElement?.textContent?.trim() ?? "";
}

async function placement(): Promise<void> {
	const anchor = { left: 100, top: 100, right: 140, bottom: 120, width: 40, height: 20 };
	const viewport = { width: 800, height: 600 };
	const panel = { width: 200, height: 100 };
	const base = { anchor, viewport, panel, sideOffset: 4, alignOffset: 0 } as const;
	const below = placeFloating({ ...base, side: "bottom", align: "center" });
	check("bottom center stands under the anchor's middle", [below.left, below.top, below.side], [20, 124, "bottom"]);
	check("it grows from the anchor's middle, at the edge facing it", below.origin, "100px top");
	const low = { ...anchor, top: 560, bottom: 580 };
	const flipped = placeFloating({ ...base, anchor: low, side: "bottom", align: "start" });
	check("bottom with no room below flips above", [flipped.side, flipped.top], ["top", 456]);
	const edge = { ...anchor, left: 760, right: 790, width: 30 };
	const beside = placeFloating({ ...base, anchor: edge, side: "right", align: "start" });
	check("right with no room flips to the left", [beside.side, beside.left], ["left", 556]);
	const shifted = placeFloating({ ...base, anchor: edge, side: "bottom", align: "start" });
	check("a panel past the right edge is shifted back into view", shifted.left, 592);
	const middle = { left: 300, top: 300, right: 340, bottom: 320, width: 40, height: 20 };
	const ended = placeFloating({ ...base, anchor: middle, side: "top", align: "end" });
	check("top end ends at the anchor's right edge, above it", [ended.left, ended.top, ended.side], [140, 196, "top"]);
}

async function sidedPopover(): Promise<void> {
	await draw(
		h(kit.Popover, { defaultOpen: true }, [
			h(kit.PopoverTrigger, { key: "t", ...TRIGGER_AT }, "Open"),
			h(kit.PopoverContent, { key: "c", side: "top", align: "end" }, "Body"),
		]),
	);
	const panel = found(document, '[data-slot="popover-content"]');
	check(
		"POPOVER CONTENT side=top align=end IS DRAWN THERE: above the trigger, its right edge on the trigger's",
		[panel.getAttribute("data-side"), panel.getAttribute("data-align"), styleOf(panel, "top"), styleOf(panel, "left")],
		["top", "end", "196px", "160px"],
	);
	await draw(null);
	await draw(
		h(kit.Popover, { defaultOpen: true }, [
			h(kit.PopoverTrigger, { key: "t" }, "Open"),
			h(kit.PopoverContent, { key: "c" }, "Body"),
		]),
	);
	check(
		"a popover asked for no side keeps its old place over the trigger",
		slotted("popover-content")?.getAttribute("data-side"),
		"over",
	);
	await draw(null);
}

function styleOf(element: Element, property: "top" | "left"): string {
	return element instanceof dom.window.HTMLElement ? element.style[property] : "";
}

async function tooltip(): Promise<void> {
	await draw(
		h(
			kit.TooltipProvider,
			{ delayDuration: 0 },
			h(kit.Tooltip, null, [
				h(kit.TooltipTrigger, { key: "t" }, "Hover me"),
				h(kit.TooltipContent, { key: "c" }, "Add to library"),
			]),
		),
	);
	const trigger = found(document, '[data-slot="tooltip-trigger"]');
	check("a tooltip is not drawn before the pointer comes", isDrawn("tooltip-content"), false);
	hover(trigger);
	await settle();
	const content = document.querySelector('[role="tooltip"]');
	check(
		"HOVER OPENS THE TOOLTIP and the trigger is described by it",
		[
			content?.getAttribute("data-slot"),
			trigger.getAttribute("aria-describedby") === content?.id,
			stateOf("tooltip-trigger"),
		],
		["tooltip-content", true, "open"],
	);
	key(document.body, "Escape");
	await settle();
	check("Escape closes it", stateOf("tooltip-content"), "closed");
	await wait(260);
	check("and once it has faded it leaves the page", isDrawn("tooltip-content"), false);
	await draw(
		h(kit.Tooltip, { delayDuration: 60 }, [
			h(kit.TooltipTrigger, { key: "t" }, "Slow"),
			h(kit.TooltipContent, { key: "c" }, "Tip"),
		]),
	);
	hover(found(document, '[data-slot="tooltip-trigger"]'));
	await settle();
	const early = isDrawn("tooltip-content");
	await wait(90);
	check("a delayed tooltip waits for its delay", [early, stateOf("tooltip-content")], [false, "open"]);
	motion.isReduced = true;
	key(document.body, "Escape");
	await settle();
	await settle();
	check("WITH REDUCED MOTION A CLOSED TOOLTIP LEAVES AT ONCE, no fade held", isDrawn("tooltip-content"), false);
	motion.isReduced = false;
	await draw(null);
}

async function hoverCard(): Promise<void> {
	await draw(
		h(kit.HoverCard, { openDelay: 0, closeDelay: 0 }, [
			h(kit.HoverCardTrigger, { key: "t", href: "#" }, "@nextjs"),
			h(kit.HoverCardContent, { key: "c" }, "The React framework"),
		]),
	);
	const trigger = found(document, '[data-slot="hover-card-trigger"]');
	hover(trigger);
	await settle();
	check("HOVER CARD OPENS ON HOVER", [trigger.tagName, stateOf("hover-card-content")], ["A", "open"]);
	unhover(trigger);
	await settle();
	check("and closes when the pointer leaves", stateOf("hover-card-content"), "closed");
	await draw(null);
}

function dropdown(
	onSelect: (event: Event) => void,
	onChecked: (checked: boolean) => void,
	onPicked: (value: string) => void,
): ReactNode {
	return h(kit.DropdownMenu, null, [
		h(kit.DropdownMenuTrigger, { key: "t" }, "Open"),
		h(kit.DropdownMenuContent, { key: "c" }, [
			h(kit.DropdownMenuLabel, { key: "l" }, "My account"),
			h(kit.DropdownMenuItem, { key: "p", onSelect }, "Profile"),
			h(kit.DropdownMenuItem, { key: "d", disabled: true }, "Disabled"),
			h(kit.DropdownMenuItem, { key: "s" }, "Settings", h(kit.DropdownMenuShortcut, null, "⌘S")),
			h(kit.DropdownMenuCheckboxItem, { key: "x", onCheckedChange: onChecked }, "Status bar"),
			h(kit.DropdownMenuRadioGroup, { key: "r", defaultValue: "a", onValueChange: onPicked }, [
				h(kit.DropdownMenuRadioItem, { key: "a", value: "a" }, "Top"),
				h(kit.DropdownMenuRadioItem, { key: "b", value: "b" }, "Bottom"),
			]),
			h(kit.DropdownMenuSeparator, { key: "sep" }),
			h(kit.DropdownMenuSub, { key: "sub" }, [
				h(kit.DropdownMenuSubTrigger, { key: "st" }, "Invite"),
				h(kit.DropdownMenuSubContent, { key: "sc" }, [
					h(kit.DropdownMenuItem, { key: "e" }, "Email"),
					h(kit.DropdownMenuItem, { key: "m" }, "Message"),
				]),
			]),
			h(kit.DropdownMenuItem, { key: "out", variant: "destructive" }, "Log out"),
		]),
	]);
}

async function dropdownMenu(): Promise<void> {
	const said: string[] = [];
	await draw(
		dropdown(
			(event) => said.push(`select ${event.type}`),
			(checked) => said.push(`checked ${checked}`),
			(value) => said.push(`picked ${value}`),
		),
	);
	const trigger = found(document, '[data-slot="dropdown-menu-trigger"]');
	fire(trigger, "click", { detail: 0 });
	await settle();
	check(
		"A DROPDOWN OPENED BY KEYBOARD IS A MENU WITH ITS FIRST ITEM FOCUSED",
		[found(document, '[role="menu"]').getAttribute("data-slot"), trigger.getAttribute("aria-expanded"), focusedText()],
		["dropdown-menu-content", "true", "Profile"],
	);
	key(document.activeElement, "ArrowDown");
	check("ArrowDown steps over a disabled item", focusedText(), "Settings⌘S");
	key(document.activeElement, "End");
	check("End goes to the last item", focusedText(), "Log out");
	key(document.activeElement, "s");
	check("typing a letter goes to the item it starts", focusedText(), "Settings⌘S");
	check(
		"the destructive variant is marked",
		slotted("dropdown-menu-content")?.querySelector('[data-variant="destructive"]')?.textContent,
		"Log out",
	);
	fire(found(document, '[role="menuitemcheckbox"]'), "click");
	await settle();
	check(
		"a checkbox item reports its new state and closes the menu",
		[said.at(-1), stateOf("dropdown-menu-content")],
		["checked true", "closed"],
	);
	fire(trigger, "click", { detail: 1 });
	await settle();
	check("a pointer opening focuses the panel, not an item", document.activeElement?.getAttribute("role"), "menu");
	fire(found(document, '[role="menuitemradio"]:not([aria-checked="true"])'), "click");
	await settle();
	check("a radio item picks its value", said.at(-1), "picked b");
	fire(trigger, "click", { detail: 0 });
	await settle();
	key(found(document, '[data-slot="dropdown-menu-item"]'), "Enter");
	await settle();
	check(
		"Enter on an item selects it and closes the menu",
		[said.at(-1), stateOf("dropdown-menu-content")],
		["select select", "closed"],
	);
	await subMenu(trigger);
	await draw(null);
}

async function subMenu(trigger: Element): Promise<void> {
	await wait(220);
	fire(trigger, "click", { detail: 0 });
	await settle();
	const subTrigger = found(document, '[data-slot="dropdown-menu-sub-trigger"]');
	key(subTrigger, "ArrowRight");
	await settle();
	check(
		"ARROW RIGHT OPENS THE SUB MENU AND FOCUSES ITS FIRST ITEM",
		[stateOf("dropdown-menu-sub-content"), subTrigger.getAttribute("aria-expanded"), focusedText()],
		["open", "true", "Email"],
	);
	fire(found(document, '[data-slot="dropdown-menu-sub-content"]'), "pointerdown");
	await settle();
	check("a press inside the sub menu is not outside the root", stateOf("dropdown-menu-content"), "open");
	key(document.activeElement, "ArrowLeft");
	await settle();
	check(
		"ArrowLeft closes the sub menu and returns to its trigger",
		[stateOf("dropdown-menu-sub-content"), focusedText()],
		["closed", "Invite"],
	);
	fire(subTrigger, "pointermove");
	await settle();
	fire(subTrigger, "click");
	await settle();
	check(
		"A PRESS ON A SUB TRIGGER OPENED BY HOVER FOCUSES INTO ITS PANEL",
		[stateOf("dropdown-menu-sub-content"), focusedText()],
		["open", "Email"],
	);
	fire(menuItemNamed("Log out"), "pointermove");
	await settle();
	check(
		"HOVERING A SIBLING ITEM CLOSES THE OPEN SUB MENU AND LEAVES THE FOCUS ON THAT ITEM",
		[stateOf("dropdown-menu-sub-content"), focusedText()],
		["closed", "Log out"],
	);
	key(document.activeElement, "Escape");
	await settle();
	check(
		"Escape closes the menu and gives focus back to the trigger",
		[stateOf("dropdown-menu-content"), document.activeElement === trigger],
		["closed", true],
	);
	fire(trigger, "click", { detail: 1 });
	await settle();
	fire(outside, "pointerdown");
	await settle();
	check("a press outside closes it", stateOf("dropdown-menu-content"), "closed");
	await wait(220);
	fire(trigger, "click", { detail: 0 });
	await settle();
	key(found(document, '[data-slot="dropdown-menu-sub-trigger"]'), "ArrowRight");
	await settle();
	key(document.activeElement, "Enter");
	await settle();
	check(
		"SELECTING AN ITEM IN A SUB MENU CLOSES THE WHOLE TREE AND GIVES THE FOCUS TO THE ROOT TRIGGER",
		[stateOf("dropdown-menu-content"), stateOf("dropdown-menu-sub-content"), document.activeElement === trigger],
		["closed", "closed", true],
	);
}

function menuItemNamed(text: string): Element {
	const item = [...document.querySelectorAll('[data-slot="dropdown-menu-item"]')].find(
		(node) => node.textContent === text,
	);
	if (!item) throw new Error(`no menu item reads ${text}`);
	return item;
}

async function contextMenu(): Promise<void> {
	await draw(
		h(kit.ContextMenu, null, [
			h(kit.ContextMenuTrigger, { key: "t" }, "Right click here"),
			h(kit.ContextMenuContent, { key: "c" }, [h(kit.ContextMenuItem, { key: "b" }, "Back")]),
		]),
	);
	fire(found(document, '[data-slot="context-menu-trigger"]'), "contextmenu", { clientX: 120, clientY: 80 });
	await settle();
	const panel = found(document, '[data-slot="context-menu-content"]');
	check(
		"A RIGHT CLICK OPENS THE CONTEXT MENU AT THE POINTER",
		[panel.getAttribute("data-state"), styleOf(panel, "left"), styleOf(panel, "top"), panel.getAttribute("data-side")],
		["open", "122px", "80px", "right"],
	);
	await draw(null);
}

async function menubar(): Promise<void> {
	await draw(
		h(kit.Menubar, null, [
			h(kit.MenubarMenu, { key: "f", value: "file" }, [
				h(kit.MenubarTrigger, { key: "t" }, "File"),
				h(kit.MenubarContent, { key: "c" }, h(kit.MenubarItem, null, "New tab")),
			]),
			h(kit.MenubarMenu, { key: "e", value: "edit" }, [
				h(kit.MenubarTrigger, { key: "t" }, "Edit"),
				h(kit.MenubarContent, { key: "c" }, [
					h(kit.MenubarItem, { key: "u" }, "Undo"),
					h(kit.MenubarSub, { key: "s" }, [
						h(kit.MenubarSubTrigger, { key: "t" }, "Find"),
						h(kit.MenubarSubContent, { key: "c" }, h(kit.MenubarItem, null, "Search the web")),
					]),
				]),
			]),
		]),
	);
	const [file, edit] = [...document.querySelectorAll('[data-slot="menubar-trigger"]')];
	if (!file || !edit) throw new Error("the menubar drew no triggers");
	fire(file, "click", { detail: 1 });
	await settle();
	hover(edit);
	await settle();
	check(
		"HOVERING ANOTHER TRIGGER WHILE ONE IS OPEN SWITCHES THE MENU",
		[file.getAttribute("aria-expanded"), edit.getAttribute("aria-expanded")],
		["false", "true"],
	);
	key(found(document, '[data-slot="menubar-sub-trigger"]'), "ArrowRight");
	await settle();
	check(
		"ARROW RIGHT ON A SUB TRIGGER IN THE BAR OPENS THE SUB MENU, NOT THE NEXT MENU",
		[edit.getAttribute("aria-expanded"), focusedText()],
		["true", "Search the web"],
	);
	key(document.activeElement, "ArrowLeft");
	await settle();
	key(found(document, '[data-slot="menubar-content"][data-state="open"]'), "ArrowRight");
	await settle();
	check(
		"ArrowRight in a menu opens the next one, wrapping round",
		[file.getAttribute("aria-expanded"), focusedText()],
		["true", "New tab"],
	);
	key(document.activeElement, "Escape");
	await settle();
	key(file, "ArrowRight");
	check("ArrowRight on a trigger moves along the bar", document.activeElement === edit, true);
	fire(edit, "click", { detail: 1 });
	await settle();
	key(found(document, '[data-slot="menubar-sub-trigger"]'), "ArrowRight");
	await settle();
	hover(file);
	await settle();
	hover(edit);
	await settle();
	check(
		"A SUB MENU LEFT OPEN WHEN THE BAR SWITCHED AWAY IS SHUT WHEN ITS MENU OPENS AGAIN",
		[edit.getAttribute("aria-expanded"), stateOf("menubar-sub-content") === "open"],
		["true", false],
	);
	await draw(null);
}

async function navigationMenu(): Promise<void> {
	await draw(
		h(
			kit.NavigationMenu,
			null,
			h(kit.NavigationMenuList, null, [
				h(kit.NavigationMenuItem, { key: "a", value: "start" }, [
					h(kit.NavigationMenuTrigger, { key: "t" }, "Getting started"),
					h(kit.NavigationMenuContent, { key: "c" }, h(kit.NavigationMenuLink, { href: "#intro" }, "Introduction")),
				]),
				h(
					kit.NavigationMenuItem,
					{ key: "d" },
					h(kit.NavigationMenuLink, { href: "#docs", className: kit.navigationMenuTriggerStyle() }, "Docs"),
				),
				h(kit.NavigationMenuIndicator, { key: "i" }),
			]),
		),
	);
	const trigger = found(document, '[data-slot="navigation-menu-trigger"]');
	fire(trigger, "click");
	await settle();
	check(
		"A NAVIGATION TRIGGER OPENS ITS CONTENT INSIDE THE ONE VIEWPORT",
		[
			trigger.getAttribute("aria-expanded"),
			slotted("navigation-menu-viewport")?.querySelector('[data-slot="navigation-menu-content"]') !== null,
		],
		["true", true],
	);
	fire(found(document, '[href="#intro"]'), "click");
	await settle();
	check("a link inside closes the menu", stateOf("navigation-menu-viewport"), "closed");
	check(
		"navigationMenuTriggerStyle names the trigger's look: our ghost Button",
		kit.navigationMenuTriggerStyle(),
		"wg-kit-btn is-ghost is-m wg-kit-nav-trigger",
	);
	await wait(260);
	key(trigger, "ArrowDown");
	await settle();
	await settle();
	check("ARROW DOWN ON A CLOSED TRIGGER OPENS IT AND FOCUSES ITS FIRST LINK", focusedText(), "Introduction");
	await draw(null);
}

async function sheetAndAlert(): Promise<void> {
	await draw(
		h(kit.Sheet, null, [
			h(kit.SheetTrigger, { key: "t" }, "Open"),
			h(kit.SheetContent, { key: "c", side: "left" }, [
				h(kit.SheetHeader, { key: "h" }, [
					h(kit.SheetTitle, { key: "t" }, "Edit profile"),
					h(kit.SheetDescription, { key: "d" }, "Change it here."),
				]),
				h(kit.SheetFooter, { key: "f" }, h(kit.SheetClose, null, "Done")),
			]),
		]),
	);
	fire(found(document, '[data-slot="sheet-trigger"]'), "click");
	await settle();
	const sheet = found(document, '[data-slot="sheet-content"]');
	check(
		"A SHEET IS A MODAL DIALOG ON ITS SIDE, NAMED BY ITS TITLE",
		[
			sheet.getAttribute("role"),
			sheet.getAttribute("data-side"),
			sheet.getAttribute("aria-labelledby") === slotted("sheet-title")?.id,
		],
		["dialog", "left", true],
	);
	fire(found(document, '[data-slot="sheet-overlay"]'), "pointerdown");
	await settle();
	check("a press on its scrim closes it", stateOf("sheet-content"), "closed");
	await draw(null);
	const said: string[] = [];
	await draw(
		h(kit.AlertDialog, { defaultOpen: true, onOpenChange: (open: boolean) => said.push(`open ${open}`) }, [
			h(kit.AlertDialogContent, { key: "c" }, [
				h(kit.AlertDialogTitle, { key: "t" }, "Delete the note?"),
				h(kit.AlertDialogFooter, { key: "f" }, [
					h(kit.AlertDialogAction, { key: "a" }, "Delete"),
					h(kit.AlertDialogCancel, { key: "x" }, "Cancel"),
				]),
			]),
		]),
	);
	await settle();
	fire(found(document, '[data-slot="alert-dialog-overlay"]'), "pointerdown");
	await settle();
	check(
		"AN ALERT DIALOG IGNORES ITS SCRIM AND FOCUSES CANCEL FIRST",
		[slotted("alert-dialog-content")?.getAttribute("role"), stateOf("alert-dialog-content"), focusedText()],
		["alertdialog", "open", "Cancel"],
	);
	fire(found(document, '[data-slot="alert-dialog-action"]'), "click");
	await settle();
	check("its action closes it", [stateOf("alert-dialog-content"), said], ["closed", ["open false"]]);
	await draw(null);
}

async function layeredEscape(): Promise<void> {
	await draw(
		h(
			kit.Sheet,
			{ defaultOpen: true },
			h(kit.SheetContent, null, [
				h(kit.SheetTitle, { key: "t" }, "Filters"),
				h(kit.DropdownMenu, { key: "m", defaultOpen: true }, [
					h(kit.DropdownMenuTrigger, { key: "t" }, "Sort"),
					h(kit.DropdownMenuContent, { key: "c" }, h(kit.DropdownMenuItem, null, "Newest")),
				]),
			]),
		),
	);
	await settle();
	key(document.body, "Escape");
	await settle();
	check(
		"ESCAPE CLOSES ONLY THE TOP LAYER: the menu goes, the sheet stays",
		[stateOf("dropdown-menu-content"), stateOf("sheet-content")],
		["closed", "open"],
	);
	await draw(null);
	await settle();
	check("every layer leaves the stack when it is gone", openLayerCount(), 0);
}

async function escapeInsideDialog(): Promise<void> {
	const said: string[] = [];
	await draw(
		h(
			kit.Dialog,
			{ defaultOpen: true, onOpenChange: (open: boolean) => said.push(`dialog ${open}`) },
			h(kit.DialogContent, null, [
				h(kit.DialogTitle, { key: "t" }, "Edit"),
				h(kit.Popover, { key: "p", defaultOpen: true }, [
					h(kit.PopoverTrigger, { key: "t" }, "Due"),
					h(kit.PopoverContent, { key: "c" }, "Body"),
				]),
			]),
		),
	);
	await settle();
	key(document.body, "Escape");
	await settle();
	check(
		"ESCAPE OVER A POPOVER IN A DIALOG CLOSES THE POPOVER ALONE",
		[stateOf("popover-content"), stateOf("dialog-content"), said],
		["closed", "open", []],
	);
	key(document.body, "Escape");
	await settle();
	check("and the next Escape closes the dialog, once", said, ["dialog false"]);
	await draw(null);
}

async function escapeInsideInlineSheet(): Promise<void> {
	await draw(
		h(
			kit.SidebarSheet,
			{ defaultOpen: true },
			h(kit.Popover, { defaultOpen: true }, [
				h(kit.PopoverTrigger, { key: "t" }, "Sort"),
				h(kit.PopoverContent, { key: "c" }, "Newest"),
			]),
		),
	);
	const sheetState = (): string | null => found(document, ".wg-kit-sheet").getAttribute("data-state");
	const opener = found(document, '[data-slot="popover-trigger"]');
	key(opener, "Escape");
	await settle();
	check(
		"A SHEET AND THE POPOVER IN IT, OPEN TOGETHER: ESCAPE INSIDE TAKES THE POPOVER FIRST",
		[stateOf("popover-content"), sheetState()],
		["closed", "open"],
	);
	key(outside, "Escape");
	await settle();
	check("an inline sheet leaves an Escape pressed outside it alone", sheetState(), "open");
	key(opener, "Escape");
	await settle();
	check("and folds on one pressed inside it", sheetState(), "closed");
	await draw(null);
}

async function inlineCommandOverlay(): Promise<void> {
	let shut = 0;
	await draw(
		h(kit.CommandMenuOverlay, { isOpen: true, isPortaled: false, onClose: () => (shut += 1) }, h("button", null, "In")),
	);
	const stray = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
	outside.dispatchEvent(stray);
	check(
		"AN INLINE COMMAND OVERLAY LEAVES AN ESCAPE PRESSED OUTSIDE IT ALONE",
		[shut, stray.defaultPrevented],
		[0, false],
	);
	key(found(document, ".wg-kit-command-overlay button"), "Escape");
	check("and closes on one pressed inside it", shut, 1);
	await draw(null);
}

async function dialogBridge(): Promise<void> {
	let closes = 0;
	await draw(h(kit.Dialog, { isOpen: true, title: "Edit", onClose: () => (closes += 1) }, h("button", null, "Save")));
	await settle();
	key(document.body, "Escape");
	await settle();
	check("A DIALOG GIVEN isOpen ANSWERS ESCAPE THROUGH onClose EXACTLY ONCE", closes, 1);
	const save = [...document.querySelectorAll<HTMLElement>('[data-slot="dialog-content"] button')].at(-1);
	save?.focus();
	key(save ?? null, "Tab");
	check(
		"and Tab from its last control wraps to its first",
		document.activeElement?.getAttribute("aria-label"),
		"Close",
	);
	await draw(null);
}

async function hoverCardLayer(): Promise<void> {
	await draw(
		h(kit.HoverCard, { openDelay: 0, closeDelay: 0 }, [
			h(kit.HoverCardTrigger, { key: "t", href: "#" }, "@nextjs"),
			h(kit.HoverCardContent, { key: "c" }, "The React framework"),
		]),
	);
	hover(found(document, '[data-slot="hover-card-trigger"]'));
	await settle();
	check(
		"A FLOATING PANEL SAYS WHERE IT MAY GROW IN THE POPOVER'S OWN WORDS",
		styleVar(found(document, '[data-slot="hover-card-content"]'), "--wg-kit-pop-available-width") !== "",
		true,
	);
	key(document.body, "Escape");
	await settle();
	check("a hover card closes on Escape", stateOf("hover-card-content"), "closed");
	await draw(null);
}

async function placementChangedMidExit(): Promise<void> {
	const panelFor = (placement: "over" | "below") =>
		h(kit.Popover, { isOpen: false, placement, trigger: h("button", null, "T") }, "Body");
	await draw(h(kit.Popover, { isOpen: true, placement: "over", trigger: h("button", null, "T") }, "Body"));
	await draw(panelFor("over"));
	await draw(panelFor("below"));
	check(
		"A POPOVER WHOSE PLACEMENT CHANGES WHILE IT FOLDS STILL LEAVES THE PAGE",
		document.querySelector(".wg-kit-pop")?.classList.contains("is-open"),
		false,
	);
	await draw(null);
}

async function handledEscape(): Promise<void> {
	await draw(
		h(kit.Popover, { defaultOpen: true }, [
			h(kit.PopoverTrigger, { key: "t" }, "Due"),
			h(kit.PopoverContent, { key: "c" }, "Body"),
		]),
	);
	const claim = (event: Event): void => event.preventDefault();
	window.addEventListener("keydown", claim, true);
	key(document.body, "Escape");
	window.removeEventListener("keydown", claim, true);
	await settle();
	check("AN ESCAPE SOMETHING ELSE ALREADY HANDLED CLOSES NO LAYER", stateOf("popover-content"), "open");
	await draw(null);
}

async function layerOwnership(): Promise<void> {
	await placementChangedMidExit();
	await handledEscape();
	await escapeInsideDialog();
	await escapeInsideInlineSheet();
	await inlineCommandOverlay();
	await dialogBridge();
	await hoverCardLayer();
	await settle();
	check("and every one of them leaves the stack", openLayerCount(), 0);
}

async function drawer(): Promise<void> {
	await draw(h(kit.Drawer, { defaultOpen: true }, h(kit.DrawerContent, null, h(kit.DrawerTitle, null, "Move goal"))));
	const panel = found(document, '[data-slot="drawer-content"]');
	Object.defineProperty(panel, "offsetHeight", { value: 400 });
	await draw(h(kit.Drawer, { defaultOpen: true }, h(kit.DrawerContent, null, h(kit.DrawerTitle, null, "Move goal"))));
	const handle = found(document, ".wg-kit-drawer-handle");
	fire(handle, "pointerdown", { clientY: 100 });
	await settle();
	fire(handle, "pointermove", { clientY: 150 });
	await settle();
	check("A DRAWER FOLLOWS THE FINGER DOWN", styleVar(panel, "--wg-kit-drawer-drag"), "50px");
	await wait(150);
	fire(handle, "pointerup");
	await settle();
	check("a short drag springs back open", stateOf("drawer-content"), "open");
	fire(handle, "pointerdown", { clientY: 100 });
	fire(handle, "pointermove", { clientY: 200 });
	fire(handle, "pointermove", { clientY: 101 });
	await wait(150);
	fire(handle, "pointerup");
	await settle();
	check("A DRAG ON THE GRIP THAT COMES BACK TO WHERE IT STARTED IS NOT A PRESS", stateOf("drawer-content"), "open");
	fire(handle, "pointerdown", { clientY: 100 });
	fire(handle, "pointermove", { clientY: 360 });
	await settle();
	fire(handle, "pointerup");
	await settle();
	check("a long drag dismisses it", stateOf("drawer-content"), "closed");
	await draw(null);
	await drawerSnaps();
	await drawerCloseButton();
	await undismissibleDrawer();
	drawerSnapArithmetic();
}

function snapDrawer(
	props: Readonly<Record<string, unknown>>,
	content: Readonly<Record<string, unknown>> = {},
): ReactNode {
	return h(
		kit.Drawer,
		{ defaultOpen: true, snapPoints: [0.4, 0.75], ...props },
		h(kit.DrawerContent, content, h(kit.DrawerTitle, null, "Move goal")),
	);
}

async function measuredSnapDrawer(tree: () => ReactNode): Promise<Element> {
	await draw(tree());
	const panel = found(document, '[data-slot="drawer-content"]');
	if (panel.parentElement) Object.defineProperty(panel.parentElement, "clientHeight", { value: 1000 });
	await draw(tree());
	return panel;
}

async function drawerSnaps(): Promise<void> {
	const picked: unknown[] = [];
	const panel = await measuredSnapDrawer(() =>
		snapDrawer({ setActiveSnapPoint: (snap: unknown) => picked.push(snap) }),
	);
	check(
		"A SNAPPED DRAWER OPENS AT ITS FIRST SNAP, THE REST OF ITS HEIGHT BELOW THE EDGE",
		styleVar(panel, "--wg-kit-drawer-drag"),
		"350px",
	);
	check("and is as tall as its top snap", styleVar(panel, "--wg-kit-drawer-height"), "750px");
	check("and holds its content still while it is low", panel.classList.contains("is-held-low"), true);
	const handle = found(document, ".wg-kit-drawer-handle");
	key(handle, "ArrowUp");
	await settle();
	check(
		"ARROW UP ON THE GRIP GROWS IT TO THE NEXT SNAP",
		[picked, styleVar(panel, "--wg-kit-drawer-drag")],
		[[0.75], "0px"],
	);
	check("and its content scrolls at the top snap", panel.classList.contains("is-held-low"), false);
	key(handle, "ArrowDown");
	await settle();
	check("arrow down brings it back", picked, [0.75, 0.4]);
	fire(handle, "pointerdown", { clientY: 500 });
	fire(handle, "pointerup", { clientY: 500 });
	await settle();
	check("A STILL PRESS ON THE GRIP STEPS TO THE NEXT SNAP", picked, [0.75, 0.4, 0.75]);
	key(handle, "Enter");
	await settle();
	check("and Enter at the top snap closes it", stateOf("drawer-content"), "closed");
	await draw(null);
}

async function drawerCloseButton(): Promise<void> {
	await draw(snapDrawer({}));
	check(
		"A DRAWER DRAWS NO CLOSE BUTTON UNLESS ASKED",
		document.querySelector('[data-slot="drawer-content"] .wg-kit-modal-close'),
		null,
	);
	await draw(null);
	await draw(snapDrawer({}, { showCloseButton: true }));
	const close = found(document, '[data-slot="drawer-content"] .wg-kit-modal-close');
	fire(close, "click");
	await settle();
	check("showCloseButton draws one, and it closes the drawer", stateOf("drawer-content"), "closed");
	await draw(null);
}

async function undismissibleDrawer(): Promise<void> {
	const panel = await measuredSnapDrawer(() => snapDrawer({ dismissible: false }));
	key(panel, "Escape");
	await settle();
	check("AN UNDISMISSIBLE DRAWER STAYS OPEN ON ESCAPE", stateOf("drawer-content"), "open");
	const handle = found(document, ".wg-kit-drawer-handle");
	fire(handle, "pointerdown", { clientY: 600 });
	fire(handle, "pointermove", { clientY: 990 });
	fire(handle, "pointerup", { clientY: 990 });
	await settle();
	check(
		"and a fling down only lands it on its lowest snap",
		[stateOf("drawer-content"), styleVar(panel, "--wg-kit-drawer-drag")],
		["open", "350px"],
	);
	await draw(null);
}

function drawerSnapArithmetic(): void {
	const heights = [400, 750];
	const released = (shownPx: number, upwardPxPerMs: number, isDismissible = true): number =>
		snaps.settledSnapIndex({ heights, shownPx, upwardPxPerMs, isDismissible });
	check(
		"A RELEASE SETTLES ON THE SNAP NEAREST WHERE ITS SPEED WOULD CARRY IT",
		[released(450, 0), released(450, 1.5), released(700, -1.5), released(380, -2), released(380, -2, false)],
		[0, 1, 0, snaps.CLOSED_SNAP, 0],
	);
	check(
		"the scrim fades in between the snap below fadeFromIndex and that snap",
		[
			snaps.fadeAt(heights, 1, 400),
			snaps.fadeAt(heights, 1, 575),
			snaps.fadeAt(heights, 1, 750),
			snaps.fadeAt(heights, 0, 200),
		],
		[0, 0.5, 1, 0.5],
	);
	check(
		"a snap is a fraction of the layer or pixels, never past its top inset",
		snaps.snapHeightsOf(["148px", 0.5, 1], { layerPx: 1000, insetPx: 8 }),
		[148, 500, 992],
	);
}

function styleVar(element: Element, name: string): string {
	return element instanceof dom.window.HTMLElement ? element.style.getPropertyValue(name) : "";
}

async function toasts(): Promise<void> {
	await draw(h(kit.Toaster, { duration: 60 }));
	const said: string[] = [];
	const id = kit.toast("Event created", {
		description: "Sunday at 9:00",
		action: { label: "Undo", onClick: () => said.push("undo") },
	});
	await settle();
	const shown = found(document, '[data-slot="toast"]');
	check(
		"TOAST() DRAWS A TOAST WITH ITS TITLE, DESCRIPTION AND ACTION",
		[
			shown.querySelector(".wg-kit-toast-title")?.textContent,
			shown.querySelector(".wg-kit-toast-description")?.textContent,
			shown.getAttribute("data-type"),
		],
		["Event created", "Sunday at 9:00", "default"],
	);
	fire(found(shown, ".wg-kit-toast-button"), "click");
	await settle();
	check("its action runs and dismisses it", [said, shown.getAttribute("data-state")], [["undo"], "closed"]);
	await wait(300);
	check(
		"a dismissed toast leaves the queue",
		kit.toast.getToasts().some((toast) => toast.id === id),
		false,
	);
	kit.toast.success("Saved", { onAutoClose: () => said.push("auto") });
	await settle();
	check("toast.success is typed", slotted("toast")?.getAttribute("data-type"), "success");
	await wait(120);
	check("a toast closes on its own after its duration", said.at(-1), "auto");
	await leavingToast();
	await promiseToast();
	await pausedToast();
	await queueOwnedLifetime();
	await draw(null);
}

async function leavingToast(): Promise<void> {
	const older = kit.toast("Older", { duration: Infinity });
	kit.toast("Newer", { duration: Infinity });
	await settle();
	kit.toast.dismiss(older);
	await settle();
	const leaving = [...document.querySelectorAll('[data-slot="toast"]')].find((toast) => toast.textContent === "Older");
	check(
		"A TOAST LEAVING FROM BEHIND THE FRONT KEEPS ITS PLACE IN THE STACK",
		leaving ? styleVar(leaving, "--wg-kit-toast-index") : "gone",
		"1",
	);
	kit.toast.dismiss();
	await wait(300);
}

async function promiseToast(): Promise<void> {
	let finish: (name: string) => void = () => undefined;
	const saving = new Promise<string>((done) => {
		finish = done;
	});
	const id = kit.toast.promise(saving, {
		loading: "Saving…",
		success: (name: string) => `${name} saved`,
		error: "Failed",
	});
	await settle();
	finish("Notes");
	check(
		"toast.promise first shows loading",
		document.querySelector(`[data-type="loading"] .wg-kit-toast-title`)?.textContent,
		"Saving…",
	);
	await settle();
	const settled = kit.toast.getToasts().find((toast) => toast.id === id);
	check(
		"then the same toast turns into the success the promise gave",
		[settled?.type, settled?.title],
		["success", "Notes saved"],
	);
	kit.toast.dismiss();
	await wait(300);
}

async function pausedToast(): Promise<void> {
	kit.toast.info("Hold me", { duration: 40 });
	await settle();
	fire(found(document, '[data-slot="toaster"]'), "pointerover", { relatedTarget: null });
	await wait(90);
	check("A TOAST UNDER THE POINTER WAITS", slotted("toast")?.getAttribute("data-state"), "open");
	fire(found(document, '[data-slot="toaster"]'), "pointerout", { relatedTarget: outside });
	await wait(90);
	check("and closes once the pointer leaves", kit.toast.getToasts().filter((toast) => !toast.isLeaving).length, 0);
}

function openToastCount(): number {
	return kit.toast.getToasts().filter((toast) => !toast.isLeaving).length;
}

async function queueOwnedLifetime(): Promise<void> {
	await draw(null);
	kit.toast("Unseen", { duration: 40 });
	await wait(80);
	check("A TOAST SHOWN WITH NO TOASTER ON SCREEN WAITS FOR ONE", openToastCount(), 1);
	await draw(h(kit.Toaster, { duration: 60 }));
	await wait(80);
	check("and runs its lifetime once a Toaster draws it", openToastCount(), 0);
	const said: string[] = [];
	kit.toast("Counting", { duration: 120, onAutoClose: () => said.push("auto") });
	await wait(70);
	await draw(null);
	await draw(h(kit.Toaster, { duration: 60 }));
	await wait(90);
	check("A TOAST'S LIFETIME RUNS FROM ITS SHOW, NOT FROM ITS TOASTER'S LAST DRAW", said, ["auto"]);
	kit.toast.info("Paused", { duration: 100 });
	await settle();
	const toaster = found(document, '[data-slot="toaster"]');
	fire(toaster, "pointerover", { relatedTarget: null });
	await wait(150);
	fire(toaster, "pointerout", { relatedTarget: outside });
	await wait(50);
	check("A PAUSED TOAST RESUMES WITH THE TIME IT HAD LEFT", openToastCount(), 1);
	await wait(110);
	check("and closes when that time runs out", openToastCount(), 0);
	kit.toast.promise(Promise.reject(new Error("Disk full")), { loading: "Saving…", success: "Saved" });
	await settle();
	check(
		"A REJECTED PROMISE WITH NO ERROR MESSAGE SHOWS THE ERROR'S OWN TEXT",
		kit.toast.getToasts().find((toast) => toast.type === "error")?.title,
		"Disk full",
	);
	kit.toast.dismiss();
	await wait(300);
}

await placement();
await sidedPopover();
await tooltip();
await hoverCard();
await dropdownMenu();
await contextMenu();
await menubar();
await navigationMenu();
await sheetAndAlert();
await layeredEscape();
await layerOwnership();
await drawer();
await toasts();

console.log(failed ? `\n${failed} failed of ${checks}` : `\nall passed (${checks} checks)`);
process.exit(failed ? 1 : 0);
