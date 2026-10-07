import { useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { DRAWER_PEEK_PX } from "../constants/overlays";
import type { GripProps } from "./use-sheet-drag";
import { useSheetDrag } from "./use-sheet-drag";

export interface DrawerDrag {
	readonly panelRef: RefObject<HTMLDivElement | null>;
	readonly gripProps: GripProps;
	readonly isDragging: boolean;
	readonly offsetPx: number;
}

export function useDrawerDrag(isOpen: boolean, setOpen: (open: boolean) => void): DrawerDrag {
	const panelRef = useRef<HTMLDivElement>(null);
	const [fullPx, setFullPx] = useState(0);
	useLayoutEffect(() => {
		const measured = panelRef.current?.offsetHeight ?? 0;
		if (measured !== fullPx) setFullPx(measured);
	});
	const drag = useSheetDrag({ isOpen, setOpen, peekPx: DRAWER_PEEK_PX, maxPx: fullPx });
	const offsetPx = isOpen || drag.isDragging ? Math.max(0, fullPx - drag.height) : 0;
	return { panelRef, gripProps: drag.gripProps, isDragging: drag.isDragging, offsetPx };
}
