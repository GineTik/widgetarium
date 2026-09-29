import { Button } from "widgetarium/kit";
import { TOTAL } from "./total-placeholder";

const SHOW_MORE = "Show {count} more";
const SHOWN_OF_ALL = "{shown} of {total}";
const COUNTED = "{total} rows";
const COUNT = "{count}";
const SHOWN = "{shown}";

export function Foot({
	shown,
	total,
	step,
	onMore,
}: {
	shown: number;
	total: number | null;
	step: number;
	onMore: () => void;
}) {
	const left = total === null ? 0 : total - shown;
	return (
		<div className="wg-list-foot">
			<span>{total === null ? COUNTED.replace(TOTAL, String(shown)) : saidCount(shown, total)}</span>
			{left <= 0 ? null : (
				<Button size="s" onClick={onMore}>
					{SHOW_MORE.replace(COUNT, String(Math.min(step, left)))}
				</Button>
			)}
		</div>
	);
}

function saidCount(shown: number, total: number): string {
	if (shown >= total) return COUNTED.replace(TOTAL, String(total));
	return SHOWN_OF_ALL.replace(SHOWN, String(shown)).replace(TOTAL, String(total));
}
