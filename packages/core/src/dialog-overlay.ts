import { createElement as h, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MouseEvent, ReactElement, ReactNode, ReactPortal, RefObject } from "react";
import { createPortal } from "react-dom";
import { mountInto } from "./portal.js";
import { cn } from "@widgetarium/kit";
import { enterDialog, exitDialog, ghostLeftInPortalPlace, watchPresses } from "./dialog-motion.js";

export interface DialogOverlayProps {
	readonly className?: string | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly children?: ReactNode;
}

interface PortalCommittingProps {
	readonly onEscape?: (() => void) | undefined;
	readonly children?: ReactNode;
}

export function DialogOverlay({ className: cls, onClose, children }: DialogOverlayProps): ReactElement {
	const overlayRef = useRef<HTMLDivElement>(null);
	useFocusInside(overlayRef);

	return h(
		PortalCommittingChildrenWithMount,
		{ onEscape: onClose },
		h(
			"div",
			{
				ref: overlayRef,
				className: cn("wg-dialog-overlay", cls),
				tabIndex: -1,
				onClick: (event: MouseEvent<HTMLDivElement>) => {
					if (event.target === event.currentTarget) onClose?.();
				},
			},
			children,
		),
	);
}

function PortalCommittingChildrenWithMount({ children, onEscape }: PortalCommittingProps): ReactPortal {
	const [portal] = useState(() => {
		watchPresses();
		return mountInto(document.body, "wg-root wg-portal", onEscape);
	});
	useLayoutEffect(
		() => () => {
			const ghost = ghostLeftInPortalPlace(portal.node);
			portal.dispose();
			if (ghost) exitDialog(ghost, () => ghost.remove());
		},
		[],
	);

	useEffect(() => enterDialog(portal.node), []);

	return createPortal(children, portal.node);
}

function useFocusInside(overlayRef: RefObject<HTMLDivElement | null>): void {
	useEffect(() => {
		const returnTo = document.activeElement;
		const overlay = overlayRef.current;
		(overlay?.querySelector<HTMLElement>(".wg-dialog") ?? overlay)?.focus();
		return () => {
			if (returnTo?.isConnected && isFocusable(returnTo)) returnTo.focus();
		};
	}, []);
}

function isFocusable(element: Element): element is Element & HTMLOrSVGElement {
	return typeof Reflect.get(element, "focus") === "function";
}
