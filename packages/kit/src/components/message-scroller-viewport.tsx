import { createElement as h, useMemo } from "react";
import type { HTMLAttributes, ReactElement, Ref } from "react";
import { MESSAGES_LABEL } from "../constants/message-scroller";
import { usePrependPreserved } from "../hooks/use-prepend-preserved";
import { cn } from "../utils/cn";
import { scrollableOf, useMessageScrollerState } from "./message-scroller-context";
import { composeRefs } from "./slot";

export interface MessageScrollerViewportProps extends HTMLAttributes<HTMLDivElement> {
	readonly preserveScrollOnPrepend?: boolean | undefined;
	readonly ref?: Ref<HTMLDivElement>;
}

export function MessageScrollerViewport({
	preserveScrollOnPrepend = true,
	ref,
	className,
	...rest
}: MessageScrollerViewportProps): ReactElement {
	const { engine, report, setPreserveOnPrepend } = useMessageScrollerState();
	const attached = useMemo(() => composeRefs<HTMLDivElement>(engine.attachViewport, ref), [engine, ref]);
	usePrependPreserved(setPreserveOnPrepend, preserveScrollOnPrepend);
	return (
		<div
			role="region"
			aria-label={MESSAGES_LABEL}
			tabIndex={0}
			data-slot="message-scroller-viewport"
			data-scrollable={scrollableOf(report)}
			data-autoscrolling={report.autoscrolling ? "" : undefined}
			data-pending-scroll={report.pending ? "" : undefined}
			{...rest}
			ref={attached}
			className={cn("wg-kit-scroller-viewport", className)}
		/>
	);
}
