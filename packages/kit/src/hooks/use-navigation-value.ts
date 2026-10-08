import { useRef } from "react";
import type { NavigationMenuState } from "../components/navigation-menu-context";
import { useControllableState } from "./use-controllable-state";

export interface NavigationValueAsk {
	readonly value?: string | undefined;
	readonly defaultValue?: string | undefined;
	readonly onValueChange?: ((value: string) => void) | undefined;
}

export type NavigationValue = Pick<NavigationMenuState, "value" | "setValue" | "shownValue">;

export function useNavigationValue(ask: NavigationValueAsk): NavigationValue {
	const [value, setValue] = useControllableState({
		prop: ask.value,
		defaultProp: ask.defaultValue ?? "",
		onChange: ask.onValueChange,
	});
	const lastOpen = useRef("");
	if (value !== "") lastOpen.current = value;
	return { value, setValue, shownValue: value || lastOpen.current };
}
