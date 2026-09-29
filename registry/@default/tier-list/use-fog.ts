import { useLayoutEffect, useRef } from "react";

const FOG_REACH_PX = 24;

export function useFog(rackRef: { current: HTMLElement | null }, fogRef: { current: HTMLElement | null }) {
	const paintRef = useRef<() => void>(() => {});
	paintRef.current = () => {
		const rack = rackRef.current;
		const fog = fogRef.current;
		if (!rack || !fog) return;
		const below = rack.scrollHeight - rack.clientHeight - rack.scrollTop;
		fog.style.setProperty("--wr-fog-top", String(Math.min(1, rack.scrollTop / FOG_REACH_PX)));
		fog.style.setProperty("--wr-fog-bottom", String(Math.min(1, below / FOG_REACH_PX)));
	};

	useLayoutEffect(() => {
		paintRef.current();
	});

	useLayoutEffect(() => {
		const rack = rackRef.current;
		if (!rack) return undefined;
		const paint = () => paintRef.current();
		rack.addEventListener("scroll", paint, { passive: true });
		const watcher = typeof ResizeObserver === "function" ? new ResizeObserver(paint) : null;
		watcher?.observe(rack);
		return () => {
			rack.removeEventListener("scroll", paint);
			watcher?.disconnect();
		};
	}, []);
}
