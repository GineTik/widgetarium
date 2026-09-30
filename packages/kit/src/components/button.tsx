import { createElement as h } from "react";
import type { ButtonHTMLAttributes, FunctionComponent, ReactElement, Ref } from "react";
import { buttonClass } from "../utils/class-names";
import type { ButtonSize, ButtonVariant } from "../utils/class-names";
import { cn } from "../utils/cn";
import { domPropsOf } from "../utils/dom-props";
import { buttonMark } from "./button-mark";
import { createSlotPart } from "./create-slot-part";
import type { SlotPartProps } from "./create-slot-part";
import { Slot } from "./slot";
import { Slottable } from "./slottable";

export { IconButton } from "./icon-button";
export { ActionButton } from "./action-button";
export { Spinner } from "./spinner";
export { ShowMore } from "./show-more";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	readonly asChild?: boolean;
	readonly isLoading?: boolean;
	readonly isDone?: boolean;
	readonly variant?: ButtonVariant | undefined;
	readonly size?: ButtonSize | undefined;
	readonly block?: boolean | undefined;
	readonly ref?: Ref<HTMLButtonElement>;
}

export function Button({
	asChild = false,
	isLoading = false,
	isDone = false,
	children,
	...props
}: ButtonProps): ReactElement {
	const Comp = asChild ? Slot : "button";
	const isDisabled = Boolean(props.disabled) || isLoading;
	return (
		<Comp
			type={asChild ? undefined : "button"}
			{...domPropsOf(props)}
			disabled={isDisabled}
			aria-busy={isLoading ? "true" : undefined}
			data-loading={isLoading ? "" : undefined}
			data-disabled={isDisabled ? "" : undefined}
			className={cn(buttonClass(props), isLoading && "is-loading", isDone && "is-done")}
		>
			{buttonMark(isLoading, isDone, props.size)}
			<Slottable>{children}</Slottable>
		</Comp>
	);
}

export const ButtonLabel: FunctionComponent<SlotPartProps> = createSlotPart(
	"span",
	(props) => cn("wg-kit-btn-label", props.className),
	"ButtonLabel",
);
