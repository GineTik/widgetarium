import { useEffect } from "react";

export function useHoldsScroll(open) {
	useEffect(() => {
		if (!open) return;
		const body = globalThis.document?.body;
		if (!body) return;
		const held = body.style.overflow;
		body.style.overflow = "hidden";
		return () => {
			body.style.overflow = held;
		};
	}, [open]);
}
