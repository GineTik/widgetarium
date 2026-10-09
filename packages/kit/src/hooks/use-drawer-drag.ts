import { useRef, useState } from "react";
import type { PointerEvent, RefObject } from "react";
import { clamp } from "../utils/clamp";
import { isElement } from "../utils/dom-nodes";

export interface DrawerRelease {
	readonly shownPx: number;
	readonly upwardPxPerMs: number;
}

export interface DrawerDragAsk {
	readonly restingPx: number;
	readonly topPx: number;
	readonly onRelease: (release: DrawerRelease) => void;
	readonly onGripPress: () => void;
}

export interface DragPointerProps {
	readonly onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
	readonly onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
	readonly onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
	readonly onPointerCancel: () => void;
}

export interface DrawerDrag {
	readonly draggedPx: number | null;
	readonly pointerProps: DragPointerProps;
}

interface PointerSample {
	readonly at: number;
	readonly y: number;
}

interface Gesture {
	readonly startY: number;
	readonly startPx: number;
	readonly isFromGrip: boolean;
	shownPx: number;
	travelPx: number;
	isFollowing: boolean;
	samples: PointerSample[];
}

interface DragHeld {
	readonly ask: RefObject<DrawerDragAsk>;
	readonly gesture: RefObject<Gesture | null>;
	readonly show: (px: number | null) => void;
}

const GRIP = ".wg-kit-drawer-handle";

const PRESSABLE =
	'button, a[href], input, textarea, select, label, [contenteditable="true"], [role="button"], [role="slider"], [role="checkbox"], [role="switch"], [role="tab"], [role="option"], [role="menuitem"]';

const STILL_PRESS_PX = 3;

const VELOCITY_WINDOW_MS = 100;

const RESTED_MS = 100;

export function useDrawerDrag(ask: DrawerDragAsk): DrawerDrag {
	const [draggedPx, setDraggedPx] = useState<number | null>(null);
	const latest = useRef(ask);
	latest.current = ask;
	const gesture = useRef<Gesture | null>(null);
	const held: DragHeld = { ask: latest, gesture, show: setDraggedPx };
	return {
		draggedPx,
		pointerProps: {
			onPointerDown: (event) => grabDrawer(event, held),
			onPointerMove: (event) => dragDrawer(event, held),
			onPointerUp: (event) => releaseDrawer(event, held),
			onPointerCancel: () => {
				gesture.current = null;
				setDraggedPx(null);
			},
		},
	};
}

function grabDrawer(event: PointerEvent<HTMLDivElement>, held: DragHeld): void {
	const panel = event.currentTarget;
	const source = dragSourceOf(event.target, panel);
	if (event.button !== 0 || source === null) return;
	const startPx = isMoving(panel) ? shownOnScreen(panel) : held.ask.current.restingPx;
	const isFromGrip = source === "grip";
	held.gesture.current = {
		startY: event.clientY,
		startPx,
		isFromGrip,
		shownPx: startPx,
		travelPx: 0,
		isFollowing: false,
		samples: [{ at: event.timeStamp, y: event.clientY }],
	};
	if (isFromGrip) follow(event, held);
}

function dragDrawer(event: PointerEvent<HTMLDivElement>, held: DragHeld): void {
	const gesture = held.gesture.current;
	if (!gesture) return;
	gesture.travelPx = Math.max(gesture.travelPx, Math.abs(event.clientY - gesture.startY));
	gesture.samples = [...recentSamples(gesture.samples, event.timeStamp), { at: event.timeStamp, y: event.clientY }];
	gesture.shownPx = clamp(gesture.startPx + gesture.startY - event.clientY, 0, held.ask.current.topPx);
	if (!gesture.isFollowing && gesture.travelPx <= STILL_PRESS_PX) return;
	if (!gesture.isFollowing) follow(event, held);
	held.show(gesture.shownPx);
}

function releaseDrawer(event: PointerEvent<HTMLDivElement>, held: DragHeld): void {
	const gesture = held.gesture.current;
	if (!gesture) return;
	held.gesture.current = null;
	held.show(null);
	if (gesture.travelPx > STILL_PRESS_PX) {
		const upwardPxPerMs = upwardSpeedOf(gesture.samples, event.timeStamp);
		held.ask.current.onRelease({ shownPx: gesture.shownPx, upwardPxPerMs });
		return;
	}
	if (gesture.isFromGrip) held.ask.current.onGripPress();
}

function follow(event: PointerEvent<HTMLDivElement>, held: DragHeld): void {
	const gesture = held.gesture.current;
	if (!gesture) return;
	gesture.isFollowing = true;
	event.currentTarget.setPointerCapture?.(event.pointerId);
	held.show(gesture.shownPx);
}

function dragSourceOf(target: EventTarget | null, panel: HTMLElement): "grip" | "body" | null {
	if (!isElement(target)) return null;
	if (target.closest(GRIP)) return "grip";
	if (target.closest(PRESSABLE) || isScrolledBetween(target, panel)) return null;
	return "body";
}

function isScrolledBetween(target: Element, panel: HTMLElement): boolean {
	for (let at: Element | null = target; at; at = at.parentElement) {
		if (at.scrollTop > 0) return true;
		if (at === panel) return false;
	}
	return false;
}

function isMoving(panel: HTMLElement): boolean {
	return (panel.getAnimations?.().length ?? 0) > 0;
}

function shownOnScreen(panel: HTMLElement): number {
	const layer = panel.parentElement;
	if (!layer) return 0;
	return layer.getBoundingClientRect().bottom - panel.getBoundingClientRect().top;
}

function recentSamples(samples: readonly PointerSample[], now: number): PointerSample[] {
	return samples.filter((sample) => now - sample.at <= VELOCITY_WINDOW_MS);
}

function upwardSpeedOf(samples: readonly PointerSample[], releasedAt: number): number {
	const last = samples[samples.length - 1];
	if (!last || releasedAt - last.at > RESTED_MS) return 0;
	const first = recentSamples(samples, last.at)[0];
	if (!first || last.at === first.at) return 0;
	return (first.y - last.y) / (last.at - first.at);
}
