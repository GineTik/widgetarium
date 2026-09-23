import type { LooseProps } from "../types";
import { createElement as h, useContext } from "react";
import { createPortal } from "react-dom";
import { LayoutActions } from "./layout-actions";
import { LayoutTitle } from "./layout-title";
import { HEAD_OUTSIDE } from "../constants/layout";
import { cx } from "../utils/cx";

export function LayoutHeader({ title, className: cls, children, ...rest }: LooseProps) {
	const headPlace = useContext(HEAD_OUTSIDE);
	const drawn = (
		<div {...rest} className={cx("wg-kit-layout-head", headPlace && "is-outside", cls)}>
			{title ? <LayoutTitle>{title}</LayoutTitle> : null}
			{title && children ? <LayoutActions>{children}</LayoutActions> : children}
		</div>
	);
	if (headPlace) return createPortal(drawn, headPlace);
	return drawn;
}
