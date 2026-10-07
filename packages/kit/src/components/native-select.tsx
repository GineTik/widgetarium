import { createElement as h } from "react";
import type { ReactElement, Ref, SelectHTMLAttributes } from "react";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";

export { NativeSelectOption } from "./native-select-option";
export { NativeSelectOptGroup } from "./native-select-opt-group";

export type NativeSelectSize = "sm" | "default";

export interface NativeSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
	readonly size?: NativeSelectSize | undefined;
	readonly onValueChange?: ((value: string) => void) | undefined;
	readonly ref?: Ref<HTMLSelectElement>;
}

const CHEVRON_PX = 16;

export function NativeSelect({ size = "default", onValueChange, className, ...rest }: NativeSelectProps): ReactElement {
	return (
		<div
			data-slot="native-select-wrapper"
			data-size={size}
			data-disabled={rest.disabled ? "" : undefined}
			className={cn("wg-kit-native-select", size === "sm" && "is-s")}
		>
			<select
				data-slot="native-select"
				data-size={size}
				{...rest}
				className={cn("wg-kit-native-select-control", className)}
				onChange={(event) => {
					rest.onChange?.(event);
					onValueChange?.(event.currentTarget.value);
				}}
			/>
			<Icon name="chevron-down" size={CHEVRON_PX} className="wg-kit-native-select-icon" />
		</div>
	);
}
