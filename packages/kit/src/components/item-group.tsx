import { createElement as h } from "react";
import type { ReactElement } from "react";
import { cn } from "../utils/cn";
import type { LayoutProps } from "./layout";
import { Rows } from "./rows";

export function ItemGroup({ className, ...rest }: Omit<LayoutProps, "kind">): ReactElement {
	return <Rows role="list" data-slot="item-group" {...rest} className={cn("wg-kit-item-group", className)} />;
}
