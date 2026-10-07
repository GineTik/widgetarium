import { createContext, useContext } from "react";
import type { Context } from "react";
import type { AnchorBox } from "../constants/popover";

export type PointSetter = (point: AnchorBox) => void;

export const ContextMenuPointContext: Context<PointSetter | null> = createContext<PointSetter | null>(null);

export function useContextMenuPoint(): PointSetter {
	const setPoint = useContext(ContextMenuPointContext);
	if (!setPoint) throw new Error("a ContextMenuTrigger stands outside a ContextMenu");
	return setPoint;
}

export function pointBox(x: number, y: number): AnchorBox {
	return { left: x, top: y, right: x, bottom: y, width: 0, height: 0 };
}
