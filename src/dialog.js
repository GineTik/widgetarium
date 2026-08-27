import { h } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { mountInto } from "./portal.js";

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

// The backdrop. Owns the portal, Escape and click-outside — nothing else.
export function DialogOverlay({ className, onClose, children }) {
	return h(
		Portal,
		{ onEscape: onClose },
		h(
			"div",
			{
				class: `wg-dialog-overlay${className ? ` ${className}` : ""}`,
				onClick: (event) => event.target === event.currentTarget && onClose?.(),
			},
			children,
		),
	);
}

// The panel. Carries no behaviour, so it can be restyled or replaced outright.
export function DialogContent({ className, width, children }) {
	return h(
		"div",
		{ class: `wg-dialog${className ? ` ${className}` : ""}`, style: width ? { maxWidth: width } : null },
		children,
	);
}

export function DialogClose({ className, onClose, label = "✕" }) {
	return h(
		"button",
		{ class: `wg-dialog-x${className ? ` ${className}` : ""}`, onClick: onClose, title: "Close" },
		label,
	);
}

// The convenient path, assembled from the three above. Anything it does, a widget
// can do itself with the same parts — this is a default, not a wall.
export function Dialog({
	open,
	onOpenChange,
	onClose,
	title,
	trigger,
	children,
	width,
	className,
	overlayClassName,
}) {
	const [selfOpen, setSelfOpen] = useState(false);
	const controlled = open !== undefined;
	const isOpen = controlled ? open : selfOpen;

	const setOpen = (next) => {
		if (!controlled) setSelfOpen(next);
		onOpenChange?.(next);
		if (!next) onClose?.();
	};

	const body = isOpen
		? h(
				DialogOverlay,
				{ className: overlayClassName, onClose: () => setOpen(false) },
				h(DialogContent, { className, width }, [
					h("div", { class: "wg-dialog-head" }, [
						h("b", null, title ?? ""),
						h(DialogClose, { onClose: () => setOpen(false) }),
					]),
					h("div", { class: "wg-dialog-body" }, children),
				]),
		  )
		: null;

	if (!trigger) return body;

	return h("span", { class: "wg-dialog-trigger" }, [h("span", { onClick: () => setOpen(true) }, trigger), body]);
}
