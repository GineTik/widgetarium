import { createContext, createElement as h, useContext, useRef } from "react";
import {
	SPARKLINE_BAR_CORNER,
	SPARKLINE_DOT_RADIUS,
	SPARKLINE_FALLBACK_WIDTH,
	SPARKLINE_HEIGHT,
	SPARKLINE_INSET,
} from "../constants/charts";
import { useWidthOf } from "../hooks/use-width-of";
import type { LooseProps } from "../types";
import { chartColorOf } from "../utils/chart-colors";
import { cn } from "../utils/cn";
import { areaPath, highlightedIndex, linePath, sparkBars, sparkSpots, spotAt, valuesOf } from "../utils/sparkline";

const SparklineContext = createContext(null);

export function Sparkline({
	data = [],
	dataKey,
	color,
	height = SPARKLINE_HEIGHT,
	label,
	className: cls,
	style,
	children,
	...props
}: LooseProps) {
	const boxRef = useRef(null);
	const width = useWidthOf(boxRef) || SPARKLINE_FALLBACK_WIDTH;
	const values = valuesOf(data, dataKey);
	return (
		<span
			ref={boxRef}
			className={cn("wg-kit-spark", cls)}
			style={{ "--wg-kit-spark": chartColorOf(color, 0), height: `${height}px`, ...style }}
			{...props}
		>
			<svg
				width={width}
				height={height}
				viewBox={`0 0 ${width} ${height}`}
				role={label ? "img" : undefined}
				aria-label={label}
				aria-hidden={label ? undefined : "true"}
			>
				<SparklineContext.Provider
					value={{ values, width, height, base: height - SPARKLINE_INSET, spots: sparkSpots(values, width, height) }}
				>
					{children ?? <SparklineLine />}
				</SparklineContext.Provider>
			</svg>
		</span>
	);
}

export function SparklineLine({ className: cls, ...props }: LooseProps) {
	const { spots } = useSparkline();
	return <path className={cn("wg-kit-spark-line", cls)} d={linePath(spots)} {...props} />;
}

export function SparklineArea({ className: cls, ...props }: LooseProps) {
	const { spots, base } = useSparkline();
	return <path className={cn("wg-kit-spark-area", cls)} d={areaPath(spots, base)} {...props} />;
}

export function SparklineBars({ highlight = "last", className: cls }: LooseProps) {
	const { values, width, height } = useSparkline();
	const marked = highlightedIndex(values, highlight);
	return (
		<g className={cn("wg-kit-spark-bars", cls)}>
			{sparkBars(values, width, height).map((bar) => (
				<rect
					key={bar.index}
					className="wg-kit-spark-bar"
					x={bar.x}
					y={bar.y}
					width={bar.width}
					height={bar.height}
					rx={SPARKLINE_BAR_CORNER}
					data-highlighted={bar.index === marked ? "" : undefined}
				/>
			))}
		</g>
	);
}

export function SparklineDot({ at = "last", r = SPARKLINE_DOT_RADIUS, className: cls, ...props }: LooseProps) {
	const spot = spotAt(useSparkline().spots, at);
	if (!spot) return null;
	return <circle className={cn("wg-kit-spark-dot", cls)} cx={spot.x} cy={spot.y} r={r} {...props} />;
}

function useSparkline() {
	const drawn = useContext(SparklineContext);
	if (!drawn) throw new Error("a sparkline part stands outside a Sparkline");
	return drawn;
}
