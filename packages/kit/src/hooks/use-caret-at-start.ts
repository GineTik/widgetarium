import { useEffect, useRef } from "react";
import type { RefObject } from "react";

export function useCaretAtStart(isWanted: boolean): RefObject<HTMLTextAreaElement | null> {
	const input = useRef<HTMLTextAreaElement>(null);
	// TRADE-OFF: opt-in — an editor that always grabbed the caret would steal it from whatever opened it
	useEffect(() => {
		if (!isWanted) return;
		input.current?.focus();
		input.current?.setSelectionRange(0, 0);
	}, [isWanted]);
	return input;
}
