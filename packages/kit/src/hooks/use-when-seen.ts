import { useEffect, useRef } from "react";

const LOAD_AHEAD = "400px 0px";

export function useWhenSeen(onSeen: () => void) {
	const mark = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const node = mark.current;
		if (!node) return undefined;
		const watcher = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) onSeen();
			},
			{ rootMargin: LOAD_AHEAD },
		);
		watcher.observe(node);
		return () => watcher.disconnect();
	}, [onSeen]);
	return mark;
}
