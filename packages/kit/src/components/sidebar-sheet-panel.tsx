import { createElement as h } from "react";
import type { ReactElement, RefObject } from "react";
import type { SidebarSheetState } from "../hooks/use-sidebar-sheet";
import { cn } from "../utils/cn";
import type { TokenStyle } from "../utils/token-style";
import { dataStateOf } from "./popover-context";
import type { PopoverDataState } from "./popover-context";
import type { SidebarSheetProps } from "./sidebar-sheet";
import { SidebarSheetGrip } from "./sidebar-sheet-grip";

export interface SidebarSheetPanelProps extends Omit<
	SidebarSheetProps,
	"open" | "defaultOpen" | "onOpenChange" | "height" | "mode" | "surface"
> {
	readonly sheet: SidebarSheetState;
	readonly lookClass: string;
}

type SheetElementAsk = Omit<SidebarSheetPanelProps, "as" | "grip" | "sheet" | "lookClass" | "children">;

interface SheetElementProps extends Omit<SheetElementAsk, "className" | "style"> {
	readonly ref: RefObject<HTMLElement | null>;
	readonly className: string;
	readonly style: TokenStyle;
	readonly "data-state": PopoverDataState;
}

const RAISE_THE_SHEET = "Raise the sheet";

export function SidebarSheetPanel({
	as = "div",
	grip = RAISE_THE_SHEET,
	sheet,
	lookClass,
	children,
	...rest
}: SidebarSheetPanelProps): ReactElement {
	return h(as, sheetElementProps(sheet, lookClass, rest), [
		<SidebarSheetGrip key="grip" label={grip} sheet={sheet} />,
		children,
	]);
}

function sheetElementProps(
	sheet: SidebarSheetState,
	lookClass: string,
	{ className, style, ...rest }: SheetElementAsk,
): SheetElementProps {
	return {
		...rest,
		ref: sheet.sheetRef,
		className: cn("wg-kit-sheet", lookClass, sheet.drag.isDragging && "is-dragging", className),
		style: { ...style, height: `${Math.round(sheet.drag.height)}px` },
		"data-state": dataStateOf(sheet.isOpen),
	};
}
