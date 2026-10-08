import { useId, useRef } from "react";
import type { RefObject } from "react";

export interface MenuRefs {
	readonly contentId: string;
	readonly triggerRef: RefObject<HTMLElement | null>;
	readonly panelRef: RefObject<HTMLDivElement | null>;
}

export function useMenuRefs(): MenuRefs {
	return { contentId: useId(), triggerRef: useRef<HTMLElement>(null), panelRef: useRef<HTMLDivElement>(null) };
}
