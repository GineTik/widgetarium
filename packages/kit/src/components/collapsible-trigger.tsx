import { createElement as h } from "react";
import type { ButtonHTMLAttributes, MouseEvent, ReactElement } from "react";
import { useCollapsible } from "./collapsible-context";
import { buttonPartOf } from "./slot";

export interface CollapsibleTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	readonly asChild?: boolean | undefined;
}

export function CollapsibleTrigger({ asChild = false, ...rest }: CollapsibleTriggerProps): ReactElement {
	const collapsible = useCollapsible();
	const { part: Comp, type } = buttonPartOf(asChild);
	return (
		<Comp
			type={type}
			data-slot="collapsible-trigger"
			{...rest}
			aria-controls={collapsible.contentId}
			aria-expanded={collapsible.isOpen}
			data-state={collapsible.isOpen ? "open" : "closed"}
			disabled={collapsible.isDisabled || rest.disabled}
			onClick={(event: MouseEvent<HTMLButtonElement>) => {
				rest.onClick?.(event);
				if (collapsible.isDisabled) return;
				collapsible.toggle();
			}}
		/>
	);
}
