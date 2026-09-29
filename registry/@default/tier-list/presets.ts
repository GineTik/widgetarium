import { EMOJI_PREFIX } from "@default/lib";

export type RankCard = { name: string; tier?: string; order?: number; picture?: string };

export type Preset = { id: string; name: string; needsTheWeb?: boolean; credit?: string; cards: RankCard[] };

export const PRESETS: Preset[] = [
	{
		id: "comfort-food",
		name: "Comfort food",
		cards: named([
			"Pizza",
			"Ramen",
			"Dumplings",
			"Fried chicken",
			"Tacos",
			"Sushi",
			"Burger",
			"Pancakes",
			"Curry",
			"Pho",
			"Falafel",
			"Lasagne",
			"Pierogi",
			"Ice cream",
		]),
	},
	{
		id: "languages",
		name: "Programming languages",
		cards: named([
			"TypeScript",
			"Python",
			"Rust",
			"Go",
			"C",
			"C++",
			"Java",
			"Ruby",
			"Swift",
			"Kotlin",
			"Elixir",
			"Haskell",
			"PHP",
			"Lua",
		]),
	},
	{
		id: "saturday",
		name: "Ways to spend a Saturday",
		cards: named([
			"Long walk",
			"Cooking",
			"Reading",
			"Gaming",
			"A museum",
			"The gym",
			"Sleeping in",
			"Board games",
			"Cinema",
			"Gardening",
			"Coding",
			"Nothing at all",
		]),
	},
	{
		id: "coffee-and-tea",
		name: "Coffee and tea",
		cards: named([
			"Espresso",
			"Flat white",
			"Cold brew",
			"Filter",
			"Latte",
			"Cappuccino",
			"Matcha",
			"Earl Grey",
			"Oolong",
			"Chai",
			"Mint tea",
			"Instant",
		]),
	},
	{
		id: "music-genres",
		name: "Music genres",
		cards: named([
			"Jazz",
			"Hip hop",
			"Techno",
			"Rock",
			"Classical",
			"Ambient",
			"Metal",
			"Folk",
			"Pop",
			"Funk",
			"Drum and bass",
			"Reggae",
			"Country",
			"Opera",
		]),
	},
	{
		id: "places-to-live",
		name: "Places to live",
		cards: named([
			"Lisbon",
			"Tokyo",
			"Berlin",
			"Kyiv",
			"Seoul",
			"Amsterdam",
			"Barcelona",
			"Vienna",
			"Toronto",
			"Prague",
			"Lviv",
			"Copenhagen",
			"Melbourne",
			"Warsaw",
		]),
	},
	{
		id: "weather",
		name: "Weather",
		cards: named([
			"Spring rain",
			"Summer heat",
			"First snow",
			"Autumn wind",
			"Thunderstorm",
			"Fog",
			"Clear frost",
			"Heatwave",
			"Drizzle",
			"Blizzard",
		]),
	},
	{
		id: "note-taking",
		name: "Note-taking habits",
		cards: named([
			"Daily note",
			"Zettelkasten",
			"Bullet journal",
			"Inbox zero",
			"Tag everything",
			"Folder trees",
			"Voice memos",
			"Sticky notes",
			"Kanban",
			"Weekly review",
			"Highlighting",
			"Nothing at all",
		]),
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

function avatarFor(seed: string): string {
	return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}`;
}

function named(names: readonly string[]): RankCard[] {
	return names.map((name) => ({ name }));
}

function withFaces(names: readonly string[]): RankCard[] {
	return names.map((name) => ({ name, picture: avatarFor(name) }));
}

function asEmoji(pairs: readonly (readonly [string, string])[]): RankCard[] {
	return pairs.map(([name, face]) => ({ name, picture: `${EMOJI_PREFIX}${face}` }));
}
