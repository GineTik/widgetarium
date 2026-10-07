import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import type { BubbleVariant } from "../constants/chat";
import { readChatParts } from "../utils/chat-parts";
import type { ChatPartLike } from "../utils/chat-parts";
import { cn } from "../utils/cn";
import { MessagePart } from "./message-part";

export interface MessagePartsProps<P extends ChatPartLike = ChatPartLike> extends HTMLAttributes<HTMLDivElement> {
	readonly parts: readonly P[];
	readonly variant?: BubbleVariant | undefined;
	readonly renderText?: ((text: string) => ReactNode) | undefined;
}

export function MessageParts<P extends ChatPartLike>({
	parts,
	variant,
	renderText,
	className,
	...rest
}: MessagePartsProps<P>): ReactElement {
	return (
		<div data-slot="message-parts" {...rest} className={cn("wg-kit-message-parts", className)}>
			{readChatParts(parts).map((part) => (
				<MessagePart key={part.key} part={part} variant={variant} renderText={renderText} />
			))}
		</div>
	);
}
