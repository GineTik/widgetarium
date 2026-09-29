import { createElement as h, useRef } from "react";
import type { LooseProps } from "../types";
import { cn } from "../utils/cn";
import { stepIndex } from "../utils/roving";
import { POPOVER_ITEM, dataStateOf, usePopover } from "./popover-context";

export function PopoverContent({ children, className: cls }: LooseProps) {
	const popover = usePopover();
	const held = useRef(null);
	if (popover.isOpen) held.current = children;
	return (
		<div
			id={popover.id}
			ref={popover.panelRef}
			className={cn(
				"wg-kit-pop",
				popover.where.panelClass,
				(popover.isOpen || popover.isExiting) && "is-open",
				popover.isExiting && "is-exiting",
				popover.className,
				cls,
			)}
			role="dialog"
			data-state={dataStateOf(popover.isOpen)}
			data-side={popover.placement}
			data-wg-overlay={popover.shown ? "" : undefined}
			onKeyDown={moveBetweenItems}
		>
			<div className="wg-kit-pop-inner">{popover.shown ? held.current : null}</div>
		</div>
	);
}

function moveBetweenItems(event) {
	const step = { ArrowDown: 1, ArrowUp: -1, Home: "first", End: "last" }[event.key];
	if (step === undefined) return;
	const items = [...event.currentTarget.querySelectorAll(POPOVER_ITEM)];
	if (items.length === 0) return;
	event.preventDefault();
	items[stepIndex(items.indexOf(document.activeElement), step, items.length)].focus();
}
