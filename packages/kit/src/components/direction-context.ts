import { createContext, useContext } from "react";
import type { Context } from "react";

export type Direction = "ltr" | "rtl";

export const DirectionContext: Context<Direction> = createContext<Direction>("ltr");

export function useDirection(): Direction {
	return useContext(DirectionContext);
}
