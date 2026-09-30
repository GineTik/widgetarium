import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";

export type LayoutActionsProps = HTMLAttributes<HTMLDivElement>;

export function LayoutActions({ className: cls, children, ...rest }: LayoutActionsProps): ReactElement {
	return (
		<div {...rest} className={cn("wg-kit-layout-actions", cls)}>
			{children}
		</div>
	);
}
