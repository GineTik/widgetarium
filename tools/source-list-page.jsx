import { createElement as h } from "react";
import { render } from "../packages/core/src/engine/render.js";
import { WidgetSurface } from "../packages/core/src/surface.js";
import { normalizeBoard } from "../packages/core/src/model.js";

const WIDGET = "@probe/counter";

const manifest = {
	id: WIDGET,
	title: "Counter",
	role: "figure",
	size: { preferredWidth: "full", preferredHeight: "auto" },
	props: {
		minutes: {
			kind: "value",
			label: "Minutes",
			type: "number",
			control: "number",
			writes: ["get"],
			default: { value: 0 },
		},
	},
};

function Probe() {
	return h("div", { className: "probe" }, "probe");
}

const registry = {
	get: (id) => (id === WIDGET ? { manifest, component: Probe } : null),
	list: () => [{ manifest }],
};

const host = { platform: "probe", can: {}, ui: { notify() {}, openNote() {} } };
const mount = document.querySelector(".wg-host");

let board = normalizeBoard({
	tiles: [{ id: "t1", widget: WIDGET }],
	layout: { dir: "row", of: [{ dir: "column", keep: true, of: [{ id: "t1" }] }] },
});

function draw() {
	render(
		h(WidgetSurface, {
			boardNode: mount,
			board,
			registry,
			host,
			editing: true,
			initialWidth: mount.clientWidth,
			onChange: (next) => {
				board = next;
				draw();
			},
		}),
		mount,
	);
}

const wait = (ms) => new Promise((done) => setTimeout(done, ms));

function measured(list, pop) {
	const rows = [...list.querySelectorAll("button")];
	return {
		rows: rows.length,
		listHeight: list.clientHeight,
		listContent: list.scrollHeight,
		overflowY: getComputedStyle(list).overflowY,
		squeezedRows: rows.filter((row) => row.scrollHeight > row.clientHeight + 1).length,
		popBottom: pop.getBoundingClientRect().bottom,
		viewport: window.innerHeight,
	};
}

draw();
setTimeout(async () => {
	mount.querySelector('.wg-tile-actions button[aria-label="Settings"]')?.click();
	await wait(400);
	[...document.querySelectorAll(".wg-set-window .wg-set-row")]
		.find((row) => row.textContent.includes("Minutes"))
		?.click();
	await wait(400);
	document.querySelector('.wg-set-pop.is-open button[aria-label="Where the data comes from"]')?.click();
	await wait(400);
	const pop = document.querySelector(".wg-set-pop.is-open");
	const list = pop?.querySelector(".wg-set-sources .wg-kit-side-list");
	const before = list ? measured(list, pop) : null;
	if (list) list.scrollTop = 200;
	await wait(200);
	document.getElementById("wg-measure").textContent = JSON.stringify({
		before,
		scrolledTo: list?.scrollTop ?? null,
		popBottomAfterScroll: pop?.getBoundingClientRect().bottom ?? null,
	});
}, 300);
