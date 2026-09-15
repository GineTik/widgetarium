import { createElement as h } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { mountInto } from "./portal.js";

export function RegionDrawer({ name, isOpen, pressAt, width, onClose, children }) {
	const panelRef = useRef(null);
	const portal = useDrawerPortal(onClose);
	useGrowthFromPress(panelRef, isOpen, pressAt);

	return createPortal(
		h(
			"div",
			{ className: `wg-drawer-over${isOpen ? " is-open" : ""}` },
			h("div", { className: "wg-drawer-scrim", onClick: onClose }),
			h(
				"div",
				{ className: `wg-drawer is-${name}`, ref: panelRef, style: { "--wg-drawer-width": `${width}px` } },
				children,
			),
		),
		portal.node,
	);
}

export function useShutDrawerWhenTheRegionStands(openedName, isFloating, shut) {
	useEffect(() => {
		if (openedName && !isFloating) shut();
	}, [openedName, isFloating, shut]);
}

function useDrawerPortal(onClose) {
	const [portal] = useState(() => mountInto(document.body, "wg-root wg-portal", onClose));
	useEffect(() => () => portal.dispose(), [portal]);
	return portal;
}

function useGrowthFromPress(panelRef, isOpen, pressAt) {
	useLayoutEffect(() => {
		const panel = panelRef.current;
		if (!panel || !pressAt) return;
		const box = panel.getBoundingClientRect();
		if (!box.width || !box.height) return;
		panel.style.transformOrigin = `${Math.round(pressAt.x - box.left)}px ${Math.round(pressAt.y - box.top)}px`;
	}, [isOpen, pressAt]);
}
