import { createElement as h } from "react";
import type { LooseProps } from "../types";
import { buttonClass } from "../utils/class-names";
import { cn } from "../utils/cn";
import { domPropsOf } from "../utils/dom-props";
import { buttonMark } from "./button-mark";
import { createSlotPart } from "./create-slot-part";
import { Slot } from "./slot";
import { Slottable } from "./slottable";

export { IconButton } from "./icon-button";
export { ActionButton } from "./action-button";
export { Spinner } from "./spinner";
export { ShowMore } from "./show-more";

export function Button({ asChild = false, isLoading = false, isDone = false, children, ...props }: LooseProps) {
	const Comp = asChild ? Slot : "button";
	return (
		<Comp
			type={asChild ? undefined : "button"}
			{...domPropsOf(props)}
			disabled={props.disabled || isLoading}
			aria-busy={isLoading ? "true" : undefined}
			data-loading={isLoading ? "" : undefined}
			data-disabled={props.disabled || isLoading ? "" : undefined}
			className={cn(buttonClass(props), isLoading && "is-loading", isDone && "is-done")}
		>
			{buttonMark(isLoading, isDone, props.size)}
			<Slottable>{children}</Slottable>
		</Comp>
	);
}

export const ButtonLabel = createSlotPart("span", (props) => cn("wg-kit-btn-label", props.className), "ButtonLabel");
