import { h, render } from "preact";
import { useEffect, useState } from "preact/hooks";
import { Catalogue } from "../src/catalogue.js";
import { WidgetRegistry } from "../src/registry.js";
import { slotFit } from "../src/fit.js";

const FILES = window.__FILES__;
const NOT_INSTALLED = new Set(window.__NOT_INSTALLED__ ?? []);
const MODE = window.__MODE__ ?? "place";
// CONTEXT: fill mode ranks against a REAL slot's declaration, read off the parent's own manifest
const SLOT = window.__SLOT__ ?? null;

// CONTEXT: the plugin reads widgets through this shape, so the harness compiles what ships
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

function Harness() {
	const [registry, setRegistry] = useState(null);

	useEffect(() => {
		const loading = new WidgetRegistry({ vault: { adapter } });
		loading
			.load()
			.then(() => {
				for (const entry of loading.list()) entry.installed = !NOT_INSTALLED.has(entry.manifest.id);
				setRegistry(loading);
			})
			.catch((failure) => boom(`load: ${failure.stack}`));
	}, []);

	if (!registry) return h("p", { class: "harness-wait" }, "Loading widgets…");

	const gives = SLOT ? registry.get(SLOT.parent)?.manifest?.slots?.[SLOT.name]?.gives : null;

	return h(Catalogue, {
		registry,
		host: { platform: "obsidian", can: {}, ui: { notify() {}, renderMarkdown: () => () => {} } },
		mode: MODE,
		rank: gives ? (manifest) => slotFit(manifest, gives) : undefined,
		onPick: () => {},
		onDetail: () => {},
	});
}

render(h(Harness), document.getElementById("host"));

setTimeout(() => {
	const over = [...document.querySelectorAll(".wg-cat-tile")].map((tile) => {
		const frame = tile.querySelector(".wg-cat-frame");
		const inner = frame?.firstElementChild;
		return {
			name: tile.querySelector(".wg-cat-name").textContent,
			box: frame ? [frame.clientWidth, frame.clientHeight] : null,
			wants: inner ? [inner.scrollWidth, inner.scrollHeight] : null,
		};
	});
	document.getElementById("count").textContent = JSON.stringify({
		tiles: document.querySelectorAll(".wg-cat-tile").length,
		lacks: document.querySelectorAll(".wg-cat-lack").length,
		divides: document.querySelectorAll(".wg-cat-divide").length,
		live: document.querySelectorAll(".wg-cat-frame").length,
		stands: document.querySelectorAll(".wg-cat-stand").length,
		contained: document.querySelectorAll(".wg-cat-stand.is-broken").length,
		over,
	});
}, 1200);
