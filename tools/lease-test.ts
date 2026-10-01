import { JSDOM } from "jsdom";
import { byId } from "./dom-find.ts";

const dom = new JSDOM(
	"<!doctype html><body><div id=kept></div><div id=reclaimed></div><div id=closed></div><div id=nulled></div><div id=untouched></div></body>",
	{ pretendToBeVisual: true },
);
const { window } = dom;
Object.assign(globalThis, {
	window,
	document: window.document,
	Node: window.Node,
	Element: window.Element,
	HTMLElement: window.HTMLElement,
	SVGElement: window.SVGElement,
	getComputedStyle: window.getComputedStyle,
	requestAnimationFrame: window.requestAnimationFrame,
	cancelAnimationFrame: window.cancelAnimationFrame,
	MouseEvent: window.MouseEvent,
});

const { createElement: h, useState } = await import("react");
const { leaseFor } = await import("../packages/core/src/engine/render.js");

const settle = async (times = 20): Promise<void> => {
	for (let at = 0; at < times; at += 1) await new Promise((resolve) => setTimeout(resolve, 1));
};

let failed = 0;
const check = (label: string, got: unknown, want: unknown): void => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK " : "!! "} ${label}${ok ? ` — ${JSON.stringify(got)}` : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`}`,
	);
};

let births = 0;
function Counter({ label }: { readonly label: string }): ReturnType<typeof h> {
	const [born] = useState(() => (births += 1));
	return h("span", null, `${label} ${born}`);
}

const kept = byId(document, "kept");
leaseFor(kept).draw(h(Counter, { label: "first" }));
await settle();
check("a lease draws into its node", kept.textContent, "first 1");

leaseFor(kept).draw(h(Counter, { label: "second" }));
await settle();
check("a second lease over the same node redraws the child that is already there", kept.textContent, "second 1");
check("so the child is born once, not once per lease", births, 1);

const reclaimed = byId(document, "reclaimed");
const reopened = leaseFor(reclaimed);
reopened.draw(h("i", null, "drawn"));
await settle();
reopened.release();
reopened.draw(h("i", null, "drawn again"));
await settle();
check("a draw that follows a release on a live node leaves the node drawn", reclaimed.textContent, "drawn again");

const closed = byId(document, "closed");
const closing = leaseFor(closed);
closing.draw(h("i", null, "drawn"));
await settle();
closing.release();
await settle();
check("a release nothing follows empties the node", closed.textContent, "");

const nulled = byId(document, "nulled");
const nulling = leaseFor(nulled);
nulling.draw(h("i", null, "drawn"));
await settle();
nulling.draw(null);
await Promise.resolve();
await Promise.resolve();
check(
	"a draw of nothing releases the node in the beat a release does, not renders nothing into it",
	nulled.textContent,
	"",
);

const untouched = byId(document, "untouched");
let queued = 0;
const nativeQueueMicrotask = globalThis.queueMicrotask;
globalThis.queueMicrotask = (work) => {
	queued += 1;
	nativeQueueMicrotask(work);
};
leaseFor(untouched).release();
globalThis.queueMicrotask = nativeQueueMicrotask;
await settle();
check("a release on a node nothing ever drew into is no work at all", [queued, untouched.textContent], [0, ""]);

console.log(failed === 0 ? "\nleases hold" : `\n${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
