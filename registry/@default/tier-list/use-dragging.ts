import { useState, type PointerEvent as ReactPointerEvent } from "react";
import type { CardRow, Carry, Target } from "./types";

const TAP_SLOP_PX = 4;

export function useDragging(
	rootRef: { current: HTMLDivElement | null },
	onDrop: (row: CardRow, target: Target) => void,
) {
	const [carry, setCarry] = useState<Carry | null>(null);
	const [target, setTarget] = useState<Target | null>(null);

	const grab = (row: CardRow) => (event: ReactPointerEvent<HTMLElement>) => {
		if (event.button !== 0) return;
		const box = event.currentTarget.getBoundingClientRect();
		const start = { x: event.clientX, y: event.clientY };
		let held: Carry = {
			row,
			x: start.x,
			y: start.y,
			offX: start.x - box.left,
			offY: start.y - box.top,
			isDragging: false,
		};
		let aimed: Target | null = null;

		const follow = (moved: PointerEvent) => {
			const isPastSlop =
				Math.abs(moved.clientX - start.x) > TAP_SLOP_PX || Math.abs(moved.clientY - start.y) > TAP_SLOP_PX;
			held = { ...held, x: moved.clientX, y: moved.clientY, isDragging: held.isDragging || isPastSlop };
			setCarry(held);
			if (!held.isDragging) return;
			aimed = aimedAt(rootRef.current, moved.clientX, moved.clientY, row.ref);
			setTarget(aimed);
		};
		const stop = () => {
			window.removeEventListener("pointermove", follow);
			window.removeEventListener("pointerup", stop);
			window.removeEventListener("pointercancel", stop);
			setCarry(null);
			setTarget(null);
			if (held.isDragging && aimed) onDrop(row, aimed);
		};

		setCarry(held);
		window.addEventListener("pointermove", follow);
		window.addEventListener("pointerup", stop);
		window.addEventListener("pointercancel", stop);
	};

	return { carry, target, grab };
}

function isWithin(box: DOMRect, x: number, y: number) {
	return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
}

function aimedAt(root: HTMLElement | null, x: number, y: number, movedRef: string): Target | null {
	const pens = [...(root?.querySelectorAll<HTMLElement>("[data-pen]") ?? [])];
	const pen = pens.find((node) => isWithin(node.getBoundingClientRect(), x, y));
	if (!pen) return null;
	const faces = [...pen.querySelectorAll<HTMLElement>("[data-card]")].filter((node) => node.dataset.card !== movedRef);
	const at = faces.findIndex((node) => {
		const box = node.getBoundingClientRect();
		return y < box.top || (y <= box.bottom && x < box.left + box.width / 2);
	});
	const name = pen.dataset.pen ?? "";
	return { tier: name || null, at: at === -1 ? faces.length : at };
}
