import { createElement as h } from "react";
import { BADGE_COLORS } from "../constants/tones";
import type { LooseProps } from "../types";
import { pillClass } from "../utils/class-names";
import { cx } from "../utils/cx";
import { render } from "../utils/render";

export function Badge({ color, style, ...props }: LooseProps) {
	const isThemed = typeof color === "object" && color !== null;
	return render(
		"span",
		{ ...props, style: { ...style, ...badgeInksOf(color) } },
		cx(pillClass(props), isThemed && "is-themed"),
	);
}

function badgeInksOf(color) {
	if (!color) return {};
	if (typeof color !== "object") return { "--wg-badge-ink": inkNamed(color) };
	return { "--wg-badge-ink-light": inkNamed(color.light), "--wg-badge-ink-dark": inkNamed(color.dark ?? color.light) };
}

function inkNamed(color) {
	if (BADGE_COLORS.includes(color)) return `var(--wg-kit-${color})`;
	return color;
}

export const Pill = Badge;

export function Count({ children, ...rest }: LooseProps) {
	return (
		<span {...rest} className={cx("wg-kit-count", rest.className)}>
			{children}
		</span>
	);
}
