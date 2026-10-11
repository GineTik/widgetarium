import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import { cn } from "../utils/cn";
import { LayoutActions } from "./layout-actions";
import { LayoutTitle } from "./layout-title";

export interface LayoutHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
	readonly title?: ReactNode;
}

export function LayoutHeader({ title, className: cls, children, ...rest }: LayoutHeaderProps): ReactElement {
	return (
		<div {...rest} className={cn("wg-kit-layout-head", cls)}>
			{title ? <LayoutTitle>{title}</LayoutTitle> : null}
			{title && children ? <LayoutActions>{children}</LayoutActions> : children}
		</div>
	);
}
