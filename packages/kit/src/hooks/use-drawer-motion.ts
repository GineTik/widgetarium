import type { KeyboardEvent, RefCallback } from "react";
import type { DialogState } from "../components/dialog-context";
import type { DrawerSettings } from "../components/drawer-context";
import { cn } from "../utils/cn";
import {
	CLOSED_SNAP,
	cycledSnapIndex,
	fadeAt,
	settledSnapIndex,
	snapHeightsOf,
	snapIndexByKey,
} from "../utils/drawer-snaps";
import type { TokenStyle } from "../utils/token-style";
import { useDrawerDrag } from "./use-drawer-drag";
import type { DragPointerProps } from "./use-drawer-drag";
import { useDrawerGeometry } from "./use-drawer-geometry";
import type { DrawerGeometry } from "./use-drawer-geometry";

export interface DrawerGrip {
	readonly label: string;
	readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

export interface DrawerMotion {
	readonly panelRef: RefCallback<HTMLDivElement>;
	readonly pointerProps: DragPointerProps | null;
	readonly grip: DrawerGrip;
	readonly className: string;
	readonly panelStyle: TokenStyle;
	readonly scrimStyle: TokenStyle | undefined;
}

interface SnapStop {
	readonly heights: readonly number[];
	readonly index: number;
	readonly goTo: (index: number) => void;
}

const RESIZE_LABEL = "Resize the drawer";

const CLOSE_LABEL = "Drag down to close";

export function useDrawerMotion(settings: DrawerSettings, { isOpen, setOpen }: DialogState): DrawerMotion {
	const { geometry, panelRef } = useDrawerGeometry();
	const stop = snapStopOf(settings, geometry, setOpen);
	const topPx = stop.heights[stop.heights.length - 1] ?? 0;
	const restingPx = stop.heights[stop.index] ?? topPx;
	const drag = useDrawerDrag({
		restingPx,
		topPx,
		onRelease: (release) =>
			stop.goTo(settledSnapIndex({ heights: stop.heights, isDismissible: settings.isDismissible, ...release })),
		onGripPress: () => stop.goTo(cycledSnapIndex(stop.index, stop.heights.length, settings.isDismissible)),
	});
	const shownPx = drag.draggedPx ?? restingPx;
	return {
		panelRef,
		pointerProps: settings.direction === "bottom" ? drag.pointerProps : null,
		grip: {
			label: settings.snaps ? RESIZE_LABEL : CLOSE_LABEL,
			onKeyDown: (event) => stepByKey(event, stop, settings.isDismissible),
		},
		className: cn(
			drag.draggedPx !== null && "is-dragging",
			settings.snaps && "has-snaps",
			stop.index < stop.heights.length - 1 && "is-held-low",
		),
		panelStyle: {
			"--wg-kit-drawer-drag": `${Math.max(0, topPx - shownPx)}px`,
			"--wg-kit-drawer-height": settings.snaps ? `${Math.max(0, topPx - geometry.insetPx)}px` : undefined,
		},
		scrimStyle: settings.snaps
			? { "--wg-kit-scrim-fade": isOpen ? fadeAt(stop.heights, settings.snaps.fadeFromIndex, shownPx) : 0 }
			: undefined,
	};
}

function snapStopOf(settings: DrawerSettings, geometry: DrawerGeometry, setOpen: (open: boolean) => void): SnapStop {
	const { snaps } = settings;
	const goTo = (index: number): void => {
		if (index === CLOSED_SNAP) setOpen(false);
		else snaps?.setActiveIndex(index);
	};
	if (!snaps) return { heights: [geometry.contentPx + geometry.insetPx], index: 0, goTo };
	return { heights: snapHeightsOf(snaps.points, geometry), index: snaps.activeIndex, goTo };
}

function stepByKey(event: KeyboardEvent<HTMLElement>, stop: SnapStop, isDismissible: boolean): void {
	const next = snapIndexByKey(event.key, stop.index, stop.heights.length, isDismissible);
	if (next === null) return;
	event.preventDefault();
	stop.goTo(next);
}
