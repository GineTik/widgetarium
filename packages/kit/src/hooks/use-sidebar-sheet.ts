import { useRef } from "react";
import type { RefObject } from "react";
import { useFoldsOnEscape } from "./use-folds-on-escape";
import { useOpenState } from "./use-open-state";
import type { OpenAsk } from "./use-open-state";
import { useSheetDrag } from "./use-sheet-drag";
import type { SheetDrag } from "./use-sheet-drag";

export interface SheetHeight {
	readonly peekPx?: number;
	readonly maxPx?: number;
	readonly onHeight?: ((height: number) => void) | undefined;
}

export interface SidebarSheetAsk extends OpenAsk {
	readonly height?: SheetHeight | undefined;
}

export interface SidebarSheetState {
	readonly isOpen: boolean;
	readonly drag: SheetDrag;
	readonly sheetRef: RefObject<HTMLElement | null>;
	readonly gripRef: RefObject<HTMLButtonElement | null>;
}

const PEEK_PX = 220;

const SHEET_MAX_PX = 640;

export function useSidebarSheet({ height = {}, ...openAsk }: SidebarSheetAsk): SidebarSheetState {
	const [isOpen, setOpen] = useOpenState(openAsk);
	const sheetRef = useRef<HTMLElement>(null);
	const gripRef = useRef<HTMLButtonElement>(null);
	const { peekPx = PEEK_PX, maxPx = SHEET_MAX_PX, onHeight } = height;
	const drag = useSheetDrag({ isOpen, setOpen, peekPx, maxPx, onHeight });
	useFoldsOnEscape({ isOpen, setOpen, sheetRef, gripRef });
	return { isOpen, drag, sheetRef, gripRef };
}
