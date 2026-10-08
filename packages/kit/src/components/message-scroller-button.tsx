import { createElement as h } from "react";
import type { ReactElement } from "react";
import { SCROLL_BUTTON_LABELS, SCROLL_DIRECTION_WORD } from "../constants/message-scroller";
import type { ScrollDirection } from "../constants/message-scroller";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";
import type { ScrollEngine } from "../utils/message-scroll-engine";
import { wornWord } from "../utils/surface";
import { IconButton } from "./icon-button";
import type { IconButtonProps } from "./icon-button";
import { useMessageScrollerState } from "./message-scroller-context";

export interface MessageScrollerButtonProps extends IconButtonProps {
	readonly direction?: ScrollDirection | undefined;
	readonly behavior?: ScrollBehavior | undefined;
}

interface EdgeJump {
	readonly engine: ScrollEngine;
	readonly toward: ScrollDirection;
	readonly behavior: ScrollBehavior;
	readonly onClick: IconButtonProps["onClick"];
}

export function MessageScrollerButton(props: MessageScrollerButtonProps): ReactElement {
	const { direction, behavior = "smooth", variant = "raised", label, onClick, className, children, ...rest } = props;
	const { engine, report } = useMessageScrollerState();
	const toward = wornWord(direction, SCROLL_DIRECTION_WORD);
	return (
		<IconButton
			data-slot="message-scroller-button"
			data-direction={toward}
			data-active={String(report[toward])}
			inert={!report[toward]}
			label={label ?? SCROLL_BUTTON_LABELS[toward]}
			variant={variant}
			{...rest}
			className={cn("wg-kit-scroller-button", className)}
			onClick={edgeJumpHandlerOf({ engine, toward, behavior, onClick })}
		>
			{children ?? <Icon name={toward === "end" ? "arrow-down" : "arrow-up"} />}
		</IconButton>
	);
}

function edgeJumpHandlerOf({ engine, toward, behavior, onClick }: EdgeJump): IconButtonProps["onClick"] {
	return (event) => {
		onClick?.(event);
		if (event.defaultPrevented) return;
		if (toward === "end") engine.scrollToEnd({ behavior });
		else engine.scrollToStart({ behavior });
	};
}
