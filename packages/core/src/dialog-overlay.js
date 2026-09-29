import { createElement as h, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { mountInto } from "./portal.js";
import { cn } from "@widgetarium/kit";
import { enterDialog, exitDialog, ghostLeftInPortalPlace, watchPresses } from "./dialog-motion.js";

export function DialogOverlay({ className: cls, onClose, children }) {
	const overlayRef = useRef(null);
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
				onClick: (event) => event.target === event.currentTarget && onClose?.(),
			},
			children,
		),
	);
}

function PortalCommittingChildrenWithMount({ children, onEscape }) {
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

function useFocusInside(overlayRef) {
	useEffect(() => {
		const returnTo = document.activeElement;
		const overlay = overlayRef.current;
		(overlay?.querySelector(".wg-dialog") ?? overlay)?.focus?.();
		return () => {
			if (returnTo?.isConnected) returnTo.focus?.();
		};
	}, []);
}
