import { z } from "zod";

export const APP_SHAPES = [
	"clover4-leaf",
	"cookie6-sided",
	"cookie9-sided",
	"flower",
	"puffy",
	"gem",
	"soft-burst",
	"arch",
	"pill",
	"sunny",
] as const;

export const APP_TONES = ["purple", "blue", "cyan", "green", "yellow", "orange", "red", "pink"] as const;

export const PLATFORMS = ["macos", "windows", "web"] as const;

export const AppSchema = z.object({
	id: z.string(),
	name: z.string(),
	icon: z.string().default("layout-grid"),
	shape: z.enum(APP_SHAPES).default("clover4-leaf"),
	tone: z.enum(APP_TONES).default("purple"),
	line: z.string().default(""),
});

export type App = z.infer<typeof AppSchema>;

export const WIDGETARIUM_APP: App = {
	id: "widgetarium",
	name: "Widgetarium",
	icon: "layout-grid",
	shape: "clover4-leaf",
	tone: "purple",
	line: "Your apps, built from widgets",
};

export const READING_APP: App = {
	id: "reading-list",
	name: "Reading list",
	icon: "book-open",
	shape: "cookie6-sided",
	tone: "orange",
	line: "3 pages · on Reading now",
};

export const SAMPLE_APPS: readonly App[] = [
	READING_APP,
	{ id: "crm", name: "CRM", icon: "users", shape: "flower", tone: "green", line: "2 pages · on People" },
	{
		id: "studio",
		name: "Studio",
		icon: "clapperboard",
		shape: "soft-burst",
		tone: "red",
		line: "4 pages · on Dashboard",
	},
	{ id: "habits", name: "Habits", icon: "flame", shape: "sunny", tone: "yellow", line: "1 page · on Today" },
	{ id: "money", name: "Money", icon: "wallet", shape: "gem", tone: "cyan", line: "3 pages · on Budget" },
	{
		id: "weekly-review",
		name: "Weekly review",
		icon: "calendar-check",
		shape: "puffy",
		tone: "blue",
		line: "2 pages · on This week",
	},
	{
		id: "word-garden",
		name: "Word garden",
		icon: "sprout",
		shape: "cookie9-sided",
		tone: "pink",
		line: "1 page · on Words",
	},
	{ id: "agent-desk", name: "Agent desk", icon: "bot", shape: "arch", tone: "purple", line: "5 pages · on Inbox" },
	{ id: "kit-art", name: "Kit art", icon: "palette", shape: "pill", tone: "orange", line: "2 pages · on Shapes" },
	{
		id: "thesis",
		name: "Thesis",
		icon: "graduation-cap",
		shape: "clover4-leaf",
		tone: "blue",
		line: "6 pages · on Chapters",
	},
];
