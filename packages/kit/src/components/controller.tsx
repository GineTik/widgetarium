import type { ReactElement } from "react";
import type { FieldBinding, FieldState, UseFormReturn } from "../hooks/use-form";
import type { FormValues } from "../utils/form-state";

export interface ControllerRender<V, K extends keyof V> {
	readonly field: FieldBinding<V, K>;
	readonly fieldState: FieldState;
}

export interface ControllerProps<V extends FormValues, T, K extends keyof V & string> {
	readonly name: K;
	readonly control: UseFormReturn<V, T>;
	readonly render: (props: ControllerRender<V, K>) => ReactElement;
}

export function Controller<V extends FormValues, T, K extends keyof V & string>({
	name,
	control,
	render,
}: ControllerProps<V, T, K>): ReactElement {
	return render(control.field(name));
}
