import { useLayoutEffect, useState } from "react";

export function useShownPx(collapsedPx: number) {
	const [shownPx, setShownPx] = useState(collapsedPx);
	useLayoutEffect(() => setShownPx(collapsedPx), [collapsedPx]);
	return [shownPx, setShownPx] as const;
}
