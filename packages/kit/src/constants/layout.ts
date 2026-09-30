import { createContext } from "react";
import type { Context } from "react";

export type LayoutKind = "stack" | "row" | "grid" | "rows";

export const LAYOUT_KINDS: readonly LayoutKind[] = ["stack", "row", "grid", "rows"];

export const LAYOUT_KIND: Context<LayoutKind> = createContext<LayoutKind>("stack");

export const HEAD_OUTSIDE: Context<HTMLElement | null> = createContext<HTMLElement | null>(null);
