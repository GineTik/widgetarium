import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { createWidthWatcher } from "../width-gate.js";

export const MIN_LAID_OUT_BOARD_PX = 120;

export function useBoardWidth(onWidth: (width: number) => void): RefObject<HTMLDivElement | null> {
	const rootRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const element = rootRef.current;
		if (!element) return;
		const watcher = createWidthWatcher({
			minimum: MIN_LAID_OUT_BOARD_PX,
			onWidth,
			schedule: (task, delay) => window.setTimeout(task, delay),
			cancel: (timer) => window.clearTimeout(timer),
		});
		const observer = new ResizeObserver(([entry]) => {
			if (entry) watcher.measured(entry.contentRect.width);
		});
		observer.observe(element);
		watcher.measured(contentWidthOf(element));
		return () => {
			observer.disconnect();
			watcher.stop();
		};
	}, []);

	return rootRef;
}

function contentWidthOf(element: HTMLElement): number {
	const style = getComputedStyle(element);
	return element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
}
