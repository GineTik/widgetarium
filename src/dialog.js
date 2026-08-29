import { h, cloneElement, createContext, toChildArray } from "preact";
import { useContext, useEffect, useRef, useState } from "preact/hooks";
import { mountInto } from "./portal.js";
import { cx, Icon, IconButton } from "./kit.js";

// CONTEXT: preact's render() starts a new tree, so no provider outside the portal reaches inside
const DialogState = createContext(null);

// CONTEXT: shadcn's asChild, same shape as render() in kit.js, which is module-private there
function part(tag, baseClass, name) {
	function Part({ asChild, children, class: cls, className, ...rest }) {
		const resolved = cx(baseClass, cls, className);
		if (!asChild) return h(tag, { ...rest, class: resolved }, children);
		const only = toChildArray(children)[0];
		if (!only || typeof only !== "object") return h(tag, { ...rest, class: resolved }, children);
		return cloneElement(only, { ...rest, class: cx(resolved, only.props.class, only.props.className) });
	}
	Part.displayName = name;
	return Part;
}

function Portal({ children, onEscape }) {
	const portalRef = useRef(null);

	useEffect(() => {
		portalRef.current = mountInto(document.body, "wg-root wg-portal", onEscape);
		return () => portalRef.current?.dispose();
	}, []);

	useEffect(() => {
		portalRef.current?.draw(children);
	});

	return null;
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

export function DialogOverlay({ class: cls, className, onClose, children }) {
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
				class: cx("wg-dialog-overlay", cls, className),
				tabIndex: -1,
				onClick: (event) => event.target === event.currentTarget && onClose?.(),
			},
			children,
		),
	);
}

export function DialogContent({ class: cls, className, width, children }) {
	return h(
		"div",
		{
			class: cx("wg-dialog", cls, className),
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
export function DialogClose({ class: cls, className, onClose, label = "Close", ...rest }) {
	const state = useContext(DialogState);
	return h(
		IconButton,
		{
			size: "s",
			...rest,
			class: cx("wg-dialog-close", cls, className),
			label,
			title: label,
			onClick: onClose ?? state?.close,
		},
		h(Icon, { name: "close" }),
	);
}

export function Dialog({ open, onOpenChange, onClose, trigger, children, class: cls, className }) {
	const [selfOpen, setSelfOpen] = useState(false);
	const controlled = open !== undefined;
	const isOpen = controlled ? open : selfOpen;

	const setOpen = (next) => {
		if (!controlled) setSelfOpen(next);
		onOpenChange?.(next);
		if (!next) onClose?.();
	};

	const close = () => setOpen(false);
	const body = isOpen
		? h(DialogOverlay, { class: cx(cls, className), onClose: close }, h(DialogState.Provider, { value: { close } }, children))
		: null;

	if (!trigger) return body;

	return h("span", { class: "wg-dialog-trigger" }, [h("span", { onClick: () => setOpen(true) }, trigger), body]);
}
