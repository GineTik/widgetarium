import { createElement as h } from "react";
import { Icon } from "../icons/icon";
import type { LooseProps } from "../types";
import { cn } from "../utils/cn";
import { PaginationButton } from "./pagination-button";
import { STEP_ICON_PX, STEP_LOOK } from "./pagination-parts";

const NEXT_PAGE = "Go to the next page";

export function PaginationNext({ label = "Next", className: cls, ...props }: LooseProps) {
	return (
		<PaginationButton aria-label={NEXT_PAGE} {...props} look={STEP_LOOK} className={cn("wg-kit-pagination-step", cls)}>
			<span className="wg-kit-pagination-step-label">{label}</span>
			<Icon name="chevron-right" size={STEP_ICON_PX} />
		</PaginationButton>
	);
}
