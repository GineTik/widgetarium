import type { LooseProps } from "../types";
import { createElement as h } from "react";
import { cx } from "../utils/cx";

export function LayoutActions({ className: cls, children, ...rest }: LooseProps) {
	return (
		<div {...rest} className={cx("wg-kit-layout-actions", cls)}>
			{children}
		</div>
	);
}
