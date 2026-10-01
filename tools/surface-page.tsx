import { createElement as h } from "react";
import type { ReactElement } from "react";
import { render } from "../packages/core/src/engine/render.js";
import { WidgetSurface } from "../packages/core/src/surface.js";
import { normalizeBoard } from "../packages/core/src/model.js";
import type { Board } from "../packages/core/src/model.js";
import { WidgetRegistry } from "../packages/core/src/registry.js";
import { measureTile } from "../packages/core/src/surface-measure.js";
import { contentInsetsOf } from "../packages/core/src/content-insets.js";
import { SlotList } from "../packages/kit/src/index.ts";
import { gapVarsOf } from "../packages/core/src/tree.js";
import { withSlotSurface } from "../packages/core/src/widget-root.js";
import { createFileTree, createProbeHost, createRowSlot } from "./vault-fixture.ts";
import { elementAt, elementsAt, present, stackOf } from "./page-dom.ts";

const WIDTH = 1400;
const failures: string[] = [];
window.addEventListener("error", (event) => failures.push(String(event.message)));

const TILE_IDS = ["a", "b", "c", "d", "e", "f", "g"];
const board: Board = normalizeBoard({
	tiles: TILE_IDS.map((id) => ({ id, widget: id === "e" ? "@probe/other" : "@probe/missing" })),
	layout: {
		dir: "row",
		of: [
			{ dir: "column", collapse: { into: "drawer", toggle: "always" }, width: 240, of: [{ id: "a", height: 120 }] },
			{
				dir: "column",
				keep: true,
				of: [
					{
						dir: "column",
						surface: "group",
						of: [
							{ id: "b", height: 80 },
							{ id: "c", height: 80, surface: "apart", side: "start" },
						],
					},
					{
						dir: "row",
						of: [
							{ id: "d", height: 90, surface: "apart" },
							{ id: "e", height: 90 },
						],
					},
					{
						dir: "column",
						surface: "group",
						of: [
							{ id: "f", height: 60 },
							{ id: "g", height: 60, surface: "group" },
						],
					},
				],
			},
			{ dir: "column", collapse: { into: "drawer", toggle: "always" }, of: [] },
		],
	},
});

const PAGE_HEIGHT = 900;
const pagedBoard: Board = { ...board, mode: "expanded" };

const registry = new WidgetRegistry({ vault: { adapter: createFileTree({}) } });
const host = createProbeHost(createRowSlot([]));
const mount = present(elementAt(".wg-host"), ".wg-host");

interface Rect {
	readonly left: number;
	readonly right: number;
	readonly top: number;
	readonly bottom: number;
	readonly width: number;
	readonly height: number;
}

const rectOf = (node: Element): Rect => {
	const at = node.getBoundingClientRect();
	return { left: at.left, right: at.right, top: at.top, bottom: at.bottom, width: at.width, height: at.height };
};
const px = (value: string): number => parseFloat(value) || 0;
const cellOf = (id: string): HTMLElement => present(elementAt(`.wg-tree-cell[data-cell="${id}"]`), `the cell of ${id}`);
const boxAt = (path: string): HTMLElement => present(elementAt(`[data-path="${path}"]`), `the box at ${path}`);

type Span = readonly [number, number];

interface Line {
	readonly left: number;
	readonly right: number;
	readonly top: number;
	readonly bottom: number;
	readonly colour: string;
}

function lineOf(node: Element): Line | null {
	const drawn = getComputedStyle(node, "::before");
	if (drawn.content === "none") return null;
	const at = rectOf(node);
	const [left, right] = spanOf(drawn.left, drawn.right, drawn.width, [at.left, at.right]);
	const [top, bottom] = spanOf(drawn.top, drawn.bottom, drawn.height, [at.top, at.bottom]);
	return { left, right, top, bottom, colour: drawn.backgroundColor };
}

function spanOf(start: string, end: string, size: string, [low, high]: Span): Span {
	if (start === "auto") return [high - px(end) - px(size), high - px(end)];
	if (end === "auto") return [low + px(start), low + px(start) + px(size)];
	return [low + px(start), high - px(end)];
}

