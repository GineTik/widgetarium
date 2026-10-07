import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";

export interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
	readonly orientation?: "horizontal" | "vertical" | undefined;
	readonly decorative?: boolean | undefined;
}

export function Separator({
	orientation = "horizontal",
	decorative = true,
	className,
	...rest
}: SeparatorProps): ReactElement {
	const isVertical = orientation === "vertical";
	return (
		<div
			data-slot="separator"
			role={decorative ? "none" : "separator"}
			aria-orientation={!decorative && isVertical ? "vertical" : undefined}
			{...rest}
			data-orientation={orientation}
			className={cn("wg-kit-separator", isVertical && "is-vertical", className)}
		/>
	);
}
