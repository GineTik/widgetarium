import { createElement as h } from "react";
import type { ButtonHTMLAttributes, ReactElement } from "react";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";
import { useAccordion, useAccordionItem } from "./accordion-context";

export type AccordionTriggerProps = ButtonHTMLAttributes<HTMLButtonElement>;

const CHEVRON_PX = 18;

export function AccordionTrigger({ className, children, ...rest }: AccordionTriggerProps): ReactElement {
	const accordion = useAccordion();
	const item = useAccordionItem();
	return (
		<h3 className="wg-kit-accordion-header" data-state={item.isOpen ? "open" : "closed"}>
			<button
				type="button"
				data-slot="accordion-trigger"
				{...rest}
				id={accordion.idOf(item.value, "trigger")}
				aria-controls={accordion.idOf(item.value, "content")}
				aria-expanded={item.isOpen}
				aria-disabled={item.isDisabled || (item.isOpen && !accordion.canShut) || undefined}
				disabled={item.isDisabled}
				data-state={item.isOpen ? "open" : "closed"}
				className={cn("wg-kit-accordion-trigger", className)}
				onClick={(event) => {
					rest.onClick?.(event);
					accordion.toggle(item.value);
				}}
			>
				{children}
				<Icon name="chevron-down" size={CHEVRON_PX} className="wg-kit-accordion-chevron" />
			</button>
		</h3>
	);
}
