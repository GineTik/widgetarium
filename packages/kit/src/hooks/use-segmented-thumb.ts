import { useLayoutEffect, useRef, useState } from "react";

export function useSegmentedThumb(value, items) {
	const listRef = useRef(null);
	const [thumb, setThumb] = useState(null);
	// TRADE-OFF: a list identity would re-run the effect every render — a caller that builds its
	// items inline hands over a NEW array each time, and the resulting setState/re-render loop
	// froze the whole app rather than merely flickering
	const count = Array.isArray(items) ? items.length : items;

	useLayoutEffect(() => {
		const list = listRef.current;
		if (!list) return;
		const measure = () => {
			const active = list.querySelector('[aria-selected="true"]');
			if (!active) return;
			// TRADE-OFF: rects, not offsetLeft — offsetLeft is measured from the nearest POSITIONED
			// ancestor, so a tab wrapped in a relative slot reported a left of nearly zero
			const activeRect = active.getBoundingClientRect();
			// CONTEXT: a widget is laid out after its first paint, so an early read is all zeroes
			if (!activeRect.width) return;
			const listRect = list.getBoundingClientRect();
			// CONTEXT: an absolute child is offset from the PADDING box, whose left edge is the INNER
			// BORDER edge — padding lies inside that box and must NOT be subtracted, or the thumb
			// leaves the container by exactly the padding. It scrolls with the content, hence scrollLeft.
			const borderLeftPx = parseFloat(getComputedStyle(list).borderLeftWidth) || 0;
			const left = activeRect.left - listRect.left - borderLeftPx + list.scrollLeft;
			// the same numbers must keep the same object, or every measure schedules a render
			setThumb((was) =>
				was && was.left === left && was.width === activeRect.width ? was : { left, width: activeRect.width },
			);
		};
		measure();
		if (typeof ResizeObserver !== "function") return;
		const watcher = new ResizeObserver(measure);
		watcher.observe(list);
		return () => watcher.disconnect();
	}, [value, count]);

	return {
		listRef,
		thumbProps: {
			className: "wg-kit-seg-thumb",
			style: thumb ? { transform: `translateX(${thumb.left}px)`, width: `${thumb.width}px` } : { opacity: 0 },
		},
	};
}
