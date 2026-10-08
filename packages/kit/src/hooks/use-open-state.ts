import { useControllableState } from "./use-controllable-state";

export interface OpenAsk {
	readonly open?: boolean | undefined;
	readonly defaultOpen?: boolean | undefined;
	readonly onOpenChange?: ((open: boolean) => void) | undefined;
}

export function useOpenState({ open, defaultOpen, onOpenChange }: OpenAsk): [boolean, (open: boolean) => void] {
	return useControllableState({ prop: open, defaultProp: defaultOpen ?? false, onChange: onOpenChange });
}
