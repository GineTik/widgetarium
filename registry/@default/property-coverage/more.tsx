import { Button } from "widgetarium/kit";
import { Line } from "./line";

const LEFT_OUT = "{count} more properties";
const SHOW_MORE = "Show {count} more";

export function More({ left, step, onMore }: { left: number; step: number; onMore: (() => void) | null }) {
	if (left === 0) return null;
	if (onMore === null) return <Line tone="var(--text-faint)" text={LEFT_OUT.replace("{count}", String(left))} />;
	return (
		<Button size="s" onClick={onMore}>
			{SHOW_MORE.replace("{count}", String(Math.min(step, left)))}
		</Button>
	);
}
