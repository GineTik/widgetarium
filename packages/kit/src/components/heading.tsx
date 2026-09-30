import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import { warnOnce } from "../utils/surface";

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
	readonly level?: HeadingLevel | undefined;
	readonly size?: HeadingLevel | undefined;
}

const HEADING_LEVELS: readonly number[] = [1, 2, 3, 4, 5, 6];

const WIDGET_HEADING_LEVEL = 3;

export function Heading({ level, size, className: cls, children, ...rest }: HeadingProps): ReactElement {
	const said = headingLevelOf(level, WIDGET_HEADING_LEVEL);
	const looks = headingLevelOf(size, said);
	return h(`h${said}`, { ...rest, className: cn("wg-kit-heading", `is-h${looks}`, cls) }, children);
}

function headingLevelOf(asked: unknown, fallback: number): number {
	const level = Number(asked);
	if (HEADING_LEVELS.includes(level)) return level;
	if (asked !== undefined) warnOnce(`${String(asked)} is no heading level, so ${fallback} was drawn instead: 1 to 6`);
	return fallback;
}
