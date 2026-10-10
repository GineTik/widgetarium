import { useEffect, useMemo, useState } from "react";
import type { RefObject } from "react";
import { fitLook } from "./pan-zoom.js";
import type { Look } from "./pan-zoom.js";
import type { Size } from "./frame-size.js";

export function useLayerFit(layerRef: RefObject<HTMLElement | null>, view: Size | null): Look | null {
	const [layer, setLayer] = useState<Size | null>(null);
	useWatchesSize(layerRef, setLayer, drawnSizeOf);
	return useMemo(() => (layer && view && hasArea(view) ? fitLook(layer, view) : null), [layer, view]);
}

export function useWatchesSize(
	ref: RefObject<HTMLElement | null>,
	onSize: (size: Size) => void,
	sizeOf: (element: HTMLElement) => Size,
): void {
	useEffect(() => {
		const element = ref.current;
		if (!element) return undefined;
		const measure = (): void => {
			const size = sizeOf(element);
			if (hasArea(size)) onSize(size);
		};
		const watcher = new ResizeObserver(measure);
		watcher.observe(element);
		measure();
		return () => watcher.disconnect();
	}, [ref, onSize, sizeOf]);
}

export function innerSizeOf(element: HTMLElement): Size {
	return { width: element.clientWidth, height: element.clientHeight };
}

function drawnSizeOf(element: HTMLElement): Size {
	return { width: element.offsetWidth, height: element.offsetHeight };
}

function hasArea({ width, height }: Size): boolean {
	return width > 0 && height > 0;
}
