import { createContext } from "react";

export const LAYOUT_KINDS = ["stack", "row", "grid", "rows"];

export const LAYOUT_KIND = createContext("stack");

export const HEAD_OUTSIDE = createContext(null);
