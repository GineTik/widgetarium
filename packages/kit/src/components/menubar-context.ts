import { createContext, useContext } from "react";
import type { Context, RefObject } from "react";
import type { FocusIntent } from "./menu-context";

export interface MenubarState {
	readonly value: string;
	readonly setValue: (value: string) => void;
	readonly rootRef: RefObject<HTMLDivElement | null>;
	readonly focusIntent: RefObject<FocusIntent>;
}

export const MenubarContext: Context<MenubarState | null> = createContext<MenubarState | null>(null);

export const MenubarValueContext: Context<string> = createContext<string>("");

export const MENUBAR_VALUE_ATTRIBUTE = "data-wg-menubar-value";

export function useMenubar(): MenubarState {
	const bar = useContext(MenubarContext);
	if (!bar) throw new Error("a menubar part stands outside a Menubar");
	return bar;
}

export function openNeighbour(bar: MenubarState, from: string, step: 1 | -1): void {
	const values = [...(bar.rootRef.current?.querySelectorAll(`[${MENUBAR_VALUE_ATTRIBUTE}]`) ?? [])].map(
		(trigger) => trigger.getAttribute(MENUBAR_VALUE_ATTRIBUTE) ?? "",
	);
	const at = values.indexOf(from);
	const next = values[(at + step + values.length) % values.length];
	if (next === undefined || next === from) return;
	bar.focusIntent.current = "first";
	bar.setValue(next);
}
