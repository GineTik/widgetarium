import { ADAPTIVE, APART, COLUMN, DRAWER, GROUP, NO_SURFACE, ROW } from "./tree.js";

export function title(said, description) {
	return {
		dir: COLUMN,
		role: "text",
		purpose: "What this screen is and what it is for",
		surface: NO_SURFACE,
		of: [text(said, 1, "value"), text(description, 0, "caption")],
	};
}

export function band(heading, purpose, holes, role = "collection") {
	return headColumn(
		heading,
		purpose,
		role,
		holes.map((said) => hole(said, role)),
	);
}

export function cards(heading, purpose, across) {
	return headColumn(heading, purpose, "collection", [
		{
			dir: ROW,
			role: "collection",
			purpose: "Each one, read across",
			of: Array.from({ length: across }, (ignored, at) => hole(`Card ${at + 1}`, "detail", GROUP)),
		},
	]);
}

export function strip(heading, purpose, across, role) {
	return headColumn(heading, purpose, role, [
		{
			dir: ROW,
			role,
			purpose: "The figures, read beside each other",
			of: Array.from({ length: across }, (ignored, at) => hole(`Figure ${at + 1}`, "indicator", GROUP)),
		},
	]);
}

export function split(heading, purpose, wide, narrow) {
	return headColumn(heading, purpose, "detail", [
		{
			dir: ROW,
			role: "detail",
			purpose: "The two halves, read together",
			of: [{ ...hole(wide, "detail"), ratio: 2 }, hole(narrow, "detail")],
		},
	]);
}

export function listDetail(heading, purpose) {
	return headColumn(heading, purpose, "collection", [
		{
			dir: ROW,
			role: "collection",
			purpose: "Everything there is, and the one opened out of it",
			of: [{ ...hole("Everything there is", "collection"), ratio: 2 }, hole("The one open", "detail")],
		},
	]);
}

export function sub(heading, purpose, holes, role) {
	return headColumn(
		heading,
		purpose,
		role,
		Array.from({ length: holes }, (ignored, at) => hole(holes === 1 ? purpose : `Part ${at + 1}`, role)),
	);
}

export function navigation(purpose) {
	return rail({
		role: "navigation",
		purpose,
		side: "end",
		width: 260,
		sections: [sub("Go to", purpose, 1, "navigation"), sub("Within it", "Which of its things", 1, "navigation")],
	});
}

export function aside(purpose, sections) {
	return rail({ role: "indicators", purpose, side: "start", width: 320, sections });
}

export function main(purpose, sections, role = "collection") {
	return { dir: COLUMN, keep: true, role, purpose, of: sections };
}

export function beside(...regions) {
	return { dir: ROW, of: regions };
}

export function rail({ role, purpose, side, width, sections }) {
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

function text(said, level, tone) {
	return { text: said, level, tone, surface: NO_SURFACE };
}

function headColumn(heading, purpose, role, of) {
	return {
		dir: COLUMN,
		heading,
		role,
		purpose,
		surface: NO_SURFACE,
		of: [text(heading, 2, "value"), text(purpose, 0, "caption"), ...of],
	};
}

function hole(purpose, role, surface = NO_SURFACE) {
	return { dir: COLUMN, role, purpose, surface, of: [] };
}
