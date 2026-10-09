import { useLayoutEffect } from "react";
import type { DialogState } from "../components/dialog-context";
import type { DrawerSettings, DrawerSnaps } from "../components/drawer-context";
import type { ModalSide } from "../components/modal-layer";
import type { SnapPoint } from "../utils/drawer-snaps";
import { useControllableState } from "./use-controllable-state";
import { useOpenState } from "./use-open-state";
import type { OpenAsk } from "./use-open-state";

export interface DrawerSnapAsk {
	readonly snapPoints?: readonly SnapPoint[] | undefined;
	readonly activeSnapPoint?: SnapPoint | null | undefined;
	readonly setActiveSnapPoint?: ((snapPoint: SnapPoint | null) => void) | undefined;
	readonly fadeFromIndex?: number | undefined;
}

export interface DrawerRootAsk extends OpenAsk, DrawerSnapAsk {
	readonly direction?: ModalSide | undefined;
	readonly dismissible?: boolean | undefined;
}

export interface DrawerRoot {
	readonly dialog: DialogState;
	readonly settings: DrawerSettings;
}

export function useDrawerRoot({
	direction = "bottom",
	dismissible = true,
	snapPoints,
	activeSnapPoint,
	setActiveSnapPoint,
	fadeFromIndex,
	...openAsk
}: DrawerRootAsk): DrawerRoot {
	const [isOpen, setOpen] = useOpenState(openAsk);
	const firstSnap = snapPoints?.[0] ?? null;
	const [active, setActive] = useControllableState<SnapPoint | null>({
		prop: activeSnapPoint,
		defaultProp: firstSnap,
		onChange: setActiveSnapPoint,
	});
	useLayoutEffect(() => {
		if (isOpen && firstSnap !== null && activeSnapPoint === undefined) setActive(firstSnap);
	}, [isOpen]);
	const snaps = snapPoints?.length ? snapsOf(snapPoints, active, setActive, fadeFromIndex) : null;
	return {
		dialog: { isOpen, setOpen },
		settings: { direction, isDismissible: dismissible, snaps },
	};
}

function activeIndexOf(points: readonly SnapPoint[], active: SnapPoint | null): number {
	const index = active === null ? -1 : points.indexOf(active);
	return index === -1 ? 0 : index;
}

function snapsOf(
	points: readonly SnapPoint[],
	active: SnapPoint | null,
	setActive: (snapPoint: SnapPoint | null) => void,
	fadeFromIndex: number | undefined,
): DrawerSnaps {
	return {
		points,
		activeIndex: activeIndexOf(points, active),
		setActiveIndex: (index) => setActive(points[index] ?? null),
		fadeFromIndex: fadeFromIndex ?? points.length - 1,
	};
}
