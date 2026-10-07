import { createContext, useContext } from "react";
import type { Context } from "react";
import type { PairStep, PanelLimits, PanelSizes } from "../utils/resizable";

export type ResizableOrientation = "horizontal" | "vertical";

export interface ResizableState {
	readonly orientation: ResizableOrientation;
	readonly sizes: PanelSizes;
	readonly limitsOf: (id: string) => PanelLimits;
	readonly register: (id: string, limits: PanelLimits) => () => void;
	readonly step: (step: PairStep, from?: PanelSizes) => void;
	readonly setDragging: (isDragging: boolean) => void;
}

export const ResizableContext: Context<ResizableState | null> = createContext<ResizableState | null>(null);

export function useResizable(): ResizableState {
	const group = useContext(ResizableContext);
	if (!group) throw new Error("a resizable part stands outside ResizablePanelGroup");
	return group;
}
