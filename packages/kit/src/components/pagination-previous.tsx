import { createElement as h } from "react";
import { Icon } from "../icons/icon";
import type { LooseProps } from "../types";
import { cn } from "../utils/cn";
import { PaginationButton } from "./pagination-button";
import { STEP_ICON_PX, STEP_LOOK } from "./pagination-parts";

const PREVIOUS_PAGE = "Go to the previous page";

export function PaginationPrevious({ label = "Previous", className: cls, ...props }: LooseProps) {
	return (
		<PaginationButton
			aria-label={PREVIOUS_PAGE}
			{...props}
			look={STEP_LOOK}
			className={cn("wg-kit-pagination-step", cls)}
		>
			<Icon name="chevron-left" size={STEP_ICON_PX} />
			<span className="wg-kit-pagination-step-label">{label}</span>
		</PaginationButton>
	);
}
