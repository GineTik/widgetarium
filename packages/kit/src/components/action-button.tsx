import { createElement as h } from "react";
import { Icon } from "../icons/icon";
import type { LooseProps } from "../types";
import { cn } from "../utils/cn";
import { Button } from "./button";
import { IconButton } from "./icon-button";

const ACTION_ICON_PX = 16;

export function ActionButton({ icon, label, className: cls, children, ...rest }: LooseProps) {
	const isMarked = rest.isLoading || rest.isDone;
	const drawnIcon = isMarked ? null : typeof icon === "string" ? <Icon name={icon} size={ACTION_ICON_PX} /> : icon;
	const own = { ...rest, size: "s", className: cn("wg-kit-action", cls) };
	if (!children) return <IconButton {...own} label={label} children={drawnIcon} />;
	return (
		<Button {...own} aria-label={label}>
			{drawnIcon}
			{children}
		</Button>
	);
}
