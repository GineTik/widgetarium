import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";

export { BreadcrumbList } from "./breadcrumb-list";
export { BreadcrumbItem } from "./breadcrumb-parts";
export { BreadcrumbLink } from "./breadcrumb-link";
export { BreadcrumbPage } from "./breadcrumb-page";
export { BreadcrumbSeparator } from "./breadcrumb-separator";
export { BreadcrumbEllipsis } from "./breadcrumb-ellipsis";
export type { BreadcrumbLinkProps } from "./breadcrumb-link";

export function Breadcrumb({ className, ...rest }: HTMLAttributes<HTMLElement>): ReactElement {
	return (
		<nav aria-label="breadcrumb" data-slot="breadcrumb" {...rest} className={cn("wg-kit-breadcrumb", className)} />
	);
}
