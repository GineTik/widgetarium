import { ADAPTIVE, APART, COLUMN, DRAWER, GROUP, NO_SURFACE, ROW } from "./tree.js";
import type { BoxNode, SurfaceSide, SurfaceWord } from "./tree.js";

export type TextTone = "value" | "caption";

export interface BaseText {
	readonly text: string;
	readonly level: number;
	readonly tone: TextTone;
	readonly surface: SurfaceWord;
}

export interface BaseBox extends Omit<BoxNode, "of"> {
	readonly heading?: string;
	readonly of: readonly BaseNode[];
}

export type BaseNode = BaseBox | BaseText;

export interface RailAsk {
	readonly role: string;
	readonly purpose: string;
	readonly side: SurfaceSide;
	readonly width: number;
	readonly sections: readonly BaseNode[];
}

export function title(said: string, description: string): BaseBox {
	return {
		dir: COLUMN,
		role: "text",
		purpose: "What this screen is and what it is for",
		surface: NO_SURFACE,
		of: [text(said, 1, "value"), text(description, 0, "caption")],
	};
}

export function band(heading: string, purpose: string, holes: readonly string[], role = "collection"): BaseBox {
	return headColumn(
		heading,
		purpose,
		role,
		holes.map((said) => hole(said, role)),
	);
}

export function cards(heading: string, purpose: string, across: number): BaseBox {
	return headColumn(heading, purpose, "collection", [
		{
			dir: ROW,
			role: "collection",
			purpose: "Each one, read across",
			of: [...Array(across).keys()].map((at) => hole(`Card ${at + 1}`, "detail", GROUP)),
		},
	]);
}

export function strip(heading: string, purpose: string, across: number, role: string): BaseBox {
	return headColumn(heading, purpose, role, [
		{
			dir: ROW,
			role,
			purpose: "The figures, read beside each other",
			of: [...Array(across).keys()].map((at) => hole(`Figure ${at + 1}`, "indicator", GROUP)),
		},
	]);
}

export function split(heading: string, purpose: string, wide: string, narrow: string): BaseBox {
	return headColumn(heading, purpose, "detail", [
		{
			dir: ROW,
			role: "detail",
			purpose: "The two halves, read together",
			of: [{ ...hole(wide, "detail"), ratio: 2 }, hole(narrow, "detail")],
		},
	]);
}

export function listDetail(heading: string, purpose: string): BaseBox {
	return headColumn(heading, purpose, "collection", [
		{
			dir: ROW,
			role: "collection",
			purpose: "Everything there is, and the one opened out of it",
			of: [{ ...hole("Everything there is", "collection"), ratio: 2 }, hole("The one open", "detail")],
		},
	]);
}

export function sub(heading: string, purpose: string, holes: number, role: string): BaseBox {
	return headColumn(
		heading,
		purpose,
		role,
		[...Array(holes).keys()].map((at) => hole(holes === 1 ? purpose : `Part ${at + 1}`, role)),
	);
}

export function navigation(purpose: string): BaseBox {
	return rail({
		role: "navigation",
		purpose,
		side: "end",
		width: 260,
		sections: [sub("Go to", purpose, 1, "navigation"), sub("Within it", "Which of its things", 1, "navigation")],
	});
}

export function aside(purpose: string, sections: readonly BaseNode[]): BaseBox {
	return rail({ role: "indicators", purpose, side: "start", width: 320, sections });
}

export function main(purpose: string, sections: readonly BaseNode[], role = "collection"): BaseBox {
	return { dir: COLUMN, keep: true, role, purpose, of: sections };
}

export function beside(...regions: readonly BaseNode[]): BaseBox {
	return { dir: ROW, of: regions };
}

export function rail({ role, purpose, side, width, sections }: RailAsk): BaseBox {
	return {
		dir: COLUMN,
		role,
		purpose,
		surface: APART,
		side,
		width,
		collapse: { into: DRAWER, toggle: ADAPTIVE },
		of: sections,
	};
}

function text(said: string, level: number, tone: TextTone): BaseText {
	return { text: said, level, tone, surface: NO_SURFACE };
}

function headColumn(heading: string, purpose: string, role: string, of: readonly BaseNode[]): BaseBox {
	return {
		dir: COLUMN,
		heading,
		role,
		purpose,
		surface: NO_SURFACE,
		of: [text(heading, 2, "value"), text(purpose, 0, "caption"), ...of],
	};
}

function hole(purpose: string, role: string, surface: SurfaceWord = NO_SURFACE): BaseBox {
	return { dir: COLUMN, role, purpose, surface, of: [] };
}
