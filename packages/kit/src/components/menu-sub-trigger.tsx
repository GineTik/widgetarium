import { createElement as h } from "react";
import type { HTMLAttributes, KeyboardEvent, PointerEvent, ReactElement } from "react";
import { Icon } from "../icons/icon";
import { chain } from "../utils/chain";
import { cn } from "../utils/cn";
import { focusQuietly } from "../utils/focus";
import { menuItemMarks } from "../utils/menu-item";
import { focusMenuItem } from "../utils/menu-keys";
import type { MenuState } from "./menu-context";
import { useMenu } from "./menu-context";
import { dataStateOf } from "./popover-context";

export interface MenuSubTriggerProps extends HTMLAttributes<HTMLDivElement> {
	readonly inset?: boolean | undefined;
	readonly disabled?: boolean | undefined;
}

const CHEVRON_PX = 16;

export function MenuSubTrigger({
	inset,
	disabled,
	className,
	children,
	onPointerMove,
	onKeyDown,
	onClick,
	...rest
}: MenuSubTriggerProps): ReactElement {
	const sub = useMenu();
	return (
		<div
			role="menuitem"
			aria-haspopup="menu"
			aria-expanded={sub.isOpen}
			aria-controls={sub.isOpen ? sub.contentId : undefined}
			data-state={dataStateOf(sub.isOpen)}
			{...rest}
			{...menuItemMarks(sub, { part: "sub-trigger", inset, disabled })}
			ref={(node: HTMLDivElement | null) => {
				sub.triggerRef.current = node;
			}}
			className={cn("wg-kit-menu-item is-sub-trigger", className)}
			onPointerMove={chain(onPointerMove, (event) => openByPointer(sub, event, disabled))}
			onClick={chain(onClick, () => openByKeys(sub, disabled))}
			onKeyDown={chain(onKeyDown, (event) => openOnArrow(sub, event, disabled))}
		>
			{children}
			<Icon name="chevron-right" size={CHEVRON_PX} className="wg-kit-menu-chevron" />
		</div>
	);
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

function openOnArrow(sub: MenuState, event: KeyboardEvent<HTMLElement>, disabled: boolean | undefined): void {
	if (event.key !== "ArrowRight" && event.key !== "Enter" && event.key !== " ") return;
	event.preventDefault();
	openByKeys(sub, disabled);
}

function focusInto(sub: MenuState): void {
	const panel = document.getElementById(sub.contentId);
	if (panel) focusMenuItem(panel, "first");
}
