import { createElement as h } from "react";
import type { ButtonHTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import { commandValueOf, matchesSearch } from "../utils/command-items";
import { useCommand } from "./command-context";

export interface CommandItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onSelect" | "value"> {
	readonly value?: string | undefined;
	readonly keywords?: readonly string[] | undefined;
	readonly onSelect?: ((value: string) => void) | undefined;
}

export function CommandItem({
	value,
	keywords,
	onSelect,
	disabled,
	className,
	children,
	...rest
}: CommandItemProps): ReactElement | null {
	const { search, shouldFilter } = useCommand();
	const item = { value, keywords, children };
	if (shouldFilter && !matchesSearch(item, search)) return null;
	return (
		<button
			type="button"
			data-slot="command-item"
			data-command-item=""
			data-disabled={disabled ? "true" : undefined}
			{...rest}
			disabled={disabled}
			className={cn("wg-kit-command-item", className)}
			onClick={(event) => {
				rest.onClick?.(event);
				onSelect?.(commandValueOf(item));
			}}
		>
			{children}
		</button>
	);
}

export function isCommandItem(type: unknown): boolean {
	return type === CommandItem;
}
