import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import { cn } from "../utils/cn";
import { itemsIn, matchesSearch } from "../utils/command-items";
import { useCommand } from "./command-context";
import { isCommandItem } from "./command-item";

export interface CommandGroupProps extends HTMLAttributes<HTMLDivElement> {
	readonly heading?: ReactNode;
}

export function CommandGroup({ heading, className, children, ...rest }: CommandGroupProps): ReactElement | null {
	const { search, shouldFilter } = useCommand();
	const items = itemsIn(children, isCommandItem);
	const isHidden = shouldFilter && items.length > 0 && !items.some((item) => matchesSearch(item, search));
	if (isHidden) return null;
	return (
		<div role="group" data-slot="command-group" {...rest} className={cn("wg-kit-command-section", className)}>
			{heading ? <h3>{heading}</h3> : null}
			{children}
		</div>
	);
}
