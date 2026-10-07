import { createElement as h, useState } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import { itemsIn, matchesSearch, movesBetweenCommandItems } from "../utils/command-items";
import { CommandContext } from "./command-context";
import { isCommandItem } from "./command-item";

export { CommandDialog } from "./command-dialog";
export { CommandEmpty } from "./command-empty";
export { CommandGroup } from "./command-group";
export { CommandInput } from "./command-input";
export { CommandItem } from "./command-item";
export { CommandList, CommandSeparator, CommandShortcut } from "./command-parts";
export type { CommandDialogProps } from "./command-dialog";
export type { CommandGroupProps } from "./command-group";
export type { CommandInputProps } from "./command-input";
export type { CommandItemProps } from "./command-item";

export interface CommandProps extends HTMLAttributes<HTMLDivElement> {
	readonly label?: string | undefined;
	readonly shouldFilter?: boolean | undefined;
}

// TRADE-OFF: items are counted by walking the tree, so one wrapped in a component of the caller's is not counted for CommandEmpty
export function Command({ label, shouldFilter = true, className, children, ...rest }: CommandProps): ReactElement {
	const [search, setSearch] = useState("");
	const items = itemsIn(children, isCommandItem);
	const isEmpty = shouldFilter && !items.some((item) => matchesSearch(item, search));
	return (
		<CommandContext.Provider value={{ search, setSearch, shouldFilter, isEmpty }}>
			<div
				data-slot="command"
				aria-label={label}
				{...rest}
				className={cn("wg-kit-cmd", className)}
				onKeyDown={(event) => {
					rest.onKeyDown?.(event);
					movesBetweenCommandItems(event);
				}}
			>
				{children}
			</div>
		</CommandContext.Provider>
	);
}
