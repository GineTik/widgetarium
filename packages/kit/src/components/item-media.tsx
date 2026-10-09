import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { ROW_PART } from "../utils/class-names";
import { cn } from "../utils/cn";

export type ItemMediaVariant = "default" | "icon" | "image" | "avatar";

export interface ItemMediaProps extends HTMLAttributes<HTMLDivElement> {
	readonly variant?: ItemMediaVariant | undefined;
}

const MEDIA_CLASS: Readonly<Record<ItemMediaVariant, string>> = {
	default: "wg-kit-item-media",
	icon: ROW_PART.badge,
	image: cn(ROW_PART.badge, "is-image"),
	avatar: cn(ROW_PART.badge, "is-avatar"),
};

export function ItemMedia({ variant = "default", className, ...rest }: ItemMediaProps): ReactElement {
	return (
		<div data-slot="item-media" {...rest} data-variant={variant} className={cn(MEDIA_CLASS[variant], className)} />
	);
}
