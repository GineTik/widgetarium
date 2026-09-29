import { countedFirstLine } from "@default/lib";
import { Line } from "./line";

export function Ceiling({ total }: { total: number | null }) {
	const said = countedFirstLine(total);
	if (said === null) return null;
	return <Line tone="var(--text-faint)" text={said} />;
}
