import "./packs-registered.ts";
import { createElement as h } from "react";
import type { ReactElement } from "react";
import { render } from "../packages/core/src/engine/render.js";
import { WidgetSurface } from "../packages/core/src/surface.js";
import { normalizeBoard } from "../packages/core/src/model.js";
import type { Board } from "../packages/core/src/model.js";
import type { BoardRegistry, SurfaceHost } from "../packages/core/src/surface/use-surface-shared.js";
import type { VaultSlot } from "../packages/core/src/gateway/obsidian.js";
import { PROBE_VIEW } from "./vault-fixture.ts";
import { elementAt, elementsAt, present } from "./page-dom.ts";

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
} as const;

function Probe(): ReactElement {
	return h("div", { className: "probe" }, "probe");
}

const registry: BoardRegistry = {
	get: (id) => (id === WIDGET ? { manifest, component: Probe } : null),
	list: () => [{ manifest }],
	tileRefOf: (id) => id,
};

const SLOT_THAT_DESCRIBES_NOTHING: VaultSlot = {
	list: async () => ({ rows: [], total: 0 }),
	get: async () => null,
};

const host: SurfaceHost = { ...PROBE_VIEW, slot: () => SLOT_THAT_DESCRIBES_NOTHING };
const mount = present(elementAt(".wg-host"), ".wg-host");

let board: Board = normalizeBoard({
	tiles: [{ id: "t1", widget: WIDGET }],
	layout: { dir: "row", of: [{ dir: "column", keep: true, of: [{ id: "t1" }] }] },
});

function draw(): void {
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

const wait = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));

interface ListMeasure {
	readonly rows: number;
	readonly listHeight: number;
	readonly listContent: number;
	readonly overflowY: string;
	readonly squeezedRows: number;
	readonly popBottom: number;
	readonly viewport: number;
	readonly sections: readonly SectionDrawn[];
}

interface SectionDrawn {
	readonly heading: string;
	readonly rows: readonly string[];
}

function sectionsIn(list: HTMLElement): SectionDrawn[] {
	return [...list.querySelectorAll(".wg-set-sources")].map((group) => ({
		heading: group.querySelector(".wg-kit-side-label")?.textContent ?? "",
		rows: [...group.querySelectorAll("button")].map((row) => row.textContent ?? ""),
	}));
}

function measured(list: HTMLElement, pop: Element): ListMeasure {
	const rows = [...list.querySelectorAll("button")];
	return {
		rows: rows.length,
		listHeight: list.clientHeight,
		listContent: list.scrollHeight,
		overflowY: getComputedStyle(list).overflowY,
		squeezedRows: rows.filter((row) => row.scrollHeight > row.clientHeight + 1).length,
		popBottom: pop.getBoundingClientRect().bottom,
		viewport: window.innerHeight,
		sections: sectionsIn(list),
	};
}

draw();
setTimeout(async () => {
	elementAt('.wg-tile-actions button[aria-label="Settings"]', mount)?.click();
	await wait(400);
	elementsAt(".wg-set-window .wg-set-row")
		.find((row) => row.textContent?.includes("Minutes"))
		?.click();
	await wait(400);
	elementAt('.wg-set-pop.is-open button[aria-label="Where the data comes from"]')?.click();
	await wait(400);
	const pop = document.querySelector(".wg-set-pop.is-open");
	const list = pop ? elementAt(".wg-set-choice-sections", pop) : null;
	const before = list && pop ? measured(list, pop) : null;
	if (list) list.scrollTop = 200;
	await wait(200);
	present(document.getElementById("wg-measure"), "#wg-measure").textContent = JSON.stringify({
		before,
		scrolledTo: list?.scrollTop ?? null,
		popBottomAfterScroll: pop?.getBoundingClientRect().bottom ?? null,
	});
}, 300);
