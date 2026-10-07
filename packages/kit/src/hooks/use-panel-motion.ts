import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import type { Placement } from "../constants/popover";
import { POPOVER_ITEM } from "../components/popover-context";
import { isFocusable } from "../utils/dom-nodes";
import { endFold, enterPanel, exitPanel, prefersReducedMotion, restPanel } from "../utils/popover-motion";
import type { StopMotion } from "../utils/popover-motion";

export interface PanelMotionAsk {
	readonly isOpen: boolean;
	readonly where: Placement;
	readonly anchorRef: RefObject<HTMLElement | null>;
	readonly pointRef: RefObject<HTMLElement | null>;
	readonly panelRef: RefObject<HTMLElement | null>;
	readonly triggerRef: RefObject<HTMLElement | null>;
	readonly openedByKeyboard: RefObject<boolean>;
	readonly wasOpen: RefObject<boolean>;
	readonly setExiting: (isExiting: boolean) => void;
	readonly onExited?: (() => void) | undefined;
}

const FOCUSABLE = "button, a, input, [tabindex]";

export function usePanelMotion(ask: PanelMotionAsk): void {
	const { isOpen, where, anchorRef, pointRef, panelRef, triggerRef, openedByKeyboard, wasOpen, setExiting } = ask;
	const stopExit = useRef<StopMotion | null>(null);
	const onExited = useRef(ask.onExited);
	onExited.current = ask.onExited;

	useLayoutEffect(() => {
		const panel = panelRef.current;
		const anchor = pointRef.current ?? (where.solve ? triggerRef.current : null) ?? anchorRef.current;
		if (!panel || !anchor) return undefined;
		const closing = wasOpen.current && !isOpen;
		wasOpen.current = isOpen;
		stopExit.current?.();
		stopExit.current = null;
		if (closing) returnFocus(panel, triggerRef.current ?? anchor);

		if (isOpen) {
			setExiting(false);
			if (anchorRef.current && anchorRef.current !== anchor) anchorRef.current.style.visibility = "";
			const stopEnter = enterPanel(panel, anchor, where);
			if (openedByKeyboard.current) panel.querySelector<HTMLElement>(POPOVER_ITEM)?.focus();
			return stopEnter;
		}
		if (!closing) {
			setExiting(false);
			restPanel(panel, anchor);
			return undefined;
		}
		if (prefersReducedMotion()) {
			setExiting(false);
			endFold(panel, anchor);
			onExited.current?.();
			return undefined;
		}

		setExiting(true);
		stopExit.current = exitPanel(panel, anchor, () => {
			stopExit.current = null;
			setExiting(false);
			endFold(panel, anchor);
			onExited.current?.();
		});
		return () => {
			stopExit.current?.();
			stopExit.current = null;
		};
	}, [isOpen, where.key]);
}

function returnFocus(panel: HTMLElement, trigger: HTMLElement): void {
	if (!panel.contains(document.activeElement)) return;
	const target = trigger.matches(FOCUSABLE) ? trigger : trigger.querySelector(FOCUSABLE);
	if (isFocusable(target)) target.focus();
}
