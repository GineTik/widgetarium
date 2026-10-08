import { createElement as h } from "react";
import type { HTMLAttributes, MouseEvent, ReactElement } from "react";
import { useLongPress } from "../hooks/use-long-press";
import { useOpensAtPoint } from "../hooks/use-opens-at-point";
import type { OpenAt } from "../hooks/use-opens-at-point";
import { chainHandlers } from "../utils/chain";
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
	const openAt = useOpensAtPoint(menu);
	const longPress = useLongPress(openAt);
	return h(asChild ? Slot : "span", {
		...rest,
		...(disabled ? {} : longPress),
		"data-slot": "context-menu-trigger",
		"data-state": dataStateOf(menu.isOpen),
		"data-disabled": disabled ? "" : undefined,
		ref: menu.triggerRef,
		onContextMenu: chainHandlers(onContextMenu, (event: MouseEvent<HTMLElement>) =>
			openAtPointer(event, openAt, disabled),
		),
	});
}

function openAtPointer(event: MouseEvent<HTMLElement>, openAt: OpenAt, disabled: boolean | undefined): void {
	if (disabled) return;
	event.preventDefault();
	openAt(event.clientX, event.clientY);
}
