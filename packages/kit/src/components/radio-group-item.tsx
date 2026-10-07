import { createElement as h } from "react";
import type { ButtonHTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import { useRadioGroup } from "./radio-group-context";

export interface RadioGroupItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "value"> {
	readonly value: string;
}

export function RadioGroupItem({ value, disabled, className, ...rest }: RadioGroupItemProps): ReactElement {
	const group = useRadioGroup();
	const isChecked = group.value === value;
	const isDisabled = Boolean(disabled) || group.disabled;
	return (
		<button
			type="button"
			role="radio"
			data-slot="radio-group-item"
			{...rest}
			value={value}
			aria-checked={isChecked}
			data-state={isChecked ? "checked" : "unchecked"}
			data-disabled={isDisabled ? "" : undefined}
			disabled={isDisabled}
			tabIndex={isChecked ? 0 : -1}
			className={cn("wg-kit-radio", className)}
			onClick={(event) => {
				rest.onClick?.(event);
				if (!event.defaultPrevented) group.choose(value);
			}}
		>
			<span data-slot="radio-group-indicator" className="wg-kit-radio-dot" />
		</button>
	);
}
