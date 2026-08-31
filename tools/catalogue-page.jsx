import { createElement as h } from "react";
import { render } from "../src/engine/render.js";
import { useEffect, useState } from "react";
import { Catalogue } from "../src/catalogue.js";
import { WidgetRegistry } from "../src/registry.js";
import { slotFit } from "../src/fit.js";

const FILES = window.__FILES__;
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
				setRegistry(loading);
			})
			.catch((failure) => boom(`load: ${failure.stack}`));
	}, []);

	if (!registry) return h("p", { className: "harness-wait" }, "Loading widgets…");

	// CONTEXT: only a slot ranks candidates, so place and browse are photographed unranked
	const gives = MODE === "fill" && SLOT ? registry.get(SLOT.parent)?.manifest?.slots?.[SLOT.name]?.gives : null;

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
	// CONTEXT: the lattice moved inside each card, so the pitch is read per stage, not once
	const spanOn = (stage, px) => {
		const style = getComputedStyle(stage);
		const cell = Number.parseFloat(style.getPropertyValue("--wg-cell"));
		const gap = Number.parseFloat(style.getPropertyValue("--wg-gap"));
		return Math.round((px + gap) / (cell + gap));
	};

	const over = [];
	const offGrid = [];
	for (const tile of document.querySelectorAll(".wg-cat-tile")) {
		const frame = tile.querySelector(".wg-cat-frame");
		const inner = frame?.firstElementChild;
		const pic = tile.querySelector(".wg-cat-pic");
		const name = tile.querySelector(".wg-cat-name").textContent;
		const box = tile.getBoundingClientRect();
		over.push({ name, at: [Math.round(box.left), Math.round(box.top), Math.round(box.width), Math.round(box.height)], span: tile.getAttribute("data-span"), box: frame ? [frame.clientWidth, frame.clientHeight] : null, wants: inner ? [inner.scrollWidth, inner.scrollHeight] : null });
		// CONTEXT: the declared span is read back off the drawn box, which is the only proof it landed
		// the card CAPS a long span, so what must hold is that the stage is a whole number of
		// cells — never that it equals the widget's own, which may be larger than the cap
		const stage = tile.querySelector(".wg-cat-frame");
		const wide = spanOn(stage, stage.clientWidth);
		const tall = spanOn(stage, stage.clientHeight);
		if (!(wide >= 1 && tall >= 1)) offGrid.push({ name, declared: tile.getAttribute("data-span"), drawn: `${wide}x${tall}` });
	}

	document.getElementById("count").textContent = JSON.stringify({
		tiles: document.querySelectorAll(".wg-cat-tile").length,
		cells: document.querySelectorAll(".wg-cat-frame > .wg-cells > i").length,
		captions: document.querySelectorAll(".wg-cat-tile .wg-cat-name").length,
		badges: document.querySelectorAll(".wg-cat-tile .wg-cat-badge").length,
		feet: document.querySelectorAll(".wg-cat-tile > .wg-cat-foot").length,
		buttons: document.querySelectorAll(".wg-cat-foot .wg-cat-go").length,
		// THE FOOT IS THE CARD'S, NOT THE STAGE'S. Over the picture it cost the stage 58px of
		// padding it kept from the widget; a foot found inside a stage is that pill back again.
		floating: document.querySelectorAll(".wg-cat-stage .wg-cat-foot").length,
		shown: document.querySelectorAll(".wg-cat-shown button").length,
		// CONTEXT: the kit paints a control's corner and fill on ::before by design, so the
		// element itself is square and measuring IT says nothing
		round: [...document.querySelectorAll(".wg-cat-go")].filter((node) => {
			const box = node.getBoundingClientRect();
			const painted = getComputedStyle(node, "::before");
			return box.width === box.height && parseFloat(painted.borderRadius) >= box.width / 2;
		}).length,
		radius: [...document.querySelectorAll(".wg-cat-go")].slice(0, 1).map((node) => {
			const box = node.getBoundingClientRect();
			const painted = getComputedStyle(node, "::before");
			return `${Math.round(box.width)}x${Math.round(box.height)} ::before r${painted.borderRadius} on ${painted.background.split(" ")[0]}`;
		})[0],
		// A PHOTOGRAPH IN THE WRONG TYPEFACE LIES ABOUT EVERYTHING IN IT. fontFamily hands back
		// the DECLARED list, where "sans-serif" contains "serif" — so the face is measured, by
		// setting the same text twice and seeing whether the page's own stack renders as Times.
		serif: (() => {
			const probe = (family) => {
				const span = document.createElement("span");
				span.textContent = "Handgloves 0123456789";
				span.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font-size:32px;${family ? `font-family:${family}` : ""}`;
				document.body.appendChild(span);
				const width = span.getBoundingClientRect().width;
				span.remove();
				return width;
			};
			const mine = probe(null);
			return mine === probe('"Times New Roman", Times, serif') ? "Times" : null;
		})(),
		lacks: document.querySelectorAll(".wg-cat-lack").length,
		divides: document.querySelectorAll(".wg-cat-divide").length,
		live: document.querySelectorAll(".wg-cat-frame").length,
		// THE FOG IS ON EVERY CARD, AND IT ENDS IN THE GROUND BEHIND IT. Painted only where a widget
		// overflowed, a haze on some cards and not others reads as a fault; painted to a hardcoded
		// white it is a grey smear on the dark theme. Both are measured here, in both themes: the
		// gradient's last stop must be the colour the stage is actually painted.
		fogged: [...document.querySelectorAll(".wg-cat-frame")].filter((node) => getComputedStyle(node, "::after").content !== "none").length,
		fog: (() => {
			const frame = document.querySelector(".wg-cat-frame");
			const stage = document.querySelector(".wg-cat-stage");
			if (!frame || !stage) return null;
			const painted = getComputedStyle(frame, "::after");
			const ground = getComputedStyle(stage).backgroundColor;
			return { ground, ends: painted.backgroundImage.includes(ground), said: painted.backgroundImage, tall: painted.height };
		})(),
		stands: document.querySelectorAll(".wg-cat-stand").length,
		contained: document.querySelectorAll(".wg-cat-stand.is-broken").length,
		over,
		offGrid,
	});
}, 1200);
