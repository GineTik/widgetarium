import { createContext } from "react";
import type { Context } from "react";
import type { WordChoice } from "../utils/surface";

export type EmblemSize = "s" | "m" | "l" | "xl";

export type EmblemShape = "circle" | "rounded" | "square";

export type EmblemStatus = "idle" | "loading" | "loaded" | "failed" | "refused";

export interface EmblemState {
	readonly status: EmblemStatus;
	readonly setStatus: (status: EmblemStatus) => void;
}

export const EMBLEM_SIZES: Readonly<Record<EmblemSize, number>> = { s: 24, m: 40, l: 64, xl: 96 };

export const EMBLEM_SHAPES: readonly EmblemShape[] = ["circle", "rounded", "square"];

export const EMBLEM_SHAPE_WORD: WordChoice<EmblemShape> = {
	kind: "emblem shape",
	allowed: EMBLEM_SHAPES,
	fallback: "circle",
};

export const EMBLEM_SIZE_WORD: WordChoice<EmblemSize> = {
	kind: "emblem size",
	allowed: ["s", "m", "l", "xl"],
	fallback: "m",
};

const OUTSIDE_AN_EMBLEM: EmblemState = { status: "idle", setStatus: () => undefined };

export const EMBLEM_STATUS: Context<EmblemState> = createContext(OUTSIDE_AN_EMBLEM);
