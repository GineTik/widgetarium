import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";

export interface SheetDragAsk {
	readonly isOpen: boolean;
	readonly setOpen: (open: boolean) => void;
	readonly peekPx: number;
	readonly maxPx: number;
	readonly onHeight?: ((height: number) => void) | undefined;
}

export interface GripProps {
	readonly onPointerDown: (event: PointerEvent) => void;
	readonly onPointerMove: (event: PointerEvent) => void;
	readonly onPointerUp: () => void;
	readonly onPointerCancel: () => void;
}

export interface SheetDrag {
	readonly height: number;
	readonly isDragging: boolean;
	readonly gripProps: GripProps;
}

interface DragStart {
	readonly y: number;
	readonly height: number;
}

const SHEET_COMMIT = 0.4;

const STILL_PRESS_PX = 2;

export function useSheetDrag({ isOpen, setOpen, peekPx, maxPx, onHeight }: SheetDragAsk): SheetDrag {
	const [dragged, setDragged] = useState<number | null>(null);
	const from = useRef<DragStart | null>(null);
	const latest = useRef(0);
	const height = dragged ?? (isOpen ? maxPx : peekPx);
	latest.current = height;

	useEffect(() => {
		onHeight?.(height);
	}, [height]);

	const start = (event: PointerEvent): void => {
		from.current = { y: event.clientY, height: latest.current };
		event.currentTarget.setPointerCapture?.(event.pointerId);
		setDragged(latest.current);
	};

	const move = (event: PointerEvent): void => {
		if (!from.current) return;
		const wanted = from.current.height + (from.current.y - event.clientY);
		setDragged(Math.max(peekPx, Math.min(maxPx, wanted)));
	};

	// TRADE-OFF: a press that never moved still commits — the grip was a toggle, and people already have that gesture
	const finish = (): void => {
		if (!from.current) return;
		const settled = latest.current;
		const moved = Math.abs(settled - from.current.height) > STILL_PRESS_PX;
		from.current = null;
		setDragged(null);
		setOpen(moved ? settled > peekPx + (maxPx - peekPx) * SHEET_COMMIT : !isOpen);
	};

	return {
		height,
		isDragging: from.current !== null,
		gripProps: { onPointerDown: start, onPointerMove: move, onPointerUp: finish, onPointerCancel: finish },
	};
}
