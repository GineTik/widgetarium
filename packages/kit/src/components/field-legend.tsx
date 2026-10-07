import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";

export interface FieldLegendProps extends HTMLAttributes<HTMLLegendElement> {
	readonly variant?: "legend" | "label" | undefined;
}

export function FieldLegend({ variant = "legend", className, ...rest }: FieldLegendProps): ReactElement {
	return (
		<legend
			data-slot="field-legend"
			data-variant={variant}
			{...rest}
			className={cn("wg-kit-form-legend", variant === "label" && "is-label", className)}
		/>
	);
}
