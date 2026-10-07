import type { ReactNode } from "react";
import { JSDOM } from "jsdom";
import { found } from "./dom-find.ts";

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
});

const { createElement: h } = await import("react");
const { render } = await import("../packages/core/src/engine/render.js");
const kit = await import("../packages/kit/src/index.ts");
const { sizesLaid, sizesStepped } = await import("../packages/kit/src/utils/resizable.ts");
const { distinctSnaps, nearestSnap, steppedSnap } = await import("../packages/kit/src/utils/carousel.ts");
const { thumbOf } = await import("../packages/kit/src/utils/scroll-thumb.ts");
const { toggledOpen } = await import("../packages/kit/src/utils/accordion.ts");
const { chartColorOf } = await import("../packages/kit/src/utils/chart-colors.ts");

let failed = 0;
let checks = 0;
function check(name: string, got: unknown, want: unknown): void {
	checks += 1;
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
}

const host = found(document, "#host");

function mount(tree: ReactNode): void {
	render(null, host);
	render(tree, host);
}

function attr(selector: string, name: string): string | null {
	return found(host, selector).getAttribute(name);
}

async function press(selector: string, key: string): Promise<void> {
	const target = found(host, selector);
	if (target instanceof HTMLElement) target.focus();
	target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
	await settle();
}

async function clickOn(selector: string): Promise<void> {
	const target = found(host, selector);
	if (target instanceof HTMLElement) target.click();
	await settle();
}

async function accordionChecks(): Promise<void> {
	const told: unknown[] = [];
	const item = (value: string) =>
		h(kit.AccordionItem, { value, key: value }, [
			h(kit.AccordionTrigger, { key: "t", ...{ "data-id": `t-${value}` } }, value),
			h(kit.AccordionContent, { key: "c" }, `${value} body`),
		]);
	const first = "[data-id='t-a']";
	const second = "[data-id='t-b']";
	const focusedId = (): string | null | undefined => document.activeElement?.getAttribute("data-id");
	mount(h(kit.Accordion, { type: "single", onValueChange: (next: string) => told.push(next) }, ["a", "b"].map(item)));
	check("an accordion opens nothing by default", attr(first, "aria-expanded"), "false");
	await clickOn(first);
	check(
		"A PRESSED TRIGGER OPENS ITS CONTENT AND SAYS SO",
		[attr(first, "aria-expanded"), attr("[data-slot='accordion-content']", "data-state")],
		["true", "open"],
	);
	check(
		"the open content is reachable, the shut one is inert",
		[
			found(host, "[data-slot='accordion-content']").hasAttribute("inert"),
			host.querySelectorAll("[data-slot='accordion-content'][inert]").length,
		],
		[false, 1],
	);
	check(
		"its trigger controls the content it names",
		attr(first, "aria-controls"),
		attr("[data-slot='accordion-content']", "id"),
	);
	await clickOn(second);
	check(
		"A SINGLE ACCORDION SHUTS THE ONE BEFORE",
		[attr(first, "aria-expanded"), attr(second, "aria-expanded")],
		["false", "true"],
	);
	await clickOn(second);
	check("a single one that is not collapsible keeps its open item", attr(second, "aria-expanded"), "true");
	check("its trigger says it cannot shut, as Radix's does", attr(second, "aria-disabled"), "true");
	check("onValueChange hears each value as shadcn names it", told, ["a", "b"]);
	await press(first, "ArrowDown");
	check("ArrowDown moves focus to the next trigger", focusedId(), "t-b");
	await press(second, "ArrowDown");
	check("ArrowDown wraps", focusedId(), "t-a");
	mount(h(kit.Accordion, { orientation: "horizontal" }, ["a", "b"].map(item)));
	await press(first, "ArrowRight");
	check("A HORIZONTAL ACCORDION STEPS WITH LEFT AND RIGHT", focusedId(), "t-b");
	mount(h(kit.Accordion, null, h(kit.AccordionItem, { value: "Getting started" }, h(kit.AccordionTrigger, null, "x"))));
	check(
		"a value with a space still names one id",
		attr("[data-slot='accordion-trigger']", "aria-controls")?.includes(" "),
		false,
	);
	mount(h(kit.Accordion, { type: "multiple", defaultValue: ["a"] }, ["a", "b"].map(item)));
	await clickOn(second);
	check(
		"A MULTIPLE ACCORDION HOLDS BOTH OPEN",
		[attr(first, "aria-expanded"), attr(second, "aria-expanded")],
		["true", "true"],
	);
	check(
		"collapsible single shuts its only open item",
		toggledOpen(["a"], "a", { isMultiple: false, isCollapsible: true }),
		[],
	);
}

