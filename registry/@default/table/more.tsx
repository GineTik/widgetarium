import { Button } from "widgetarium/kit";

const SHOW_MORE = "Show {count} more";

export function More({ left, step, onMore }: { left: number; step: number; onMore: () => void }) {
	if (left <= 0) return null;
	return (
		<Button size="s" onClick={onMore}>
			{SHOW_MORE.replace("{count}", String(Math.min(step, left)))}
		</Button>
	);
}
