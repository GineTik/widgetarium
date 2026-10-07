import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { variants } from "../utils/cn";
import type { ClassOf } from "../utils/cn";
import { renderedChildren } from "../utils/render-prop";
import { Card } from "./card";
import { Slot } from "./slot";

export { ItemGroup } from "./item-group";
export { ItemMedia } from "./item-media";
export { ItemSeparator } from "./item-separator";
export { ItemActions, ItemContent, ItemDescription, ItemFooter, ItemHeader, ItemTitle } from "./item-parts";
export type { ItemMediaProps, ItemMediaVariant } from "./item-media";

export type ItemVariant = "default" | "outline" | "muted";

export type ItemSize = "default" | "sm" | "xs";

export interface ItemProps extends Omit<HTMLAttributes<HTMLDivElement>, "style"> {
	readonly variant?: ItemVariant | undefined;
	readonly size?: ItemSize | undefined;
	readonly asChild?: boolean | undefined;
	readonly render?: ReactElement | undefined;
}

const ITEM_VARIANTS = {
	variant: { default: "", outline: "is-outline", muted: "is-muted" },
	size: { default: "", sm: "is-sm", xs: "is-xs" },
} as const;

export const itemVariants: ClassOf<typeof ITEM_VARIANTS> = variants("wg-kit-item", ITEM_VARIANTS, {
	variant: "default",
	size: "default",
});

export function Item({
	variant = "default",
	size = "default",
	asChild = false,
	render,
	className,
	children,
	...rest
}: ItemProps): ReactElement {
	const isSlotted = asChild || render !== undefined;
	const drawn = renderedChildren(render, children);
	const item = {
		...rest,
		"data-variant": variant,
		"data-size": size,
		className: itemVariants({ variant, size, className }),
	};
	if (variant === "muted") return <Card {...item} asChild={isSlotted} data-slot="item" children={drawn} />;
	const Comp = isSlotted ? Slot : "div";
	return (
		<Comp data-slot="item" {...item}>
			{drawn}
		</Comp>
	);
}
