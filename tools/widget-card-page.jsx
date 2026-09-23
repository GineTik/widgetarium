import { createElement as h } from "react";
import { render } from "../packages/core/src/engine/render.js";
import { useEffect, useState } from "react";
import { WidgetRegistry } from "../packages/core/src/registry.js";
import { drawnWidget } from "../packages/core/src/mounted.js";
import { previewProps, previewSize } from "../packages/core/src/preview.js";
import { GRID } from "../packages/core/src/paths.js";

const FILES = window.__FILES__;
const WANTED = window.__WANTED__;

const adapter = {
	async exists(path) {
		return Object.hasOwn(FILES, path) || Object.keys(FILES).some((key) => key.startsWith(`${path}/`));
	},
	async list(path) {
		const files = [];
		const folders = new Set();
		for (const key of Object.keys(FILES)) {
			if (!key.startsWith(`${path}/`)) continue;
			const rest = key.slice(path.length + 1);
			const cut = rest.indexOf("/");
			if (cut === -1) files.push(key);
			else folders.add(`${path}/${rest.slice(0, cut)}`);
		}
		return { files, folders: [...folders] };
	},
	async read(path) {
		return FILES[path];
	},
};

function boom(what) {
	document.getElementById("boom").textContent += `${what}\n`;
}

window.addEventListener("error", (event) => boom(`error: ${event.message}`));
window.addEventListener("unhandledrejection", (event) => boom(`rejected: ${event.reason}`));

function Card() {
	const [registry, setRegistry] = useState(null);

	useEffect(() => {
		const loading = new WidgetRegistry({ vault: { adapter } });
		loading
			.load()
			.then(() => setRegistry(loading))
			.catch((failure) => boom(`load: ${failure.stack}`));
	}, []);

	if (!registry) return null;

	const definition = registry.get(WANTED);
	if (!definition) {
		boom(`${WANTED} is not in the registry`);
		return null;
	}
	if (definition.error) {
		boom(`${WANTED} does not load: ${definition.error.message}`);
		return null;
	}

	const size = previewSize(definition.manifest, GRID.cellPx, GRID.gapPx);
	const host = { platform: "obsidian", can: {}, ui: { notify() {}, renderMarkdown: () => () => {} } };

	return h(
		"div",
		{ className: "wg-cat-stage", style: { "--wg-cell": `${GRID.cellPx}px`, "--wg-gap": `${GRID.gapPx}px` } },
		h(
			"div",
			{ className: "wg-cat-frame", style: { width: `${size.width}px`, height: `${size.height}px` } },
			h(
				"div",
				{ className: "wg-cat-pic", inert: true },
				h(
					"div",
					{ className: "wg-cat-scaled", style: { width: `${size.width}px`, height: `${size.height}px` } },
					drawnWidget(definition, previewProps(definition, { registry, host })),
				),
			),
		),
	);
}

render(h(Card), document.getElementById("host"));

setTimeout(() => {
	const frame = document.querySelector(".wg-cat-frame");
	const drew = document.querySelector(".wg-cat-pic")?.innerText ?? "";
	const rooted = document.querySelector(".wg-cat-scaled")?.firstElementChild?.getBoundingClientRect();
	const framedAt = frame?.getBoundingClientRect();
	document.getElementById("count").textContent = JSON.stringify({
		drawn: Boolean(frame),
		box: frame ? [frame.clientWidth, frame.clientHeight] : null,
		frameAt: framedAt ? [Math.round(framedAt.left), Math.round(framedAt.top)] : null,
		rootAt: rooted
			? [Math.round(rooted.left), Math.round(rooted.top), Math.round(rooted.width), Math.round(rooted.height)]
			: null,
		letters: drew.replace(/\s+/g, "").length,
		said: drew.slice(0, 160),
	});
}, 1500);
