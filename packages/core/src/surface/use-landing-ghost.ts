import { useLayoutEffect } from "react";
import type { RefObject } from "react";
import { flyGhostHome, LANDING_MS } from "./ghost.js";
import type { Carry, SetCarry } from "./carry.js";

export interface LandingRefs {
	readonly pageRef: RefObject<HTMLElement | null>;
	readonly ghostRef: RefObject<HTMLElement | null>;
}

export function useLandingGhost(carry: Carry | null, setCarry: SetCarry, { pageRef, ghostRef }: LandingRefs): void {
	useLayoutEffect(() => {
		if (!carry?.isLanding) return undefined;
		flyGhostHome(pageRef.current, ghostRef.current, carry);
		const settling = window.setTimeout(() => setCarry(null), LANDING_MS);
		return () => window.clearTimeout(settling);
	}, [carry?.isLanding]);
}
