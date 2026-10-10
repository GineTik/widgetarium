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

export const PLATFORMS = ["macos", "windows", "web"] as const;

export const AppSchema = z.object({
	id: z.string(),
	name: z.string(),
	shape: z.enum(APP_SHAPES).default("clover4-leaf"),
	line: z.string().default(""),
});

export type App = z.infer<typeof AppSchema>;

export const WIDGETARIUM_APP: App = {
	id: "widgetarium",
	name: "Widgetarium",
	shape: "clover4-leaf",
	line: "Your apps, built from widgets",
};

export const DRAFT_APP: App = {
	id: "new-app",
	name: "Untitled app",
	shape: "clover4-leaf",
	line: "Not created yet",
};

export const READING_APP: App = {
	id: "reading-list",
	name: "Reading list",
	shape: "cookie6-sided",
	line: "3 pages · on Reading now",
};

export const SAMPLE_APPS: readonly App[] = [
	READING_APP,
	{ id: "crm", name: "CRM", shape: "flower", line: "2 pages · on People" },
	{
		id: "studio",
		name: "Studio",
		shape: "soft-burst",
		line: "4 pages · on Dashboard",
	},
	{ id: "habits", name: "Habits", shape: "sunny", line: "1 page · on Today" },
	{ id: "money", name: "Money", shape: "gem", line: "3 pages · on Budget" },
	{
		id: "weekly-review",
		name: "Weekly review",
		shape: "puffy",
		line: "2 pages · on This week",
	},
	{
		id: "word-garden",
		name: "Word garden",
		shape: "cookie9-sided",
		line: "1 page · on Words",
	},
	{ id: "agent-desk", name: "Agent desk", shape: "arch", line: "5 pages · on Inbox" },
	{ id: "kit-art", name: "Kit art", shape: "pill", line: "2 pages · on Shapes" },
	{
		id: "thesis",
		name: "Thesis",
		shape: "clover4-leaf",
		line: "6 pages · on Chapters",
	},
];
