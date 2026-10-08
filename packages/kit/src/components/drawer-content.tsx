import { createElement as h, useContext } from "react";
import type { CSSProperties, HTMLAttributes, ReactElement } from "react";
import { useDrawerDrag } from "../hooks/use-drawer-drag";
import { cn } from "../utils/cn";
import type { TokenStyle } from "../utils/token-style";
import { useDialog } from "./dialog-context";
import { DrawerDirectionContext } from "./drawer-direction";
import { DrawerHandle } from "./drawer-handle";
import { ModalLayer } from "./modal-layer";

export type DrawerContentProps = HTMLAttributes<HTMLDivElement>;

export function DrawerContent({ className, style, children, ...rest }: DrawerContentProps): ReactElement {
	const direction = useContext(DrawerDirectionContext);
	const { isOpen, setOpen } = useDialog();
	const drag = useDrawerDrag(isOpen, setOpen);
	return (
		<ModalLayer
			kind="drawer"
			side={direction}
			closesOnScrim={true}
			{...rest}
			panelRef={drag.panelRef}
			className={cn(drag.isDragging && "is-dragging", className)}
			style={dragStyle(style, drag.offsetPx)}
		>
			{direction === "bottom" ? <DrawerHandle gripProps={drag.gripProps} /> : null}
			{children}
		</ModalLayer>
	);
}

function dragStyle(style: CSSProperties | undefined, offsetPx: number): TokenStyle {
	return { ...style, "--wg-kit-drawer-drag": `${offsetPx}px` };
}
