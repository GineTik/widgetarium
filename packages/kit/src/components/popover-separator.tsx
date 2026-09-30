import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";

export type PopoverSeparatorProps = HTMLAttributes<HTMLDivElement>;

export function PopoverSeparator(props: PopoverSeparatorProps): ReactElement {
	return <div {...props} role="separator" className={cn("wg-kit-pop-sep", props.className)} />;
}
