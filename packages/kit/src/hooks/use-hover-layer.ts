import { useId, useRef } from "react";
import type { RefObject } from "react";
import { useHoverTiming } from "./use-hover-timing";
import type { HoverDelays, HoverTiming } from "./use-hover-timing";
import { useOpenState } from "./use-open-state";
import type { OpenAsk } from "./use-open-state";

export interface HoverLayerAsk extends OpenAsk, HoverDelays {}

export interface HoverLayer extends HoverTiming {
	readonly isOpen: boolean;
	readonly setOpen: (open: boolean) => void;
	readonly triggerRef: RefObject<HTMLElement | null>;
	readonly contentId: string;
}

export function useHoverLayer(ask: HoverLayerAsk): HoverLayer {
	const [isOpen, setOpen] = useOpenState(ask);
	const triggerRef = useRef<HTMLElement>(null);
	const contentId = useId();
	return { isOpen, setOpen, triggerRef, contentId, ...useHoverTiming(setOpen, ask) };
}
