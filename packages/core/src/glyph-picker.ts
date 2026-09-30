import { createElement as h, useState } from "react";
import type { ComponentType, Dispatch, ReactElement, SetStateAction, UIEvent } from "react";
import { Field, Icon } from "@widgetarium/kit";

const FIRST_PAGE = 120;
const NEXT_PAGE = 120;
const NEAR_THE_END_PX = 160;

export interface GlyphEntry {
	readonly name: string;
	readonly words?: string | undefined;
}

export interface GlyphDrawingProps {
	readonly name: string;
	readonly size: number;
}

export interface GlyphSet {
	readonly entries: () => readonly GlyphEntry[];
	readonly draw: ComponentType<GlyphDrawingProps>;
	readonly placeholder: string;
	readonly nothingFound: string;
}

export interface GlyphPickerProps {
	readonly picker: GlyphSet;
	readonly value: string | null | undefined;
	readonly onPick: (name: string) => void;
}

interface GlyphDrawing {
	readonly draw: ComponentType<GlyphDrawingProps>;
	readonly value: string | null | undefined;
	readonly onPick: (name: string) => void;
}

type SetCount = Dispatch<SetStateAction<number>>;

export function GlyphPicker({ picker, value, onPick }: GlyphPickerProps): ReactElement {
	const [keyword, setKeyword] = useState("");
	const [shownCount, setShownCount] = useState(FIRST_PAGE);
	const found = glyphsMatching(picker.entries(), keyword);
	const drawing = { draw: picker.draw, value, onPick };
	return h("div", { className: "wg-set-glyphs" }, [
		searchField(picker.placeholder, keyword, setKeyword, setShownCount),
		found.length === 0
			? h("p", { className: "wg-set-pop-note", key: "none" }, picker.nothingFound)
			: glyphGrid(found.slice(0, shownCount), drawing, growingNearTheEnd(setShownCount, found.length)),
	]);
}

export function glyphsMatching<Entry extends GlyphEntry>(entries: readonly Entry[], keyword: string): readonly Entry[] {
	const words = keyword.trim().toLowerCase().split(/\s+/).filter(Boolean);
	if (words.length === 0) return entries;
	return entries.filter((entry) => words.every((word) => spokenOf(entry).includes(word)));
}

function spokenOf(entry: GlyphEntry): string {
	return `${entry.name.replace(/-/g, " ")} ${entry.words ?? ""}`;
}

// TODO: Field props are unchecked until the kit types LooseProps
function searchField(
	placeholder: string,
	keyword: string,
	setKeyword: (keyword: string) => void,
	setShownCount: SetCount,
): ReactElement {
	return h(Field, {
		block: true,
		size: "s",
		key: "search",
		icon: h(Icon, { name: "search" }),
		value: keyword,
		placeholder,
		onValueChange: (typed: string) => {
			setKeyword(typed);
			setShownCount(FIRST_PAGE);
		},
	});
}

function growingNearTheEnd(setShownCount: SetCount, total: number): (event: UIEvent<HTMLElement>) => void {
	return (event) => {
		const scroller = event.currentTarget;
		if (scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - NEAR_THE_END_PX) return;
		setShownCount((held) => (held >= total ? held : held + NEXT_PAGE));
	};
}

function glyphGrid(
	page: readonly GlyphEntry[],
	drawing: GlyphDrawing,
	onScroll: (event: UIEvent<HTMLElement>) => void,
): ReactElement {
	return h(
		"div",
		{ className: "wg-set-glyph-grid", key: "grid", onScroll },
		page.map((entry) => glyphTile(entry, drawing)),
	);
}

function glyphTile(entry: GlyphEntry, drawing: GlyphDrawing): ReactElement {
	return h(
		"button",
		{
			type: "button",
			key: entry.name,
			className: "wg-set-glyph",
			title: entry.name,
			"aria-label": entry.name,
			"aria-pressed": entry.name === drawing.value ? "true" : "false",
			onClick: () => drawing.onPick(entry.name),
		},
		h(drawing.draw, { name: entry.name, size: 24 }),
	);
}
