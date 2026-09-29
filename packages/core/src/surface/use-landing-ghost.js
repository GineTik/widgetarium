import { useLayoutEffect } from "react";
import { flyGhostHome, LANDING_MS } from "./ghost.js";

export function useLandingGhost(carry, setCarry, { pageRef, ghostRef }) {
	useLayoutEffect(() => {
		if (!carry?.isLanding) return undefined;
		flyGhostHome(pageRef.current, ghostRef.current, carry);
		const settling = window.setTimeout(() => setCarry(null), LANDING_MS);
		return () => window.clearTimeout(settling);
	}, [carry?.isLanding]);
}
