import { useLayoutEffect, useState, type RefObject } from "react";

export function useMeasuredHeight(content: RefObject<HTMLDivElement | null>) {
	const [fullPx, setFullPx] = useState(0);

	useLayoutEffect(() => {
		const measured = content.current;
		if (!measured) return undefined;
		const observer = new ResizeObserver(() => setFullPx(measured.offsetHeight));
		observer.observe(measured);
		setFullPx(measured.offsetHeight);
		return () => observer.disconnect();
	}, []);

	return fullPx;
}
