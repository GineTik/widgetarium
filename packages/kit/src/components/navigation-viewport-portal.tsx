import type { ReactNode, ReactPortal } from "react";
import { createPortal } from "react-dom";
import { useNavigationMenu } from "./navigation-menu-context";

export interface NavigationViewportPortalProps {
	readonly isShown: boolean;
	readonly content: ReactNode;
}

export function NavigationViewportPortal({ isShown, content }: NavigationViewportPortalProps): ReactPortal | null {
	const { viewportTarget } = useNavigationMenu();
	if (!isShown || !viewportTarget) return null;
	return createPortal(content, viewportTarget);
}
