import { createElement as h } from "react";
import { render } from "../packages/core/src/engine/render.js";
import { Catalogue } from "../packages/core/src/catalogue.js";
import { TEMPLATES } from "../packages/core/src/templates.js";

const TITLES = window.__TITLES__;

const registry = {
	list: () => [],
	get: () => null,
};

function boom(what) {
	document.getElementById("boom").textContent += `${what}\n`;
}

window.addEventListener("error", (event) => boom(`error: ${event.message}`));
window.addEventListener("unhandledrejection", (event) => boom(`rejected: ${event.reason}`));

render(
	h(Catalogue, {
		registry,
		host: { platform: "obsidian", can: {}, ui: { notify() {}, renderMarkdown: () => () => {} } },
		mode: "browse",
		available: Object.entries(TITLES).map(([id, title]) => ({
			manifest: { id, title, defaultSize: { w: 3, h: 2 } },
			installed: false,
		})),
		templates: TEMPLATES,
		onUseTemplate: async () => ({ ok: true }),
	}),
	document.getElementById("host"),
);

setTimeout(() => {
	document.querySelectorAll(".wg-cat-shelf button")[1]?.click();
	setTimeout(() => {
		const cells = [...document.querySelectorAll(".wg-tpl-cell")];
		const regions = [...document.querySelectorAll(".wg-tpl-region")];
		document.getElementById("count").textContent = JSON.stringify({
			cards: document.querySelectorAll(".wg-tpl-tile").length,
			regions: regions.map((node) => Math.round(node.getBoundingClientRect().width)),
			labels: cells.map((node) => node.textContent),
			clipped: cells.filter((node) => node.scrollWidth > node.clientWidth + 1).map((node) => node.textContent),
			rows: [...document.querySelectorAll(".wg-tpl-row")].map((node) =>
				Math.round(node.getBoundingClientRect().height),
			),
			shelf: [...document.querySelectorAll(".wg-cat-shelf button")].map((node) => node.textContent),
			narrowers: document.querySelectorAll(".wg-cat-shown, .wg-cat-size").length,
			buttonGap: (() => {
				const foot = document.querySelector(".wg-tpl-foot");
				const go = foot?.querySelector(".wg-cat-go");
				if (!foot || !go) return null;
				return Math.round(foot.getBoundingClientRect().right - go.getBoundingClientRect().right);
			})(),
		});
	}, 200);
}, 600);
