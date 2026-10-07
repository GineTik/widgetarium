import { useEffect, useRef, useState } from "react";
import { lightSpotOf, mixedPoints, outlineOf, pointsIn, springOf } from "../utils/shape-morph";
import type { ShapeLightSpot } from "../utils/shape-morph";

const MORPH_MS = 520;

export interface MorphedShape {
	readonly outline: string;
	readonly light: ShapeLightSpot;
}

export function useMorphedOutline(points: string): MorphedShape {
	const target = pointsIn(points);
	const [drawn, setDrawn] = useState<readonly number[]>(target);
	const shown = useRef<readonly number[]>(target);
	useEffect(() => {
		const from = shown.current;
		const to = pointsIn(points);
		if (!canAnimate()) {
			shown.current = to;
			setDrawn(to);
			return undefined;
		}
		const began = performance.now();
		let frame = requestAnimationFrame(function step(now: number) {
			const progress = Math.min(1, Math.max(0, (now - began) / MORPH_MS));
			const mixed = mixedPoints(from, to, springOf(progress));
			shown.current = mixed;
			setDrawn(mixed);
			if (progress < 1) frame = requestAnimationFrame(step);
		});
		return () => cancelAnimationFrame(frame);
	}, [points]);
	return { outline: outlineOf(drawn), light: lightSpotOf(drawn) };
}

function canAnimate(): boolean {
	if (typeof requestAnimationFrame !== "function" || typeof window === "undefined") return false;
	return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}
