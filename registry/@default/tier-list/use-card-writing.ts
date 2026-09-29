import { canDo } from "widgetarium";
import { orderBetween, placedAt, renumbered } from "./ordering";
import type { CardRow, Draft, Gates, RackView, Target } from "./types";

const CANNOT_MOVE = "This source cannot be written here, so the card stayed where it was.";
const CANNOT_ADD_CARD = "This source does not take new cards, so nothing was added.";

export function useCardWriting(held: RackView, { cards, say }: Gates) {
	const listOf = (tier: string | null) =>
		tier === null ? held.tray : (held.rack.find((line) => line.label === tier)?.cards ?? []);

	const renumberCards = async (rows: CardRow[], tier: string | null) => {
		for (const row of renumbered(rows)) await cards.update({ ref: row.ref, data: { tier, order: row.order } });
	};

	const unrank = async (rows: CardRow[]) => {
		for (const row of rows) await cards.update({ ref: row.ref, data: { tier: null, order: null } });
	};

	return {
		listOf,

		into: async (row: CardRow, target: Target) => {
			if (!canDo(cards.update)) return say(CANNOT_MOVE);
			const line = placedAt(listOf(target.tier), row, target.at);
			const at = line.findIndex((card) => card.ref === row.ref);
			const order = orderBetween(line[at - 1] ?? null, line[at + 1] ?? null);
			if (order === null) return renumberCards(line, target.tier);
			await cards.update({ ref: row.ref, data: { tier: target.tier, order } });
		},

		unorphan: () => unrank(held.orphans),

		resetRanks: () => unrank(held.rack.flatMap((line) => line.cards)),

		card: async (row: CardRow | null, draft: Draft) => {
			const data = { name: draft.name.trim(), picture: draft.picture.trim() };
			if (!data.name) return;
			if (row) {
				if (!canDo(cards.update)) return say(CANNOT_MOVE);
				await cards.update({ ref: row.ref, data });
				return;
			}
			if (!canDo(cards.create)) return say(CANNOT_ADD_CARD);
			await cards.create(data);
		},

		removeCard: async (row: CardRow) => {
			await cards.remove(row.ref);
		},
	};
}
