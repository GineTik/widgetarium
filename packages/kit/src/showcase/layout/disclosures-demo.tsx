import { createElement as h } from "react";
import type { ReactElement } from "react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
	Button,
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "../../index";
import { Named } from "../frame/named";

export function Disclosures(): ReactElement {
	return (
		<div className="wg-showcase-stack">
			<Accordion type="single" collapsible defaultValue="sync">
				<AccordionItem value="sync">
					<AccordionTrigger>How does sync work?</AccordionTrigger>
					<AccordionContent>Every note is written to the vault first, then mirrored to each device.</AccordionContent>
				</AccordionItem>
				<AccordionItem value="offline">
					<AccordionTrigger>Can I work offline?</AccordionTrigger>
					<AccordionContent>Yes. Changes wait in the vault until a device is back online.</AccordionContent>
				</AccordionItem>
				<AccordionItem value="share">
					<AccordionTrigger>Can I share a board?</AccordionTrigger>
					<AccordionContent>A board is a note, so it travels with the vault.</AccordionContent>
				</AccordionItem>
			</Accordion>
			<Collapsible defaultOpen>
				<Named name="Collapsible · CollapsibleTrigger asChild">
					<CollapsibleTrigger asChild>
						<Button variant="ghost" size="sm">
							3 starred notes
						</Button>
					</CollapsibleTrigger>
				</Named>
				<CollapsibleContent>
					<div className="wg-showcase-stack">
						<span>Garden plan</span>
						<span>Reading list</span>
						<span>Trip to Lisbon</span>
					</div>
				</CollapsibleContent>
			</Collapsible>
		</div>
	);
}
