import { createElement as h } from "react";
import type { KeyboardEvent, ReactElement, ReactNode } from "react";
import { POPOVER_ITEM } from "../constants/popover";
import { cn } from "../utils/cn";
import { focusStepped } from "../utils/focus-step";
import { COLUMN_STEP_OF_KEY } from "../utils/roving";
import { dataStateOf } from "./popover-context";
import type { HeldPopover } from "./popover-context";

export interface PopoverPanelProps {
	readonly popover: HeldPopover;
	readonly className?: string | undefined;
	readonly children?: ReactNode;
}

export function PopoverPanel({ popover, className, children }: PopoverPanelProps): ReactElement {
	return (
		<div
			id={popover.id}
			ref={popover.panelRef}
			className={popoverPanelClass(popover, className)}
			role="dialog"
			data-slot="popover-content"
			data-state={dataStateOf(popover.isOpen)}
			data-wg-overlay={popover.shown ? "" : undefined}
			onKeyDown={moveBetweenItems}
		>
			<div className="wg-kit-pop-inner">{children}</div>
		</div>
	);
}

function popoverPanelClass(popover: HeldPopover, className: string | undefined): string {
	return cn(
		"wg-kit-pop",
		popover.where.panelClass,
		(popover.isOpen || popover.isExiting) && "is-open",
		popover.isExiting && "is-exiting",
		popover.className,
		className,
	);
}

function moveBetweenItems(event: KeyboardEvent<HTMLDivElement>): void {
	const items = [...event.currentTarget.querySelectorAll<HTMLElement>(POPOVER_ITEM)];
	focusStepped(event, items, COLUMN_STEP_OF_KEY.get(event.key));
}
