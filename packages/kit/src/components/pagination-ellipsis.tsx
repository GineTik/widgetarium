import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";
import { domPropsOf } from "../utils/dom-props";
import { STEP_ICON_PX } from "./pagination-parts";

export type PaginationEllipsisProps = HTMLAttributes<HTMLSpanElement>;

export function PaginationEllipsis(props: PaginationEllipsisProps): ReactElement {
	return (
		<span aria-hidden="true" {...domPropsOf(props)} className={cn("wg-kit-pagination-ellipsis", props.className)}>
			<Icon name="ellipsis" size={STEP_ICON_PX} />
		</span>
	);
}
