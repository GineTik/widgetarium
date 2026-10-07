import { createElement as h } from "react";
import type { InputHTMLAttributes, ReactElement } from "react";
import { useCommandSearch } from "../hooks/use-command-search";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";

export interface CommandInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "type"> {
	readonly value?: string | undefined;
	readonly onValueChange?: ((search: string) => void) | undefined;
}

export function CommandInput({ value, onValueChange, className, ...rest }: CommandInputProps): ReactElement {
	const { search, setSearch } = useCommandSearch(value);
	return (
		<div data-slot="command-input-wrapper" className={cn("wg-kit-command-input", className)}>
			<Icon name="search" />
			<input
				data-slot="command-input"
				{...rest}
				type="search"
				value={search}
				onInput={(event) => {
					rest.onInput?.(event);
					setSearch(event.currentTarget.value);
					onValueChange?.(event.currentTarget.value);
				}}
			/>
		</div>
	);
}
