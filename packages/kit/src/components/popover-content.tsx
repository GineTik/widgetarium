import { createElement as h, useRef } from "react";
import type { KeyboardEvent, ReactElement, ReactNode } from "react";
import { createPortal } from "react-dom";
import { POPOVER_ITEM } from "../constants/popover";
import type { PopoverAlign, PopoverSide } from "../constants/popover";
import { useAsksPlacement } from "../hooks/use-asks-placement";
import { cn } from "../utils/cn";
import { portalLayer } from "../utils/portal-layer";
import { stepIndex } from "../utils/roving";
import type { Step } from "../utils/roving";
import { dataStateOf, usePopover } from "./popover-context";

export interface PopoverContentProps {
	readonly side?: PopoverSide | undefined;
	readonly align?: PopoverAlign | undefined;
	readonly sideOffset?: number | undefined;
	readonly alignOffset?: number | undefined;
	readonly children?: ReactNode;
	readonly className?: string | undefined;
}

const STEP_OF_KEY: ReadonlyMap<string, Step> = new Map<string, Step>([
	["ArrowDown", 1],
	["ArrowUp", -1],
	["Home", "first"],
	["End", "last"],
]);

export function PopoverContent({
	side,
	align,
	sideOffset,
	alignOffset,
	children,
	className: cls,
}: PopoverContentProps): ReactElement {
	const popover = usePopover();
	const held = useRef<ReactNode>(null);
	if (popover.isOpen) held.current = children;
	useAsksPlacement({ side, align, sideOffset, alignOffset, askPlacement: popover.askPlacement });
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
			data-slot="popover-content"
			data-state={dataStateOf(popover.isOpen)}
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
