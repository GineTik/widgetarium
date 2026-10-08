import { useControllableState } from "./use-controllable-state";

export type CheckedState = boolean | "indeterminate";

export interface CheckToggleAsk {
	readonly checked?: CheckedState | undefined;
	readonly defaultChecked?: CheckedState | undefined;
	readonly onCheckedChange?: ((checked: boolean) => void) | undefined;
	readonly onSelect?: ((event: Event) => void) | undefined;
}

export function useCheckToggle(ask: CheckToggleAsk): [CheckedState, (event: Event) => void] {
	const [isChecked, setChecked] = useControllableState<CheckedState>({
		prop: ask.checked,
		defaultProp: ask.defaultChecked ?? false,
	});
	const toggle = (event: Event): void => {
		const next = isChecked !== true;
		setChecked(next);
		ask.onCheckedChange?.(next);
		ask.onSelect?.(event);
	};
	return [isChecked, toggle];
}
