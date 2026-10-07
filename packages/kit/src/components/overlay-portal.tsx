import { Fragment, createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";

export interface OverlayPortalProps {
	readonly children?: ReactNode;
	readonly container?: Element | null | undefined;
}

export function OverlayPortal({ children }: OverlayPortalProps): ReactElement {
	return <>{children}</>;
}
