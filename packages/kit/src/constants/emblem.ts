import { createContext } from "react";

export const EMBLEM_SIZES = { s: 24, m: 40, l: 64, xl: 96 };

export const EMBLEM_SHAPES = ["circle", "rounded", "square"];

export const EMBLEM_SHAPE_WORD = { kind: "emblem shape", allowed: EMBLEM_SHAPES, fallback: EMBLEM_SHAPES[0] };

export const EMBLEM_SIZE_WORD = { kind: "emblem size", allowed: Object.keys(EMBLEM_SIZES), fallback: "m" };

export const EMBLEM_STATUS = createContext(null);
