import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import { AccordionItemContext, useAccordion } from "./accordion-context";

export interface AccordionItemProps extends HTMLAttributes<HTMLDivElement> {
	readonly value: string;
	readonly disabled?: boolean | undefined;
}

export function AccordionItem({ value, disabled = false, className, ...rest }: AccordionItemProps): ReactElement {
	const accordion = useAccordion();
	const isOpen = accordion.opened.includes(value);
	const isDisabled = disabled || accordion.isDisabled;
	return (
		<AccordionItemContext.Provider value={{ value, isOpen, isDisabled }}>
			<div
				data-slot="accordion-item"
				{...rest}
				data-state={isOpen ? "open" : "closed"}
				data-disabled={isDisabled ? "" : undefined}
				className={cn("wg-kit-accordion-item", className)}
			/>
		</AccordionItemContext.Provider>
	);
}
