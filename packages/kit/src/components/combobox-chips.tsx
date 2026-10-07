import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import { focusControlOnPress } from "../utils/focus-on-press";

const CHIPS_INPUT = "[data-slot='combobox-chip-input']";

export function ComboboxChips({ className, ...rest }: HTMLAttributes<HTMLDivElement>): ReactElement {
	return (
		<div
			data-slot="combobox-chips"
			{...rest}
			className={cn("wg-kit-combobox-chips", className)}
			onClick={(event) => {
				rest.onClick?.(event);
				focusControlOnPress(event, event.currentTarget, CHIPS_INPUT);
			}}
		/>
	);
}
