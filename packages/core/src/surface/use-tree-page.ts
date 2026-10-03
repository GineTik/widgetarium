import { useEffect, useRef, useState } from "react";
import type { MutableRefObject, RefObject } from "react";
import { useContentInsets } from "../content-insets.js";
import type { InsetsByCell } from "../content-insets.js";
import { useMeasuresSurfaces } from "../surface-measure.js";
import type { PressAt } from "../drawer.js";
import { startCarry } from "./carry.js";
import { spotsIn } from "./carry-spots.js";
import { receiveDrops } from "./drop-receivers.js";
import { sameTarget, targetAt } from "../tree.js";
import type { DropTarget } from "../tree-drop.js";
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
	readonly addTileAt: ((widgetId: string, target: DropTarget) => void) | null;
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

export function useTreePage({ shared, editing, commitLayout, addTileAt }: TreePageAsk): TreePage {
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
	useReceivesWidgets({ pageRef, regionsRef, setCarry }, addTileAt);
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

const INCOMING = "incoming-widget";
const INCOMING_STAND_IN_PX = 120;

let boardsCounted = 0;

interface ReceivingRefs {
	readonly pageRef: RefObject<HTMLElement | null>;
	readonly regionsRef: MutableRefObject<RegionElements>;
	readonly setCarry: SetCarry;
}

function useReceivesWidgets(
	{ pageRef, regionsRef, setCarry }: ReceivingRefs,
	addTileAt: ((widgetId: string, target: DropTarget) => void) | null,
): void {
	const [id] = useState(() => `board-${(boardsCounted += 1)}`);
	const placeRef = useRef(addTileAt);
	placeRef.current = addTileAt;
	const isReceiving = addTileAt !== null;
	useEffect(() => {
		const element = pageRef.current;
		if (!element || !isReceiving) return undefined;
		let aimed: DropTarget | null = null;
		const show = (target: DropTarget | null): void => {
			if (sameTarget(target, aimed)) return;
			aimed = target;
			setCarry(target ? { id: INCOMING, target, height: INCOMING_STAND_IN_PX, ghost: null, isIncoming: true } : null);
		};
		return receiveDrops({
			id,
			element,
			aim: (pointer) => {
				const target = targetAt(spotsIn(regionsRef.current.entries(), INCOMING), pointer.clientX, pointer.clientY);
				show(target);
				return target ? { kind: "board", board: id, target } : null;
			},
			rest: () => show(null),
			place: (widget, at) => {
				if (at.kind !== "board") return false;
				show(null);
				placeRef.current?.(widget, at.target);
				return true;
			},
		});
	}, [id, isReceiving]);
}
