import type { RefObject } from "react";
import { returnFocusTo } from "../utils/focus";
import { useDismissLayer } from "./use-dismiss-layer";

export interface FoldOnEscape {
	readonly isOpen: boolean;
	readonly setOpen: (open: boolean) => void;
	readonly sheetRef: RefObject<HTMLElement | null>;
	readonly gripRef: RefObject<HTMLElement | null>;
}

export function useFoldsOnEscape({ isOpen, setOpen, sheetRef, gripRef }: FoldOnEscape): void {
	useDismissLayer({
		isOpen,
		holds: (node) => Boolean(sheetRef.current?.contains(node)),
		onEscape: () => {
			setOpen(false);
			returnFocusTo(gripRef.current);
		},
		escapeReach: "within",
	});
}
