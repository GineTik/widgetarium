import type { BoardColumn } from "@default/lib";
import { useRef, useState, type DragEvent } from "react";

type Reorder = { from: number; to: number; step: number; origin: number };

export function useColumnReorder(
	columnNames: string[],
	boardColumns: BoardColumn[],
	save: (columns: BoardColumn[]) => void,
) {
	const boardRef = useRef<HTMLDivElement | null>(null);
	const [reorder, setReorder] = useState<Reorder | null>(null);

	// TRADE-OFF: one step and one origin, not a rect per column — every column is the same width
	const grab = (from: number) => (event: DragEvent<HTMLElement>) => {
		const strip = boardRef.current;
		if (!strip) return;
		const lists = [...strip.querySelectorAll(".ok-list")];
		const [firstList] = lists;
		const carriedList = lists[from];
		if (!firstList || !carriedList) return;
		const first = firstList.getBoundingClientRect();
		const carriedRect = carriedList.getBoundingClientRect();
		event.dataTransfer?.setDragImage?.(carriedList, event.clientX - carriedRect.left, event.clientY - carriedRect.top);
		const carrying = {
			from,
			to: from,
			step: lists[1] ? lists[1].getBoundingClientRect().left - first.left : first.width,
			origin: first.left - strip.getBoundingClientRect().left + strip.scrollLeft,
		};
		requestAnimationFrame(() => setReorder(carrying));
	};

	const aim = (event: DragEvent<HTMLElement>) => {
		if (!reorder) return;
		event.preventDefault();
		const strip = boardRef.current;
		if (!strip) return;
		const x = event.clientX - strip.getBoundingClientRect().left + strip.scrollLeft;
		const wanted = Math.floor((x - reorder.origin) / reorder.step);
		const to = Math.max(0, Math.min(columnNames.length - 1, wanted));
		if (to !== reorder.to) setReorder({ ...reorder, to });
	};

	const shiftOf = (index: number) => {
		if (!reorder) return undefined;
		if (index === reorder.from) return (reorder.to - reorder.from) * reorder.step;
		if (index > reorder.from && index <= reorder.to) return -reorder.step;
		if (index < reorder.from && index >= reorder.to) return reorder.step;
		return 0;
	};

	return {
		boardRef,
		isReordering: reorder !== null,
		carriedFrom: reorder?.from,
		grab,
		aim,
		shiftOf,
		release: () => setReorder(null),
		drop: () => {
			if (!reorder) return;
			if (reorder.to !== reorder.from) save(afterColumnMoves(boardColumns, columnNames, reorder.from, reorder.to));
			setReorder(null);
		},
	};
}

function afterColumnMoves(authored: BoardColumn[], shown: string[], from: number, to: number) {
	const moving = shown[from];
	if (!moving) return authored;
	const order = shown.filter((_, index) => index !== from);
	order.splice(to, 0, moving);
	const moved = order[Symbol.iterator]();
	const byName = new Map(authored.map((column) => [column.name, column]));
	return authored.map((column) => {
		if (!shown.includes(column.name)) return column;
		return byName.get(String(moved.next().value)) ?? column;
	});
}
