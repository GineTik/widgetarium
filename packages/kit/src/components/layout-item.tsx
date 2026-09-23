import type { LooseProps } from "../types";
import { createElement as h, useContext } from "react";
import { Card } from "./card";
import { LAYOUT_KIND } from "../constants/layout";
import { cx } from "../utils/cx";
import { tonedPlateClass } from "../utils/tones";

export function LayoutItem({ tone, className: cls, children, ...rest }: LooseProps) {
	const kind = useContext(LAYOUT_KIND);
	const itemClass = cx("wg-kit-layout-item", cls);
	if (kind === "grid" || kind === "row")
		return (
			<Card {...rest} tone={tone} className={itemClass}>
				{children}
			</Card>
		);
	if (kind === "rows")
		return (
			<div {...rest} className={cx(itemClass, tonedPlateClass(tone))}>
				{children}
			</div>
		);
	return (
		<div {...rest} className={itemClass}>
			{children}
		</div>
	);
}
