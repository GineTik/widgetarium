import { createElement as h } from "react";
import type { ReactElement, SVGProps } from "react";
import { cn } from "../utils/cn";
import { linePath } from "../utils/sparkline";
import { useSparkline } from "./sparkline-context";

export type SparklinePathProps = SVGProps<SVGPathElement>;

export function SparklineLine({ className: cls, ...props }: SparklinePathProps): ReactElement {
	const { spots } = useSparkline();
	return <path className={cn("wg-kit-spark-line", cls)} d={linePath(spots)} {...props} />;
}
