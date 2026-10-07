import { useEffect, useRef } from "react";

export interface Delayed {
	readonly start: (run: () => void, ms: number) => void;
	readonly stop: () => void;
}

export function useDelayed(): Delayed {
	const held = useRef<ReturnType<typeof setTimeout> | null>(null);
	const stop = (): void => {
		if (held.current !== null) clearTimeout(held.current);
		held.current = null;
	};
	useEffect(() => stop, []);
	return {
		start: (run, ms) => {
			stop();
			if (ms <= 0) {
				run();
				return;
			}
			held.current = setTimeout(run, ms);
		},
		stop,
	};
}
