import { useEffect, useState } from "react";

export function useCycled<T>(items: readonly T[], everyMs: number): T | undefined {
	const [at, setAt] = useState(0);
	useEffect(() => {
		if (items.length < 2) return;
		const timer = window.setInterval(() => setAt((was) => (was + 1) % items.length), everyMs);
		return () => window.clearInterval(timer);
	}, [items, everyMs]);
	return items[at];
}
