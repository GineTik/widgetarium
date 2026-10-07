import { createElement as h } from "react";
import type { ReactElement } from "react";
import { PopoverSeparator } from "./popover-separator";
import type { PopoverSeparatorProps } from "./popover-separator";

export function SelectSeparator(props: PopoverSeparatorProps): ReactElement {
	return <PopoverSeparator data-slot="select-separator" {...props} />;
}
