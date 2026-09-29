import { Button } from "widgetarium/kit";
import { Line } from "./line";
import type { Group } from "./types";

const LEFT_OUT = "{count} more — {sum} together";
const SHOW_MORE = "Show {count} more";

export function More({ left, step, onMore }: { left: Group[]; step: number; onMore: (() => void) | null }) {
	if (left.length === 0) return null;
	if (onMore === null) return <Line tone="var(--text-faint)" text={leftOutLine(left)} />;
	return (
		<Button size="s" onClick={onMore}>
			{SHOW_MORE.replace("{count}", String(Math.min(step, left.length)))}
		</Button>
	);
}

function leftOutLine(left: Group[]): string {
	const summed = left.reduce((sum, group) => sum + group.count, 0);
	return LEFT_OUT.replace("{count}", String(left.length)).replace("{sum}", String(summed));
}
