import type { LooseProps } from "../types";
import { createElement as h } from "react";
import { cx } from "../utils/cx";
import { warnOnce } from "../utils/surface";

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6];

const WIDGET_HEADING_LEVEL = 3;

function headingLevelOf(asked, fallback) {
	const level = Number(asked);
	if (HEADING_LEVELS.includes(level)) return level;
	if (asked !== undefined) warnOnce(`${asked} is no heading level, so ${fallback} was drawn instead: 1 to 6`);
	return fallback;
}

export function Heading({ level, size, className: cls, children, ...rest }: LooseProps) {
	const said = headingLevelOf(level, WIDGET_HEADING_LEVEL);
	const looks = headingLevelOf(size, said);
	return h(`h${said}`, { ...rest, className: cx("wg-kit-heading", `is-h${looks}`, cls) }, children);
}
