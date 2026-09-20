import { createElement as h, cloneElement, createContext, Children } from "react";
import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { mountInto } from "./portal.js";
import { Button, cx, Icon, IconButton } from "./kit.js";

// CONTEXT: preact's render() starts a new tree, so no provider outside the portal reaches inside
const DialogState = createContext(null);

// TRADE-OFF: durations here, curves in styles.css — JS schedules the beats, so it owns the numbers
const GROW_MS = 220;
const SETTLE_MS = 160;
const EXIT_MS = 160;
// CONTEXT: jsdom and a backgrounded tab end no transition, so the beat that disposes needs a floor
const EXIT_GUARD_MS = 240;
// TRADE-OFF: later than a slow frame, so a painting browser still animates; a starved one waited 1300ms
const GROW_WAIT_MS = 50;
// TRADE-OFF: 0.9, not 0, because the panel is a place that was already there, not a thing being born
const START_SCALE = 0.9;
// CONTEXT: the overshoot the design asks for — 5% past its size, then given back
const PEAK_SCALE = 1.05;
// TRADE-OFF: a share of the distance to the press, capped — a press across the screen would else throw it
const PULL_RATIO = 0.18;
const PULL_MAX_PX = 48;
// CONTEXT: older than this and the press is somebody else's — a command palette opened this
const PRESS_FRESH_MS = 1200;

let lastPress = null;
let watchingPresses = false;

// CONTEXT: a keyboard-fired click reports detail 0 and coordinates 0, which is the screen corner
function rememberPress(event) {
	if (event.type === "click" && !event.detail) return;
	lastPress = { x: event.clientX, y: event.clientY, at: Date.now() };
}

// TRADE-OFF: the document, not a trigger — a dialog opened from state has no element to ask
function watchPresses() {
	if (watchingPresses) return;
	watchingPresses = true;
	for (const name of ["pointerdown", "mousedown", "click"]) document.addEventListener(name, rememberPress, true);
}

