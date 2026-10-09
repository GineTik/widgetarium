import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import type { ToneName } from "../constants/tones";
import { rowClass } from "../utils/class-names";
import { cn, variants } from "../utils/cn";
import type { ClassOf } from "../utils/cn";
import { renderChildren } from "../utils/render-prop";
import { tonedPlateClass } from "../utils/tones";
import { Card } from "./card";
import { Slot } from "./slot";

export { ItemGroup } from "./item-group";
export { ItemMedia } from "./item-media";
export { ItemSeparator } from "./item-separator";
export { ItemActions, ItemContent, ItemDescription, ItemFooter, ItemHeader, ItemTitle } from "./item-parts";
export type { ItemMediaProps, ItemMediaVariant } from "./item-media";

export type ItemVariant = "default" | "outline" | "muted";

export type ItemSize = "default" | "sm" | "xs";

export type ItemHolds = "line" | "block";

export interface ItemProps extends HTMLAttributes<HTMLDivElement> {
	readonly variant?: ItemVariant | undefined;
	readonly size?: ItemSize | undefined;
	readonly holds?: ItemHolds | undefined;
	readonly tone?: ToneName | undefined;
	readonly pressable?: boolean | undefined;
	readonly asChild?: boolean | undefined;
	readonly render?: ReactElement | undefined;
}

const ITEM_WORDS = {
	variant: { default: "", outline: "", muted: "" },
	size: { default: "", sm: "", xs: "" },
} as const;

export const itemVariants: ClassOf<typeof ITEM_WORDS> = variants(rowClass(), ITEM_WORDS, {
	variant: "default",
	size: "default",
});

const PRESS_TAGS: readonly unknown[] = ["a", "button"];

export function Item({
	variant = "default",
	size = "default",
	holds = "line",
	tone,
	pressable,
	asChild = false,
	render,
	className,
	children,
	...rest
}: ItemProps): ReactElement {
	const isSlotted = asChild || render !== undefined;
	const drawn = renderChildren(render, children);
	const line = holds === "line" ? rowClass({ pressable: pressable ?? PRESS_TAGS.includes(render?.type) }) : null;
	const item = { "data-slot": "item", ...rest, "data-variant": variant, "data-size": size };
	if (variant === "muted")
		return <Card {...item} tone={tone} asChild={isSlotted} className={cn(line, className)} children={drawn} />;
	const Comp = isSlotted ? Slot : "div";
	return (
		<Comp {...item} className={cn(line, className, tonedPlateClass(tone))}>
			{drawn}
		</Comp>
	);
}
