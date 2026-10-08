import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import { POPOVER_ITEM } from "../constants/popover";
import type { Placement } from "../constants/popover";
import { returnFocusTo } from "../utils/focus";
import { endFold, enterPanel, exitPanel, restPanel } from "../utils/popover-motion";
import { prefersReducedMotion } from "../utils/reduced-motion";
import type { StopMotion } from "../utils/popover-motion";

export interface PanelMotionAsk {
	readonly isOpen: boolean;
	readonly where: Placement;
	readonly anchorRef: RefObject<HTMLElement | null>;
	readonly pointRef: RefObject<HTMLElement | null>;
	readonly panelRef: RefObject<HTMLElement | null>;
	readonly triggerRef: RefObject<HTMLElement | null>;
	readonly openedByKeyboard: RefObject<boolean>;
	readonly release: () => void;
	readonly onExited?: (() => void) | undefined;
}

export function usePanelMotion(ask: PanelMotionAsk): void {
	const wasOpen = useRef(false);
	const stopExit = useRef<StopMotion | null>(null);
	const latest = useRef(ask);
	latest.current = ask;

	useLayoutEffect(() => {
		const panel = ask.panelRef.current;
		const anchor = motionAnchorOf(ask);
		if (!panel || !anchor) {
			if (!ask.isOpen) latest.current.release();
			return undefined;
		}
		const isClosing = wasOpen.current && !ask.isOpen;
		wasOpen.current = ask.isOpen;
		stopExit.current?.();
		stopExit.current = null;
		if (isClosing && panel.contains(document.activeElement)) returnFocusTo(ask.triggerRef.current ?? anchor);
		if (ask.isOpen) return openPanel(panel, anchor, ask);
		if (!isClosing) {
			restPanel(panel, anchor);
			latest.current.release();
			return undefined;
		}
		stopExit.current = closePanel(panel, anchor, () => {
			stopExit.current = null;
			latest.current.onExited?.();
			latest.current.release();
		});
		return () => {
			stopExit.current?.();
			stopExit.current = null;
		};
	}, [ask.isOpen, ask.where.key]);
}

function motionAnchorOf({ pointRef, where, triggerRef, anchorRef }: PanelMotionAsk): HTMLElement | null {
	return pointRef.current ?? (where.measuresTrigger ? triggerRef.current : null) ?? anchorRef.current;
}

function closePanel(panel: HTMLElement, anchor: HTMLElement, done: () => void): StopMotion | null {
	const finish = (): void => {
		endFold(panel, anchor);
		done();
	};
	if (prefersReducedMotion()) {
		finish();
		return null;
	}
	return exitPanel(panel, anchor, finish);
}

function openPanel(panel: HTMLElement, anchor: HTMLElement, ask: PanelMotionAsk): StopMotion | undefined {
	if (ask.anchorRef.current && ask.anchorRef.current !== anchor) ask.anchorRef.current.style.visibility = "";
	const stopEnter = enterPanel(panel, anchor, ask.where);
	if (ask.openedByKeyboard.current) panel.querySelector<HTMLElement>(POPOVER_ITEM)?.focus();
	return stopEnter;
}
