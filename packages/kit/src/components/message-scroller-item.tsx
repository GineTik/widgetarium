import { createElement as h, useMemo, useRef } from "react";
import type { HTMLAttributes, ReactElement, Ref } from "react";
import { useWatchedRow } from "../hooks/use-watched-row";
import { cn } from "../utils/cn";
import { dataFlagsOf } from "../utils/data-flags";
import { useMessageScrollerState } from "./message-scroller-context";
import { composeRefs } from "./slot";

export interface MessageScrollerItemProps extends HTMLAttributes<HTMLDivElement> {
	readonly messageId: string;
	readonly scrollAnchor?: boolean | undefined;
	readonly ref?: Ref<HTMLDivElement>;
}

export function MessageScrollerItem(props: MessageScrollerItemProps): ReactElement {
	const { messageId, scrollAnchor = false, ref, className, ...rest } = props;
	const { engine } = useMessageScrollerState();
	const row = useRef<HTMLDivElement>(null);
	const attached = useMemo(() => composeRefs<HTMLDivElement>(row, ref), [ref]);
	useWatchedRow(engine, row, messageId);
	return (
		<div
			data-slot="message-scroller-item"
			data-message-id={messageId}
			{...dataFlagsOf({ "scroll-anchor": scrollAnchor })}
			{...rest}
			ref={attached}
			className={cn("wg-kit-scroller-item", className)}
		/>
	);
}
