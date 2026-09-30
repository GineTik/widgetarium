import { createElement as h } from "react";
import type { ReactElement, SVGProps } from "react";
import { SPARKLINE_DOT_RADIUS } from "../constants/charts";
import { cn } from "../utils/cn";
import { spotAt } from "../utils/sparkline";
import { useSparkline } from "./sparkline-context";

export interface SparklineDotProps extends Omit<SVGProps<SVGCircleElement>, "r"> {
	readonly at?: unknown;
	readonly r?: number;
}

export function SparklineDot({
	at = "last",
	r = SPARKLINE_DOT_RADIUS,
	className: cls,
	...props
}: SparklineDotProps): ReactElement | null {
	const spot = spotAt(useSparkline().spots, at);
	if (!spot) return null;
	return <circle className={cn("wg-kit-spark-dot", cls)} cx={spot.x} cy={spot.y} r={r} {...props} />;
}
