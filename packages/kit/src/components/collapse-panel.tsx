import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";

export interface CollapsePanelProps extends HTMLAttributes<HTMLDivElement> {
	readonly isOpen: boolean;
	readonly slot: string;
	readonly innerClassName?: string | undefined;
}

export function CollapsePanel({
	isOpen,
	slot,
	innerClassName,
	className,
	children,
	...rest
}: CollapsePanelProps): ReactElement {
	return (
		<div
			data-slot={slot}
			{...rest}
			data-state={isOpen ? "open" : "closed"}
			inert={!isOpen}
			className={cn("wg-kit-collapse", className)}
		>
			<div className="wg-kit-collapse-inner">
				<div className={innerClassName}>{children}</div>
			</div>
		</div>
	);
}
