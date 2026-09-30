import { useRef, useState } from "react";
import type { MutableRefObject, RefObject } from "react";
import { useContentInsets } from "../content-insets.js";
import type { InsetsByCell } from "../content-insets.js";
import { useMeasuresSurfaces } from "../surface-measure.js";
import type { PressAt } from "../drawer.js";
import { startCarry } from "./carry.js";
import type { Carry, CarryGesture, PointerAt, SetCarry } from "./carry.js";
import type { CommitLayout } from "./board-edits.js";
import type { SidebarDrag } from "./sidebar-drag.js";
import { useLandingGhost } from "./use-landing-ghost.js";
import { useStopOnUnmount } from "./use-stop-on-unmount.js";
import type { SurfaceShared } from "./use-surface-shared.js";

type RegionElements = Map<number, HTMLElement>;

type EveryRegionElement = Map<string, HTMLElement>;

interface CarryPress extends PointerAt {
	readonly target: EventTarget | null;
	readonly button: number;
	readonly preventDefault: () => void;
}

interface TreePageAsk {
	readonly shared: Pick<SurfaceShared, "host">;
	readonly editing: boolean;
	readonly commitLayout: CommitLayout;
}

export interface TreePage {
	readonly pageRef: RefObject<HTMLDivElement | null>;
	readonly regionsRef: MutableRefObject<RegionElements>;
	readonly ghostRef: RefObject<HTMLDivElement | null>;
	readonly sidebarRef: MutableRefObject<SidebarDrag | null>;
	readonly pressedRef: MutableRefObject<Map<string, PressAt | null | undefined>>;
	readonly everyRegionRef: MutableRefObject<EveryRegionElement>;
	readonly carry: Carry | null;
	readonly insets: InsetsByCell;
	readonly carrying: Carry | null;
	readonly carryFrom: (event: CarryPress) => void;
}

interface CarryRefs {
	readonly pageRef: RefObject<HTMLElement | null>;
	readonly regionsRef: MutableRefObject<RegionElements>;
	readonly carryRef: MutableRefObject<CarryGesture | null>;
	readonly ghostRef: RefObject<HTMLElement | null>;
	readonly setCarry: SetCarry;
}

export function useTreePage({ shared, editing, commitLayout }: TreePageAsk): TreePage {
	const pageRef = useRef<HTMLDivElement | null>(null);
	const regionsRef = useRef<RegionElements>(new Map());
	const carryRef = useRef<CarryGesture | null>(null);
	const ghostRef = useRef<HTMLDivElement | null>(null);
	const sidebarRef = useRef<SidebarDrag | null>(null);
	const [carry, setCarry] = useState<Carry | null>(null);
	const pressedRef = useRef(new Map<string, PressAt | null | undefined>());
	const [insets, setInsets] = useState<InsetsByCell>({});
	useContentInsets(pageRef, setInsets);
	useStopOnUnmount(carryRef);
	useLandingGhost(carry, setCarry, { pageRef, ghostRef });
	const everyRegionRef = useRef<EveryRegionElement>(new Map());
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

function carryStarter(
	{ pageRef, regionsRef, carryRef, ghostRef, setCarry }: CarryRefs,
	editing: boolean,
	commitLayout: CommitLayout,
): (event: CarryPress) => void {
	return (event) => {
		const cell = event.target instanceof Element ? event.target.closest<HTMLElement>(".wg-tree-cell") : null;
		const id = cell?.dataset["cell"];
		const page = pageRef.current;
		if (!cell || !id || !page || !editing || event.button !== 0 || carryRef.current) return;
		event.preventDefault();
		startCarry({
			event,
			cell,
			id,
			page: page.getBoundingClientRect(),
			regions: regionsRef.current,
			carryRef,
			ghostRef,
			setCarry,
			commitLayout,
		});
	};
}
