import { createContext, useContext } from "react";
import type { Context } from "react";
import type { HoverLayer } from "../hooks/use-hover-layer";

export const HoverCardContext: Context<HoverLayer | null> = createContext<HoverLayer | null>(null);

export function useHoverCard(): HoverLayer {
	const card = useContext(HoverCardContext);
	if (!card) throw new Error("a hover card part stands outside a HoverCard");
	return card;
}
