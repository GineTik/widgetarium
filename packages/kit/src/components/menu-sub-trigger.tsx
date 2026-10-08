import { createElement as h } from "react";
import type { HTMLAttributes, KeyboardEvent, PointerEvent, ReactElement } from "react";
import { Icon } from "../icons/icon";
import { chainHandlers } from "../utils/chain";
import { cn } from "../utils/cn";
import { focusQuietly } from "../utils/focus";
import { menuItemMarks } from "../utils/menu-item";
import { focusMenuItem } from "../utils/menu-keys";
import { menuTriggerAria } from "../utils/menu-trigger-aria";
import type { MenuState } from "./menu-context";
import { useMenu } from "./menu-context";
import { dataStateOf } from "./popover-context";
import { composeRefs } from "./slot";

export interface MenuSubTriggerProps extends HTMLAttributes<HTMLDivElement> {
	readonly inset?: boolean | undefined;
	readonly disabled?: boolean | undefined;
}

type SubTriggerHandlers = Required<Pick<HTMLAttributes<HTMLElement>, "onPointerMove" | "onClick" | "onKeyDown">>;

interface SubTriggerPress {
	readonly disabled: boolean | undefined;
	readonly theirs: Partial<SubTriggerHandlers>;
}

const CHEVRON_PX = 16;

export function MenuSubTrigger({ inset, disabled, className, children, ...rest }: MenuSubTriggerProps): ReactElement {
	const sub = useMenu();
	return (
		<div
			role="menuitem"
			{...menuTriggerAria(sub)}
			data-state={dataStateOf(sub.isOpen)}
			{...rest}
			{...menuItemMarks(sub, { part: "sub-trigger", inset, disabled })}
			ref={composeRefs(sub.triggerRef)}
			className={cn("wg-kit-menu-item is-sub-trigger", className)}
			{...subTriggerHandlers(sub, { disabled, theirs: rest })}
		>
			{children}
			<Icon name="chevron-right" size={CHEVRON_PX} className="wg-kit-menu-chevron" />
		</div>
	);
}

function subTriggerHandlers(sub: MenuState, { disabled, theirs }: SubTriggerPress): SubTriggerHandlers {
	return {
		onPointerMove: chainHandlers(theirs.onPointerMove, (event: PointerEvent<HTMLElement>) =>
			openByPointer(sub, event, disabled),
		),
		onClick: chainHandlers(theirs.onClick, () => openByKeys(sub, disabled)),
		onKeyDown: chainHandlers(theirs.onKeyDown, (event: KeyboardEvent<HTMLElement>) =>
			openOnForwardKey(sub, event, disabled),
		),
	};
}

function openByPointer(sub: MenuState, event: PointerEvent<HTMLElement>, disabled: boolean | undefined): void {
	if (disabled || event.pointerType === "touch") return;
	focusQuietly(event.currentTarget);
	sub.focusIntent.current = "none";
	sub.setOpen(true);
}

function openByKeys(sub: MenuState, disabled: boolean | undefined): void {
	if (disabled) return;
	if (sub.isOpen) {
		focusInto(sub);
		return;
	}
	sub.focusIntent.current = "first";
	sub.setOpen(true);
}

function openOnForwardKey(sub: MenuState, event: KeyboardEvent<HTMLElement>, disabled: boolean | undefined): void {
	if (event.key !== "ArrowRight" && event.key !== "Enter" && event.key !== " ") return;
	event.preventDefault();
	openByKeys(sub, disabled);
}

function focusInto(sub: MenuState): void {
	const panel = sub.panelRef.current;
	if (panel) focusMenuItem(panel, "first");
}
