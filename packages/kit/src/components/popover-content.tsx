import { createElement as h, useRef } from "react";
import type { KeyboardEvent, ReactElement, ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../utils/cn";
import { portalLayer } from "../utils/portal-layer";
import { stepIndex } from "../utils/roving";
import type { Step } from "../utils/roving";
import { POPOVER_ITEM, dataStateOf, usePopover } from "./popover-context";

export interface PopoverContentProps {
	readonly children?: ReactNode;
	readonly className?: string | undefined;
}

const STEP_OF_KEY: ReadonlyMap<string, Step> = new Map<string, Step>([
	["ArrowDown", 1],
	["ArrowUp", -1],
	["Home", "first"],
	["End", "last"],
]);

export function PopoverContent({ children, className: cls }: PopoverContentProps): ReactElement {
	const popover = usePopover();
	const held = useRef<ReactNode>(null);
	if (popover.isOpen) held.current = children;
	const panel = (
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
	return popover.isPortaled ? createPortal(panel, portalLayer()) : panel;
}

function moveBetweenItems(event: KeyboardEvent<HTMLDivElement>): void {
	const step = STEP_OF_KEY.get(event.key);
	if (step === undefined) return;
	const items = [...event.currentTarget.querySelectorAll<HTMLElement>(POPOVER_ITEM)];
	if (items.length === 0) return;
	event.preventDefault();
	const at = items.findIndex((item) => item === document.activeElement);
	items[stepIndex(at, step, items.length)]?.focus();
}
