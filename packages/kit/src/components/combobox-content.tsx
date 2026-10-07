import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { cn } from "../utils/cn";
import { PopoverContent } from "./popover-content";

export interface ComboboxContentProps {
	readonly className?: string | undefined;
	readonly children?: ReactNode;
}

export function ComboboxContent({ className, children }: ComboboxContentProps): ReactElement {
	return <PopoverContent className={cn("wg-kit-combobox-content", className)}>{children}</PopoverContent>;
}
