import { createElement as h, useRef } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { SPARKLINE_FALLBACK_WIDTH, SPARKLINE_HEIGHT, SPARKLINE_INSET } from "../constants/charts";
import { useWidthOf } from "../hooks/use-width-of";
import { chartColorOf } from "../utils/chart-colors";
import { cn } from "../utils/cn";
import { sparkSpots, valuesOf } from "../utils/sparkline";
import type { StyleProp, TokenStyle } from "../utils/token-style";
import { SparklineContext } from "./sparkline-context";
import { SparklineLine } from "./sparkline-line";

export { SparklineArea } from "./sparkline-area";
export { SparklineBars } from "./sparkline-bars";
export { SparklineDot } from "./sparkline-dot";
export { SparklineLine } from "./sparkline-line";
export type { SparklineBarsProps } from "./sparkline-bars";
export type { SparklineDotProps } from "./sparkline-dot";
export type { SparklinePathProps } from "./sparkline-line";

export interface SparklineProps extends Omit<HTMLAttributes<HTMLSpanElement>, "color" | "style"> {
	readonly data?: unknown;
	readonly dataKey?: string | undefined;
	readonly color?: unknown;
	readonly height?: number;
	readonly label?: string | undefined;
	readonly style?: StyleProp | undefined;
}

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
}: SparklineProps): ReactElement {
	const boxRef = useRef<HTMLSpanElement>(null);
	const width = useWidthOf(boxRef) || SPARKLINE_FALLBACK_WIDTH;
	const values = valuesOf(data, dataKey);
	const inked: TokenStyle = { "--wg-kit-spark": chartColorOf(color, 0), height: `${height}px`, ...style };
	return (
		<span ref={boxRef} className={cn("wg-kit-spark", cls)} style={inked} {...props}>
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
