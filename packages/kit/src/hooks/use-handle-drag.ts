import { useRef } from "react";
import type { KeyboardEvent, PointerEvent, RefObject } from "react";
import type { ResizableState } from "../components/resizable-context";
import { useDirection } from "../components/direction-context";
import { WHOLE } from "../utils/resizable";
import type { PanelSizes } from "../utils/resizable";
import { PANEL_ID } from "./use-resizable-group";
import { pointerAxisOf } from "../utils/pointer-axis";

export interface HandleNeighbours {
	readonly before: string;
	readonly after: string;
}

export interface HandleDrag {
	readonly onPointerDown: (event: PointerEvent<HTMLElement>) => void;
	readonly onPointerMove: (event: PointerEvent<HTMLElement>) => void;
	readonly onPointerUp: (event: PointerEvent<HTMLElement>) => void;
	readonly onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
	readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

interface DragStart extends HandleNeighbours {
	readonly pointer: number;
	readonly span: number;
	readonly sizes: PanelSizes;
}

interface HandleHeld {
	readonly group: ResizableState;
	readonly drag: RefObject<DragStart | null>;
	readonly isVertical: boolean;
	readonly flip: number;
}

const KEY_STEP = 10;

export function useHandleDrag(group: ResizableState): HandleDrag {
	const drag = useRef<DragStart | null>(null);
	const isVertical = group.orientation === "vertical";
	const flip = useDirection() === "rtl" && !isVertical ? -1 : 1;
	const held: HandleHeld = { group, drag, isVertical, flip };
	const release = (): void => releaseHandle(held);
	return {
		onPointerDown: (event) => grabHandle(event, held),
		onPointerMove: (event) => dragHandle(event, held),
		onPointerUp: release,
		onPointerCancel: release,
		onKeyDown: (event) => stepHandleByKey(event, held),
	};
}

export function neighboursOf(handle: Element): HandleNeighbours | null {
	const before = siblingPanel(handle, "previousElementSibling");
	const after = siblingPanel(handle, "nextElementSibling");
	return before && after ? { before, after } : null;
}

function grabHandle(event: PointerEvent<HTMLElement>, { group, drag, isVertical }: HandleHeld): void {
	const neighbours = neighboursOf(event.currentTarget);
	const span = spanOf(event.currentTarget, isVertical);
	if (!neighbours || span <= 0 || event.button !== 0) return;
	event.preventDefault();
	event.currentTarget.setPointerCapture?.(event.pointerId);
	drag.current = { ...neighbours, pointer: pointerAxisOf(event, isVertical), span, sizes: group.sizes };
	group.setDragging(true);
}

function dragHandle(event: PointerEvent<HTMLElement>, { group, drag, isVertical, flip }: HandleHeld): void {
	const start = drag.current;
	if (!start) return;
	const delta = (((pointerAxisOf(event, isVertical) - start.pointer) * WHOLE) / start.span) * flip;
	group.step({ before: start.before, after: start.after, delta }, start.sizes);
}

function releaseHandle({ group, drag }: HandleHeld): void {
	drag.current = null;
	group.setDragging(false);
}

function stepHandleByKey(event: KeyboardEvent<HTMLElement>, { group, isVertical, flip }: HandleHeld): void {
	const neighbours = neighboursOf(event.currentTarget);
	const delta = keyDeltaOf(event.key, isVertical, flip);
	if (!neighbours || delta === null) return;
	event.preventDefault();
	group.step({ ...neighbours, delta });
}

function siblingPanel(handle: Element, way: "previousElementSibling" | "nextElementSibling"): string | null {
	for (let at = handle[way]; at; at = at[way]) {
		const id = at.getAttribute(PANEL_ID);
		if (id) return id;
	}
	return null;
}

function spanOf(handle: Element, isVertical: boolean): number {
	const box = handle.parentElement?.getBoundingClientRect();
	if (!box) return 0;
	return isVertical ? box.height : box.width;
}

function keyDeltaOf(key: string, isVertical: boolean, flip: number): number | null {
	if (key === "Home") return -WHOLE;
	if (key === "End") return WHOLE;
	const grow = isVertical ? "ArrowDown" : "ArrowRight";
	const shrink = isVertical ? "ArrowUp" : "ArrowLeft";
	if (key === grow) return KEY_STEP * flip;
	if (key === shrink) return -KEY_STEP * flip;
	return null;
}
