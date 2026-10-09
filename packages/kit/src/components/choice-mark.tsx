import { createElement as h } from "react";
import type { ReactElement } from "react";
import { cn } from "../utils/cn";
import { Checkbox } from "./checkbox";
import { RadioDot } from "./radio-dot";

export interface ChoiceMarkProps {
	readonly isMultiple: boolean;
	readonly isChecked: boolean;
	readonly className?: string | undefined;
}

export function ChoiceMark({ isMultiple, isChecked, className }: ChoiceMarkProps): ReactElement {
	if (isMultiple) return <Checkbox checked={isChecked} className={className} />;
	return (
		<span
			aria-hidden="true"
			data-state={isChecked ? "checked" : "unchecked"}
			className={cn("wg-kit-check is-radio", className)}
		>
			<RadioDot />
		</span>
	);
}
