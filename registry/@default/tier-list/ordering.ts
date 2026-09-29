import { fieldOf, textOf } from "widgetarium";
import { labelOf } from "./tiers";
import { toneOf } from "./tones";
import { nameOf } from "./cards";

type Ordered = { order?: number | null | undefined };

export type Rack<Tier, Card> = {
	tiers: Tier[];
	rack: { row: Tier; label: string; tone: string; cards: Card[] }[];
	tray: Card[];
	orphans: Card[];
	ranked: number;
};

export function rackOf<Tier, Card>(
	tierRows: readonly Tier[] | null | undefined,
	cardRows: readonly Card[] | null | undefined,
): Rack<Tier, Card> {
	const standing = firstOfEachLabel(tierRows);
	const labels = new Set(standing.map(labelOf));
	const held = [...(cardRows ?? [])].sort(byOrderThenName);
	const rack = standing.map((row) => ({
		row,
		label: labelOf(row),
		tone: toneOf(row),
		cards: held.filter((card) => tierOf(card) === labelOf(row)),
	}));
	return {
		tiers: standing,
		rack,
		tray: held.filter((card) => !tierOf(card)),
		orphans: held.filter((card) => tierOf(card) && !labels.has(tierOf(card))),
		ranked: rack.reduce((sum, line) => sum + line.cards.length, 0),
	};
}

export function placeAt<Held extends { ref: string }>(cards: readonly Held[], moved: Held, at: number): Held[] {
	const without = cards.filter((card) => card.ref !== moved.ref);
	const landing = Math.max(0, Math.min(without.length, at));
	return [...without.slice(0, landing), moved, ...without.slice(landing)];
}

export function orderBetween(above: Ordered | null, below: Ordered | null): number | null {
	const low = finiteOrder(above);
	const high = finiteOrder(below);
	if (low === null) return high === null ? 1 : high - 1;
	if (high === null) return low + 1;
	const middle = (low + high) / 2;
	return middle > low && middle < high ? middle : null;
}

export function renumber<Held extends { ref: string }>(cards: readonly Held[]): (Held & { order: number })[] {
	return cards.map((card, at) => ({ ...card, order: at + 1 }));
}

function tierOf(card: unknown): string {
	return textOf(card, "tier").trim();
}

function orderOf(card: unknown): number {
	const held = Number(fieldOf(card, "order"));
	return Number.isFinite(held) ? held : Number.POSITIVE_INFINITY;
}

function byOrder(one: unknown, other: unknown): number {
	const first = orderOf(one);
	const second = orderOf(other);
	if (first === second) return 0;
	return first < second ? -1 : 1;
}

function byOrderThenName(one: unknown, other: unknown): number {
	return byOrder(one, other) || nameOf(one).localeCompare(nameOf(other));
}

function firstOfEachLabel<Tier>(rows: readonly Tier[] | null | undefined): Tier[] {
	const seen = new Set<string>();
	const kept: Tier[] = [];
	for (const row of rows ?? []) {
		const label = labelOf(row);
		if (!label || seen.has(label)) continue;
		seen.add(label);
		kept.push(row);
	}
	return kept.sort(byOrder);
}

function finiteOrder(row: unknown): number | null {
	const held = row ? orderOf(row) : Number.POSITIVE_INFINITY;
	return Number.isFinite(held) ? held : null;
}
