import { createElement as h, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { createPortal } from "react-dom";
import { TipBubble } from "./design-tip-bubble.js";
import type { Placed } from "./design-tip-bubble.js";

const SHOWN_AFTER_MS = 400;
const BELOW_PX = 10;

export function Tip({ label, children }: { readonly label: string; readonly children?: ReactNode }): ReactElement {
	const [placed, setPlaced] = useState<Placed | null>(null);
	const timer = useRef(0);
	const anchor = useRef<HTMLSpanElement | null>(null);
	const show = (): void => {
		window.clearTimeout(timer.current);
		timer.current = window.setTimeout(() => {
			const box = anchor.current?.getBoundingClientRect();
			if (box) setPlaced({ left: box.left + box.width / 2, top: box.bottom + BELOW_PX });
		}, SHOWN_AFTER_MS);
	};
	const hide = (): void => {
		window.clearTimeout(timer.current);
		setPlaced(null);
	};
	return h(
		"span",
		{ className: "wg-design-tip", ref: anchor, onMouseEnter: show, onMouseLeave: hide, onPointerDown: hide },
		[children, placed ? createPortal(h(TipBubble, { key: "bubble", label, placed }), document.body) : null],
	);
}