async function collapsibleChecks(): Promise<void> {
	const told: boolean[] = [];
	mount(
		h(kit.Collapsible, { onOpenChange: (open: boolean) => told.push(open) }, [
			h(kit.CollapsibleTrigger, { key: "t", id: "toggle" }, "More"),
			h(kit.CollapsibleContent, { key: "c" }, "Hidden rows"),
		]),
	);
	check("a collapsible starts shut", attr("[data-slot='collapsible-content']", "data-state"), "closed");
	await clickOn("#toggle");
	check(
		"A COLLAPSIBLE TRIGGER OPENS ITS CONTENT",
		[attr("#toggle", "aria-expanded"), attr("[data-slot='collapsible-content']", "data-state"), told],
		["true", "open", [true]],
	);
	check(
		"the trigger names its content",
		attr("#toggle", "aria-controls"),
		attr("[data-slot='collapsible-content']", "id"),
	);
	mount(
		h(kit.Collapsible, { disabled: true }, [
			h(kit.CollapsibleTrigger, { key: "t", asChild: true }, h("div", { id: "div-toggle" }, "More")),
			h(kit.CollapsibleContent, { key: "c" }, "x"),
		]),
	);
	await clickOn("#div-toggle");
	check(
		"A DISABLED COLLAPSIBLE IGNORES A PRESS EVEN ON A NON-BUTTON CHILD",
		attr("[data-slot='collapsible-content']", "data-state"),
		"closed",
	);
	mount(h(kit.Collapsible, { open: true }, h(kit.CollapsibleContent, null, "x")));
	check(
		"a controlled collapsible draws what it is told",
		attr("[data-slot='collapsible-content']", "data-state"),
		"open",
	);
}

function displayChecks(): void {
	mount(
		h(kit.Alert, { variant: "destructive" }, [
			h(kit.AlertTitle, { key: "t" }, "Failed"),
			h(kit.AlertDescription, { key: "d" }, "Retry"),
		]),
	);
	const alert = found(host, "[data-slot='alert']");
	check(
		"AN ALERT IS A PLATE THE SURFACE LAWS PAINT, TONED FOR DESTRUCTIVE",
		[alert.getAttribute("role"), alert.getAttribute("data-surface"), alert.classList.contains("is-err")],
		["alert", "group", true],
	);
	mount(
		h(
			kit.Breadcrumb,
			null,
			h(kit.BreadcrumbList, null, [
				h(kit.BreadcrumbItem, { key: "i" }, h(kit.BreadcrumbLink, { href: "#" }, "Home")),
				h(kit.BreadcrumbSeparator, { key: "s" }),
				h(kit.BreadcrumbItem, { key: "p" }, h(kit.BreadcrumbPage, null, "Notes")),
			]),
		),
	);
	check(
		"A BREADCRUMB IS A NAMED NAV WITH THE PAGE MARKED CURRENT",
		[
			attr("nav", "aria-label"),
			attr("[data-slot='breadcrumb-page']", "aria-current"),
			attr("[data-slot='breadcrumb-separator']", "aria-hidden"),
			host.querySelector("[data-slot='breadcrumb-separator'] svg") !== null,
		],
		["breadcrumb", "page", "true", true],
	);
	mount(
		h("div", null, [
			h(kit.Separator, { key: "a", id: "deco" }),
			h(kit.Separator, { key: "b", id: "real", orientation: "vertical", decorative: false }),
		]),
	);
	check(
		"A DECORATIVE SEPARATOR IS HIDDEN FROM READERS, A REAL ONE IS ANNOUNCED",
		[attr("#deco", "role"), attr("#real", "role"), attr("#real", "aria-orientation")],
		["none", "separator", "vertical"],
	);
}

