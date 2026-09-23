import type { LooseProps } from "../types";
import { createElement as h, useEffect, useRef, useState } from "react";
import { sidebarClass } from "../utils/class-names";
import { cx } from "../utils/cx";

const SHEET_COMMIT = 0.4;

export function SidebarSheet({
	as = "div",
	mode,
	surface,
	isOpen,
	onOpen,
	onHeight,
	peekPx = 220,
	maxPx = 640,
	grip = "Raise the sheet",
	className: cls,
	style,
	children,
	...rest
}: LooseProps) {
	const [dragged, setDragged] = useState(null);
	const from = useRef(null);
	const latest = useRef(0);

	const height = dragged ?? (isOpen ? maxPx : peekPx);
	latest.current = height;

	// CONTEXT: the sheet OWNS its height, so anything that has to stand clear of it is told —
	// a second place computing the same number was what put the controls under the panel
	useEffect(() => {
		onHeight?.(height);
	}, [height]);

	const start = (event) => {
		from.current = { y: event.clientY, height: latest.current };
		event.currentTarget.setPointerCapture?.(event.pointerId);
		setDragged(latest.current);
	};

	const move = (event) => {
		if (!from.current) return;
		const wanted = from.current.height + (from.current.y - event.clientY);
		setDragged(Math.max(peekPx, Math.min(maxPx, wanted)));
	};

	// TRADE-OFF: a press that never moved still commits — the grip was a toggle before this, and
	// taking that away would cost a gesture people already have
	const finish = () => {
		if (!from.current) return;
		const settled = latest.current;
		const moved = Math.abs(settled - from.current.height) > 2;
		from.current = null;
		setDragged(null);
		onOpen?.(moved ? settled > peekPx + (maxPx - peekPx) * SHEET_COMMIT : !isOpen);
	};

	return h(
		as,
		{
			...rest,
			className: cx("wg-kit-sheet", sidebarClass({ mode, surface }), from.current && "is-dragging", cls),
			style: { ...style, height: `${Math.round(height)}px` },
		},
		[
			<button
				key="grip"
				type="button"
				className="wg-kit-sheet-grip"
				aria-label={grip}
				aria-pressed={String(Boolean(isOpen))}
				onPointerDown={start}
				onPointerMove={move}
				onPointerUp={finish}
				onPointerCancel={finish}
			/>,
			children,
		],
	);
}
