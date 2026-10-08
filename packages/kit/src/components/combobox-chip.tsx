import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";
import { textOfNode } from "../utils/command-items";
import { useCombobox } from "./combobox-context";
import type { ComboboxState } from "./combobox-context";

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
	const key = chipKeyOf(combobox, value, label);
	return (
		<span data-slot="combobox-chip" {...rest} className={cn("wg-kit-combobox-chip", className)}>
			{children}
			{showRemove && key !== null ? (
				<button
					type="button"
					data-slot="combobox-chip-remove"
					aria-label={`Remove ${label}`}
					className="wg-kit-combobox-chip-remove"
					onClick={() => combobox.remove(key)}
				>
					<Icon name="x" size={REMOVE_PX} />
				</button>
			) : null}
		</span>
	);
}

function chipKeyOf(combobox: ComboboxState, value: unknown, label: string): string | null {
	if (value !== undefined) return combobox.keyOf(value);
	return combobox.selectedKeys.find((key) => combobox.labelOf(key) === label) ?? null;
}
