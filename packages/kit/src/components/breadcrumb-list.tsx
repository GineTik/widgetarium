import { createElement as h } from "react";
import type { OlHTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";

export function BreadcrumbList({ className, ...rest }: OlHTMLAttributes<HTMLOListElement>): ReactElement {
	return <ol data-slot="breadcrumb-list" {...rest} className={cn("wg-kit-breadcrumb-list", className)} />;
}
