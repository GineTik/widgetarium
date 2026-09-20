import { COLUMN, GROUP, NO_SURFACE, ROW } from "./tree.js";

export const CARDS = {
	"header-body": {
		suits: "a title and the thing it explains, the commonest card there is",
		role: "detail",
		wears: { alone: GROUP, amongPeers: GROUP },
		parts: [
			{ place: "title", asks: "text" },
			{ place: "body", asks: "detail" },
		],
	},
	"media-body": {
		suits: "a picture and the words that go with it",
		role: "detail",
		wears: { alone: GROUP, amongPeers: GROUP },
		parts: [
			{ place: "media", asks: "media" },
			{ place: "title", asks: "text" },
			{ place: "body", asks: "detail" },
		],
	},
	metric: {
		suits: "one number that carries a decision, and what it is measured against",
		role: "indicator",
		wears: { alone: NO_SURFACE, amongPeers: GROUP },
		parts: [
			{ place: "label", asks: "text" },
			{ place: "value", asks: "indicator" },
			{ place: "against", asks: "indicator" },
		],
	},
	"list-row": {
		suits: "one row of a list, which never wears a plate of its own",
		role: "collection",
		wears: { alone: NO_SURFACE, amongPeers: NO_SURFACE },
		parts: [
			{ place: "leading", asks: "media" },
			{ place: "label", asks: "text" },
			{ place: "trailing", asks: "control" },
		],
	},
};

export const CARD_NAMES = Object.keys(CARDS);

export function cardNamed(said) {
	return CARDS[String(said ?? "")] ?? null;
}

export function cardNode(name, { amongPeers = false } = {}) {
	const card = cardNamed(name);
	if (!card) return null;
	const surface = amongPeers ? card.wears.amongPeers : card.wears.alone;
	return {
		dir: COLUMN,
		role: card.role,
		purpose: card.suits,
		...(surface === NO_SURFACE ? {} : { surface }),
		of: [],
	};
}
