import { createElement as h } from "react";
import { useState } from "react";
import { Button } from "./kit.js";

// TRADE-OFF: 12 clears every shipped height and leaves the 13-wide family one edge click away
export const START_CELLS = 12;
const GROW_BY = 2;
const GROW_AT = 0.9;

// CONTEXT: whole authored sentences — a built-up sentence cannot be translated
const SAID = {
	empty: "Click any cell to set where the range starts.",
	corner: "Click another cell to set where the range ends.",
	one: "Filtering widgets exactly {width} by {height} cells.",
	range: "Filtering widgets {wFrom} to {wTo} cells wide and {hFrom} to {hTo} cells tall.",
	cell: "{width} by {height} cells",
};

function filled(sentence, values) {
	return Object.entries(values).reduce((said, [key, value]) => said.replace(`{${key}}`, String(value)), sentence);
}

export function emptyPick() {
	return { cells: START_CELLS, corners: [] };
}

function reachOf(corners) {
	return corners.reduce((most, corner) => Math.max(most, corner.x, corner.y), 0);
}

export function grownTo(cells, corners) {
	let room = cells;
	while (reachOf(corners) >= Math.ceil(room * GROW_AT)) room += GROW_BY;
	return room;
}

// CONTEXT: a third press starts over, so two corners is the most this ever holds
export function pickCell(pick, cell) {
	const corners = pick.corners.length === 1 ? [pick.corners[0], cell] : [cell];
	return { cells: grownTo(pick.cells, corners), corners };
}

// CONTEXT: neither corner is the start — per axis the smaller is the floor
export function spanOf(one, other) {
	return {
		wFrom: Math.min(one.x, other.x),
		wTo: Math.max(one.x, other.x),
		hFrom: Math.min(one.y, other.y),
		hTo: Math.max(one.y, other.y),
	};
}

export function pickedSize(pick) {
	return pick.corners.length === 2 ? spanOf(pick.corners[0], pick.corners[1]) : null;
}

export function saidFor(pick) {
	const size = pickedSize(pick);
	if (size === null) return pick.corners.length === 0 ? SAID.empty : SAID.corner;
	if (size.wFrom === size.wTo && size.hFrom === size.hTo) {
		return filled(SAID.one, { width: size.wFrom, height: size.hFrom });
	}
	return filled(SAID.range, size);
}

export function typedOf(size) {
	return { wFrom: String(size.wFrom), wTo: String(size.wTo), hFrom: String(size.hFrom), hTo: String(size.hTo) };
}

function holds(size, x, y) {
	return size !== null && x >= size.wFrom && x <= size.wTo && y >= size.hFrom && y <= size.hTo;
}

function cellClass(held, shown, x, y) {
	if (holds(held, x, y)) return "wg-size-cell is-on";
	if (holds(shown, x, y)) return "wg-size-cell is-near";
	return "wg-size-cell";
}

function cellsOf(pick, held, shown, press, enter) {
	const cells = [];
	for (let y = 1; y <= pick.cells; y += 1) {
		for (let x = 1; x <= pick.cells; x += 1) {
			cells.push(
				h("button", {
					type: "button",
					key: `${x}-${y}`,
					className: cellClass(held, shown, x, y),
					"data-cell": `${x}x${y}`,
					"aria-label": filled(SAID.cell, { width: x, height: y }),
					onMouseEnter: () => enter({ x, y }),
					onClick: () => press({ x, y }),
				}),
			);
		}
	}
	return cells;
}

// TRADE-OFF: nothing leaves here until Apply, so a half-drawn rectangle never filters the list
export function SizeGrid({ phone, onClear, onApply }) {
	const [pick, setPick] = useState(emptyPick);
	const [hover, setHover] = useState(null);
	const held = pickedSize(pick);
	const planted = pick.corners.length === 1 ? spanOf(pick.corners[0], hover ?? pick.corners[0]) : null;
	const shown = held ?? planted;

	return h("div", { className: "wg-size-pick" }, [
		h(
			"div",
			{
				key: "grid",
				className: phone ? "wg-size-grid is-phone" : "wg-size-grid",
				style: { "--wg-size-across": pick.cells },
				onMouseLeave: () => setHover(null),
			},
			cellsOf(pick, held, shown, (cell) => setPick((last) => pickCell(last, cell)), setHover),
		),
		h("p", { key: "said", className: "wg-size-said" }, saidFor(pick)),
		h("div", { key: "foot", className: "wg-size-foot" }, [
			h(Button, { key: "clear", size: "s", className: "wg-size-clear", onClick: onClear }, "Clear"),
			h(
				Button,
				{ key: "apply", size: "s", variant: "accent", className: "wg-size-apply", disabled: held === null, onClick: () => onApply(typedOf(held)) },
				"Apply",
			),
		]),
	]);
}
