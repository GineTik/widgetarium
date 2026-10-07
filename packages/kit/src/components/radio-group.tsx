import { createElement as h, useRef } from "react";
import type { HTMLAttributes, KeyboardEvent, ReactElement } from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { useRadioTabStop } from "../hooks/use-radio-tab-stop";
import { cn } from "../utils/cn";
import { ACROSS_STEP_OF_KEY, stepIndex } from "../utils/roving";
import { RadioGroupContext } from "./radio-group-context";

export { RadioGroupItem } from "./radio-group-item";
export type { RadioGroupItemProps } from "./radio-group-item";

export interface RadioGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange" | "dir"> {
	readonly value?: string | undefined;
	readonly defaultValue?: string | undefined;
	readonly onValueChange?: ((value: string) => void) | undefined;
	readonly disabled?: boolean | undefined;
	readonly orientation?: "horizontal" | "vertical" | undefined;
	readonly required?: boolean | undefined;
}

const ENABLED_RADIO = "[role='radio']:not([disabled])";

export function RadioGroup({
	value,
	defaultValue = "",
	onValueChange,
	disabled = false,
	orientation = "vertical",
	required,
	className,
	...rest
}: RadioGroupProps): ReactElement {
	const [chosen, choose] = useControllableState({ prop: value, defaultProp: defaultValue, onChange: onValueChange });
	const groupRef = useRef<HTMLDivElement>(null);
	useRadioTabStop(groupRef);
	return (
		<RadioGroupContext.Provider value={{ value: chosen, choose, disabled }}>
			<div
				role="radiogroup"
				data-slot="radio-group"
				aria-orientation={orientation}
				aria-required={required}
				data-disabled={disabled ? "" : undefined}
				{...rest}
				ref={groupRef}
				className={cn("wg-kit-radio-group", `is-${orientation}`, className)}
				onKeyDown={(event) => {
					rest.onKeyDown?.(event);
					moveToNextRadio(event);
				}}
			/>
		</RadioGroupContext.Provider>
	);
}

function moveToNextRadio(event: KeyboardEvent<HTMLDivElement>): void {
	const step = ACROSS_STEP_OF_KEY.get(event.key);
	if (step === undefined) return;
	const radios = [...event.currentTarget.querySelectorAll<HTMLElement>(ENABLED_RADIO)];
	if (radios.length === 0) return;
	event.preventDefault();
	const next =
		radios[
			stepIndex(
				radios.findIndex((radio) => radio === document.activeElement),
				step,
				radios.length,
			)
		];
	next?.focus();
	next?.click();
}