function tokenColour(token: string): string {
	const probe = document.createElement("div");
	probe.style.backgroundColor = `var(${token})`;
	present(document.querySelector(".wg-tree-page"), ".wg-tree-page").appendChild(probe);
	const colour = getComputedStyle(probe).backgroundColor;
	probe.remove();
	return colour;
}

function gapItemsOf(cell: HTMLElement): string {
	return getComputedStyle(cell.querySelector(".wg-widget-root") ?? cell)
		.getPropertyValue("--wg-gap-items")
		.trim();
}

function readPaint(): Readonly<Record<string, unknown>> {
	const filled = boxAt("1/0");
	const lower = boxAt("1/2");
	const leftRegion = present(document.querySelector('.wg-tree-region[data-region="0"]'), "the left region");
	const mainRegion = elementAt('.wg-tree-region[data-region="1"]');
	const rightRegion = elementAt('.wg-tree-region[data-region="2"]');
	return {
		fill: {
			surface: filled.dataset["surface"],
			background: getComputedStyle(filled).backgroundColor,
			token: tokenColour("--wg-kit-group-fill"),
			padding: getComputedStyle(filled).paddingTop,
			corner: getComputedStyle(filled).borderTopLeftRadius,
			box: rectOf(filled),
			cells: [rectOf(cellOf("b")), rectOf(cellOf("c"))],
		},
		lower: {
			gap: rectOf(cellOf("g")).top - rectOf(cellOf("f")).bottom,
			kitPlate: getComputedStyle(lower).getPropertyValue("--wg-kit-plate").trim(),
			nestedCorner: getComputedStyle(cellOf("g")).borderTopLeftRadius,
		},
		gaps: {
			plateToBare: rectOf(boxAt("1/1")).top - rectOf(filled).bottom,
			bareToPlate: rectOf(lower).top - rectOf(boxAt("1/1")).bottom,
		},
		columnLine: lineOf(cellOf("c")),
		rowLine: { line: lineOf(cellOf("d")), cell: rectOf(cellOf("d")), next: rectOf(cellOf("e")) },
		rowGap: {
			drawn: rectOf(cellOf("e")).left - rectOf(cellOf("d")).right,
			before: contentInsetsOf(present(cellOf("d").querySelector(".wg-tile-body"), "the body of d")),
			after: contentInsetsOf(present(cellOf("e").querySelector(".wg-tile-body"), "the body of e")),
		},
		padded: readPadded(),
		cellGaps: {
			sidebar: gapItemsOf(cellOf("a")),
			nested: gapItemsOf(cellOf("d")),
		},
		slots: readSlots(),
		regionLine: {
			line: lineOf(leftRegion),
			left: rectOf(leftRegion),
			main: rectOf(present(mainRegion, "the main region")),
		},
		emptyRegion: rightRegion?.dataset["surface"] ?? null,
		mainRegion: mainRegion?.dataset["surface"] ?? null,
		pageLine: readPageLine(),
	};
}

function slotOf(item: HTMLElement): HTMLElement {
	const slot = item.closest(".wg-slot");
	return slot instanceof HTMLElement ? slot : item;
}

function listedSlots(name: string): Readonly<Record<string, unknown>> {
	const [first, second] = elementsAt(`.probe-slots-${name} .probe-slot`).map(slotOf);
	const shown = present(first, `the first ${name} slot`);
	return {
		gap: rectOf(present(second, `the second ${name} slot`)).top - rectOf(shown).bottom,
		surface: shown.dataset["surface"] ?? null,
		background: getComputedStyle(shown).backgroundColor,
		padding: getComputedStyle(shown).paddingTop,
	};
}

function readSlots(): Readonly<Record<string, unknown>> {
	return {
		cards: listedSlots("cards"),
		bare: listedSlots("bare"),
		inset: tokenColour("--wg-kit-group-inset"),
		fill: tokenColour("--wg-kit-group-fill"),
		steps: gapVarsOf(0),
	};
}

