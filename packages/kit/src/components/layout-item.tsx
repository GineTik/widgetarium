import { createElement as h, useContext } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { LAYOUT_KIND } from "../constants/layout";
import type { ToneName } from "../constants/tones";
import { cn } from "../utils/cn";
import { Item } from "./item";

export interface LayoutItemProps extends HTMLAttributes<HTMLDivElement> {
	readonly tone?: ToneName | undefined;
}

export function LayoutItem({ className, ...rest }: LayoutItemProps): ReactElement {
	const kind = useContext(LAYOUT_KIND);
	const isOwnPlate = kind === "grid" || kind === "row";
	return (
		<Item
			{...rest}
			variant={isOwnPlate ? "muted" : "default"}
			holds="block"
			className={cn("wg-kit-layout-item", className)}
		/>
	);
}
