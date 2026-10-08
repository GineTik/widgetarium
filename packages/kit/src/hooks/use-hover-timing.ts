import { useDelayed } from "./use-delayed";

export interface HoverDelays {
	readonly openDelay: () => number;
	readonly closeDelay: () => number;
}

export interface HoverTiming {
	readonly openSoon: () => void;
	readonly closeSoon: () => void;
	readonly settle: (open: boolean) => void;
}

export function useHoverTiming(setOpen: (open: boolean) => void, { openDelay, closeDelay }: HoverDelays): HoverTiming {
	const delayed = useDelayed();
	return {
		openSoon: () => delayed.start(() => setOpen(true), openDelay()),
		closeSoon: () => delayed.start(() => setOpen(false), closeDelay()),
		settle: (next) => {
			delayed.stop();
			setOpen(next);
		},
	};
}
