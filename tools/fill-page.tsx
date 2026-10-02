import "./packs-registered.ts";
import type { ReactElement } from "react";
import { render } from "../packages/core/src/engine/render.js";
import { rootWidget } from "../packages/core/src/widget-root.js";
import { arrayGateway, soloGateway } from "../packages/core/src/gateway/create";
import { createViewCells, selectionGateway } from "../packages/core/src/gateway/refs.js";
import ViewTabs from "../registry/@default/view-tabs/widget.tsx";
import FilterPanel from "../registry/@default/filter-panel/widget.tsx";
import { spanToPixels } from "../packages/core/src/paths.js";
import { GRID } from "../packages/core/src/paths.js";

interface FillCase {
	readonly name: string;
	readonly cells: number;
	readonly node: ReactElement;
	readonly control: string;
	readonly label: string;
	readonly icon: string;
}

interface DrawnTile {
	readonly tile: HTMLElement;
	readonly body: HTMLElement;
	readonly width: number;
}

interface DrawnCase extends DrawnTile {
	readonly entry: FillCase;
}

interface Box {
	readonly left: number;
	readonly right: number;
	readonly width: number;
	readonly height: number;
}

interface FillReading {
	readonly name: string;
	readonly cells: number;
	readonly tileWidth: number;
	readonly tileBox: Box | null;
	readonly control: Box | null;
	readonly controlOverflow: number | null;
	readonly controlNatural: number | null;
	readonly label: Box | null;
	readonly labelText: string | null;
	readonly labelClipped: boolean | null;
	readonly labelEllipsis: string | null;
	readonly icon: Box | null;
}

const emptyTasks = arrayGateway([], {}, "fill-tasks");
const cellFor = createViewCells();

const viewOptions = (selected: string) => {
	const options = arrayGateway(
		["Kanban", "Archived columns"].map((label) => ({ label, value: label })),
		{},
		`fill-views-${selected}`,
	);
	const picked = cellFor(`fill-picked-${selected}`);
	picked.update(selected === "Kanban" ? "i0" : "i1");
	return {
		options,
		selection: selectionGateway({
			id: `fill-selection-${selected}`,
			memory: picked,
			collection: options,
			fieldName: "value",
			isFallbackToFirst: true,
		}),
	};
};
const shortLabel = viewOptions("Kanban");
const longLabel = viewOptions("Archived columns");
const filterGroups = arrayGateway([{ prop: "assignees", control: "people", label: "Members" }], {}, "fill-groups");
const noProperties = arrayGateway([], {}, "fill-properties");
const openNothing = soloGateway("", {}, "fill-open");
const chosenFilters = cellFor("fill-chosen");
const filterPanel = (): ReactElement => (
	<FilterPanel
		getTasks={emptyTasks}
		getGroups={filterGroups}
		getOpenGroup={openNothing}
		getProperties={noProperties}
		getChosen={chosenFilters}
	/>
);

const CASES: readonly FillCase[] = [
	{
		name: "view-tabs, 3 cells, short label",
		cells: 3,
		node: <ViewTabs getOptions={shortLabel.options} getSelection={shortLabel.selection} />,
		control: "button.ovt-pick",
		label: ".ovt-pick .wg-kit-btn-label",
		icon: ".ovt-caret",
	},
	{
		name: "view-tabs, 2 cells, over-long label",
		cells: 2,
		node: <ViewTabs getOptions={longLabel.options} getSelection={longLabel.selection} />,
		control: "button.ovt-pick",
		label: ".ovt-pick .wg-kit-btn-label",
		icon: ".ovt-caret",
	},
	{
		name: "view-tabs, 1 cell, over-long label",
		cells: 1,
		node: <ViewTabs getOptions={longLabel.options} getSelection={longLabel.selection} />,
		control: "button.ovt-pick",
		label: ".ovt-pick .wg-kit-btn-label",
		icon: ".ovt-caret",
	},
	{
		name: "view-tabs, 13 cells, over-long label",
		cells: 13,
		node: <ViewTabs getOptions={longLabel.options} getSelection={longLabel.selection} />,
		control: "button.ovt-pick",
		label: ".ovt-pick .wg-kit-btn-label",
		icon: ".ovt-caret",
	},
	{
		name: "filter, 3 cells",
		cells: 3,
		node: filterPanel(),
		control: "button.ofp-open",
		label: ".ofp-open .wg-kit-btn-label",
		icon: ".ofp-icon",
	},
	{
		name: "filter, 2 cells",
		cells: 2,
		node: filterPanel(),
		control: "button.ofp-open",
		label: ".ofp-open .wg-kit-btn-label",
		icon: ".ofp-icon",
	},
	{
		name: "filter, 1 cell",
		cells: 1,
		node: filterPanel(),
		control: "button.ofp-open",
		label: ".ofp-open .wg-kit-btn-label",
		icon: ".ofp-icon",
	},
];

