import { useEffect, useState } from "react";
import { TICK_MS } from "./overall";

export function useNow(isTicking: boolean): number {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		if (!isTicking) return undefined;
		const timer = setInterval(() => setNow(Date.now()), TICK_MS);
		return () => clearInterval(timer);
	}, [isTicking]);
	return now;
}
