import { useEffect, useState } from "react";

const TICK_MS = 30000;

export function useNow() {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const beat = setInterval(() => setNow(Date.now()), TICK_MS);
		return () => clearInterval(beat);
	}, []);
	return now;
}
