import { createElement as h } from "react";
import type { ReactElement } from "react";
import { SPARKLINE_BAR_CORNER } from "../constants/charts";
import { cn } from "../utils/cn";
import { highlightedIndex, sparkBars } from "../utils/sparkline";
import { useSparkline } from "./sparkline-context";

export interface SparklineBarsProps {
	readonly highlight?: number | "last" | undefined;
	readonly className?: string | undefined;
}

export function SparklineBars({ highlight = "last", className: cls }: SparklineBarsProps): ReactElement {
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
