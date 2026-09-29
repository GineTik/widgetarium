import { createElement as h } from "react";
import { cn } from "../utils/cn";

export function PopoverSeparator(props) {
	return <div {...props} role="separator" className={cn("wg-kit-pop-sep", props.className)} />;
}
