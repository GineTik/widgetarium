import { JSDOM } from "jsdom";
import { buildMirror } from "./mirror.mjs";

const dom = new JSDOM("<!doctype html><body><div id=kept></div><div id=reclaimed></div><div id=closed></div><div id=untouched></div></body>", { pretendToBeVisual: true });
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "MouseEvent"]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}

buildMirror();
const { createElement: h, useState } = await import("react");
const { sessionAt } = await import("./.mjs-cache/engine/render.mjs");

const settle = async (times = 20) => {
	for (let at = 0; at < times; at += 1) await new Promise((resolve) => setTimeout(resolve, 1));
};

let failed = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${label}${ok ? ` — ${JSON.stringify(got)}` : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`}`);
};

let births = 0;
function Counter({ label }) {
	const [born] = useState(() => (births += 1));
	return h("span", null, `${label} ${born}`);
}

const kept = document.getElementById("kept");
sessionAt(kept).draw(h(Counter, { label: "first" }));
await settle();
check("a session draws into its node", kept.textContent, "first 1");

sessionAt(kept).draw(h(Counter, { label: "second" }));
await settle();
check("a second session over the same node redraws the child that is already there", kept.textContent, "second 1");
check("so the child is born once, not once per session", births, 1);

const reclaimed = document.getElementById("reclaimed");
const reopened = sessionAt(reclaimed);
reopened.draw(h("i", null, "drawn"));
await settle();
reopened.release();
reopened.draw(h("i", null, "drawn again"));
await settle();
check("a draw that follows a release on a live node leaves the node drawn", reclaimed.textContent, "drawn again");

const closed = document.getElementById("closed");
const closing = sessionAt(closed);
closing.draw(h("i", null, "drawn"));
await settle();
closing.release();
await settle();
check("a release nothing follows empties the node", closed.textContent, "");

const untouched = document.getElementById("untouched");
sessionAt(untouched).release();
await settle();
check("a release on a node nothing ever drew into is no work at all", untouched.textContent, "");

console.log(failed === 0 ? "\nsessions hold" : `\n${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
