import { createContext, useContext } from "react";
import type { Context } from "react";

export interface CollapsibleState {
	readonly isOpen: boolean;
	readonly isDisabled: boolean;
	readonly toggle: () => void;
	readonly contentId: string;
}

export const CollapsibleContext: Context<CollapsibleState | null> = createContext<CollapsibleState | null>(null);

export function useCollapsible(): CollapsibleState {
	const collapsible = useContext(CollapsibleContext);
	if (!collapsible) throw new Error("a collapsible part stands outside Collapsible");
	return collapsible;
}
