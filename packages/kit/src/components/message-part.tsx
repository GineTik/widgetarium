import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import type { BubbleVariant } from "../constants/chat";
import type { ChatPartRead } from "../utils/chat-parts";
import { Bubble } from "./bubble";
import { BubbleContent } from "./bubble-content";
import { MessageFile } from "./message-file";
import { MessageReasoning } from "./message-reasoning";
import { MessageTool } from "./message-tool";

export interface MessagePartProps {
	readonly part: ChatPartRead;
	readonly variant: BubbleVariant | undefined;
	readonly renderText: ((text: string) => ReactNode) | undefined;
}

export function MessagePart({ part, variant, renderText }: MessagePartProps): ReactElement {
	if (part.kind === "reasoning") return <MessageReasoning text={part.text} isStreaming={part.isStreaming} />;
	if (part.kind === "tool") {
		const { name, stage, input, output, error } = part;
		return <MessageTool name={name} stage={stage} input={input} output={output} error={error} />;
	}
	if (part.kind === "file") return <MessageFile file={part} />;
	return (
		<Bubble variant={variant} data-streaming={part.isStreaming ? "" : undefined}>
			<BubbleContent>{renderText ? renderText(part.text) : part.text}</BubbleContent>
		</Bubble>
	);
}
