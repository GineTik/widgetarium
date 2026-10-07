import { createElement as h } from "react";
import type { ReactElement } from "react";
import { SCROLL_BUTTON_LABELS, SCROLL_DIRECTION_WORD } from "../constants/message-scroller";
import type { ScrollDirection } from "../constants/message-scroller";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";
import { wornWord } from "../utils/surface";
import { IconButton } from "./icon-button";
import type { IconButtonProps } from "./icon-button";
import { useMessageScrollerState } from "./message-scroller-context";

export interface MessageScrollerButtonProps extends IconButtonProps {
	readonly direction?: ScrollDirection | undefined;
	readonly behavior?: ScrollBehavior | undefined;
}

export function MessageScrollerButton({
	direction,
	behavior = "smooth",
	variant = "raised",
	label,
	onClick,
	className,
	children,
	...rest
}: MessageScrollerButtonProps): ReactElement {
	const { engine, report } = useMessageScrollerState();
	const toward = wornWord(direction, SCROLL_DIRECTION_WORD);
	const isActive = report[toward];
	return (
		<IconButton
			data-slot="message-scroller-button"
			data-direction={toward}
			data-active={String(isActive)}
			inert={!isActive}
			label={label ?? SCROLL_BUTTON_LABELS[toward]}
			variant={variant}
			{...rest}
			className={cn("wg-kit-scroller-button", className)}
			onClick={(event) => {
				onClick?.(event);
				if (event.defaultPrevented) return;
				if (toward === "end") engine.scrollToEnd({ behavior });
				else engine.scrollToStart({ behavior });
			}}
		>
			{children ?? <Icon name={toward === "end" ? "arrow-down" : "arrow-up"} />}
		</IconButton>
	);
}
