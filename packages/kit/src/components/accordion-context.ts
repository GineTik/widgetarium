import { createContext, useContext } from "react";
import type { Context } from "react";

export interface AccordionState {
	readonly opened: readonly string[];
	readonly toggle: (value: string) => void;
	readonly isDisabled: boolean;
	readonly canShut: boolean;
	readonly idOf: (value: string, part: "trigger" | "content") => string;
}

export interface AccordionItemState {
	readonly value: string;
	readonly isOpen: boolean;
	readonly isDisabled: boolean;
}

export const AccordionContext: Context<AccordionState | null> = createContext<AccordionState | null>(null);

export const AccordionItemContext: Context<AccordionItemState | null> = createContext<AccordionItemState | null>(null);

export function useAccordion(): AccordionState {
	const accordion = useContext(AccordionContext);
	if (!accordion) throw new Error("an accordion part stands outside Accordion");
	return accordion;
}

export function useAccordionItem(): AccordionItemState {
	const item = useContext(AccordionItemContext);
	if (!item) throw new Error("an accordion trigger or content stands outside AccordionItem");
	return item;
}
