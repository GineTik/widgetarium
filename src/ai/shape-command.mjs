import { normalizeBoard, serializeBoard } from "../model.js";
import { CARD_NAMES, cardNamed, cardNode } from "../patterns.js";
import { LAYOUT_NAMES, layoutNamed, sectionsOf, skeletonOf } from "../layouts.js";

export const BASE_NAMES = LAYOUT_NAMES;

export function everyBase() {
	const rows = LAYOUT_NAMES.map((name) => ({
		base: name,
		suits: layoutNamed(name).suits,
		holds: layoutNamed(name).holds,
	}));
	const text = rows
		.map((row) => `${row.base.padEnd(15)} ${row.suits}\n${" ".repeat(15)} holds: ${row.holds}`)
		.join("\n");
	return { value: rows, text };
}

export function baseNamed(name) {
	const held = layoutNamed(name);
	if (!held)
		return { refusal: `${name} is not a base a screen starts from. The ones that are: ${LAYOUT_NAMES.join(", ")}.` };
	const board = skeletonOf(name, (raw) => serializeBoard(normalizeBoard(raw)));
	return { value: board, text: baseText(name, held, board) };
}

export function cardLayoutNamed(name) {
	const card = cardNamed(name);
	if (!card) return { refusal: `${name} is not a card layout. The ones there are: ${CARD_NAMES.join(", ")}.` };
	const alone = cardNode(name);
	const amongPeers = cardNode(name, { amongPeers: true });
	return {
		value: { card: name, alone, amongPeers, parts: card.parts },
		text: [
			`${name} — ${card.suits}`,
			`standing alone it wears ${alone.surface ?? "nothing"}, among peers of its kind ${amongPeers.surface ?? "nothing"}`,
			"every part stands bare on that one plate; a part that wears a plate of its own is what law N2 refuses",
			...card.parts.map((part) => `  ${part.place.padEnd(9)} asks for ${part.asks}`),
		].join("\n"),
	};
}

function baseText(name, held, board) {
	return [
		`${name} — ${held.suits}`,
		`holds: ${held.holds}`,
		regionLines(held),
		"",
		sectionLines(held),
		"",
		placeLines(board),
	].join("\n");
}

function regionLines(held) {
	return [
		`${held.layout.of.length} regions, needs ${held.needsPx}px of board width`,
		...held.layout.of.map(
			(region, at) =>
				`  ${at}  ${String(region.role).padEnd(12)} ${region.keep ? "keep" : "side"}  ${region.surface ?? "none"}  ${region.purpose}`,
		),
	].join("\n");
}

function sectionLines(held) {
	return [
		"sections, each already carrying its heading:",
		...sectionsOf(held.layout).map(
			(row) => `  ${row.name.padEnd(18)} ${String(row.role ?? "-").padEnd(12)} ${row.purpose}`,
		),
	].join("\n");
}

function placeLines(board) {
	const places = emptyPlaces(board.layout);
	return [
		`${board.tiles.length} lines of text are already written and placed; ${places.length} places stand empty, waiting for a widget:`,
		...places.map((place) => `  ${String(place.role).padEnd(12)} ${place.purpose}`),
		"",
		"Fill a place by appending a tile and a leaf naming its id inside it. Duplicate a place to get another of the same.",
	].join("\n");
}

function emptyPlaces(node, found = []) {
	for (const child of node?.of ?? []) {
		if (Array.isArray(child.of) && child.of.length === 0) found.push(child);
		emptyPlaces(child, found);
	}
	return found;
}
