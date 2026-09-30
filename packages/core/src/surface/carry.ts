import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react";
import { targetAt, moveInto, sameTarget } from "../tree.js";
import type { BoxNode } from "../tree-nodes.js";
import type { DropTarget, Spot } from "../tree-drop.js";
import { spotsIn } from "./carry-spots.js";

const CARRY_THRESHOLD_PX = 5;
const CARRY_EDGE_PX = 56;
const GHOST_TALLEST_PX = 96;
const GHOST_SHORTEST_PX = 44;
const GHOST_WIDEST_PX = 260;
const GHOST_NARROWEST_PX = 150;
const DWELL_MS = 50;

export interface Point {
	readonly x: number;
	readonly y: number;
}

export interface PointerAt {
	readonly clientX: number;
	readonly clientY: number;
}

export interface CarriedGhost {
	readonly across: number;
	readonly down: number;
	readonly gripAcross: number;
	readonly gripDown: number;
	readonly liftedFrom: number;
	readonly left: number;
	readonly top: number;
}

export interface Carry {
	readonly id: string;
	readonly target: DropTarget | null;
	readonly height: number;
	readonly ghost: CarriedGhost;
	readonly isLanding?: boolean;
}

export type SetCarry = Dispatch<SetStateAction<Carry | null>>;

export interface CarryGesture {
	isStarted: boolean;
	readonly stop: () => void;
}

export type CommitLayout = (change: (held: BoxNode) => BoxNode) => void;

export type PageCorner = Pick<DOMRect, "left" | "top">;

export interface CarryStart {
	readonly event: PointerAt;
	readonly cell: HTMLElement;
	readonly id: string;
	readonly page: PageCorner;
	readonly regions: ReadonlyMap<number, HTMLElement>;
	readonly carryRef: MutableRefObject<CarryGesture | null>;
	readonly ghostRef: RefObject<HTMLElement | null>;
	readonly setCarry: SetCarry;
	readonly commitLayout: CommitLayout;
}

interface Carried {
	spots: readonly Spot[];
	target: DropTarget | null;
	latest: Point;
	lifted: Point;
	frame: number;
}

interface AimHeld {
	readonly spots: () => readonly Spot[];
	readonly target: () => DropTarget | null;
	readonly onTarget: (aimed: DropTarget | null) => void;
	readonly onSettled: (aimed: DropTarget | null) => void;
}

interface AimKeeper {
	readonly rest: () => void;
	readonly aim: (pointer: PointerAt, isFirst: boolean) => void;
}

interface GhostLift {
	readonly box: DOMRect;
	readonly grabbed: Point;
	readonly lifted: Point;
	readonly page: PageCorner;
}

type GhostShape = Omit<CarriedGhost, "left" | "top">;

export function startCarry({
	event,
	cell,
	id,
	page,
	regions,
	carryRef,
	ghostRef,
	setCarry,
	commitLayout,
}: CarryStart): void {
	const grabbed = { x: event.clientX, y: event.clientY };
	const box = cell.getBoundingClientRect();
	const scroller = scrollerOf(cell);
	const scrolledAt = scroller?.scrollTop ?? 0;
	const carried: Carried = { spots: [], target: null, latest: grabbed, lifted: grabbed, frame: 0 };
	const gesture: CarryGesture = { isStarted: false, stop: () => finish(false) };

	const roll = (): void => {
		carried.frame = window.requestAnimationFrame(roll);
		rollTowards(scroller, carried.latest.y);
	};

	const keeper = aimKeeper({
		spots: () => carried.spots,
		target: () => carried.target,
		onTarget: (aimed) => {
			carried.target = aimed;
		},
		onSettled: (aimed) => {
			carried.target = aimed;
			setCarry(patchedCarry({ target: aimed }));
		},
	});

	const begin = (pointer: PointerAt): void => {
		carried.spots = spotsIn(regions.entries(), id);
		gesture.isStarted = true;
		document.body.classList.add("wg-tree-carrying");
		carried.frame = window.requestAnimationFrame(roll);
		keeper.aim(pointer, true);
		carried.lifted = carried.latest;
		setCarry({
			id,
			target: carried.target,
			height: Math.round(box.height),
			ghost: liftGhost({ box, grabbed, lifted: carried.lifted, page }),
		});
	};

	const move = (pointer: PointerEvent): void => {
		carried.latest = { x: pointer.clientX, y: pointer.clientY };
		if (gesture.isStarted) {
			paintGhost(ghostRef.current, carried, (scroller?.scrollTop ?? 0) - scrolledAt);
			keeper.aim(pointer, false);
			return;
		}
		if (isCarriedFar(grabbed, carried.latest)) begin(pointer);
	};

	const listening = new AbortController();
	const finish = (isKept: boolean): void => {
		listening.abort();
		window.cancelAnimationFrame(carried.frame);
		keeper.rest();
		document.body.classList.remove("wg-tree-carrying");
		carryRef.current = null;
		const target = carried.target;
		if (!isKept || !gesture.isStarted || !target) return setCarry(null);
		commitLayout((held) => moveInto(held, id, target));
		setCarry(patchedCarry({ isLanding: true }));
	};

	carryRef.current = gesture;
	listenUntilDropped(listening.signal, { move, drop: () => finish(true), cancel: gesture.stop });
}

