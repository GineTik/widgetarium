import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";

export function BreadcrumbPage({ className, ...rest }: HTMLAttributes<HTMLSpanElement>): ReactElement {
	return (
		<span
			data-slot="breadcrumb-page"
			role="link"
			aria-disabled="true"
			aria-current="page"
			{...rest}
			className={cn("wg-kit-breadcrumb-page", className)}
		/>
	);
}
