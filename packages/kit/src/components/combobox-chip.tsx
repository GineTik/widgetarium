import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";
import { textOfNode } from "../utils/command-items";
import { useCombobox } from "./combobox-context";

export interface ComboboxChipProps extends HTMLAttributes<HTMLSpanElement> {
	readonly value?: unknown;
	readonly showRemove?: boolean | undefined;
}

const REMOVE_PX = 14;

export function ComboboxChip({
	value,
	showRemove = true,
	className,
	children,
	...rest
}: ComboboxChipProps): ReactElement {
	const combobox = useCombobox();
	const label = textOfNode(children).trim();
	const held = value ?? combobox.selected.find((one) => combobox.stringOf(one) === label);
	return (
		<span data-slot="combobox-chip" {...rest} className={cn("wg-kit-combobox-chip", className)}>
			{children}
			{showRemove && held !== undefined ? (
				<button
					type="button"
					data-slot="combobox-chip-remove"
					aria-label={`Remove ${label}`}
					className="wg-kit-combobox-chip-remove"
					onClick={() => combobox.remove(held)}
				>
					<Icon name="x" size={REMOVE_PX} />
				</button>
			) : null}
		</span>
	);
}
