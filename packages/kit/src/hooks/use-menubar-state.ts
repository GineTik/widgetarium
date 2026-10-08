import { useRef } from "react";
import type { FocusIntent } from "../components/menu-context";
import type { MenubarState } from "../components/menubar-context";
import { useControllableState } from "./use-controllable-state";

export interface MenubarAsk {
	readonly value?: string | undefined;
	readonly defaultValue?: string | undefined;
	readonly onValueChange?: ((value: string) => void) | undefined;
}

export function useMenubarState({ value, defaultValue, onValueChange }: MenubarAsk): MenubarState {
	const [openValue, setValue] = useControllableState({
		prop: value,
		defaultProp: defaultValue ?? "",
		onChange: onValueChange,
	});
	const rootRef = useRef<HTMLDivElement>(null);
	const focusIntent = useRef<FocusIntent>("panel");
	return { value: openValue, setValue, rootRef, focusIntent };
}
