import { JSDOM } from "jsdom";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { WidgetComponent } from "../packages/core/src/registry-scope.ts";

export function drawnTextOf(component: WidgetComponent | undefined): string | undefined {
	if (!component) return undefined;
	return JSDOM.fragment(renderToStaticMarkup(createElement(component, {}))).textContent ?? "";
}
