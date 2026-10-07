import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement, Ref } from "react";
import { CHAT_ALIGN_WORD } from "../constants/chat";
import type { ChatAlign } from "../constants/chat";
import { cn } from "../utils/cn";
import { wornWord } from "../utils/surface";
import { MessageAlignContext } from "./message-context";

export { MessageAvatar, MessageContent, MessageFooter, MessageGroup, MessageHeader } from "./message-slots";
export { MessageParts } from "./message-parts";
export { MessageReasoning } from "./message-reasoning";
export { MessageTool } from "./message-tool";
export type { MessagePartsProps } from "./message-parts";
export type { MessageReasoningProps } from "./message-reasoning";
export type { MessageToolProps } from "./message-tool";

export interface MessageProps extends HTMLAttributes<HTMLDivElement> {
	readonly align?: ChatAlign | undefined;
	readonly ref?: Ref<HTMLDivElement>;
}

export function Message({ align, className, children, ...rest }: MessageProps): ReactElement {
	const side = wornWord(align, CHAT_ALIGN_WORD);
	return (
		<MessageAlignContext.Provider value={side}>
			<div data-slot="message" data-align={side} {...rest} className={cn("wg-kit-message", className)}>
				{children}
			</div>
		</MessageAlignContext.Provider>
	);
}
