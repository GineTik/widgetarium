import type { LooseProps } from "../types";
import { createElement as h } from "react";
import { Icon } from "../icons/icon";
import { cx } from "../utils/cx";

export function PopoverItem({ checked, sub, children, ...rest }: LooseProps) {
	return (
		<button
			type="button"
			{...rest}
			aria-checked={checked === undefined ? undefined : String(checked)}
			className={cx("wg-kit-pop-item", sub && "is-two", rest.className)}
		>
			{sub === undefined ? (
				children
			) : (
				<span className="wg-kit-pop-said">
					{children}
					<span className="wg-kit-pop-sub" key="sub">
						{sub}
					</span>
				</span>
			)}
			{checked === undefined ? null : <Icon name="tick" className="wg-kit-pop-tick" />}
		</button>
	);
}
