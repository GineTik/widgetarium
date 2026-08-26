import { h } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { mountInto } from "./portal.js";

function Portal({ children, onClose }) {
	const portalRef = useRef(null);

	useEffect(() => {
		portalRef.current = mountInto(document.body, "wg-root wg-portal", onClose);
		return () => portalRef.current?.dispose();
	}, []);

	useEffect(() => {
		portalRef.current?.draw(children);
	});

	return null;
}

export function Dialog({ open, onOpenChange, onClose, title, trigger, children, width }) {
	const [selfOpen, setSelfOpen] = useState(false);
	const controlled = open !== undefined;
	const isOpen = controlled ? open : selfOpen;

	const setOpen = (next) => {
		if (!controlled) setSelfOpen(next);
		onOpenChange?.(next);
		if (!next) onClose?.();
	};

	const body = isOpen
		? h(Portal, { onClose: () => setOpen(false) },
				h(
					"div",
					{
						class: "wg-dialog-overlay",
						onClick: (event) => event.target === event.currentTarget && setOpen(false),
					},
					h("div", { class: "wg-dialog", style: width ? { maxWidth: width } : null }, [
						h("div", { class: "wg-dialog-head" }, [
							h("b", null, title ?? ""),
							h("button", { class: "wg-dialog-x", onClick: () => setOpen(false), title: "Close" }, "\u2715"),
						]),
						h("div", { class: "wg-dialog-body" }, children),
					]),
				),
		  )
		: null;

	if (!trigger) return body;

	return h("span", { class: "wg-dialog-trigger" }, [
		h("span", { onClick: () => setOpen(true) }, trigger),
		body,
	]);
}
