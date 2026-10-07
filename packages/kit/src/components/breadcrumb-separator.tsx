import { createElement as h } from "react";
import type { LiHTMLAttributes, ReactElement } from "react";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";

const SEPARATOR_PX = 14;

export function BreadcrumbSeparator({ className, children, ...rest }: LiHTMLAttributes<HTMLLIElement>): ReactElement {
	return (
		<li
			data-slot="breadcrumb-separator"
			role="presentation"
			aria-hidden="true"
			{...rest}
			className={cn("wg-kit-breadcrumb-separator", className)}
		>
			{children ?? <Icon name="chevron-right" size={SEPARATOR_PX} />}
		</li>
	);
}