function prefersReducedMotion() {
	return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

function pressPoint() {
	if (!lastPress || Date.now() - lastPress.at > PRESS_FRESH_MS) return null;
	return { x: lastPress.x, y: lastPress.y };
}

// CONTEXT: the panel grows about the point that was pressed, and starts pulled toward it
function seatAt(box, press) {
	if (!press) return { origin: "50% 50%", left: 0, top: 0 };
	const pull = (from, to) => Math.max(Math.min((from - to) * PULL_RATIO, PULL_MAX_PX), -PULL_MAX_PX);
	return {
		origin: `${Math.round(press.x - box.left)}px ${Math.round(press.y - box.top)}px`,
		left: Math.round(pull(press.x, box.left + box.width / 2)),
		top: Math.round(pull(press.y, box.top + box.height / 2)),
	};
}

const dialogPress = new WeakMap();
const enterBeats = new WeakMap();

function panelOf(node) {
	const overlay = node?.querySelector?.(".wg-dialog-overlay");
	const panel = overlay?.querySelector(".wg-dialog");
	return panel ? { overlay, panel } : null;
}

function sitAtPress(panel, seat) {
	panel.style.transition = "none";
	panel.style.transformOrigin = seat.origin;
	panel.style.translate = `${seat.left}px ${seat.top}px`;
	panel.style.scale = String(START_SCALE);
	panel.style.opacity = "0";
}

// CONTEXT: it grows PAST its size while it arrives, the spread weighted to the end of the fall
function growDialog(panel) {
	panel.style.transition = `translate ${GROW_MS}ms var(--wg-ease), scale ${GROW_MS}ms var(--wg-spread), opacity ${GROW_MS}ms var(--wg-ease)`;
	panel.style.translate = "0px 0px";
	panel.style.scale = String(PEAK_SCALE);
	panel.style.opacity = "1";
}

// CONTEXT: only the overshoot is taken back — the panel is already where it belongs
function settleDialog(panel) {
	panel.style.transition = `scale ${SETTLE_MS}ms var(--wg-ease)`;
	panel.style.scale = "1";
}

function restDialog(overlay, panel) {
	panel.style.transition = "";
	panel.style.transformOrigin = "";
	panel.style.translate = "";
	panel.style.scale = "";
	panel.style.opacity = "";
	overlay.style.transition = "";
	overlay.style.backgroundColor = "";
}

function enterDialog(node) {
	const found = panelOf(node);
	if (!found || prefersReducedMotion()) return;
	const { overlay, panel } = found;
	const box = panel.getBoundingClientRect();
	// CONTEXT: nothing is laid out, so there is no origin to fall from and no size to scale
	if (!box.width || !box.height) return;

	const press = pressPoint();
	dialogPress.set(panel, press);
	overlay.style.transition = "none";
	overlay.style.backgroundColor = "transparent";
	sitAtPress(panel, seatAt(box, press));

	const beats = [];
	// TRADE-OFF: a flag, not two cancellations — whichever of the frame and the wait arrives first
	let grown = false;
	const start = () => {
		if (grown) return;
		grown = true;
		overlay.style.transition = `background-color ${GROW_MS}ms var(--wg-ease)`;
		overlay.style.backgroundColor = "var(--wg-dialog-scrim)";
		growDialog(panel);
		beats.push(
			setTimeout(() => {
				settleDialog(panel);
				beats.push(setTimeout(() => restDialog(overlay, panel), SETTLE_MS));
			}, GROW_MS),
		);
	};
	const frame = requestAnimationFrame(start);
	const waited = setTimeout(start, GROW_WAIT_MS);
	enterBeats.set(panel, () => {
		cancelAnimationFrame(frame);
		clearTimeout(waited);
		for (const beat of beats) clearTimeout(beat);
	});
}

function exitDialog(node, done) {
	const found = panelOf(node);
	if (!found || prefersReducedMotion()) return done();
	const { overlay, panel } = found;
	enterBeats.get(panel)?.();
	// CONTEXT: the settle cleared these, so the measurement below would commit 1 -> 0 untransitioned
	panel.style.opacity = "1";
	panel.style.scale = "1";
	panel.style.translate = "0px 0px";

	const box = panel.getBoundingClientRect();
	if (!box.width || !box.height) {
		restDialog(overlay, panel);
		return done();
	}

	// CONTEXT: it goes back where it came from, and a recorded nothing is an answer, not a gap
	const seat = seatAt(box, dialogPress.has(panel) ? dialogPress.get(panel) : pressPoint());
	node.style.pointerEvents = "none";
	overlay.style.transition = `background-color ${EXIT_MS}ms var(--wg-ease)`;
	overlay.style.backgroundColor = "transparent";
	panel.style.transition = `translate ${EXIT_MS}ms var(--wg-ease), scale ${EXIT_MS}ms var(--wg-ease), opacity ${EXIT_MS}ms var(--wg-ease)`;
	panel.style.transformOrigin = seat.origin;
	panel.style.translate = `${seat.left}px ${seat.top}px`;
	panel.style.scale = String(START_SCALE);
	panel.style.opacity = "0";

	const finish = (event) => {
		if (event && (event.target !== panel || event.propertyName !== "scale")) return;
		stop();
		done();
	};
	const guard = setTimeout(() => finish(), EXIT_GUARD_MS);
	const stop = () => {
		clearTimeout(guard);
		panel.removeEventListener("transitionend", finish);
	};
	panel.addEventListener("transitionend", finish);
}

// CONTEXT: shadcn's asChild, same shape as render() in kit.js, which is module-private there
function part(tag, baseClass, name) {
	function Part({ asChild, children, className: cls, ...rest }) {
		const resolved = cx(baseClass, cls);
		if (!asChild) return h(tag, { ...rest, className: resolved }, children);
		const only = Children.toArray(children)[0];
		if (!only || typeof only !== "object") return h(tag, { ...rest, className: resolved }, children);
		return cloneElement(only, { ...rest, className: cx(resolved, only.props.className) });
	}
	Part.displayName = name;
	return Part;
}

// CONTEXT: React strips the portal on unmount, so the exit is played on a copy left in its place
function foldOut(node) {
	const found = panelOf(node);
	if (!found) return null;
	enterBeats.get(found.panel)?.();
	const ghost = node.cloneNode(true);
	const copy = panelOf(ghost);
	if (!copy) return null;
	// CONTEXT: the copy inherits the press it grew from, or it folds back toward the wrong point
	if (dialogPress.has(found.panel)) dialogPress.set(copy.panel, dialogPress.get(found.panel));
	node.replaceWith(ghost);
	return ghost;
}

// CONTEXT: the seat is measured right after the mount, so the children must land in the same commit
function Portal({ children, onEscape }) {
	const [portal] = useState(() => {
		watchPresses();
		return mountInto(document.body, "wg-root wg-portal", onEscape);
	});
	useLayoutEffect(
		() => () => {
			const ghost = foldOut(portal.node);
			portal.dispose();
			if (ghost) exitDialog(ghost, () => ghost.remove());
		},
		[],
	);

	useEffect(() => enterDialog(portal.node), []);

	return createPortal(children, portal.node);
}

// CONTEXT: the portal is mounted on <body>, so the browser has no trigger left to return to
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

export function DialogOverlay({ className: cls, onClose, children }) {
	const overlayRef = useRef(null);
	// CONTEXT: the child Portal commits first, so the ref is filled before this effect runs
	useFocusInside(overlayRef);

	return h(
		Portal,
		{ onEscape: onClose },
		h(
			"div",
			{
				ref: overlayRef,
				className: cx("wg-dialog-overlay", cls),
				tabIndex: -1,
				onClick: (event) => event.target === event.currentTarget && onClose?.(),
			},
			children,
		),
	);
}

export function DialogContent({ className: cls, width, children }) {
	return h(
		"div",
		{
			className: cx("wg-dialog", cls),
			role: "dialog",
			"aria-modal": "true",
			tabIndex: -1,
			style: width ? { maxWidth: width } : null,
		},
		children,
	);
}

export const DialogHeader = part("div", "wg-dialog-head", "DialogHeader");
export const DialogTitle = part("h2", "wg-dialog-title", "DialogTitle");
export const DialogDescription = part("p", "wg-dialog-desc", "DialogDescription");
export const DialogFooter = part("div", "wg-dialog-foot", "DialogFooter");

// TRADE-OFF: the kit's icon button, because a fill on a bare <button> loses its radius to the host
export function DialogClose({ className: cls, onClose, label = "Close", ...rest }) {
	const state = useContext(DialogState);
	return h(
		IconButton,
		{
			size: "s",
			...rest,
			className: cx("wg-dialog-close", cls),
			label,
			title: label,
			onClick: onClose ?? state?.close,
		},
		h(Icon, { name: "close" }),
	);
}

export function Dialog({ isOpen: isOpenAsked, onOpenChange, onClose, trigger, children, className: cls }) {
	const [isSelfOpen, setSelfOpen] = useState(false);
	const isControlled = isOpenAsked !== undefined;
	const isOpen = isControlled ? isOpenAsked : isSelfOpen;

	const setOpen = (next) => {
		if (!isControlled) setSelfOpen(next);
		onOpenChange?.(next);
		if (!next) onClose?.();
	};

	const close = () => setOpen(false);
	const body = isOpen
		? h(DialogOverlay, { className: cx(cls), onClose: close }, h(DialogState.Provider, { value: { close } }, children))
		: null;

	if (!trigger) return body;

	return h("span", { className: "wg-dialog-trigger" }, [h("span", { onClick: () => setOpen(true) }, trigger), body]);
}

// CONTEXT: authored whole, filled by replace — a built sentence cannot be reordered
const CANCEL = "Cancel";

// CONTEXT: one shape for every ask-before-it-is-gone — the caller owns the words and the verb
export function ConfirmDialog({
	isOpen,
	title,
	description,
	confirmLabel,
	variant = "danger",
	onConfirm,
	onOpenChange,
	className,
}) {
	return h(
		Dialog,
		{ isOpen, onOpenChange },
		h(DialogContent, { className }, [
			h(DialogClose, { key: "close" }),
			h(DialogHeader, { key: "head" }, [
				h(DialogTitle, { key: "title" }, title),
				h(DialogDescription, { key: "desc" }, description),
			]),
			h(DialogFooter, { key: "foot" }, [
				h(
					Button,
					{ key: "cancel", size: "s", className: "wg-dialog-cancel", onClick: () => onOpenChange?.(false) },
					CANCEL,
				),
				h(
					Button,
					{ key: "confirm", size: "s", variant, className: "wg-dialog-confirm", onClick: onConfirm },
					confirmLabel,
				),
			]),
		]),
	);
}
