import { useRef, useState } from "react";
import { useContentInsets } from "../content-insets.js";
import { useMeasuresSurfaces } from "../surface-measure.js";
import { startCarry } from "./carry.js";
import { useLandingGhost } from "./use-landing-ghost.js";
import { useStopOnUnmount } from "./use-stop-on-unmount.js";

export function useTreePage({ shared, editing, commitLayout }) {
	const pageRef = useRef(null);
	const regionsRef = useRef(new Map());
	const carryRef = useRef(null);
	const ghostRef = useRef(null);
	const sidebarRef = useRef(null);
	const [carry, setCarry] = useState(null);
	const pressedRef = useRef(new Map());
	const [insets, setInsets] = useState({});
	useContentInsets(pageRef, setInsets);
	useStopOnUnmount(carryRef);
	useLandingGhost(carry, setCarry, { pageRef, ghostRef });
	const everyRegionRef = useRef(new Map());
	useMeasuresSurfaces(pageRef, shared.host, everyRegionRef);
	return {
		pageRef,
		regionsRef,
		ghostRef,
		sidebarRef,
		pressedRef,
		everyRegionRef,
		carry,
		insets,
		carrying: carry?.isLanding ? null : carry,
		carryFrom: carryStarter({ pageRef, regionsRef, carryRef, ghostRef, setCarry }, editing, commitLayout),
	};
}

function carryStarter({ pageRef, regionsRef, carryRef, ghostRef, setCarry }, editing, commitLayout) {
	return (event) => {
		const id = event.target.closest(".wg-tree-cell")?.dataset.cell;
		if (!id || !editing || event.button !== 0 || carryRef.current) return;
		event.preventDefault();
		startCarry({
			event,
			page: pageRef.current.getBoundingClientRect(),
			regions: regionsRef.current,
			carryRef,
			ghostRef,
			setCarry,
			commitLayout,
		});
	};
}
