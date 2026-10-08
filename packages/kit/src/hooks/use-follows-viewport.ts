import { useEffect, useRef } from "react";

const CAPTURE_EVERY_SCROLLER = true;

export function useFollowsViewport(isOpen: boolean, place: () => void): void {
	const latest = useRef(place);
	latest.current = place;
	useEffect(() => {
		if (!isOpen) return undefined;
		const follow = (): void => latest.current();
		window.addEventListener("resize", follow);
		window.addEventListener("scroll", follow, CAPTURE_EVERY_SCROLLER);
		return () => {
			window.removeEventListener("resize", follow);
			window.removeEventListener("scroll", follow, CAPTURE_EVERY_SCROLLER);
		};
	}, [isOpen]);
}
