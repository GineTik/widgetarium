import { normalizeBoard, serializeBoard } from "@widgetarium/core/model.js";
import { CARD_NAMES, cardNamed, cardNode } from "@widgetarium/core/patterns.js";
import {
	LAYOUT_NAMES,
	layoutNamed,
	refuseZones,
	sectionsOf,
	skeletonOf,
	slotRulesOf,
} from "@widgetarium/core/layouts.js";
import type { LayoutBase } from "@widgetarium/core/layout-bases.js";
import { isBox } from "@widgetarium/core/tree-nodes.js";
import type { BoardNode, BoxNode } from "@widgetarium/core/tree-nodes.js";

type SerializedBoard = ReturnType<typeof serializeBoard>;

export type Told<Value> =
	{ readonly refusal: string } | { readonly refusal?: undefined; readonly value: Value; readonly text: string };

export interface BaseRow {
	readonly base: string;
	readonly suits: string | undefined;
	readonly holds: string | undefined;
}

export const BASE_NAMES = LAYOUT_NAMES;

export function everyBase(): Told<BaseRow[]> {
	const rows = LAYOUT_NAMES.map((name) => ({
		base: name,
		suits: layoutNamed(name)?.suits,
		holds: layoutNamed(name)?.holds,
	}));
	const text = rows
		.map((row) => `${row.base.padEnd(15)} ${String(row.suits)}\n${" ".repeat(15)} holds: ${String(row.holds)}`)
		.join("\n");
	return { value: rows, text };
}

export function baseNamed(name: unknown, zonesSaid?: unknown): Told<SerializedBoard> {
	const zones = zonesIn(zonesSaid);
	const refusal = refuseZones(name, zones);
	if (refusal) return { refusal };
	const held = layoutNamed(name);
	const board = held ? skeletonOf(name, (raw) => serializeBoard(normalizeBoard(raw)), zones) : null;
	if (!held || !board)
		return {
			refusal: `${String(name)} is not a base a screen starts from. The ones that are: ${LAYOUT_NAMES.join(", ")}.`,
		};
	return { value: board, text: baseText(String(name), held, board) };
}

export function cardLayoutNamed(name: unknown): Told<object> {
	const card = cardNamed(name);
	if (!card) return { refusal: `${String(name)} is not a card layout. The ones there are: ${CARD_NAMES.join(", ")}.` };
	const alone = cardNode(name);
	const amongPeers = cardNode(name, { amongPeers: true });
	return {
		value: { card: name, alone, amongPeers, parts: card.parts },
		text: [
			`${String(name)} — ${card.suits}`,
			`standing alone it wears ${alone?.surface ?? "nothing"}, among peers of its kind ${amongPeers?.surface ?? "nothing"}`,
			"every part stands bare on that one plate; a part that wears a plate of its own is what law N2 refuses",
			...card.parts.map((part) => `  ${part.place.padEnd(9)} asks for ${part.asks}`),
		].join("\n"),
	};
}

function zonesIn(said: unknown): string[] {
	if (typeof said !== "string") return [];
	return said
		.split(",")
		.map((zone) => zone.trim())
		.filter(Boolean);
}

function baseText(name: string, held: LayoutBase, board: SerializedBoard): string {
	return [
		`${name} — ${held.suits}`,
		`holds: ${held.holds}`,
		regionLines(held, board),
		"",
		slotLines(name),
		sectionLines(held),
		"",
		placeLines(board),
	].join("\n");
}

function regionLines(held: LayoutBase, board: SerializedBoard): string {
	const regions = isBox(board.layout) ? board.layout.of : [];
	return [
		`${regions.length} regions, needs ${held.needsPx}px of board width`,
		...regions.map((each, at) => {
			const region: Partial<BoxNode> = isBox(each) ? each : {};
			return `  ${at}  ${String(region.name ?? region.role).padEnd(12)} ${region.keep ? "keep" : "side"}  ${region.surface ?? "none"}  ${String(region.purpose)}`;
		}),
	].join("\n");
}

function slotLines(name: string): string {
	const rules = slotRulesOf(name);
	if (rules.length === 0) return "";
	return [
		"slots, each a box carrying its name; a widget goes inside one, never beside it:",
		...rules.map(
			([slot, rule]) =>
				`  ${slot.padEnd(11)} ${rule.isOptional ? "optional" : "required"}  ${rule.maxWidgets === undefined ? "any number" : `at most ${rule.maxWidgets}`}  ${rule.accepts ? `takes ${rule.accepts.join(", ")}` : "takes any role"}`,
		),
		"",
	].join("\n");
}

function sectionLines(held: LayoutBase): string {
	return [
		"sections, each already carrying its heading:",
		...sectionsOf(held.layout).map(
			(row) => `  ${row.name.padEnd(18)} ${String(row.role ?? "-").padEnd(12)} ${String(row.purpose)}`,
		),
	].join("\n");
}

function placeLines(board: SerializedBoard): string {
	const places = emptyPlaces(board.layout);
	return [
		`${board.tiles.length} lines of text are already written and placed; ${places.length} places stand empty, waiting for a widget:`,
		...places.map((place) => `  ${String(place.role).padEnd(12)} ${String(place.purpose)}`),
		"",
		"Fill a place by appending a tile and a leaf naming its id inside it. Duplicate a place to get another of the same.",
	].join("\n");
}

function emptyPlaces(node: BoardNode, found: BoxNode[] = []): BoxNode[] {
	if (!isBox(node)) return found;
	for (const child of node.of) {
		if (isBox(child) && child.of.length === 0) found.push(child);
		emptyPlaces(child, found);
	}
	return found;
}
