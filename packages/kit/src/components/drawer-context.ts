import { createContext } from "react";
import type { Context } from "react";
import type { SnapPoint } from "../utils/drawer-snaps";
import type { ModalSide } from "./modal-layer";

export interface DrawerSnaps {
	readonly points: readonly SnapPoint[];
	readonly activeIndex: number;
	readonly setActiveIndex: (index: number) => void;
	readonly fadeFromIndex: number;
}

export interface DrawerSettings {
	readonly direction: ModalSide;
	readonly isDismissible: boolean;
	readonly snaps: DrawerSnaps | null;
}

export const DrawerContext: Context<DrawerSettings> = createContext<DrawerSettings>({
	direction: "bottom",
	isDismissible: true,
	snaps: null,
});
