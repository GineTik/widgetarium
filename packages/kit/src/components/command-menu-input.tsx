import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";

export interface CommandMenuInputProps {
	readonly value: string;
	readonly onValueChange?: ((value: string) => void) | undefined;
	readonly placeholder?: string | undefined;
	readonly hint?: string | undefined;
	readonly className?: string | undefined;
}

export function CommandMenuInput({
	value,
	onValueChange,
	placeholder,
	hint = "Esc",
	className: cls,
}: CommandMenuInputProps): ReactElement {
	return (
		<label className={cn("wg-kit-command-input", cls)}>
			<Icon name="search" />
			<input
				type="search"
				value={value}
				placeholder={placeholder}
				readOnly={!onValueChange}
				onChange={(event) => onValueChange?.(event.currentTarget.value)}
			/>
			{hint ? <kbd>{hint}</kbd> : null}
		</label>
	);
}
