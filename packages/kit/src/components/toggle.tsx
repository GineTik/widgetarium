import { Children, createElement as h, isValidElement } from "react";
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { buttonClass } from "../utils/class-names";
import type { ButtonSize } from "../utils/class-names";

export type ToggleVariant = "default" | "outline";

export type ToggleSize = "default" | "sm" | "lg";

export interface ToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
	readonly pressed?: boolean | undefined;
	readonly defaultPressed?: boolean | undefined;
	readonly onPressedChange?: ((pressed: boolean) => void) | undefined;
	readonly variant?: ToggleVariant | undefined;
	readonly size?: ToggleSize | undefined;
}

const TEXT_SIZE: Readonly<Record<ToggleSize, ButtonSize>> = { default: "default", sm: "sm", lg: "lg" };

const ICON_SIZE: Readonly<Record<ToggleSize, ButtonSize>> = { default: "icon", sm: "icon-sm", lg: "icon-lg" };

export function Toggle({
	pressed,
	defaultPressed = false,
	onPressedChange,
	variant = "default",
	size = "default",
	className,
	...rest
}: ToggleProps): ReactElement {
	const [isOn, setOn] = useControllableState({ prop: pressed, defaultProp: defaultPressed, onChange: onPressedChange });
	return (
		<button
			type="button"
			data-slot="toggle"
			{...rest}
			aria-pressed={isOn}
			data-state={isOn ? "on" : "off"}
			data-variant={variant}
			data-size={size}
			data-disabled={rest.disabled ? "" : undefined}
			className={buttonClass({
				variant: restingVariantOf(isOn, variant),
				size: (isIconOnly(rest.children) ? ICON_SIZE : TEXT_SIZE)[size],
				className: ["wg-kit-toggle", className],
			})}
			onClick={(event) => {
				rest.onClick?.(event);
				if (!event.defaultPrevented) setOn(!isOn);
			}}
		/>
	);
}

function restingVariantOf(isOn: boolean, variant: ToggleVariant): "accent" | "outline" | "ghost" {
	if (isOn) return "accent";
	return variant === "outline" ? "outline" : "ghost";
}

function isIconOnly(children: ReactNode): boolean {
	const parts = Children.toArray(children);
	return parts.length === 1 && isValidElement(parts[0]);
}
