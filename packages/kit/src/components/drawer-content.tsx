import { createElement as h, useContext } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import type { DragPointerProps } from "../hooks/use-drawer-drag";
import { useDrawerMotion } from "../hooks/use-drawer-motion";
import { cn } from "../utils/cn";
import { useDialog } from "./dialog-context";
import { DrawerContext } from "./drawer-context";
import { DrawerHandle } from "./drawer-handle";
import { ModalCloseButton } from "./modal-close-button";
import { DISMISSED_ANYWHERE, ModalLayer } from "./modal-layer";
import type { ModalDismissal } from "./modal-layer";

const NEVER_DISMISSED: ModalDismissal = { byScrim: false, byEscape: false };

export interface DrawerContentProps extends Omit<HTMLAttributes<HTMLDivElement>, keyof DragPointerProps> {
	readonly showCloseButton?: boolean | undefined;
}

export function DrawerContent({
	showCloseButton = false,
	className,
	style,
	children,
	...rest
}: DrawerContentProps): ReactElement {
	const settings = useContext(DrawerContext);
	const motion = useDrawerMotion(settings, useDialog());
	return (
		<ModalLayer
			kind="drawer"
			side={settings.direction}
			dismissal={settings.isDismissible ? DISMISSED_ANYWHERE : NEVER_DISMISSED}
			scrimStyle={motion.scrimStyle}
			{...rest}
			{...motion.pointerProps}
			panelRef={motion.panelRef}
			className={cn(motion.className, className)}
			style={{ ...style, ...motion.panelStyle }}
		>
			{children}
			{showCloseButton ? <ModalCloseButton /> : null}
			{settings.direction === "bottom" ? <DrawerHandle grip={motion.grip} /> : null}
		</ModalLayer>
	);
}
