import type { LooseProps } from "../types";
import { Fragment, createElement as h } from "react";
import { buttonMark } from "../utils/button-mark";
import { buttonClass } from "../utils/class-names";
import { cx } from "../utils/cx";
import { render } from "../utils/render";

export function Button({ isLoading = false, isDone = false, children, ...props }: LooseProps) {
	const mark = buttonMark(isLoading, isDone, props.size);
	const held = {
		type: "button",
		...props,
		disabled: props.disabled || isLoading,
		"aria-busy": isLoading ? "true" : undefined,
		children:
			mark === null ? (
				children
			) : (
				<>
					{mark}
					{children}
				</>
			),
	};
	return render("button", held, cx(buttonClass(props), isLoading && "is-loading", isDone && "is-done"));
}
