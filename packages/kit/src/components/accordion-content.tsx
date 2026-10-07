import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import { useAccordion, useAccordionItem } from "./accordion-context";
import { CollapsePanel } from "./collapse-panel";

export type AccordionContentProps = HTMLAttributes<HTMLDivElement>;

export function AccordionContent({ className, ...rest }: AccordionContentProps): ReactElement {
	const accordion = useAccordion();
	const item = useAccordionItem();
	return (
		<CollapsePanel
			{...rest}
			slot="accordion-content"
			role="region"
			isOpen={item.isOpen}
			id={accordion.idOf(item.value, "content")}
			aria-labelledby={accordion.idOf(item.value, "trigger")}
			innerClassName={cn("wg-kit-accordion-body", className)}
		/>
	);
}
