import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { cn } from "../utils/cn";
import { PopoverItem } from "./popover-item";
import { useSelect } from "./select-context";

export interface SelectItemProps {
	readonly value: unknown;
	readonly disabled?: boolean | undefined;
	readonly className?: string | undefined;
	readonly children?: ReactNode;
}

export function SelectItem({ value, disabled, className: cls, children }: SelectItemProps): ReactElement {
	const { selected, choose } = useSelect();
	const isChosen = Object.is(selected, value);
	return (
		<PopoverItem
			role="option"
			aria-selected={isChosen}
			checked={isChosen}
			disabled={disabled}
			className={cn("wg-kit-select-item", cls)}
			onClick={() => choose(value)}
		>
			{children}
		</PopoverItem>
	);
}
