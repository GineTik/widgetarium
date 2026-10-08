import { useControllableState } from "./use-controllable-state";

export interface ComboboxOpenAsk {
	readonly open?: boolean | undefined;
	readonly defaultOpen: boolean;
	readonly onOpenChange?: ((open: boolean) => void) | undefined;
}

export function useComboboxOpen(ask: ComboboxOpenAsk): [boolean, (open: boolean) => void] {
	return useControllableState({ prop: ask.open, defaultProp: ask.defaultOpen, onChange: ask.onOpenChange });
}
