import { useContext, useLayoutEffect } from "react";
import type { ScrollAxis } from "../utils/scroll-thumb";
import { ScrollAreaContext } from "./scroll-area-context";

export interface ScrollBarProps {
	readonly orientation?: ScrollAxis | undefined;
}

export function ScrollBar({ orientation = "vertical" }: ScrollBarProps): null {
	const area = useContext(ScrollAreaContext);
	const isAcross = orientation === "horizontal";
	useLayoutEffect(() => {
		if (!area || !isAcross) return undefined;
		area.wantAcross(true);
		return () => area.wantAcross(false);
	}, [area, isAcross]);
	return null;
}