function readPadded(): Readonly<Record<string, unknown>> {
	const body = document.createElement("div");
	body.style.cssText = "position: absolute; left: 0; top: 0; width: 300px; height: 200px";
	body.innerHTML = `<div style="padding: 20px 12px 0 30px"><p style="margin: 0">words</p><div style="width: 10px; height: 10px; margin-left: 200px; background: rgb(120, 120, 120)"></div><span style="visibility: hidden; position: absolute; left: 1px; top: 1px">hidden</span></div>`;
	document.body.appendChild(body);
	const insets = contentInsetsOf(body);
	const words = present(body.querySelector("p"), "the words").getBoundingClientRect();
	body.remove();
	return { insets, wordsBottom: Math.round(words.bottom) };
}

function readPageLine(): Readonly<Record<string, unknown>> | null {
	const scroller = document.querySelector(".view-content > .wg-page");
	if (!scroller) return null;
	const region = scroller.querySelector('.wg-tree-region[data-region="0"]');
	if (!region) return null;
	return {
		line: lineOf(region),
		pane: rectOf(scroller),
		scrolls: scroller.scrollHeight > scroller.clientHeight,
	};
}

const SAMPLE_TILE = `
<div class="probe-root" style="background: rgb(250, 250, 250)">
	<h3>Title</h3>
	<div class="probe-column" style="background: rgb(230, 230, 230)"><b>Todo</b><p>First card</p></div>
	<button style="background: rgb(200, 200, 200)">Add</button>
	<i class="probe-mark" style="display:block;width:8px;height:8px;background: rgb(120, 120, 120)"></i>
	<span style="background: rgb(210, 240, 210)">tag</span>
</div>`;

function readMeasure(): ReturnType<typeof measureTile> {
	const body = document.createElement("div");
	body.innerHTML = SAMPLE_TILE;
	document.body.appendChild(body);
	const measured = measureTile(body);
	body.remove();
	return measured;
}

const settled = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 120));

async function report(): Promise<void> {
	const sink = present(document.getElementById("wg-measure"), "#wg-measure");
	try {
		await settled();
		sink.textContent = JSON.stringify({ paint: readPaint(), measure: readMeasure(), failures });
	} catch (failure) {
		sink.textContent = JSON.stringify({ thrown: stackOf(failure) });
	}
}

render(
	h(
		"div",
		{ style: { width: `${WIDTH}px` } },
		h(WidgetSurface, {
			board,
			registry,
			host,
			editing: false,
			screen: true,
			initialWidth: WIDTH,
			onChange: () => {},
			onWidth: () => {},
		}),
	),
	mount,
);

const pane = document.createElement("div");
pane.className = "view-content";
pane.style.cssText = `position: relative; width: ${WIDTH}px; height: ${PAGE_HEIGHT}px; overflow: hidden`;
const pageMount = document.createElement("div");
pane.appendChild(pageMount);
document.body.appendChild(pane);
render(
	h(WidgetSurface, {
		board: pagedBoard,
		registry,
		host,
		editing: false,
		screen: true,
		boardNode: pageMount,
		initialWidth: WIDTH,
		onChange: () => {},
		onWidth: () => {},
	}),
	pageMount,
);

interface SlotRow {
	readonly title: string;
}

const drawProbe = ({ title }: SlotRow): ReactElement =>
	h("p", { className: "probe-slot", style: { margin: 0 } }, title);
const slotRows: readonly SlotRow[] = [{ title: "First" }, { title: "Second" }];
const SLOT_LOOKS = [
	["cards", true],
	["bare", false],
] as const;
for (const [name, isCard] of SLOT_LOOKS) {
	const holder = document.createElement("div");
	holder.className = `wg-root probe-slots-${name}`;
	holder.style.cssText = `width: 300px; ${Object.entries(gapVarsOf(0))
		.map(([key, value]) => `${key}: ${value}`)
		.join("; ")}`;
	document.body.appendChild(holder);
	const ground = document.createElement("div");
	if (isCard) ground.dataset["surface"] = "group";
	holder.appendChild(ground);
	render(
		h(SlotList<SlotRow, SlotRow>, {
			slot: withSlotSurface(drawProbe, { surface: isCard ? "group" : "none", isCard }),
			rows: slotRows,
			give: (row: SlotRow) => row,
		}),
		ground,
	);
}
setTimeout(report, 600);
