import { useEffect, useState } from "react";

export function useNow(tickMs: number, isTicking = true): number {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		if (!isTicking) return undefined;
		const timer = setInterval(() => setNow(Date.now()), tickMs);
		return () => clearInterval(timer);
	}, [tickMs, isTicking]);
	return now;
}
