import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import { watchSizes } from "../utils/resize-watch";

export interface ThumbProps {
	readonly className: string;
	readonly style: CSSProperties;
}

export interface SegmentedThumb {
	readonly listRef: RefObject<HTMLDivElement | null>;
	readonly thumbProps: ThumbProps;
}

interface ThumbSpot {
	readonly left: number;
	readonly width: number;
}

const NOT_LAID_OUT_YET = 0;
const THUMB = "wg-kit-seg-thumb";
const ARRIVING_THUMB = "wg-kit-seg-thumb is-arriving";

export function useSegmentedThumb(value: unknown, items?: readonly unknown[] | number): SegmentedThumb {
	const listRef = useRef<HTMLDivElement>(null);
	const [thumb, setThumb] = useState<ThumbSpot | null>(null);
	const [hasArrived, setHasArrived] = useState(false);
	// TRADE-OFF: keyed by count, not the list — an inline list re-ran this every render and froze the app
	const count = Array.isArray(items) ? items.length : items;

	useLayoutEffect(() => {
		const list = listRef.current;
		if (!list) return undefined;
		const measure = (): void => {
			const spot = thumbSpotIn(list);
			if (!spot) return;
			setThumb((was) => (was && was.left === spot.left && was.width === spot.width ? was : spot));
		};
		measure();
		return watchSizes([list, ...list.querySelectorAll('[role="tab"]')], measure);
	}, [value, count]);

	useLayoutEffect(() => {
		if (thumb === null || hasArrived) return undefined;
		const frame = requestAnimationFrame(() => setHasArrived(true));
		return () => cancelAnimationFrame(frame);
	}, [thumb, hasArrived]);

	return {
		listRef,
		thumbProps: {
			className: hasArrived ? THUMB : ARRIVING_THUMB,
			style: thumb ? { transform: `translateX(${thumb.left}px)`, width: `${thumb.width}px` } : { opacity: 0 },
		},
	};
}

function thumbSpotIn(list: HTMLElement): ThumbSpot | null {
	const active = list.querySelector('[aria-selected="true"]');
	if (!active) return null;
	// TRADE-OFF: rects, not offsetLeft — offsetLeft counts from the nearest positioned ancestor
	const activeRect = active.getBoundingClientRect();
	if (activeRect.width === NOT_LAID_OUT_YET) return null;
	const listRect = list.getBoundingClientRect();
	const scale = list.offsetWidth === NOT_LAID_OUT_YET ? 1 : listRect.width / list.offsetWidth;
	const paddingBoxLeftPx = parseFloat(getComputedStyle(list).borderLeftWidth) || 0;
	return {
		left: (activeRect.left - listRect.left) / scale - paddingBoxLeftPx + list.scrollLeft,
		width: activeRect.width / scale,
	};
}