function mustFind(selector: string): Element {
	const found = document.querySelector(selector);
	if (!found) throw new Error(`fill page: nothing matches ${selector}`);
	return found;
}

function tileLikeSurfaceAt(cells: number): DrawnTile {
	const width = spanToPixels(cells, GRID.cellPx, GRID.gapPx);
	const height = spanToPixels(1, GRID.cellPx, GRID.gapPx);
	const tile = document.createElement("div");
	tile.className = "wg-tile";
	tile.style.cssText = `position: relative; width: ${width}px; height: ${height}px;`;
	const body = document.createElement("div");
	body.className = "wg-tile-body";
	tile.appendChild(body);
	mustFind(".wg-grid").appendChild(tile);
	return { tile, body, width };
}

function boxOf(node: Element | null): Box | null {
	if (!node) return null;
	const rect = node.getBoundingClientRect();
	return { left: rect.left, right: rect.right, width: rect.width, height: rect.height };
}

function drawAll(): DrawnCase[] {
	return CASES.map((entry) => {
		const { tile, body, width } = tileLikeSurfaceAt(entry.cells);
		render(rootWidget(entry.node), body);
		return { entry, tile, body, width };
	});
}

function collapseThresholdOf(control: Element | null): number | null {
	if (!control) return null;
	const copy = control.cloneNode(true);
	if (!(copy instanceof HTMLElement)) return null;
	copy.style.cssText = "position: absolute; left: -9999px; width: max-content;";
	control.parentNode?.appendChild(copy);
	const measured = copy.getBoundingClientRect().width;
	copy.remove();
	return measured;
}

function readOne({ entry, tile, body, width }: DrawnCase): FillReading {
	const control = body.querySelector(entry.control);
	const label = body.querySelector(entry.label);
	return {
		name: entry.name,
		cells: entry.cells,
		tileWidth: width,
		tileBox: boxOf(tile),
		control: boxOf(control),
		controlOverflow: control ? control.scrollWidth : null,
		controlNatural: collapseThresholdOf(control),
		label: boxOf(label),
		labelText: label ? label.textContent : null,
		labelClipped: label ? label.scrollWidth > label.clientWidth : null,
		labelEllipsis: label ? getComputedStyle(label).textOverflow : null,
		icon: boxOf(body.querySelector(entry.icon)),
	};
}

// TRADE-OFF: headless Chrome fires no requestAnimationFrame, so a timer ladder waits for layout instead.
function afterLayoutWithoutFrames(done: () => void): void {
	for (const delay of [0, 20, 80, 250]) setTimeout(done, delay);
}

const probe = document.createElement("div");
probe.className = "wg-grid";
probe.style.cssText = "position: relative; width: 1200px; display: block;";
mustFind(".wg-root").appendChild(probe);

function stackOf(failure: unknown): string {
	if (failure instanceof Error) return String(failure.stack);
	return String(failure ? undefined : failure);
}

function report(): void {
	const sink = mustFind("#wg-measure");
	try {
		sink.textContent = JSON.stringify(drawn.map(readOne));
	} catch (failure) {
		sink.textContent = JSON.stringify({ failure: stackOf(failure) });
	}
}

const drawn = drawAll();
report();
afterLayoutWithoutFrames(report);
window.addEventListener("error", (event) => {
	mustFind("#wg-measure").textContent = JSON.stringify({ failure: String(event.message) });
});
