import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";
import { Button } from "./button";
import type { ButtonProps } from "./button";
import { PopoverTrigger } from "./popover-trigger";

export type SelectTriggerProps = ButtonProps;

const CHEVRON_PX = 16;

export function SelectTrigger({
	asChild = false,
	children,
	className: cls,
	...props
}: SelectTriggerProps): ReactElement {
	if (asChild) return <PopoverTrigger asChild aria-haspopup="listbox" {...props} children={children} />;
	return (
		<PopoverTrigger asChild aria-haspopup="listbox">
			<Button {...props} className={cn("wg-kit-select-trigger", cls)}>
				{children}
				<Icon name="chevron-down" size={CHEVRON_PX} className="wg-kit-select-chevron" />
			</Button>
		</PopoverTrigger>
	);
}
