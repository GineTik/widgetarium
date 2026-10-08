import type { HTMLAttributes, KeyboardEvent, PointerEvent } from "react";
import type { MenuState } from "../components/menu-context";
import { menuSlot } from "../components/menu-context";
import { chain } from "./chain";
import { focusQuietly } from "./focus";

export type ItemHandlers = Pick<
	HTMLAttributes<HTMLElement>,
	"onClick" | "onKeyDown" | "onPointerMove" | "onPointerLeave"
>;

export interface ItemLook {
	readonly part: string;
	readonly inset?: boolean | undefined;
	readonly disabled?: boolean | undefined;
}

export interface ItemPress {
	readonly disabled?: boolean | undefined;
	readonly onSelect?: ((event: Event) => void) | undefined;
	readonly theirs: ItemHandlers;
}

export interface ItemMarks {
	readonly tabIndex: number;
	readonly "data-wg-menu-item": "";
	readonly "data-slot": string;
	readonly "data-inset": "" | undefined;
	readonly "data-disabled": "" | undefined;
	readonly "aria-disabled": true | undefined;
}

export function menuItemMarks(menu: MenuState, { part, inset, disabled }: ItemLook): ItemMarks {
	return {
		tabIndex: -1,
		"data-wg-menu-item": "",
		"data-slot": menuSlot(menu, part),
		"data-inset": inset ? "" : undefined,
		"data-disabled": disabled ? "" : undefined,
		"aria-disabled": disabled ? true : undefined,
	};
}

export function menuItemHandlers(menu: MenuState, { disabled, onSelect, theirs }: ItemPress): Required<ItemHandlers> {
	return {
		onClick: chain(theirs.onClick, () => {
			if (!disabled) selectItem(menu, onSelect);
		}),
		onKeyDown: chain(theirs.onKeyDown, pressOnEnterOrSpace),
		onPointerMove: chain(theirs.onPointerMove, (event: PointerEvent<HTMLElement>) => {
			if (disabled || event.pointerType === "touch") return;
			menu.closeChildren();
			if (document.activeElement !== event.currentTarget) focusQuietly(event.currentTarget);
		}),
		onPointerLeave: chain(theirs.onPointerLeave, (event: PointerEvent<HTMLElement>) => {
			focusQuietly(event.currentTarget.closest('[role="menu"]'));
		}),
	};
}

export function pressOnEnterOrSpace(event: KeyboardEvent<HTMLElement>): void {
	if (event.key !== "Enter" && event.key !== " ") return;
	event.preventDefault();
	event.currentTarget.click();
}

function selectItem(menu: MenuState, onSelect: ((event: Event) => void) | undefined): void {
	const event = new Event("select", { cancelable: true });
	onSelect?.(event);
	if (!event.defaultPrevented) menu.closeTree();
}
