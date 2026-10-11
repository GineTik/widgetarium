import { createContext } from "react";
import type { Context } from "react";

export type LayoutKind = "stack" | "row" | "grid";

export const LAYOUT_KINDS: readonly LayoutKind[] = ["stack", "row", "grid"];

export const LAYOUT_KIND: Context<LayoutKind> = createContext<LayoutKind>("stack");
