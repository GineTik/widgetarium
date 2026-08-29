import { render } from "preact";
import ViewTabs from "../widgets/@orbitask/view-tabs/widget.jsx";
import FilterPanel from "../widgets/@orbitask/filter-panel/widget.jsx";
import { spanToPixels } from "../src/layout.js";
import { GRID } from "../src/paths.js";

// CONTEXT: a widget reads its board through this, and a standalone tile has no board
const context = { get: () => undefined, set: () => {} };

const CASES = [
	{
		name: "view-tabs, 3 cells, short label",
		cells: 3,
		node: <ViewTabs settings={{ views: "Kanban, Archived columns", activeView: "Kanban" }} context={context} />,
		control: "button.ovt-pick",
		label: ".ovt-pick .wg-kit-btn-label",
		icon: ".ovt-caret",
	},
	{
		name: "view-tabs, 2 cells, over-long label",
		cells: 2,
		node: <ViewTabs settings={{ views: "Kanban, Archived columns", activeView: "Archived columns" }} context={context} />,
		control: "button.ovt-pick",
		label: ".ovt-pick .wg-kit-btn-label",
		icon: ".ovt-caret",
	},
	{
		name: "view-tabs, 1 cell, over-long label",
		cells: 1,
		node: <ViewTabs settings={{ views: "Kanban, Archived columns", activeView: "Archived columns" }} context={context} />,
		control: "button.ovt-pick",
		label: ".ovt-pick .wg-kit-btn-label",
		icon: ".ovt-caret",
	},
	{
		name: "view-tabs, 13 cells, over-long label",
		cells: 13,
		node: <ViewTabs settings={{ views: "Kanban, Archived columns", activeView: "Archived columns" }} context={context} />,
		control: "button.ovt-pick",
		label: ".ovt-pick .wg-kit-btn-label",
		icon: ".ovt-caret",
	},
	{
		name: "filter, 3 cells",
		cells: 3,
		node: <FilterPanel settings={{ groups: "assignees:people:Members", key: "filters" }} data={{ tasks: { rows: [] } }} context={context} />,
		control: "button.ofp-open",
		label: ".ofp-open .wg-kit-btn-label",
		icon: ".ofp-icon",
	},
	{
		name: "filter, 2 cells",
		cells: 2,
		node: <FilterPanel settings={{ groups: "assignees:people:Members", key: "filters" }} data={{ tasks: { rows: [] } }} context={context} />,
		control: "button.ofp-open",
		label: ".ofp-open .wg-kit-btn-label",
		icon: ".ofp-icon",
	},
	{
		name: "filter, 1 cell",
		cells: 1,
		node: <FilterPanel settings={{ groups: "assignees:people:Members", key: "filters" }} data={{ tasks: { rows: [] } }} context={context} />,
		control: "button.ofp-open",
		label: ".ofp-open .wg-kit-btn-label",
		icon: ".ofp-icon",
	},
];

// CONTEXT: the tile chain surface.js builds — grid, absolute tile at a pixel width, body, widget
function tileFor(cells) {
	const width = spanToPixels(cells, GRID.cellPx, GRID.gapPx);
	const height = spanToPixels(1, GRID.cellPx, GRID.gapPx);
	const tile = document.createElement("div");
	tile.className = "wg-tile";
	tile.style.cssText = `position: relative; width: ${width}px; height: ${height}px;`;
	const body = document.createElement("div");
	body.className = "wg-tile-body";
	tile.appendChild(body);
	document.querySelector(".wg-grid").appendChild(tile);
	return { tile, body, width };
}

function boxOf(node) {
	if (!node) return null;
	const rect = node.getBoundingClientRect();
	return { left: rect.left, right: rect.right, width: rect.width, height: rect.height };
}

function drawAll() {
	return CASES.map((entry) => {
		const { tile, body, width } = tileFor(entry.cells);
		render(entry.node, body);
		return { entry, tile, body, width };
	});
}

// CONTEXT: what the control would be at its content width, which is the collapse threshold
function naturalWidth(control) {
	if (!control) return null;
	const copy = control.cloneNode(true);
	copy.style.cssText = "position: absolute; left: -9999px; width: max-content;";
	control.parentNode.appendChild(copy);
	const measured = copy.getBoundingClientRect().width;
	copy.remove();
	return measured;
}

function readOne({ entry, tile, body, width }) {
	const control = body.querySelector(entry.control);
	const label = body.querySelector(entry.label);
	return {
		name: entry.name,
		cells: entry.cells,
		tileWidth: width,
		tileBox: boxOf(tile),
		control: boxOf(control),
		controlOverflow: control ? control.scrollWidth : null,
		controlNatural: naturalWidth(control),
		label: boxOf(label),
		labelText: label ? label.textContent : null,
		labelClipped: label ? label.scrollWidth > label.clientWidth : null,
		labelEllipsis: label ? getComputedStyle(label).textOverflow : null,
		icon: boxOf(body.querySelector(entry.icon)),
	};
}

// CONTEXT: headless Chrome paints no frames, so requestAnimationFrame never fires — a
// measuring decision that lands in a microtask has to be waited for on a timer instead
function afterLayout(done) {
	for (const delay of [0, 20, 80, 250]) setTimeout(done, delay);
}

const probe = document.createElement("div");
probe.className = "wg-grid";
probe.style.cssText = "position: relative; width: 1200px; display: block;";
document.querySelector(".wg-root").appendChild(probe);

function report() {
	const sink = document.getElementById("wg-measure");
	try {
		sink.textContent = JSON.stringify(drawn.map(readOne));
	} catch (failure) {
		sink.textContent = JSON.stringify({ failure: String(failure && failure.stack) });
	}
}

const drawn = drawAll();
report();
afterLayout(report);
window.addEventListener("error", (event) => {
	document.getElementById("wg-measure").textContent = JSON.stringify({ failure: String(event.message) });
});
