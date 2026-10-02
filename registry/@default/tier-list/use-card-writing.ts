import { orderBetween, placeAt, renumber } from "./ordering";
import type { CardRow, Draft, Gates, RackView, Target } from "./types";

const CANNOT_MOVE = "This source cannot be written here, so the card stayed where it was.";
const CANNOT_ADD_CARD = "This source does not take new cards, so nothing was added.";

export function useCardWriting(held: RackView, { createCard, updateCard, removeCard, say }: Gates) {
	const listOf = (tier: string | null) =>
		tier === null ? held.tray : (held.rack.find((line) => line.label === tier)?.cards ?? []);

	const renumberCards = async (rows: CardRow[], tier: string | null) => {
		for (const row of renumber(rows)) await updateCard({ ref: row.ref, tier, order: row.order });
	};

	const unrank = async (rows: CardRow[]) => {
		for (const row of rows) await updateCard({ ref: row.ref, tier: null, order: null });
	};

	return {
		listOf,

		into: async (row: CardRow, target: Target) => {
			if (!updateCard.can().can) return say(CANNOT_MOVE);
			const line = placeAt(listOf(target.tier), row, target.at);
			const at = line.findIndex((card) => card.ref === row.ref);
			const order = orderBetween(line[at - 1] ?? null, line[at + 1] ?? null);
			if (order === null) return renumberCards(line, target.tier);
			await updateCard({ ref: row.ref, tier: target.tier, order });
		},

		unorphan: () => unrank(held.orphans),

		resetRanks: () => unrank(held.rack.flatMap((line) => line.cards)),

		card: async (row: CardRow | null, draft: Draft) => {
			const data = { name: draft.name.trim(), picture: draft.picture.trim() };
			if (!data.name) return;
			if (row) {
				if (!updateCard.can().can) return say(CANNOT_MOVE);
				await updateCard({ ref: row.ref, ...data });
				return;
			}
			if (!createCard.can().can) return say(CANNOT_ADD_CARD);
			await createCard({ id: crypto.randomUUID(), ...data });
		},

		removeCard: async (row: CardRow) => {
			await removeCard({ ref: row.ref });
		},
	};
}
