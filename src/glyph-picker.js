import { createElement as h, useState } from "react";
import { Field, Icon } from "./kit.js";

const FIRST_PAGE = 120;
const NEXT_PAGE = 120;
const NEAR_THE_END_PX = 160;

export function GlyphPicker({ picker, value, onPick }) {
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

export function glyphsMatching(entries, keyword) {
	const words = keyword.trim().toLowerCase().split(/\s+/).filter(Boolean);
	if (words.length === 0) return entries;
	return entries.filter((entry) => words.every((word) => spokenOf(entry).includes(word)));
}

function spokenOf(entry) {
	return `${entry.name.replace(/-/g, " ")} ${entry.words ?? ""}`;
}

function searchField(placeholder, keyword, setKeyword, setShownCount) {
	return h(Field, {
		block: true,
		size: "s",
		key: "search",
		icon: h(Icon, { name: "search" }),
		value: keyword,
		placeholder,
		onInput: (event) => {
			setKeyword(event.target.value);
			setShownCount(FIRST_PAGE);
		},
	});
}

function growingNearTheEnd(setShownCount, total) {
	return (event) => {
		const scroller = event.target;
		if (scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - NEAR_THE_END_PX) return;
		setShownCount((held) => (held >= total ? held : held + NEXT_PAGE));
	};
}

function glyphGrid(page, drawing, onScroll) {
	return h(
		"div",
		{ className: "wg-set-glyph-grid", key: "grid", onScroll },
		page.map((entry) => glyphTile(entry, drawing)),
	);
}

function glyphTile(entry, drawing) {
	return h(
		"button",
		{
			type: "button",
			key: entry.name,
			className: "wg-set-glyph",
			title: entry.name,
			"aria-label": entry.name,
			"aria-pressed": String(entry.name === drawing.value),
			onClick: () => drawing.onPick(entry.name),
		},
		h(drawing.draw, { name: entry.name, size: 24 }),
	);
}
