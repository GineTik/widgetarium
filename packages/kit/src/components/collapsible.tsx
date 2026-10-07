import { createElement as h, useId } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../utils/cn";
import { CollapsibleContext } from "./collapsible-context";

export { CollapsibleTrigger } from "./collapsible-trigger";
export { CollapsibleContent } from "./collapsible-content";
export type { CollapsibleTriggerProps } from "./collapsible-trigger";
export type { CollapsibleContentProps } from "./collapsible-content";

export interface CollapsibleProps extends HTMLAttributes<HTMLDivElement> {
	readonly open?: boolean | undefined;
	readonly defaultOpen?: boolean | undefined;
	readonly onOpenChange?: ((open: boolean) => void) | undefined;
	readonly disabled?: boolean | undefined;
}

export function Collapsible({
	open,
	defaultOpen = false,
	onOpenChange,
	disabled = false,
	className,
	...rest
}: CollapsibleProps): ReactElement {
	const [isOpen, setOpen] = useControllableState({ prop: open, defaultProp: defaultOpen, onChange: onOpenChange });
	const contentId = useId();
	const toggle = (): void => setOpen(!isOpen);
	return (
		<CollapsibleContext.Provider value={{ isOpen, isDisabled: disabled, toggle, contentId }}>
			<div
				data-slot="collapsible"
				{...rest}
				data-state={isOpen ? "open" : "closed"}
				data-disabled={disabled ? "" : undefined}
				className={cn("wg-kit-collapsible", className)}
			/>
		</CollapsibleContext.Provider>
	);
}
