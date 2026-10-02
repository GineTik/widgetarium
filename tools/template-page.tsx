import "./packs-registered.ts";
import { createElement as h } from "react";
import { render } from "../packages/core/src/engine/render.js";
import { Catalogue } from "../packages/core/src/catalogue.js";
import type { WidgetLookup } from "../packages/core/src/registry.js";
import { TEMPLATES } from "../packages/core/src/templates.js";
import { isObject } from "../packages/core/src/engine/is-object.js";
import { PAGE_HOST, pageGlobal, reportsFailures } from "./page-harness.ts";

const titles = pageGlobal("__TITLES__");
const TITLES = isObject(titles) ? titles : {};

const NO_WIDGETS: WidgetLookup = {
	list: () => [],
	get: () => null,
};

reportsFailures();

const hostNode = document.getElementById("host");
if (hostNode)
	render(
		h(Catalogue, {
			registry: NO_WIDGETS,
			host: PAGE_HOST,
			mode: "browse",
			available: Object.entries(TITLES).map(([id, title]) => ({
				manifest: { id, title, defaultSize: { w: 3, h: 2 } },
				installed: false,
			})),
			templates: TEMPLATES,
			onUseTemplate: async () => ({ ok: true }),
		}),
		hostNode,
	);

function footRightOfButton(): number | null {
	const foot = document.querySelector(".wg-tpl-foot");
	const go = foot?.querySelector(".wg-cat-go");
	if (!foot || !go) return null;
	return Math.round(foot.getBoundingClientRect().right - go.getBoundingClientRect().right);
}

function countDrawn(): void {
	const cells = [...document.querySelectorAll(".wg-tpl-cell")];
	const regions = [...document.querySelectorAll(".wg-tpl-region")];
	const count = document.getElementById("count");
	if (!count) return;
	count.textContent = JSON.stringify({
		cards: document.querySelectorAll(".wg-tpl-tile").length,
		regions: regions.map((node) => Math.round(node.getBoundingClientRect().width)),
		labels: cells.map((node) => node.textContent),
		clipped: cells.filter((node) => node.scrollWidth > node.clientWidth + 1).map((node) => node.textContent),
		rows: [...document.querySelectorAll(".wg-tpl-row")].map((node) => Math.round(node.getBoundingClientRect().height)),
		shelf: [...document.querySelectorAll(".wg-cat-shelf button")].map((node) => node.textContent),
		narrowers: document.querySelectorAll(".wg-cat-shown, .wg-cat-size").length,
		buttonGap: footRightOfButton(),
	});
}

function openTemplatesShelf(): void {
	const templatesShelf = document.querySelectorAll(".wg-cat-shelf button")[1];
	if (templatesShelf instanceof HTMLElement) templatesShelf.click();
	setTimeout(countDrawn, 200);
}

setTimeout(openTemplatesShelf, 600);
