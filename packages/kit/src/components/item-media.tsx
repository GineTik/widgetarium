import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";

export type ItemMediaVariant = "default" | "icon" | "image" | "avatar";

export interface ItemMediaProps extends HTMLAttributes<HTMLDivElement> {
	readonly variant?: ItemMediaVariant | undefined;
}

export function ItemMedia({ variant = "default", className, ...rest }: ItemMediaProps): ReactElement {
	return (
		<div
			data-slot="item-media"
			{...rest}
			data-variant={variant}
			className={cn("wg-kit-item-media", variant !== "default" && `is-${variant}`, className)}
		/>
	);
}
