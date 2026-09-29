import { useLayoutEffect, useRef } from "react";
import { POPOVER_ITEM } from "../components/popover-context";
import { enterPanel, exitPanel, prefersReducedMotion, restPanel } from "../utils/popover-motion";

export function usePanelMotion({
	isOpen,
	where,
	anchorRef,
	panelRef,
	triggerRef,
	openedByKeyboard,
	wasOpen,
	setExiting,
}) {
	const stopExit = useRef(null);

	useLayoutEffect(() => {
		const panel = panelRef.current;
		const anchor = anchorRef.current;
		if (!panel || !anchor) return;
		const closing = wasOpen.current && !isOpen;
		wasOpen.current = isOpen;
		stopExit.current?.();
		stopExit.current = null;
		if (closing) returnFocus(panel, triggerRef.current ?? anchor);

		if (isOpen) {
			setExiting(false);
			const stopEnter = enterPanel(panel, anchor, where);
			if (openedByKeyboard.current) panel.querySelector(POPOVER_ITEM)?.focus();
			return stopEnter;
		}
		if (!closing || prefersReducedMotion()) {
			setExiting(false);
			restPanel(panel, anchor);
			return;
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

function returnFocus(panel, trigger) {
	if (!panel.contains(document.activeElement)) return;
	const target = trigger.matches?.("button, a, input, [tabindex]")
		? trigger
		: trigger.querySelector?.("button, a, input, [tabindex]");
	target?.focus();
}
