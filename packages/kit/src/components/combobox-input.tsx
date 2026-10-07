import { createElement as h } from "react";
import type { InputHTMLAttributes, ReactElement, ReactNode } from "react";
import { useComboboxInput } from "../hooks/use-combobox-input";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";
import { useCombobox } from "./combobox-context";
import { InputGroup } from "./input-group";
import { InputGroupAddon } from "./input-group-addon";
import { InputGroupButton } from "./input-group-button";
import { InputGroupInput } from "./input-group-input";

export interface ComboboxInputProps extends Omit<
	InputHTMLAttributes<HTMLInputElement>,
	"value" | "defaultValue" | "onChange" | "children"
> {
	readonly showTrigger?: boolean | undefined;
	readonly showClear?: boolean | undefined;
	readonly children?: ReactNode;
}

const ICON_PX = 16;

export function ComboboxInput({
	showTrigger = true,
	showClear = false,
	className,
	children,
	...rest
}: ComboboxInputProps): ReactElement {
	const combobox = useCombobox();
	const binding = useComboboxInput();
	return (
		<InputGroup data-slot="combobox-input" className={cn("wg-kit-combobox-input", className)}>
			{children}
			<InputGroupInput {...rest} {...binding} disabled={binding.disabled || rest.disabled} />
			<InputGroupAddon align="inline-end">
				{showClear && combobox.selected.length > 0 ? (
					<InputGroupButton size="icon-xs" aria-label="Clear" data-slot="combobox-clear" onClick={combobox.clear}>
						<Icon name="x" size={ICON_PX} />
					</InputGroupButton>
				) : null}
				{showTrigger ? (
					<InputGroupButton
						size="icon-xs"
						aria-label="Show options"
						data-slot="combobox-trigger"
						disabled={combobox.disabled}
						onClick={() => combobox.setOpen(!combobox.isOpen)}
					>
						<Icon name="chevron-down" size={ICON_PX} className="wg-kit-combobox-chevron" />
					</InputGroupButton>
				) : null}
			</InputGroupAddon>
		</InputGroup>
	);
}
