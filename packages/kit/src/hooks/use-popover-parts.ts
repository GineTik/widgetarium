import { useId, useRef } from "react";
import type { RefObject } from "react";

export interface PopoverParts {
	readonly id: string;
	readonly anchorRef: RefObject<HTMLSpanElement | null>;
	readonly pointRef: RefObject<HTMLElement | null>;
	readonly panelRef: RefObject<HTMLDivElement | null>;
	readonly triggerRef: RefObject<HTMLElement | null>;
	readonly openedByKeyboard: RefObject<boolean>;
}

export function usePopoverParts(): PopoverParts {
	return {
		id: useId(),
		anchorRef: useRef<HTMLSpanElement>(null),
		pointRef: useRef<HTMLElement>(null),
		panelRef: useRef<HTMLDivElement>(null),
		triggerRef: useRef<HTMLElement>(null),
		openedByKeyboard: useRef(false),
	};
}
