import { createElement as h } from "react";
import type { ReactElement } from "react";
import { cn } from "../utils/cn";
import { Separator } from "./separator";
import type { SeparatorProps } from "./separator";

export function ItemSeparator({ className, ...rest }: SeparatorProps): ReactElement {
	return (
		<Separator
			{...rest}
			data-slot="item-separator"
			orientation="horizontal"
			className={cn("wg-kit-item-separator", className)}
		/>
	);
}
