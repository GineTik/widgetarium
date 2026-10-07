import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";

export function BreadcrumbEllipsis({ className, ...rest }: HTMLAttributes<HTMLSpanElement>): ReactElement {
	return (
		<span
			data-slot="breadcrumb-ellipsis"
			role="presentation"
			aria-hidden="true"
			{...rest}
			className={cn("wg-kit-breadcrumb-ellipsis", className)}
		>
			<Icon name="ellipsis" />
			<span className="wg-kit-sr-only">More</span>
		</span>
	);
}
