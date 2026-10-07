import { createElement as h } from "react";
import type { HTMLAttributes, MouseEvent, ReactElement } from "react";
import { useLongPress } from "../hooks/use-long-press";
import { chain } from "../utils/chain";
import { pointBox, useContextMenuPoint } from "./context-menu-point";
import { useMenu } from "./menu-context";
import { dataStateOf } from "./popover-context";
import { Slot } from "./slot";

export interface ContextMenuTriggerProps extends HTMLAttributes<HTMLSpanElement> {
	readonly asChild?: boolean;
	readonly disabled?: boolean | undefined;
}

export function ContextMenuTrigger({
	asChild = false,
	disabled,
	onContextMenu,
	...rest
}: ContextMenuTriggerProps): ReactElement {
	const menu = useMenu();
	const setPoint = useContextMenuPoint();
	const openAt = (x: number, y: number): void => {
		setPoint(pointBox(x, y));
		menu.focusIntent.current = "panel";
		menu.setOpen(true);
	};
	const longPress = useLongPress(openAt);
	return h(asChild ? Slot : "span", {
		...rest,
		...(disabled ? {} : longPress),
		"data-slot": "context-menu-trigger",
		"data-state": dataStateOf(menu.isOpen),
		"data-disabled": disabled ? "" : undefined,
		ref: menu.triggerRef,
		onContextMenu: chain(onContextMenu, (event: MouseEvent<HTMLElement>) => {
			if (disabled) return;
			event.preventDefault();
			openAt(event.clientX, event.clientY);
		}),
	});
}
