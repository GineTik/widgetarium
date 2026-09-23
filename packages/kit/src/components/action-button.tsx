import type { LooseProps } from "../types";
import { createElement as h } from "react";
import { Button } from "./button";
import { IconButton } from "./icon-button";
import { Icon } from "../icons/icon";
import { cx } from "../utils/cx";

const ACTION_ICON_PX = 16;

export function ActionButton({ icon, label, className: cls, children, ...rest }: LooseProps) {
	const isMarked = rest.isLoading || rest.isDone;
	const drawnIcon = isMarked ? null : typeof icon === "string" ? <Icon name={icon} size={ACTION_ICON_PX} /> : icon;
	const own = { ...rest, size: "s", className: cx("wg-kit-action", cls) };
	if (!children)
		return (
			<IconButton {...own} label={label}>
				{drawnIcon}
			</IconButton>
		);
	return (
		<Button {...own} aria-label={label}>
			{drawnIcon}
			{children}
		</Button>
	);
}