function itemChecks(): void {
	mount(
		h(kit.ItemGroup, null, [
			h(
				kit.Item,
				{ key: "a", id: "muted", variant: "muted", size: "sm" },
				h(kit.ItemContent, null, h(kit.ItemTitle, null, "A")),
			),
			h(kit.ItemSeparator, { key: "s" }),
			h(kit.Item, { key: "b", id: "link", render: h("a", { href: "#x" }) }, h(kit.ItemTitle, null, "B")),
		]),
	);
	check(
		"A MUTED ITEM WEARS A PLATE THROUGH CARD",
		[attr("#muted", "data-slot"), attr("#muted", "data-surface"), attr("#muted", "data-size")],
		["item", "group", "sm"],
	);
	check(
		"AN ITEM RENDERED AS A LINK IS THAT LINK",
		[found(host, "#link").tagName, attr("#link", "href"), attr("#link", "data-slot")],
		["A", "#x", "item"],
	);
	check("an item group is a list", attr("[data-slot='item-group']", "role"), "list");
	check("its separator is a separator", attr("[data-slot='item-separator']", "data-orientation"), "horizontal");
	mount(
		h(kit.Marker, { variant: "separator", role: "status" }, [
			h(kit.MarkerIcon, { key: "i" }, "•"),
			h(kit.MarkerContent, { key: "c" }, "Compacted"),
		]),
	);
	check(
		"A MARKER CARRIES ITS VARIANT AND HIDES ITS ICON",
		[
			attr("[data-slot='marker']", "data-variant"),
			attr("[data-slot='marker']", "role"),
			attr("[data-slot='marker-icon']", "aria-hidden"),
		],
		["separator", "status", "true"],
	);
	mount(h(kit.TypographyH1, null, "Title"));
	check(
		"typography draws the element its name says",
		[found(host, "h1").className, attr("h1", "data-slot")],
		["wg-kit-type-h1", "typography"],
	);
}

function settle(): Promise<void> {
	return new Promise((done) => setTimeout(done, 0));
}

async function resizableChecks(): Promise<void> {
	const laid: number[][] = [];
	mount(
		h(kit.ResizablePanelGroup, { direction: "horizontal", onLayout: (sizes: number[]) => laid.push(sizes) }, [
			h(kit.ResizablePanel, { key: "l", id: "left", defaultSize: 30, minSize: 20 }, "L"),
			h(kit.ResizableHandle, { key: "h", id: "handle", withHandle: true }),
			h(kit.ResizablePanel, { key: "r", id: "right" }, "R"),
		]),
	);
	check(
		"PANELS WITHOUT A SIZE SHARE WHAT IS LEFT",
		[attr("#left", "data-size"), attr("#right", "data-size")],
		["30.0", "70.0"],
	);
	check(
		"the handle is a separator holding its panel's size",
		[
			attr("#handle", "role"),
			attr("#handle", "aria-valuenow"),
			attr("#handle", "aria-controls"),
			attr("#handle", "aria-orientation"),
		],
		["separator", "30", "left", "vertical"],
	);
	await press("#handle", "ArrowRight");
	check(
		"AN ARROW KEY RESIZES THE PAIR BY A STEP",
		[attr("#left", "data-size"), attr("#right", "data-size"), attr("#handle", "aria-valuenow")],
		["40.0", "60.0", "40"],
	);
	await press("#handle", "Home");
	check("HOME SHRINKS A PANEL TO ITS MINIMUM, NEVER PAST IT", attr("#left", "data-size"), "20.0");
	check("onLayout hears every layout", laid.at(-1), [20, 80]);
	const limits = new Map([
		["a", { defaultSize: 50, min: 10, max: 60 }],
		["b", { defaultSize: undefined, min: 30, max: 100 }],
	]);
	check(
		"a pair never grows past the maximum of one side",
		sizesStepped({ a: 50, b: 50 }, { before: "a", after: "b", delta: 30 }, limits),
		{ a: 60, b: 40 },
	);
	check(
		"nor shrinks the other past its minimum",
		sizesStepped({ a: 50, b: 50 }, { before: "b", after: "a", delta: 45 }, limits),
		{ a: 10, b: 90 },
	);
	check(
		"sizes laid split the rest evenly",
		sizesLaid(["a", "b", "c"], new Map([["a", { defaultSize: 40, min: 0, max: 100 }]])),
		{ a: 40, b: 30, c: 30 },
	);
}

