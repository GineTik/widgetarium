import { createElement as h, useState } from "react";
import { Icon } from "../icons/icon";
import type { LooseProps } from "../types";
import { cn } from "../utils/cn";

export function PopoverItem({ checked, sub, children, ...rest }: LooseProps) {
	const [isHighlighted, setHighlighted] = useState(false);
	return (
		<button
			type="button"
			{...rest}
			aria-checked={checked === undefined ? undefined : String(checked)}
			data-state={checked === undefined ? undefined : checked ? "checked" : "unchecked"}
			data-highlighted={isHighlighted ? "" : undefined}
			data-disabled={rest.disabled ? "" : undefined}
			onFocus={(event) => {
				setHighlighted(true);
				rest.onFocus?.(event);
			}}
			onBlur={(event) => {
				setHighlighted(false);
				rest.onBlur?.(event);
			}}
			onPointerEnter={(event) => {
				setHighlighted(true);
				rest.onPointerEnter?.(event);
			}}
			onPointerLeave={(event) => {
				setHighlighted(false);
				rest.onPointerLeave?.(event);
			}}
			className={cn("wg-kit-pop-item", sub && "is-two", rest.className)}
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
