import { JSDOM } from "jsdom";

export function layJsdomGlobals(): JSDOM {
	const dom = new JSDOM("<!doctype html><body></body>");
	const { window } = dom;
	Object.assign(globalThis, {
		window,
		document: window.document,
		Node: window.Node,
		Element: window.Element,
		HTMLElement: window.HTMLElement,
		SVGElement: window.SVGElement,
		getComputedStyle: window.getComputedStyle,
	});
	return dom;
}
