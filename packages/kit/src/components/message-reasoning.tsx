import { createElement as h } from "react";
import type { DetailsHTMLAttributes, ReactElement } from "react";
import { REASONING_LABEL, REASONING_LIVE_LABEL, SUMMARY_ICON_PX } from "../constants/chat";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";
import { Spinner } from "./spinner";

export interface MessageReasoningProps extends DetailsHTMLAttributes<HTMLDetailsElement> {
	readonly text: string;
	readonly isStreaming?: boolean | undefined;
	readonly label?: string | undefined;
}

export function MessageReasoning({
	text,
	isStreaming = false,
	label,
	className,
	...rest
}: MessageReasoningProps): ReactElement {
	return (
		<details
			data-slot="message-reasoning"
			data-streaming={isStreaming ? "" : undefined}
			open={isStreaming || undefined}
			{...rest}
			className={cn("wg-kit-message-reasoning", className)}
		>
			<summary className="wg-kit-message-summary">
				{isStreaming ? <Spinner size={SUMMARY_ICON_PX} /> : <Icon name="sparkles" size={SUMMARY_ICON_PX} />}
				<span>{label ?? (isStreaming ? REASONING_LIVE_LABEL : REASONING_LABEL)}</span>
				<Icon name="chevron-down" size={SUMMARY_ICON_PX} className="wg-kit-message-chevron" />
			</summary>
			<div className="wg-kit-message-reasoning-text">{text}</div>
		</details>
	);
}
