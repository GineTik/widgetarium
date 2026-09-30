import { createElement as h, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode, ReactPortal, RefObject } from "react";
import { createPortal } from "react-dom";
import { mountInto } from "./portal.js";
import type { PortalMount } from "./portal.js";

const MENU_GAP_PX = 8;
const MENU_SHORTEST_PX = 160;

export interface PressAt {
	readonly x: number;
	readonly y: number;
}

export interface RegionDrawerProps {
	readonly name: string;
	readonly isOpen: boolean;
	readonly pressAt?: PressAt | null | undefined;
	readonly width: number;
	readonly onClose?: (() => void) | undefined;
	readonly children?: ReactNode;
}

type CssVariables = Readonly<Record<`--${string}`, string>>;

export function RegionDrawer({ name, isOpen, pressAt, width, onClose, children }: RegionDrawerProps): ReactPortal {
	const panelRef = useRef<HTMLDivElement>(null);
	const portal = useDrawerPortal(onClose);
	useGrowthFromPress(panelRef, isOpen, pressAt);
	const placed = name === "menu" ? menuPlace(pressAt, width) : {};
	const style: CSSProperties & CssVariables = { "--wg-drawer-width": `${width}px`, ...placed };

	return createPortal(
		h(
			"div",
			{ className: `wg-drawer-over${isOpen ? " is-open" : ""}` },
			h("div", { className: "wg-drawer-scrim", onClick: onClose }),
			h("div", { className: `wg-drawer is-${name}`, ref: panelRef, style }, children),
		),
		portal.node,
	);
}

function menuPlace(pressAt: PressAt | null | undefined, width: number): CssVariables {
	if (!pressAt) return {};
	const left = Math.min(Math.max(pressAt.x - width / 2, MENU_GAP_PX), window.innerWidth - width - MENU_GAP_PX);
	const top = Math.min(pressAt.y + MENU_GAP_PX, window.innerHeight - MENU_SHORTEST_PX);
	return { "--wg-menu-left": `${Math.round(left)}px`, "--wg-menu-top": `${Math.round(Math.max(top, MENU_GAP_PX))}px` };
}

function useDrawerPortal(onClose: (() => void) | undefined): PortalMount {
	const [portal] = useState(() => mountInto(document.body, "wg-root wg-portal", onClose));
	useEffect(() => () => portal.dispose(), [portal]);
	return portal;
}

function useGrowthFromPress(
	panelRef: RefObject<HTMLDivElement | null>,
	isOpen: boolean,
	pressAt: PressAt | null | undefined,
): void {
	useLayoutEffect(() => {
		const panel = panelRef.current;
		if (!panel || !pressAt) return;
		const box = panel.getBoundingClientRect();
		if (!box.width || !box.height) return;
		panel.style.transformOrigin = `${Math.round(pressAt.x - box.left)}px ${Math.round(pressAt.y - box.top)}px`;
	}, [isOpen, pressAt]);
}
