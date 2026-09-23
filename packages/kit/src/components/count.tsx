import type { LooseProps } from "../types";
import { createElement as h } from "react";
import { cx } from "../utils/cx";

export function Count({ children, ...rest }: LooseProps) {
	return (
		<span {...rest} className={cx("wg-kit-count", rest.className)}>
			{children}
		</span>
	);
}