function carouselAndScrollChecks(): void {
	let api: unknown = null;
	mount(
		h(kit.Carousel, { setApi: (given: unknown) => (api = given), opts: { loop: true } }, [
			h(kit.CarouselContent, { key: "c" }, [
				h(kit.CarouselItem, { key: 1 }, "1"),
				h(kit.CarouselItem, { key: 2 }, "2"),
			]),
			h(kit.CarouselPrevious, { key: "p" }),
			h(kit.CarouselNext, { key: "n" }),
		]),
	);
	check(
		"A CAROUSEL IS A NAMED REGION OF SLIDES THAT HANDS OUT ITS API",
		[
			attr("[data-slot='carousel']", "aria-roledescription"),
			attr("[data-slot='carousel-item']", "aria-roledescription"),
			typeof api === "object" && api !== null && "scrollNext" in api,
		],
		["carousel", "slide", true],
	);
	check("a loop steps from the last snap back to the first", steppedSnap(2, 1, 3, true), 0);
	check("without a loop it stops at the last", steppedSnap(2, 1, 3, false), 2);
	check("items past the end collapse onto one snap", distinctSnaps([0, 300, 600, 600]), [0, 300, 600]);
	check("the nearest snap is selected", nearestSnap([0, 300, 600], 420), 1);
	mount(h(kit.ScrollArea, null, ["x", h(kit.ScrollBar, { key: "b", orientation: "horizontal" })]));
	check(
		"A HORIZONTAL SCROLLBAR ASKED FOR INSIDE A SCROLL AREA IS DRAWN BESIDE THE VERTICAL ONE",
		[...host.querySelectorAll("[data-slot='scroll-area-scrollbar']")].map((bar) =>
			bar.getAttribute("data-orientation"),
		),
		["vertical", "horizontal"],
	);
	check(
		"a thumb is as long as the window is of the whole",
		thumbOf({ scroll: 0, client: 200, total: 800, track: 200 }),
		{ size: 50, offset: 0, isNeeded: true },
	);
	check(
		"a thumb at the end sits at the end",
		thumbOf({ scroll: 600, client: 200, total: 800, track: 200 }).offset,
		150,
	);
	check("no thumb when nothing overflows", thumbOf({ scroll: 0, client: 200, total: 200, track: 200 }).isNeeded, false);
}

function directionAndChartChecks(): void {
	function Reads() {
		return h("span", { id: "dir" }, kit.useDirection());
	}
	mount(h(kit.DirectionProvider, { direction: "rtl" }, h(Reads)));
	check("DIRECTION PROVIDER HANDS ITS DIRECTION DOWN", found(host, "#dir").textContent, "rtl");
	mount(h(Reads));
	check("without one the direction is ltr", found(host, "#dir").textContent, "ltr");
	check(
		"A CHART SERIES IS COLOURED FROM SHADCN'S --chart-N",
		[chartColorOf(2, 0), chartColorOf(undefined, 0)],
		["var(--chart-2)", "var(--chart-1)"],
	);
}

await accordionChecks();
await collapsibleChecks();
displayChecks();
itemChecks();
await resizableChecks();
carouselAndScrollChecks();
directionAndChartChecks();
render(null, host);

const { paintChecks } = await import("./kit-layout-paint.ts");
const painted = await paintChecks();
for (const [name, got, want] of painted) check(name, got, want);

console.log(failed ? `\n${failed} failed` : `\nall passed (${checks} checks)`);
process.exit(failed ? 1 : 0);
