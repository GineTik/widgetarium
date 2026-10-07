import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";

export function ItemGroup({ className, ...rest }: HTMLAttributes<HTMLDivElement>): ReactElement {
	return <div role="list" data-slot="item-group" {...rest} className={cn("wg-kit-item-group", className)} />;
}
