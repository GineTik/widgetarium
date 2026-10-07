import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { nearestSnap, snapsIn, steppedSnap } from "../utils/carousel";
import type {
	CarouselApi,
	CarouselEvent,
	CarouselListener,
	CarouselOptions,
	CarouselOrientation,
} from "../utils/carousel";

export interface CarouselTrackAsk {
	readonly orientation: CarouselOrientation;
	readonly opts: CarouselOptions;
	readonly setApi: ((api: CarouselApi) => void) | undefined;
}

export interface CarouselView {
	readonly selected: number;
	readonly count: number;
}

export interface CarouselTrack {
	readonly viewportRef: RefObject<HTMLDivElement | null>;
	readonly api: CarouselApi;
	readonly view: CarouselView;
}

interface TrackHeld {
	readonly viewportRef: RefObject<HTMLDivElement | null>;
	readonly listeners: Map<CarouselEvent, Set<CarouselListener>>;
	readonly latest: RefObject<CarouselTrackAsk>;
}

export function useCarouselTrack(ask: CarouselTrackAsk): CarouselTrack {
	const viewportRef = useRef<HTMLDivElement | null>(null);
	const [view, setView] = useState<CarouselView>({ selected: 0, count: 0 });
	const latest = useRef(ask);
	latest.current = ask;
	const listeners = useRef(new Map<CarouselEvent, Set<CarouselListener>>());
	const api = useMemo(() => apiOf({ viewportRef, listeners: listeners.current, latest }), []);
	useLayoutEffect(
		() => watchTrack(viewportRef.current, { api, listeners: listeners.current, setView }),
		[ask.orientation],
	);
	useEffect(() => {
		ask.setApi?.(api);
	}, [api, ask.setApi]);
	useEffect(() => emit(listeners.current, api, "select"), [view.selected]);
	return { viewportRef, api, view };
}

function apiOf({ viewportRef, listeners, latest }: TrackHeld): CarouselApi {
	const snaps = (): number[] => (viewportRef.current ? snapsIn(viewportRef.current, latest.current.orientation) : []);
	const selected = (): number => nearestSnap(snaps(), scrolledOf(viewportRef.current, latest.current.orientation));
	const isLooping = (): boolean => Boolean(latest.current.opts.loop);
	const go = (index: number): void => slideTo(viewportRef.current, latest.current.orientation, snaps()[index]);
	const api: CarouselApi = {
		scrollTo: go,
		scrollPrev: () => go(steppedSnap(selected(), -1, snaps().length, isLooping())),
		scrollNext: () => go(steppedSnap(selected(), 1, snaps().length, isLooping())),
		canScrollPrev: () => snaps().length > 1 && (isLooping() || selected() > 0),
		canScrollNext: () => snaps().length > 1 && (isLooping() || selected() < snaps().length - 1),
		selectedScrollSnap: selected,
		scrollSnapList: snaps,
		rootNode: () => viewportRef.current,
		on: (event, listener) => {
			listeners.set(event, new Set([...(listeners.get(event) ?? []), listener]));
			return api;
		},
		off: (event, listener) => {
			listeners.get(event)?.delete(listener);
			return api;
		},
	};
	return api;
}

interface TrackWatch {
	readonly api: CarouselApi;
	readonly listeners: ReadonlyMap<CarouselEvent, ReadonlySet<CarouselListener>>;
	readonly setView: (view: CarouselView) => void;
}

function watchTrack(viewport: HTMLElement | null, { api, listeners, setView }: TrackWatch): (() => void) | undefined {
	if (!viewport) return undefined;
	const measure = (): void => setView({ selected: api.selectedScrollSnap(), count: api.scrollSnapList().length });
	const scrolled = (): void => {
		measure();
		emit(listeners, api, "scroll");
	};
	const resized = (): void => {
		measure();
		emit(listeners, api, "reInit");
	};
	measure();
	viewport.addEventListener("scroll", scrolled, { passive: true });
	const watcher = typeof ResizeObserver === "function" ? new ResizeObserver(resized) : null;
	watcher?.observe(viewport);
	if (viewport.firstElementChild) watcher?.observe(viewport.firstElementChild);
	return () => {
		viewport.removeEventListener("scroll", scrolled);
		watcher?.disconnect();
	};
}

function emit(
	listeners: ReadonlyMap<CarouselEvent, ReadonlySet<CarouselListener>>,
	api: CarouselApi,
	event: CarouselEvent,
): void {
	for (const listener of listeners.get(event) ?? []) listener(api, event);
}

function scrolledOf(viewport: HTMLElement | null, orientation: CarouselOrientation): number {
	if (!viewport) return 0;
	return orientation === "vertical" ? viewport.scrollTop : viewport.scrollLeft;
}

function slideTo(viewport: HTMLElement | null, orientation: CarouselOrientation, to: number | undefined): void {
	if (!viewport || to === undefined) return;
	const side = orientation === "vertical" ? "top" : "left";
	if (typeof viewport.scrollTo !== "function") {
		viewport[side === "top" ? "scrollTop" : "scrollLeft"] = to;
		return;
	}
	viewport.scrollTo({ [side]: to, behavior: prefersStill() ? "auto" : "smooth" });
}

function prefersStill(): boolean {
	return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}
