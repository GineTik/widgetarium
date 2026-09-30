import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import type { Placement } from "../constants/popover";
import { POPOVER_ITEM } from "../components/popover-context";
import { isFocusable } from "../utils/dom-nodes";
import { enterPanel, exitPanel, prefersReducedMotion, restPanel } from "../utils/popover-motion";
import type { StopMotion } from "../utils/popover-motion";

export interface PanelMotionAsk {
	readonly isOpen: boolean;
	readonly where: Placement;
	readonly anchorRef: RefObject<HTMLElement | null>;
	readonly panelRef: RefObject<HTMLElement | null>;
	readonly triggerRef: RefObject<HTMLElement | null>;
	readonly openedByKeyboard: RefObject<boolean>;
	readonly wasOpen: RefObject<boolean>;
	readonly setExiting: (isExiting: boolean) => void;
}

const FOCUSABLE = "button, a, input, [tabindex]";

export function usePanelMotion(ask: PanelMotionAsk): void {
	const { isOpen, where, anchorRef, panelRef, triggerRef, openedByKeyboard, wasOpen, setExiting } = ask;
	const stopExit = useRef<StopMotion | null>(null);

	useLayoutEffect(() => {
		const panel = panelRef.current;
		const anchor = anchorRef.current;
		if (!panel || !anchor) return undefined;
		const closing = wasOpen.current && !isOpen;
		wasOpen.current = isOpen;
		stopExit.current?.();
		stopExit.current = null;
		if (closing) returnFocus(panel, triggerRef.current ?? anchor);

		if (isOpen) {
			setExiting(false);
			const stopEnter = enterPanel(panel, anchor, where);
			if (openedByKeyboard.current) panel.querySelector<HTMLElement>(POPOVER_ITEM)?.focus();
			return stopEnter;
		}
		if (!closing || prefersReducedMotion()) {
			setExiting(false);
			restPanel(panel, anchor);
			return undefined;
		}

		setExiting(true);
		stopExit.current = exitPanel(panel, anchor, () => {
			stopExit.current = null;
			setExiting(false);
			restPanel(panel, anchor);
		});
		return () => {
			stopExit.current?.();
			stopExit.current = null;
		};
	}, [isOpen]);
}

function returnFocus(panel: HTMLElement, trigger: HTMLElement): void {
	if (!panel.contains(document.activeElement)) return;
	const target = trigger.matches(FOCUSABLE) ? trigger : trigger.querySelector(FOCUSABLE);
	if (isFocusable(target)) target.focus();
}
