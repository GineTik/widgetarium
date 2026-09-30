import { createElement as h, useContext } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { LAYOUT_KIND } from "../constants/layout";
import type { ToneName } from "../constants/tones";
import { cn } from "../utils/cn";
import { tonedPlateClass } from "../utils/tones";
import { Card } from "./card";

export interface LayoutItemProps extends HTMLAttributes<HTMLDivElement> {
	readonly tone?: ToneName | undefined;
}

export function LayoutItem({ tone, className: cls, children, ...rest }: LayoutItemProps): ReactElement {
	const kind = useContext(LAYOUT_KIND);
	const itemClass = cn("wg-kit-layout-item", cls);
	if (kind === "grid" || kind === "row")
		return <Card {...rest} tone={tone} className={itemClass} children={children} />;
	if (kind === "rows") return <div {...rest} className={cn(itemClass, tonedPlateClass(tone))} children={children} />;
	return (
		<div {...rest} className={itemClass}>
			{children}
		</div>
	);
}
