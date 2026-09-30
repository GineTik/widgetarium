import { createElement as h, useRef } from "react";
import type { HTMLAttributes, KeyboardEvent, ReactElement } from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { useSheetDrag } from "../hooks/use-sheet-drag";
import { sidebarClass } from "../utils/class-names";
import { cn } from "../utils/cn";
import type { StyleProp } from "../utils/token-style";
import type { SidebarLook, SidebarTag } from "./sidebar";

export interface SheetHeight {
	readonly peekPx?: number;
	readonly maxPx?: number;
	readonly onHeight?: ((height: number) => void) | undefined;
}

export interface SidebarSheetProps extends Omit<HTMLAttributes<HTMLElement>, "style">, SidebarLook {
	readonly as?: SidebarTag;
	readonly open?: boolean | undefined;
	readonly defaultOpen?: boolean;
	readonly onOpenChange?: ((open: boolean) => void) | undefined;
	readonly height?: SheetHeight;
	readonly grip?: string;
	readonly style?: StyleProp | undefined;
}

const PEEK_PX = 220;

const SHEET_MAX_PX = 640;

const RAISE_THE_SHEET = "Raise the sheet";

export function SidebarSheet({
	as = "div",
	mode,
	surface,
	open,
	defaultOpen = false,
	onOpenChange,
	height = {},
	grip = RAISE_THE_SHEET,
	className: cls,
	style,
	children,
	...rest
}: SidebarSheetProps): ReactElement {
	const [isOpen, setOpen] = useControllableState({ prop: open, defaultProp: defaultOpen, onChange: onOpenChange });
	const gripRef = useRef<HTMLButtonElement>(null);
	const { peekPx = PEEK_PX, maxPx = SHEET_MAX_PX, onHeight } = height;
	const drag = useSheetDrag({ isOpen, setOpen, peekPx, maxPx, onHeight });

	const collapseOnEscape = (event: KeyboardEvent): void => {
		if (event.key !== "Escape" || !isOpen) return;
		event.stopPropagation();
		setOpen(false);
		gripRef.current?.focus();
	};

	return h(
		as,
		{
			...rest,
			className: cn("wg-kit-sheet", sidebarClass({ mode, surface }), drag.isDragging && "is-dragging", cls),
			style: { ...style, height: `${Math.round(drag.height)}px` },
			"data-state": isOpen ? "open" : "closed",
			onKeyDown: collapseOnEscape,
		},
		[
			<button
				key="grip"
				ref={gripRef}
				type="button"
				className="wg-kit-sheet-grip"
				aria-label={grip}
				aria-pressed={isOpen}
				{...drag.gripProps}
			/>,
			children,
		],
	);
}
