import { fieldOf, textOf } from "widgetarium";
import { TONE_NAMES } from "widgetarium/kit";

const NEUTRAL = "neutral";
const COLOURED_TONES = TONE_NAMES.filter((tone) => tone !== NEUTRAL);

export const DEFAULT_TIERS = [
	{ label: "S", tone: "error", order: 1 },
	{ label: "A", tone: "warning", order: 2 },
	{ label: "B", tone: "standout", order: 3 },
	{ label: "C", tone: "success", order: 4 },
	{ label: "D", tone: "info", order: 5 },
];

const CARD_SIZE_FLOOR = 32;
const CARD_SIZE_CEILING = 160;
const CARD_SIZE_DEFAULT = 64;

const EMOJI_PREFIX = "emoji:";
const WEB_ADDRESS = /^https?:\/\//i;
const ALREADY_AN_EMBED = /^!\[/;

export function labelOf(tier) {
	return (textOf(tier, "label") || textOf(tier, "name")).trim();
}

export function toneOf(tier) {
	const written = textOf(tier, "tone").trim().toLowerCase();
	return TONE_NAMES.includes(written) ? written : NEUTRAL;
}

export function nameOf(card) {
	return (textOf(card, "name") || textOf(card, "title")).trim();
}

function tierOf(card) {
	return textOf(card, "tier").trim();
}

function orderOf(card) {
	const held = Number(fieldOf(card, "order"));
	return Number.isFinite(held) ? held : Number.POSITIVE_INFINITY;
}

function byOrder(one, other) {
	const first = orderOf(one.value);
	const second = orderOf(other.value);
	if (first === second) return 0;
	return first < second ? -1 : 1;
}

function byOrderThenName(one, other) {
	return byOrder(one, other) || nameOf(one.value).localeCompare(nameOf(other.value));
}

function firstOfEachLabel(rows) {
	const seen = new Set();
	const kept = [];
	for (const row of rows ?? []) {
		const label = labelOf(row.value);
		if (!label || seen.has(label)) continue;
		seen.add(label);
		kept.push(row);
	}
	return kept.sort(byOrder);
}

export function rackOf(tierRows, cardRows) {
	const standing = firstOfEachLabel(tierRows);
	const labels = new Set(standing.map((row) => labelOf(row.value)));
	const held = [...(cardRows ?? [])].sort(byOrderThenName);
	const rack = standing.map((row) => ({ row, label: labelOf(row.value), tone: toneOf(row.value), cards: held.filter((card) => tierOf(card.value) === labelOf(row.value)) }));
	return {
		tiers: standing,
		rack,
		tray: held.filter((card) => !tierOf(card.value)),
		orphans: held.filter((card) => tierOf(card.value) && !labels.has(tierOf(card.value))),
		ranked: rack.reduce((sum, line) => sum + line.cards.length, 0),
	};
}

export function placedAt(cards, moved, at) {
	const without = cards.filter((card) => card.ref !== moved.ref);
	const landing = Math.max(0, Math.min(without.length, at));
	return [...without.slice(0, landing), moved, ...without.slice(landing)];
}

function finiteOrder(row) {
	const held = row ? orderOf(row.value) : Number.POSITIVE_INFINITY;
	return Number.isFinite(held) ? held : null;
}

export function orderBetween(above, below) {
	const low = finiteOrder(above);
	const high = finiteOrder(below);
	if (low === null) return high === null ? 1 : high - 1;
	if (high === null) return low + 1;
	const middle = (low + high) / 2;
	return middle > low && middle < high ? middle : null;
}

export function renumbered(cards) {
	return cards.map((card, at) => ({ ...card, value: { ...card.value, order: at + 1 } }));
}

function lettersOf(name) {
	const words = String(name ?? "")
		.split(/[\s_-]+/)
		.filter(Boolean);
	if (words.length === 0) return "?";
	if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
	return (words[0][0] + words[1][0]).toUpperCase();
}

export function pictureOf(card) {
	const letters = lettersOf(nameOf(card));
	const written = textOf(card, "picture").trim();
	if (!written) return { kind: "letters", letters };
	if (written.startsWith(EMOJI_PREFIX)) return { kind: "emoji", name: written.slice(EMOJI_PREFIX.length), letters };
	if (WEB_ADDRESS.test(written)) return { kind: "remote", src: written, letters };
	return { kind: "vault", markdown: ALREADY_AN_EMBED.test(written) ? written : `![[${written}]]`, letters };
}

// TODO: move the seed-to-tone hash into the kit — @task/kanban-board and @core/filter-panel each carry their own copy
export function toneForSeed(seed) {
	const written = String(seed ?? "");
	let sum = 0;
	for (let at = 0; at < written.length; at += 1) sum = (sum * 31 + written.charCodeAt(at)) % 100003;
	return COLOURED_TONES[sum % COLOURED_TONES.length];
}

export function nextToneAfter(tone) {
	const at = COLOURED_TONES.indexOf(tone);
	return COLOURED_TONES[(at + 1) % COLOURED_TONES.length];
}

export function cardSizeOf(value) {
	const held = Number(value);
	if (!Number.isFinite(held)) return CARD_SIZE_DEFAULT;
	return Math.max(CARD_SIZE_FLOOR, Math.min(CARD_SIZE_CEILING, Math.round(held)));
}

export function rowsOf(values) {
	return (values ?? []).map((value, at) => ({ ref: `seed${at}`, value }));
}

const A_NEW_ROW = "New row";
const A_NEW_ROW_NTH = "New row {nth}";

export function isLabelTaken(taken, label) {
	return (taken ?? []).includes(label);
}

// TODO: put freeUntitled on the widget-facing surface — src/editable-tabs.js and the kanban already carry a copy each
export function freeLabel(taken) {
	if (!isLabelTaken(taken, A_NEW_ROW)) return A_NEW_ROW;
	for (let nth = 2; nth < (taken?.length ?? 0) + 3; nth += 1) {
		const wanted = A_NEW_ROW_NTH.replace("{nth}", String(nth));
		if (!isLabelTaken(taken, wanted)) return wanted;
	}
	return A_NEW_ROW;
}

const avatarFor = (seed) => `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}`;

const named = (names) => names.map((name) => ({ name }));

const withFaces = (names) => names.map((name) => ({ name, picture: avatarFor(name) }));

const asEmoji = (pairs) => pairs.map(([name, face]) => ({ name, picture: `${EMOJI_PREFIX}${face}` }));

export const PRESETS = [
	{
		id: "comfort-food",
		name: "Comfort food",
		cards: named(["Pizza", "Ramen", "Dumplings", "Fried chicken", "Tacos", "Sushi", "Burger", "Pancakes", "Curry", "Pho", "Falafel", "Lasagne", "Pierogi", "Ice cream"]),
	},
	{
		id: "languages",
		name: "Programming languages",
		cards: named(["TypeScript", "Python", "Rust", "Go", "C", "C++", "Java", "Ruby", "Swift", "Kotlin", "Elixir", "Haskell", "PHP", "Lua"]),
	},
	{
		id: "saturday",
		name: "Ways to spend a Saturday",
		cards: named(["Long walk", "Cooking", "Reading", "Gaming", "A museum", "The gym", "Sleeping in", "Board games", "Cinema", "Gardening", "Coding", "Nothing at all"]),
	},
	{
		id: "coffee-and-tea",
		name: "Coffee and tea",
		cards: named(["Espresso", "Flat white", "Cold brew", "Filter", "Latte", "Cappuccino", "Matcha", "Earl Grey", "Oolong", "Chai", "Mint tea", "Instant"]),
	},
	{
		id: "music-genres",
		name: "Music genres",
		cards: named(["Jazz", "Hip hop", "Techno", "Rock", "Classical", "Ambient", "Metal", "Folk", "Pop", "Funk", "Drum and bass", "Reggae", "Country", "Opera"]),
	},
	{
		id: "places-to-live",
		name: "Places to live",
		cards: named(["Lisbon", "Tokyo", "Berlin", "Kyiv", "Seoul", "Amsterdam", "Barcelona", "Vienna", "Toronto", "Prague", "Lviv", "Copenhagen", "Melbourne", "Warsaw"]),
	},
	{
		id: "weather",
		name: "Weather",
		cards: named(["Spring rain", "Summer heat", "First snow", "Autumn wind", "Thunderstorm", "Fog", "Clear frost", "Heatwave", "Drizzle", "Blizzard"]),
	},
	{
		id: "note-taking",
		name: "Note-taking habits",
		cards: named(["Daily note", "Zettelkasten", "Bullet journal", "Inbox zero", "Tag everything", "Folder trees", "Voice memos", "Sticky notes", "Kanban", "Weekly review", "Highlighting", "Nothing at all"]),
	},
	{
		id: "the-team",
		name: "The team",
		needsTheWeb: true,
		credit: "Faces drawn by DiceBear from the Notionists set, dedicated to the public domain under CC0 1.0.",
		cards: withFaces(["Iris", "Milo", "Zoe", "Luna", "Otto", "Juno", "Finn", "Rhea", "Theo", "Ada", "Kai", "Nova"]),
	},
	{
		id: "moods",
		name: "Moods",
		cards: asEmoji([
			["Blessed", "smiling-face-with-halo"],
			["Delighted", "grinning-face"],
			["Thinking", "thinking-face"],
			["In stitches", "face-with-tears-of-joy"],
			["Sleepy", "sleepy-face"],
			["Overwhelmed", "exploding-head"],
			["Untouchable", "smiling-face-with-sunglasses"],
			["Pleading", "pleading-face"],
			["Unamused", "unamused-face"],
			["Terrified", "face-screaming-in-fear"],
			["Indifferent", "neutral-face"],
			["Celebrating", "partying-face"],
		]),
	},
];
