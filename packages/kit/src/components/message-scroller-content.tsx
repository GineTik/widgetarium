import { createElement as h, useMemo } from "react";
import type { HTMLAttributes, ReactElement, Ref } from "react";
import { cn } from "../utils/cn";
import { useMessageScrollerState } from "./message-scroller-context";
import { composeRefs } from "./slot";

export interface MessageScrollerContentProps extends HTMLAttributes<HTMLDivElement> {
	readonly ref?: Ref<HTMLDivElement>;
}

export function MessageScrollerContent({ ref, className, ...rest }: MessageScrollerContentProps): ReactElement {
	const { engine } = useMessageScrollerState();
	const attached = useMemo(() => composeRefs<HTMLDivElement>(engine.attachContent, ref), [engine, ref]);
	return (
		<div
			role="log"
			aria-relevant="additions"
			data-slot="message-scroller-content"
			{...rest}
			ref={attached}
			className={cn("wg-kit-scroller-content", className)}
		/>
	);
}
