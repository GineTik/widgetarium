import { createElement as h, useContext } from "react";
import type { HTMLAttributes, ReactElement, Ref } from "react";
import { BUBBLE_VARIANT_WORD, CHAT_ALIGN_WORD } from "../constants/chat";
import type { BubbleVariant, ChatAlign } from "../constants/chat";
import { cn } from "../utils/cn";
import { wornWord } from "../utils/surface";
import { BubbleVariantContext } from "./bubble-context";
import { MessageAlignContext } from "./message-context";

export { BubbleContent } from "./bubble-content";
export { BubbleGroup } from "./bubble-group";
export { BubbleReactions } from "./bubble-reactions";
export type { BubbleContentProps } from "./bubble-content";
export type { BubbleReactionsProps } from "./bubble-reactions";

export interface BubbleProps extends HTMLAttributes<HTMLDivElement> {
	readonly variant?: BubbleVariant | undefined;
	readonly align?: ChatAlign | undefined;
	readonly ref?: Ref<HTMLDivElement>;
}

export function Bubble({ variant, align, className, children, ...rest }: BubbleProps): ReactElement {
	const messageAlign = useContext(MessageAlignContext);
	const worn = wornWord(variant, BUBBLE_VARIANT_WORD);
	return (
		<BubbleVariantContext.Provider value={worn}>
			<div
				data-slot="bubble"
				data-variant={worn}
				data-align={wornWord(align ?? messageAlign, CHAT_ALIGN_WORD)}
				{...rest}
				className={cn("wg-kit-bubble", className)}
			>
				{children}
			</div>
		</BubbleVariantContext.Provider>
	);
}
