import { useLayoutEffect, useState } from "react";
import { dayKey, moveByKey } from "../utils/calendar";

export function useDayFocusByKeys({ gridRef, shown, setShown, inMonth }) {
	const [focusWanted, setFocusWanted] = useState(null);

	useLayoutEffect(() => {
		if (!focusWanted) return;
		gridRef.current?.querySelector(`[data-date="${dayKey(focusWanted)}"]`)?.focus();
		setFocusWanted(null);
	}, [focusWanted, shown]);

	return (event) => {
		const from = event.target.closest?.("[data-date]");
		const next = from ? moveByKey(new Date(from.dataset.day), event.key) : null;
		if (!next) return;
		event.preventDefault();
		if (!inMonth(next)) setShown(new Date(next.getFullYear(), next.getMonth(), 1));
		setFocusWanted(next);
	};
}
