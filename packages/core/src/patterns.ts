import { COLUMN, GROUP, NO_SURFACE } from "./tree.js";
import type { BoxNode, SurfaceWord } from "./tree.js";

export interface CardPart {
	readonly place: string;
	readonly asks: string;
}

export interface CardShape {
	readonly suits: string;
	readonly role: string;
	readonly wears: { readonly alone: SurfaceWord; readonly amongPeers: SurfaceWord };
	readonly parts: readonly CardPart[];
}

export interface CardAsk {
	readonly amongPeers?: boolean;
}

export const CARDS: Readonly<Record<string, CardShape>> = {
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

export const CARD_NAMES: readonly string[] = Object.keys(CARDS);

export function cardNamed(said: unknown): CardShape | null {
	const name = String(said ?? "");
	return CARD_NAMES.includes(name) ? (CARDS[name] ?? null) : null;
}

export function cardNode(name: unknown, { amongPeers = false }: CardAsk = {}): BoxNode | null {
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
