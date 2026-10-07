import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import { useCombobox } from "./combobox-context";

export function ComboboxEmpty({ className, ...rest }: HTMLAttributes<HTMLDivElement>): ReactElement | null {
	if (!useCombobox().isEmpty) return null;
	return <div data-slot="combobox-empty" {...rest} className={cn("wg-kit-combobox-empty", className)} />;
}
