import { JSDOM } from "jsdom";

const dom = new JSDOM(`<!doctype html><body><div id="host"></div><p id="away">away</p></body>`, {
	pretendToBeVisual: true,
});
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
	Event: dom.window.Event,
	MutationObserver: dom.window.MutationObserver,
	ResizeObserver: class {
		observe(): void {}
		disconnect(): void {}
	},
});

const { createElement: h } = await import("react");
const { render } = await import("../packages/core/src/engine/render.js");
const { Help } = await import("../packages/kit/src/index.ts");
const { HOVER_OPEN_MS } = await import("../packages/kit/src/hooks/use-hover-open.ts");

const SAID = "How many widgets the filters leave.";

let failed = 0;

function check(what: string, got: unknown, wanted: unknown): void {
	const isSame = JSON.stringify(got) === JSON.stringify(wanted);
	if (!isSame) failed += 1;
	console.log(
		`${isSame ? "OK " : "!! "} ${what}${isSame ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(wanted)}`}`,
	);
}

const settle = (ms = 30): Promise<void> => new Promise((done) => setTimeout(done, ms));

function host(): HTMLElement {
	const node = document.getElementById("host");
	if (!node) throw new Error("no host");
	return node;
}

function button(): HTMLElement {
	const node = host().querySelector<HTMLElement>(".wg-kit-help-button");
	if (!node) throw new Error("the help draws no button");
	return node;
}

function shownText(): string | null {
	if (button().getAttribute("aria-expanded") !== "true") return null;
	return document.querySelector(".wg-kit-help-pop.is-open .wg-kit-help-text")?.textContent ?? null;
}

function point(type: "pointerover" | "pointerout", pointerType: string, from: Element | null): void {
	const event = new dom.window.MouseEvent(type, { bubbles: true, relatedTarget: from });
	Object.defineProperty(event, "pointerType", { value: pointerType });
	button().dispatchEvent(event);
}

render(h(Help, null, SAID), host());
await settle();
check("the help is one button and no text until asked", [Boolean(button()), shownText()], [true, null]);
check("the button tells a screen reader what it would show", button().getAttribute("aria-description"), SAID);

button().dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
await settle();
check("a press opens it", shownText(), SAID);
check(
	"it opens on the page's own layer, so no box around the button can cut it",
	[
		Boolean(host().querySelector(".wg-kit-help-pop")),
		document.querySelector(".wg-kit-help-pop")?.parentElement?.className,
	],
	[false, "wg-root wg-portal wg-kit-portal-layer"],
);
button().dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
await settle();
check("a second press closes it", shownText(), null);

point("pointerover", "mouse", document.getElementById("away"));
await settle(HOVER_OPEN_MS / 2);
check("a mouse resting on it opens nothing at once", shownText(), null);
await settle(HOVER_OPEN_MS);
check("and opens it once it has rested", shownText(), SAID);
point("pointerout", "mouse", document.getElementById("away"));
await settle();
check("leaving closes what the hover opened", shownText(), null);

point("pointerover", "touch", document.getElementById("away"));
await settle(HOVER_OPEN_MS * 2);
check("a finger never opens it by resting", shownText(), null);

render(h(Help, null, ""), host());
await settle();
check("an empty help draws nothing at all", host().querySelector(".wg-kit-help"), null);

console.log(failed === 0 ? "help: clean" : `help: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
