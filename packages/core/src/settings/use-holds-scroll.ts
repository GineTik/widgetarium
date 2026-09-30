import { useEffect } from "react";

export function useHoldsScroll(open: boolean): void {
	useEffect(() => {
		if (!open) return undefined;
		const body = globalThis.document?.body;
		if (!body) return undefined;
		const held = body.style.overflow;
		body.style.overflow = "hidden";
		return () => {
			body.style.overflow = held;
		};
	}, [open]);
}
