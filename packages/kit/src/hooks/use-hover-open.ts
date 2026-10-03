import { useEffect, useRef } from "react";
import type { PointerEvent } from "react";

export const HOVER_OPEN_MS = 400;

export interface HoverOpen {
	readonly onPointerEnter: (event: PointerEvent) => void;
	readonly onPointerLeave: () => void;
	readonly forgetHover: () => void;
}

interface Timer {
	readonly start: (run: () => void, ms: number) => void;
	readonly stop: () => void;
}

export function useHoverOpen(setOpen: (open: boolean) => void): HoverOpen {
	const timer = useTimer();
	const opener = useRef<HoverOpener | null>(null);
	opener.current ??= new HoverOpener(timer, setOpen);
	return opener.current;
}

class HoverOpener implements HoverOpen {
	private isOpenedByHover = false;

	constructor(
		private readonly timer: Timer,
		private readonly setOpen: (open: boolean) => void,
	) {}

	readonly onPointerEnter = (event: PointerEvent): void => {
		if (event.pointerType === "mouse") this.timer.start(this.openByHover, HOVER_OPEN_MS);
	};

	readonly onPointerLeave = (): void => {
		const wasOpenedByHover = this.isOpenedByHover;
		this.forgetHover();
		if (wasOpenedByHover) this.setOpen(false);
	};

	readonly forgetHover = (): void => {
		this.timer.stop();
		this.isOpenedByHover = false;
	};

	private readonly openByHover = (): void => {
		this.isOpenedByHover = true;
		this.setOpen(true);
	};
}

function useTimer(): Timer {
	const held = useRef<ReturnType<typeof setTimeout> | null>(null);
	const stop = (): void => {
		if (held.current !== null) clearTimeout(held.current);
		held.current = null;
	};
	useEffect(() => stop, []);
	return {
		start: (run, ms) => {
			stop();
			held.current = setTimeout(run, ms);
		},
		stop,
	};
}
