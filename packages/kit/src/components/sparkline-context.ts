import { createContext, useContext } from "react";
import type { Context } from "react";
import type { SparkSpots, SparkValues } from "../utils/sparkline";

export interface SparklineDrawing {
	readonly values: SparkValues;
	readonly width: number;
	readonly height: number;
	readonly base: number;
	readonly spots: SparkSpots;
}

export const SparklineContext: Context<SparklineDrawing | null> = createContext<SparklineDrawing | null>(null);

export function useSparkline(): SparklineDrawing {
	const drawn = useContext(SparklineContext);
	if (!drawn) throw new Error("a sparkline part stands outside a Sparkline");
	return drawn;
}
