import { createElement as h, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { MouseEvent, ReactElement, ReactNode, ReactPortal, RefObject } from "react";
import { createPortal } from "react-dom";
import { mountInto } from "./portal.js";
import { cn } from "@widgetarium/kit";
import { CATALOGUE_REQUESTS } from "./engine/catalogue-requests.js";
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
	const isAside = useSyncExternalStore(CATALOGUE_REQUESTS.subscribe, isCatalogueAsking);

	return h(
		PortalCommittingChildrenWithMount,
		{ onEscape: onClose },
		h(
			"div",
			{
				ref: overlayRef,
				className: cn("wg-dialog-overlay", isAside && "is-aside", cls),
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

// TRADE-OFF: every open dialog steps aside while the catalogue is asked, not only the one that asked, because nothing else opens a dialog meanwhile
function isCatalogueAsking(): boolean {
	return CATALOGUE_REQUESTS.current() !== null;
}
