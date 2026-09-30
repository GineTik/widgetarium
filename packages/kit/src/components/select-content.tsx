import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { cn } from "../utils/cn";
import { PopoverContent } from "./popover-content";

export interface SelectContentProps {
	readonly children?: ReactNode;
	readonly className?: string | undefined;
}

export function SelectContent({ className: cls, children }: SelectContentProps): ReactElement {
	return (
		<PopoverContent className={cn("wg-kit-select-content", cls)}>
			<div role="listbox">{children}</div>
		</PopoverContent>
	);
}
