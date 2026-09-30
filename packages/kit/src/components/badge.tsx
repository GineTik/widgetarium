import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement, Ref } from "react";
import { BADGE_COLORS } from "../constants/tones";
import type { ToneName } from "../constants/tones";
import { pillClass } from "../utils/class-names";
import type { PillSize, PillVariant } from "../utils/class-names";
import { cn } from "../utils/cn";
import { domPropsOf } from "../utils/dom-props";
import type { StyleProp, TokenStyle } from "../utils/token-style";
import { Slot } from "./slot";

export { Count } from "./count";
export type { CountProps } from "./count";

export interface ThemedInk {
	readonly light?: string | undefined;
	readonly dark?: string | undefined;
}

export interface BadgeProps extends Omit<HTMLAttributes<HTMLElement>, "color" | "style"> {
	readonly asChild?: boolean;
	readonly color?: string | ThemedInk | null | undefined;
	readonly tone?: ToneName | undefined;
	readonly variant?: PillVariant | undefined;
	readonly size?: PillSize | undefined;
	readonly style?: StyleProp | undefined;
	readonly ref?: Ref<HTMLElement>;
}

export function Badge({ asChild = false, color, style, children, ...props }: BadgeProps): ReactElement {
	const isThemed = typeof color === "object" && color !== null;
	const Comp = asChild ? Slot : "span";
	return (
		<Comp
			{...domPropsOf(props)}
			style={{ ...style, ...badgeInksOf(color) }}
			className={cn(pillClass(props), isThemed && "is-themed")}
		>
			{children}
		</Comp>
	);
}

export const Pill = Badge;

function badgeInksOf(color: BadgeProps["color"]): TokenStyle {
	if (!color) return {};
	if (typeof color !== "object") return { "--wg-badge-ink": inkNamed(color) };
	return {
		"--wg-badge-ink-light": inkNamed(color.light),
		"--wg-badge-ink-dark": inkNamed(color.dark ?? color.light),
	};
}

function inkNamed(color: string | undefined): string | undefined {
	if (color !== undefined && BADGE_COLORS.some((named) => named === color)) return `var(--wg-kit-${color})`;
	return color;
}
