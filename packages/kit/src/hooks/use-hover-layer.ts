import { useId, useRef } from "react";
import type { RefObject } from "react";
import { useControllableState } from "./use-controllable-state";
import { useDelayed } from "./use-delayed";

export interface HoverLayerAsk {
	readonly open?: boolean | undefined;
	readonly defaultOpen?: boolean | undefined;
	readonly onOpenChange?: ((open: boolean) => void) | undefined;
	readonly openDelay: () => number;
	readonly closeDelay: number;
}

export interface HoverLayer {
	readonly isOpen: boolean;
	readonly setOpen: (open: boolean) => void;
	readonly triggerRef: RefObject<HTMLElement | null>;
	readonly contentId: string;
	readonly openSoon: () => void;
	readonly closeSoon: () => void;
	readonly settle: (open: boolean) => void;
}

export function useHoverLayer({ open, defaultOpen, onOpenChange, openDelay, closeDelay }: HoverLayerAsk): HoverLayer {
	const [isOpen, setOpen] = useControllableState({
		prop: open,
		defaultProp: defaultOpen ?? false,
		onChange: onOpenChange,
	});
	const delayed = useDelayed();
	const triggerRef = useRef<HTMLElement>(null);
	const contentId = useId();
	return {
		isOpen,
		setOpen,
		triggerRef,
		contentId,
		openSoon: () => delayed.start(() => setOpen(true), openDelay()),
		closeSoon: () => delayed.start(() => setOpen(false), closeDelay),
		settle: (next) => {
			delayed.stop();
			setOpen(next);
		},
	};
}
