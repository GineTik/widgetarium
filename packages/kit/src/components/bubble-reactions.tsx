import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement, Ref } from "react";
import { CHAT_ALIGN_WORD, REACTION_SIDE_WORD } from "../constants/chat";
import type { ChatAlign, ReactionSide } from "../constants/chat";
import { cn } from "../utils/cn";
import { wornWord } from "../utils/surface";

export interface BubbleReactionsProps extends HTMLAttributes<HTMLDivElement> {
	readonly side?: ReactionSide | undefined;
	readonly align?: ChatAlign | undefined;
	readonly ref?: Ref<HTMLDivElement>;
}

export function BubbleReactions({ side, align = "end", className, ...rest }: BubbleReactionsProps): ReactElement {
	return (
		<div
			data-slot="bubble-reactions"
			data-side={wornWord(side, REACTION_SIDE_WORD)}
			data-align={wornWord(align, CHAT_ALIGN_WORD)}
			{...rest}
			className={cn("wg-kit-bubble-reactions", className)}
		/>
	);
}
