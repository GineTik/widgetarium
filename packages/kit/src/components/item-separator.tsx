import { createElement as h, useContext } from "react";
import type { ReactElement } from "react";
import { LAYOUT_KIND } from "../constants/layout";
import { cn } from "../utils/cn";
import { Separator } from "./separator";
import type { SeparatorProps } from "./separator";

export function ItemSeparator({ className, ...rest }: SeparatorProps): ReactElement | null {
	const isInRows = useContext(LAYOUT_KIND) === "rows";
	if (isInRows) return null;
	return (
		<Separator
			{...rest}
			data-slot="item-separator"
			orientation="horizontal"
			className={cn("wg-kit-item-separator", className)}
		/>
	);
}
