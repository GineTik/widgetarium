import { createElement as h, useContext } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { createPortal } from "react-dom";
import { HEAD_OUTSIDE } from "../constants/layout";
import { cn } from "../utils/cn";
import { LayoutActions } from "./layout-actions";
import { LayoutTitle } from "./layout-title";

export interface LayoutHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
	readonly title?: ReactNode;
}

export function LayoutHeader({ title, className: cls, children, ...rest }: LayoutHeaderProps): ReactNode {
	const headPlace = useContext(HEAD_OUTSIDE);
	const drawn = (
		<div {...rest} className={cn("wg-kit-layout-head", Boolean(headPlace) && "is-outside", cls)}>
			{title ? <LayoutTitle>{title}</LayoutTitle> : null}
			{title && children ? <LayoutActions>{children}</LayoutActions> : children}
		</div>
	);
	if (headPlace) return createPortal(drawn, headPlace);
	return drawn;
}
