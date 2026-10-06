import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { movedNow } from "./design-zoom.js";
import { projectedDrop, shownTopOf } from "./layer-drag.js";
import type { DragRow, Projection } from "./layer-drag.js";

export interface Slot {
	readonly top: number;
	readonly left: number;
	readonly height: number;
}

export interface LayerDrag {
	readonly slot: Slot | null;
	readonly onPointerDown: (event: ReactPointerEvent, mark: string, canDrag: boolean) => void;
	readonly wasDragged: () => boolean;
}

interface Lift {
	readonly mark: string;
	readonly startX: number;
	readonly startY: number;
	rows: readonly DragRow[];
	elements: ReadonlyMap<string, HTMLElement>;
	grab: number;
	projection: Projection | null;
}

const ROW = ".wg-design-layer-row";
const SHUT = ".wg-ai-fold.is-shut";
const DRAGGING = "is-dragging";
const LIFTED = "is-lifted";
const STARTS_AFTER_PX = 4;
const SETTLED_AFTER_MS = 4000;

export function useLayerDrag(
	tree: RefObject<HTMLDivElement | null>,
	indent: number,
	onDrop: (dragged: string, projection: Projection) => void,
	rebuilt: unknown,
): LayerDrag {
	const [slot, setSlot] = useState<Slot | null>(null);
	const lift = useRef<Lift | null>(null);
	const dragged = useRef(false);
	useEffect(() => {
		lift.current = null;
		setSlot(null);
		if (tree.current) cleared(tree.current);
	}, [rebuilt, tree]);
	const onPointerDown = (event: ReactPointerEvent, mark: string, canDrag: boolean): void => {
		dragged.current = false;
		const holder = tree.current;
		if (event.button !== 0 || !holder || !canDrag) return;
		lift.current = {
			mark,
			startX: event.clientX,
			startY: event.clientY,
			rows: [],
			elements: new Map(),
			grab: 0,
			projection: null,
		};
		const onMove = (move: PointerEvent): void => {
			const held = lift.current;
			if (!held) return;
			const isFar = Math.hypot(move.clientX - held.startX, move.clientY - held.startY) >= STARTS_AFTER_PX;
			if (!dragged.current && !isFar) return;
			if (!dragged.current) started(holder, held);
			dragged.current = true;
			movedNow();
			moved(held, { y: contentY(holder, move.clientY), dx: move.clientX - held.startX }, indent, setSlot);
		};
		const onUp = (): void => {
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
			const held = lift.current;
			lift.current = null;
			if (!held || !dragged.current) return;
			const projection = held.projection;
			if (!projection || projection.isStill) {
				setSlot(null);
				return cleared(holder);
			}
			landed(held, projection);
			setSlot(null);
			onDrop(held.mark, projection);
			window.setTimeout(() => cleared(holder), SETTLED_AFTER_MS);
		};
		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
	};
	return { slot, onPointerDown, wasDragged: () => dragged.current };
}

function contentY(holder: HTMLElement, clientY: number): number {
	return clientY - holder.getBoundingClientRect().top + holder.scrollTop;
}

function started(holder: HTMLElement, held: Lift): void {
	const shown = [...holder.querySelectorAll<HTMLElement>(ROW)].filter((row) => !row.closest(SHUT));
	held.rows = shown.map((row) => ({
		mark: row.dataset["mark"] ?? "",
		depth: Number(row.dataset["depth"] ?? 0),
		top: contentY(holder, row.getBoundingClientRect().top),
		height: row.offsetHeight,
		canHold: row.dataset["canHold"] === "true",
		isHeld: row.dataset["held"] === "true",
		scope: row.dataset["scope"] ?? "",
	}));
	held.elements = new Map(shown.map((row) => [row.dataset["mark"] ?? "", row]));
	const lifted = held.rows.find((row) => row.mark === held.mark);
	held.grab = contentY(holder, held.startY) - (lifted?.top ?? 0);
	holder.classList.add(DRAGGING);
}

function moved(
	held: Lift,
	pointer: { y: number; dx: number },
	indent: number,
	setSlot: (slot: Slot | null) => void,
): void {
	const projection = projectedDrop(held.rows, held.mark, pointer, held.projection?.at ?? null, indent);
	const lifted = held.rows.find((row) => row.mark === held.mark);
	const block = new Set(projection?.block ?? [held.mark]);
	const offset = pointer.y - held.grab - (lifted?.top ?? 0);
	for (const mark of block) {
		const element = held.elements.get(mark);
		element?.classList.add(LIFTED);
		if (element) element.style.transform = `translateY(${offset}px)`;
	}
	const isSame = projection?.at === held.projection?.at && projection?.depth === held.projection?.depth;
	held.projection = projection;
	if (isSame) return;
	if (!projection) {
		for (const [mark, element] of held.elements) if (!block.has(mark)) element.style.transform = "";
		return setSlot(null);
	}
	const from = held.rows.findIndex((row) => row.mark === held.mark);
	const shift = { from, blockHeight: projection.blockHeight, at: projection.at };
	held.rows
		.filter((row) => !block.has(row.mark))
		.forEach((row, index) => {
			const element = held.elements.get(row.mark);
			if (element) element.style.transform = `translateY(${shownTopOf(row, index, shift) - row.top}px)`;
		});
	setSlot({ top: projection.slotTop, left: projection.depth * indent, height: projection.blockHeight });
}

function landed(held: Lift, projection: Projection): void {
	let inside = 0;
	for (const mark of projection.block) {
		const element = held.elements.get(mark);
		const row = held.rows.find((one) => one.mark === mark);
		if (!element || !row) continue;
		element.classList.remove(LIFTED);
		element.style.transform = `translateY(${projection.slotTop + inside - row.top}px)`;
		inside += row.height;
	}
}

function cleared(holder: HTMLElement): void {
	holder.classList.remove(DRAGGING);
	for (const row of holder.querySelectorAll<HTMLElement>(ROW)) {
		row.classList.remove(LIFTED);
		row.style.transform = "";
	}
}
