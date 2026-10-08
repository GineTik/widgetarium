import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";
import { dayKey } from "../utils/calendar";

export function useFocusesWantedDay(gridRef: RefObject<HTMLElement | null>, shown: Date): (day: Date) => void {
	const [focusWanted, setFocusWanted] = useState<Date | null>(null);
	useLayoutEffect(() => {
		if (!focusWanted) return;
		gridRef.current?.querySelector<HTMLElement>(`[data-date="${dayKey(focusWanted)}"]:not([data-outside])`)?.focus();
		setFocusWanted(null);
	}, [focusWanted, shown]);
	return setFocusWanted;
}
