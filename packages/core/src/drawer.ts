import { createElement as h, Fragment, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactElement, ReactNode, RefObject } from "react";
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

export function RegionDrawer({ name, isOpen, pressAt, width, onClose, children }: RegionDrawerProps): ReactElement {
	const markerRef = useRef<HTMLSpanElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const portal = useDrawerPortal(markerRef, onClose);
	useGrowthFromPress(panelRef, isOpen, pressAt);
	const placed = name === "menu" ? menuPlace(pressAt, width, boundsOf(portal?.pane ?? null)) : {};
	const style: CSSProperties & CssVariables = { "--wg-drawer-width": `${width}px`, ...placed };
	const over = h(
		"div",
		{ className: `wg-drawer-over${isOpen ? " is-open" : ""}` },
		h("div", { className: "wg-drawer-scrim", onClick: onClose }),
		h("div", { className: `wg-drawer is-${name}`, ref: panelRef, style }, children),
	);
	return h(
		Fragment,
		null,
		h("span", { ref: markerRef, hidden: true }),
		portal ? createPortal(over, portal.mount.node) : null,
	);
}

interface Bounds {
	readonly left: number;
	readonly top: number;
	readonly width: number;
	readonly height: number;
}

interface DrawerPortal {
	readonly mount: PortalMount;
	readonly pane: HTMLElement | null;
}

const PANE = ".workspace-leaf-content";
const PHONE = "is-phone";

function menuPlace(pressAt: PressAt | null | undefined, width: number, bounds: Bounds): CssVariables {
	if (!pressAt) return {};
	const x = pressAt.x - bounds.left;
	const y = pressAt.y - bounds.top;
	const left = Math.min(Math.max(x - width / 2, MENU_GAP_PX), bounds.width - width - MENU_GAP_PX);
	const top = Math.min(y + MENU_GAP_PX, bounds.height - MENU_SHORTEST_PX);
	return { "--wg-menu-left": `${Math.round(left)}px`, "--wg-menu-top": `${Math.round(Math.max(top, MENU_GAP_PX))}px` };
}

function boundsOf(pane: HTMLElement | null): Bounds {
	if (!pane) return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
	const box = pane.getBoundingClientRect();
	return { left: box.left, top: box.top, width: box.width, height: box.height };
}

// TRADE-OFF: on a phone every pane is the whole screen already, so the window is the pane there
function paneOf(marker: HTMLElement | null): HTMLElement | null {
	if (!marker || marker.ownerDocument.body.classList.contains(PHONE)) return null;
	return marker.closest<HTMLElement>(PANE);
}

function useDrawerPortal(
	markerRef: RefObject<HTMLElement | null>,
	onClose: (() => void) | undefined,
): DrawerPortal | null {
	const [portal, setPortal] = useState<DrawerPortal | null>(null);
	useLayoutEffect(() => {
		const pane = paneOf(markerRef.current);
		if (pane && getComputedStyle(pane).position === "static") pane.style.position = "relative";
		const mount = mountInto(
			pane ?? document.body,
			pane ? "wg-root wg-portal is-in-pane" : "wg-root wg-portal",
			onClose,
		);
		setPortal({ mount, pane });
		return () => mount.dispose();
	}, []);
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
