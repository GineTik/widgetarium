import { createElement as h } from "react";
import { Icon } from "../icons/icon";
import type { LooseProps } from "../types";
import { cn } from "../utils/cn";
import { domPropsOf } from "../utils/dom-props";
import { STEP_ICON_PX } from "./pagination-parts";

export function PaginationEllipsis({ className: cls, ...props }: LooseProps) {
	return (
		<span aria-hidden="true" {...domPropsOf(props)} className={cn("wg-kit-pagination-ellipsis", cls)}>
			<Icon name="ellipsis" size={STEP_ICON_PX} />
		</span>
	);
}
