import { JSDOM } from "jsdom";
import type { FunctionComponent } from "react";
import { byId, foundAs } from "./dom-find.ts";
import { runWidgetSource } from "./run-widget-source.ts";

const dom = new JSDOM(`<!doctype html><body><div id="host"></div></body>`, { pretendToBeVisual: true });
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
	Event: dom.window.Event,
	MutationObserver: dom.window.MutationObserver,
});

const react = await import("react");
const { createElement: h, Fragment } = react;
const { flushSync } = await import("react-dom");
const { render } = await import("../packages/core/src/engine/render.js");
const { ENGINE_SCOPE } = await import("../packages/core/src/registry.js");
const kit = await import("../packages/kit/src/index.ts");
const { soloGateway } = await import("../packages/core/src/gateway/create.ts");

interface SearchInputProps {
	readonly value: unknown;
	readonly placeholder: unknown;
}

const isSearchInput = (value: unknown): value is FunctionComponent<SearchInputProps> => typeof value === "function";

const WIDGET = "registry/@default/search-input/widget.tsx";
const modules: Readonly<Record<string, unknown>> = { widgetarium: ENGINE_SCOPE.api, "widgetarium/kit": kit, react };
const SearchInput = runWidgetSource(WIDGET, (name) => modules[name], h, Fragment)["default"];
if (!isSearchInput(SearchInput)) throw new Error(`${WIDGET} exports no component as its default`);

let failed = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "ok  " : "FAIL"} ${what}${ok ? "" : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(wanted)}`}`,
	);
}

const fieldOn = (host: HTMLElement): HTMLInputElement => foundAs(host, "input", dom.window.HTMLInputElement);

const host = byId(document, "host");
let held = "draft";
const written: string[] = [];
const value = soloGateway(
	() => held,
	{
		update: (typed: string) => {
			written.push(typed);
			held = typed;
		},
	},
	"search-test/value",
);
const placeholder = soloGateway("Search widgets", {}, "search-test/placeholder");

render(h(SearchInput, { value, placeholder }), host);
const input = host.querySelector("input");
check("the placeholder is read from its gateway", input?.placeholder, "Search widgets");
check("the field opens on the value the gateway holds", input?.value, "draft");
check("the search icon stands beside the field", Boolean(host.querySelector(".wg-kit-field svg")), true);

const setValue = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")?.set;
if (!input || !setValue) throw new Error("the field drew no input whose value can be set");
flushSync(() => {
	setValue.call(input, "tasks");
	input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
});
await new Promise((settle) => setTimeout(settle, 0));
check("typing writes the text through the value's update", written, ["tasks"]);
check("the field shows what was typed", fieldOn(host).value, "tasks");

render(null, host);
const fixed = soloGateway("fixed", {}, "search-test/fixed");
render(h(SearchInput, { value: fixed, placeholder }), host);
check("a value with no update is read-only rather than silently dropping keys", fieldOn(host).readOnly, true);
render(null, host);

if (failed > 0) {
	console.log(`\n${failed} failed`);
	process.exit(1);
}
