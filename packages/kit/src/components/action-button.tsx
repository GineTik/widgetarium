import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Icon } from "../icons/icon";
import type { ButtonSize, IconButtonSize } from "../utils/class-names";
import { cn } from "../utils/cn";
import { Button } from "./button";
import type { ButtonProps } from "./button";
import { IconButton } from "./icon-button";

export interface ActionButtonProps extends Omit<ButtonProps, "size" | "variant"> {
	readonly icon?: ReactNode;
	readonly label?: string | undefined;
}

const ACTION_ICON_PX = 16;

const ACTION_SIZE: ButtonSize & IconButtonSize = "s";

export function ActionButton({ icon, label, className: cls, children, ...rest }: ActionButtonProps): ReactElement {
	const isMarked = rest.isLoading || rest.isDone;
	const drawnIcon = isMarked ? null : iconDrawn(icon);
	const own = { ...rest, size: ACTION_SIZE, className: cn("wg-kit-action", cls) };
	if (!children) return <IconButton {...own} label={label} children={drawnIcon} />;
	return (
		<Button {...own} aria-label={label}>
			{drawnIcon}
			{children}
		</Button>
	);
}

function iconDrawn(icon: ReactNode): ReactNode {
	return typeof icon === "string" ? <Icon name={icon} size={ACTION_ICON_PX} /> : icon;
}
