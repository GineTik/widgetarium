import { createElement as h, useContext } from "react";
import type { HTMLAttributes, ReactElement, Ref } from "react";
import { BUBBLE_PLATES } from "../constants/chat";
import { cn } from "../utils/cn";
import { renderElement } from "../utils/render-prop";
import type { RenderProp } from "../utils/render-prop";
import type { StyleProp } from "../utils/token-style";
import { BubbleVariantContext } from "./bubble-context";
import { Card } from "./card";

export interface BubbleContentProps extends Omit<HTMLAttributes<HTMLDivElement>, "style"> {
	readonly render?: RenderProp | undefined;
	readonly style?: StyleProp | undefined;
	readonly ref?: Ref<HTMLDivElement>;
}

export function BubbleContent({ render, className, children, ...rest }: BubbleContentProps): ReactElement {
	const plate = BUBBLE_PLATES[useContext(BubbleVariantContext)];
	return (
		<Card
			asChild={render !== undefined}
			type={plate.type}
			tone={plate.tone}
			data-slot="bubble-content"
			{...rest}
			className={cn("wg-kit-bubble-content", plate.look, render !== undefined && "is-pressable", className)}
		>
			{render === undefined ? children : renderElement(render, children)}
		</Card>
	);
}
