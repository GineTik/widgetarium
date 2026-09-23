import type { LooseProps } from "../types";
import { createElement as h, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { PLACEMENTS, PRESS_EVENTS } from "../constants/popover";
import { cx } from "../utils/cx";
import { enterPanel, exitPanel, prefersReducedMotion, restPanel } from "../utils/popover-motion";

export function Popover({
	trigger,
	children,
	isOpen: isOpenAsked,
	onOpenChange,
	className: cls,
	placement = "over",
}: LooseProps) {
	const where = PLACEMENTS[placement] ?? PLACEMENTS.over;
	const [isOpenHeld, setOpenHeld] = useState(false);
	const isOpen = isOpenAsked ?? isOpenHeld;
	const triggerRef = useRef(null);
	const panelRef = useRef(null);
	const id = useId();

	// CONTEXT: one press fires pointerdown AND mousedown — report the transition once
	const reported = useRef(isOpen);
	reported.current = isOpen;

	const setOpen = useCallback(
		(next) => {
			if (reported.current === next) return;
			reported.current = next;
			if (isOpenAsked === undefined) setOpenHeld(next);
			onOpenChange?.(next);
		},
		[isOpenAsked, onOpenChange],
	);

	// TRADE-OFF: a ref, so the listener below depends on `open` alone — a caller handing over
	// a fresh onOpenChange each render would otherwise re-hang it on every render
	const latestSetOpen = useRef(setOpen);
	latestSetOpen.current = setOpen;

	// CONTEXT: preact drops `is-open` the instant `open` turns false, so the exit needs its own state
	const [isExiting, setExiting] = useState(false);
	const wasOpen = useRef(false);
	const stopExit = useRef(null);

	// CONTEXT: a caller writes `{open ? <panel/> : null}`, so the children go before the fold is measured
	const held = useRef(null);
	if (isOpen) held.current = children;
	// CONTEXT: wasOpen is still true on the closing render, the one render `exiting` cannot cover
	const shown = isOpen || isExiting || wasOpen.current;

	useLayoutEffect(() => {
		const panel = panelRef.current;
		const anchor = triggerRef.current;
		if (!panel || !anchor) return;
		const closing = wasOpen.current && !isOpen;
		wasOpen.current = isOpen;
		stopExit.current?.();
		stopExit.current = null;

		if (isOpen) {
			setExiting(false);
			return enterPanel(panel, anchor, where);
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

	// CONTEXT: src/editor-shield.js stops pointerdown/mousedown in the BUBBLE phase on every
	// widget root, so a press on the board never reached a bubble listener here — capture does
	useEffect(() => {
		if (!isOpen) return;
		const closeOnOutsidePress = (event) => {
			if (panelRef.current?.contains(event.target)) return;
			if (triggerRef.current?.contains(event.target)) return;
			latestSetOpen.current(false);
		};
		const closeOnEscape = (event) => {
			if (event.key === "Escape") latestSetOpen.current(false);
		};
		// CONTEXT: pointerdown carries touch and pen; mousedown covers a host without it
		for (const name of PRESS_EVENTS) document.addEventListener(name, closeOnOutsidePress, true);
		document.addEventListener("keydown", closeOnEscape, true);
		return () => {
			for (const name of PRESS_EVENTS) document.removeEventListener(name, closeOnOutsidePress, true);
			document.removeEventListener("keydown", closeOnEscape, true);
		};
	}, [isOpen]);

	// TRADE-OFF: measure the WRAPPER, not the trigger — a ref does not reach a DOM node
	// through a function component, so any component trigger would have gone unmeasured
	return (
		<span
			className="wg-kit-anchor"
			ref={triggerRef}
			aria-expanded={String(isOpen)}
			aria-controls={id}
			onClick={(event) => {
				if (panelRef.current?.contains(event.target)) return;
				setOpen(!isOpen);
			}}
		>
			{trigger}
			<div
				id={id}
				ref={panelRef}
				className={cx(
					"wg-kit-pop",
					where.panelClass,
					(isOpen || isExiting) && "is-open",
					isExiting && "is-exiting",
					cls,
				)}
				role="dialog"
				data-wg-overlay={shown ? "" : undefined}
			>
				<div className="wg-kit-pop-inner">{shown ? held.current : null}</div>
			</div>
		</span>
	);
}
