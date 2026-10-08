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
import { prefersReducedMotion } from "../utils/reduced-motion";
import { watchSizes } from "../utils/resize-watch";
import { scrollOffsetOf, scrollToOffset } from "../utils/scroll-axis";

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

type Listeners = Map<CarouselEvent, Set<CarouselListener>>;

type ReadonlyListeners = ReadonlyMap<CarouselEvent, ReadonlySet<CarouselListener>>;

interface TrackHeld {
	readonly viewportRef: RefObject<HTMLDivElement | null>;
	readonly listeners: Listeners;
	readonly latest: RefObject<CarouselTrackAsk>;
}

interface TrackApi {
	readonly api: CarouselApi;
	readonly listeners: Listeners;
}

type SnapNavigation = Omit<CarouselApi, "rootNode" | "on" | "off">;

export function useCarouselTrack(ask: CarouselTrackAsk): CarouselTrack {
	const viewportRef = useRef<HTMLDivElement | null>(null);
	const [view, setView] = useState<CarouselView>({ selected: 0, count: 0 });
	const { api, listeners } = useTrackApi(viewportRef, ask);
	useLayoutEffect(() => watchTrack(viewportRef.current, { api, listeners, setView }), [ask.orientation]);
	useEffect(() => emit(listeners, api, "select"), [view.selected]);
	return { viewportRef, api, view };
}

function useTrackApi(viewportRef: RefObject<HTMLDivElement | null>, ask: CarouselTrackAsk): TrackApi {
	const latest = useRef(ask);
	latest.current = ask;
	const listeners = useRef<Listeners>(new Map());
	const api = useMemo(() => apiOf({ viewportRef, listeners: listeners.current, latest }), []);
	useEffect(() => {
		ask.setApi?.(api);
	}, [api, ask.setApi]);
	return { api, listeners: listeners.current };
}

function apiOf(held: TrackHeld): CarouselApi {
	const api: CarouselApi = {
		...snapNavigationOf(held),
		rootNode: () => held.viewportRef.current,
		on: (event, listener) => {
			held.listeners.set(event, new Set([...(held.listeners.get(event) ?? []), listener]));
			return api;
		},
		off: (event, listener) => {
			held.listeners.get(event)?.delete(listener);
			return api;
		},
	};
	return api;
}

function snapNavigationOf({ viewportRef, latest }: TrackHeld): SnapNavigation {
	const snaps = (): number[] => (viewportRef.current ? snapsIn(viewportRef.current, latest.current.orientation) : []);
	const selected = (): number => nearestSnap(snaps(), scrolledOf(viewportRef.current, latest.current.orientation));
	const isLooping = (): boolean => Boolean(latest.current.opts.loop);
	const go = (index: number): void => slideTo(viewportRef.current, latest.current.orientation, snaps()[index]);
	return {
		scrollTo: go,
		scrollPrev: () => go(steppedSnap(selected(), -1, snaps().length, isLooping())),
		scrollNext: () => go(steppedSnap(selected(), 1, snaps().length, isLooping())),
		canScrollPrev: () => snaps().length > 1 && (isLooping() || selected() > 0),
		canScrollNext: () => snaps().length > 1 && (isLooping() || selected() < snaps().length - 1),
		selectedScrollSnap: selected,
		scrollSnapList: snaps,
	};
}

interface TrackWatch {
	readonly api: CarouselApi;
	readonly listeners: ReadonlyListeners;
	readonly setView: (view: CarouselView) => void;
}

function watchTrack(viewport: HTMLElement | null, watch: TrackWatch): (() => void) | undefined {
	if (!viewport) return undefined;
	const scrolled = remeasureListenerOf(watch, "scroll");
	measureView(watch);
	viewport.addEventListener("scroll", scrolled, { passive: true });
	const stopSizes = watchSizes(trackBoxesOf(viewport), remeasureListenerOf(watch, "reInit"));
	return () => {
		viewport.removeEventListener("scroll", scrolled);
		stopSizes();
	};
}

function measureView({ api, setView }: TrackWatch): void {
	setView({ selected: api.selectedScrollSnap(), count: api.scrollSnapList().length });
}

function remeasureListenerOf(watch: TrackWatch, event: CarouselEvent): () => void {
	return () => {
		measureView(watch);
		emit(watch.listeners, watch.api, event);
	};
}

function trackBoxesOf(viewport: HTMLElement): Element[] {
	return viewport.firstElementChild ? [viewport, viewport.firstElementChild] : [viewport];
}

function emit(listeners: ReadonlyListeners, api: CarouselApi, event: CarouselEvent): void {
	for (const listener of listeners.get(event) ?? []) listener(api, event);
}

function scrolledOf(viewport: HTMLElement | null, orientation: CarouselOrientation): number {
	if (!viewport) return 0;
	return scrollOffsetOf(viewport, orientation === "vertical");
}

function slideTo(viewport: HTMLElement | null, orientation: CarouselOrientation, to: number | undefined): void {
	if (!viewport || to === undefined) return;
	const isVertical = orientation === "vertical";
	if (typeof viewport.scrollTo !== "function") {
		scrollToOffset(viewport, isVertical, to);
		return;
	}
	const behavior = prefersReducedMotion() ? "auto" : "smooth";
	viewport.scrollTo(isVertical ? { top: to, behavior } : { left: to, behavior });
}
