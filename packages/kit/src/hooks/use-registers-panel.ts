import { useLayoutEffect } from "react";
import type { ResizableState } from "../components/resizable-context";
import type { PanelLimits } from "../utils/resizable";

export function useRegistersPanel(group: ResizableState, id: string, limits: PanelLimits): void {
	useLayoutEffect(() => group.register(id, limits), [id, limits.defaultSize, limits.min, limits.max]);
}