interface CarryListeners {
	readonly move: (pointer: PointerEvent) => void;
	readonly drop: () => void;
	readonly cancel: () => void;
}

function listenUntilDropped(signal: AbortSignal, { move, drop, cancel }: CarryListeners): void {
	window.addEventListener("pointermove", move, { signal });
	window.addEventListener("pointerup", drop, { signal });
	window.addEventListener("pointercancel", cancel, { signal });
	window.addEventListener("keydown", (held) => held.key === "Escape" && cancel(), { signal });
}

function paintGhost(ghost: HTMLElement | null, { latest, lifted }: Carried, rolled: number): void {
	if (!ghost) return;
	ghost.style.transform = `translate(${latest.x - lifted.x}px, ${latest.y - lifted.y + rolled}px)`;
}

function patchedCarry(patch: Partial<Carry>): SetStateAction<Carry | null> {
	return (was) => (was ? { ...was, ...patch } : was);
}

function scrollerOf(node: Element): Element | null {
	for (let at: Element | null = node; at && at !== document.body; at = at.parentElement) {
		const flow = getComputedStyle(at).overflowY;
		if ((flow === "auto" || flow === "scroll") && at.scrollHeight > at.clientHeight) return at;
	}
	return document.scrollingElement;
}

function rollTowards(scroller: Element | null, y: number): void {
	if (!scroller) return;
	const edge = scroller.getBoundingClientRect();
	const above = y - edge.top;
	const below = edge.bottom - y;
	if (above < CARRY_EDGE_PX) scroller.scrollTop -= (CARRY_EDGE_PX - above) / 4;
	else if (below < CARRY_EDGE_PX) scroller.scrollTop += (CARRY_EDGE_PX - below) / 4;
}

function ghostFor(box: DOMRect, grabbed: Point): GhostShape {
	const across = Math.min(Math.max(box.width, GHOST_NARROWEST_PX), GHOST_WIDEST_PX);
	const down = Math.min(Math.max(box.height, GHOST_SHORTEST_PX), GHOST_TALLEST_PX);
	return {
		across,
		down,
		gripAcross: box.width > 0 ? (grabbed.x - box.left) / box.width : 0.5,
		gripDown: box.height > 0 ? (grabbed.y - box.top) / box.height : 0.5,
		liftedFrom: Math.max(box.width / across, box.height / down),
	};
}

function aimKeeper(held: AimHeld): AimKeeper {
	let dwelling = 0;
	const rest = (): void => {
		window.clearTimeout(dwelling);
		dwelling = 0;
	};
	return {
		rest,
		aim: (pointer, isFirst) => {
			const aimed = targetAt(held.spots(), pointer.clientX, pointer.clientY);
			if (sameTarget(aimed, held.target())) return rest();
			if (isFirst) return held.onTarget(aimed);
			window.clearTimeout(dwelling);
			dwelling = window.setTimeout(() => held.onSettled(aimed), DWELL_MS);
		},
	};
}

function liftGhost({ box, grabbed, lifted, page }: GhostLift): CarriedGhost {
	const ghost = ghostFor(box, grabbed);
	return {
		...ghost,
		left: lifted.x - ghost.gripAcross * ghost.across - page.left,
		top: lifted.y - ghost.gripDown * ghost.down - page.top,
	};
}

function isCarriedFar(from: Point, to: Point): boolean {
	return Math.abs(to.x - from.x) + Math.abs(to.y - from.y) >= CARRY_THRESHOLD_PX;
}
