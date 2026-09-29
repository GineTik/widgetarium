import { createElement as h } from "react";
import { Line } from "./line";

export const COUNTED_CEILING = 500;
const COUNTED_FIRST = "the first {counted} of {total} counted";

export function Ceiling({
	total,
	tone,
	className,
}: {
	total: number | null | undefined;
	tone: string;
	className?: string;
}) {
	const said = countedFirstLine(total);
	if (said === null) return null;
	return <Line tone={tone} text={said} className={className} />;
}

export function countedFirstLine(total: number | null | undefined): string | null {
	if (typeof total !== "number" || total <= COUNTED_CEILING) return null;
	return COUNTED_FIRST.replace("{counted}", String(COUNTED_CEILING)).replace("{total}", String(total));
}
