import { createElement as h } from "react";
import type { ReactElement } from "react";
import { cn } from "../utils/cn";
import { areaPath } from "../utils/sparkline";
import { useSparkline } from "./sparkline-context";
import type { SparklinePathProps } from "./sparkline-line";

export function SparklineArea({ className: cls, ...props }: SparklinePathProps): ReactElement {
	const { spots, base } = useSparkline();
	return <path className={cn("wg-kit-spark-area", cls)} d={areaPath(spots, base)} {...props} />;
}
