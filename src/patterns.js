import { ADAPTIVE, APART, COLUMN, DRAWER, GROUP, NO_SURFACE, ROW } from "./tree.js";

const side = (role, purpose) => ({
	dir: COLUMN,
	role,
	purpose,
	surface: APART,
	collapse: { into: DRAWER, toggle: ADAPTIVE },
	of: [],
});

const kept = (role, purpose) => ({ dir: COLUMN, role, purpose, keep: true, of: [] });

export const PATTERNS = {
	"list-detail": {
		suits: "a collection of peers, each with substance of its own",
		needsPx: 840,
		layout: { dir: ROW, of: [side("collection", "Every one of them"), kept("detail", "The one that is open")] },
	},
	"sidebar-and-content": {
		suits: "more than five destinations, switched often",
		needsPx: 840,
		layout: { dir: ROW, of: [side("navigation", "Where to go"), kept("detail", "Where you are")] },
	},
	"supporting-pane": {
		suits: "content meaningful only in relation to the main content",
		needsPx: 840,
		layout: {
			dir: ROW,
			of: [kept("detail", "What is being worked on"), side("indicators", "What is worth knowing about it")],
		},
	},
	"three-pane": {
		suits: "exactly three levels: collection, item, substance",
		needsPx: 1600,
		layout: {
			dir: ROW,
			of: [side("navigation", "Which set"), kept("collection", "Which one"), side("detail", "What it holds")],
		},
	},
	"nested-sidebars": {
		suits: "few kinds, many instances per kind",
		needsPx: 1200,
		layout: {
			dir: ROW,
			of: [side("navigation", "Which kind"), side("collection", "Which instance"), kept("detail", "The instance")],
		},
	},
	"full-bleed": {
		suits: "one object consumed continuously",
		needsPx: 0,
		layout: { dir: ROW, of: [kept("media", "The object")] },
	},
};

export const PATTERN_NAMES = Object.keys(PATTERNS);

export function patternNamed(said) {
	return PATTERNS[String(said ?? "")] ?? null;
}

export function skeletonOf(name, asBoard) {
	const pattern = patternNamed(name);
	if (!pattern) return null;
	return asBoard({ pattern: name, tiles: [], layout: structuredClone(pattern.layout) });
}

export function patternMismatch(name, root) {
	const pattern = patternNamed(name);
	if (!pattern) return `${name} is not a pattern; the ones that cut a page are ${PATTERN_NAMES.join(", ")}.`;
	const asked = pattern.layout.of;
	const standing = root?.of ?? [];
	if (standing.length !== asked.length)
		return `the board says ${name}, which cuts the page into ${asked.length} columns, and this one has ${standing.length}`;
	const wrong = asked.map((box, at) => miscast(box, standing[at], at)).filter(Boolean);
	return wrong.length > 0 ? `the board says ${name}, but ${wrong.join("; ")}` : null;
}

function miscast(asked, standing, at) {
	if (standing?.role === asked.role) return null;
	return `column ${at} should hold ${asked.role} and holds ${standing?.role ?? "nothing declared"}`;
}

export function emptyColumnsOf(root) {
	return (root?.of ?? []).flatMap((box, at) => ((box?.of ?? []).length === 0 ? [at] : []));
}

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
