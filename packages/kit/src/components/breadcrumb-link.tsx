import { createElement as h } from "react";
import type { AnchorHTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import { Slot } from "./slot";

export interface BreadcrumbLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
	readonly asChild?: boolean | undefined;
}

export function BreadcrumbLink({ asChild = false, className, ...rest }: BreadcrumbLinkProps): ReactElement {
	const Comp = asChild ? Slot : "a";
	return <Comp data-slot="breadcrumb-link" {...rest} className={cn("wg-kit-breadcrumb-link", className)} />;
}
