import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement, Ref } from "react";
import { cn } from "../utils/cn";
import { scrollableOf, useMessageScrollerState } from "./message-scroller-context";

export { MessageScrollerButton } from "./message-scroller-button";
export { MessageScrollerContent } from "./message-scroller-content";
export { MessageScrollerItem } from "./message-scroller-item";
export { MessageScrollerProvider } from "./message-scroller-provider";
export { MessageScrollerViewport } from "./message-scroller-viewport";
export type { MessageScrollerButtonProps } from "./message-scroller-button";
export type { MessageScrollerItemProps } from "./message-scroller-item";
export type { MessageScrollerProviderProps } from "./message-scroller-provider";
export type { MessageScrollerViewportProps } from "./message-scroller-viewport";

export interface MessageScrollerProps extends HTMLAttributes<HTMLDivElement> {
	readonly ref?: Ref<HTMLDivElement>;
}

export function MessageScroller({ className, ...rest }: MessageScrollerProps): ReactElement {
	const { report } = useMessageScrollerState();
	return (
		<div
			data-slot="message-scroller"
			data-scrollable={scrollableOf(report)}
			data-autoscrolling={report.autoscrolling ? "" : undefined}
			{...rest}
			className={cn("wg-kit-scroller", className)}
		/>
	);
}
