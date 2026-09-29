import { Button } from "widgetarium/kit";

const SHOW_MORE = "Show {count} more";
const SHOWN_OF_ALL = "{shown} of {total} tracks";
const COUNTED = "{total} tracks";

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
	const counted = total === null ? COUNTED.replace("{total}", String(shown)) : saidCount(shown, total);
	const left = total === null ? 0 : total - shown;
	return (
		<div className="mt-foot">
			<span>{counted}</span>
			{left <= 0 ? null : (
				<Button size="s" onClick={onMore}>
					{SHOW_MORE.replace("{count}", String(Math.min(step, left)))}
				</Button>
			)}
		</div>
	);
}

function saidCount(shown: number, total: number): string {
	if (shown >= total) return COUNTED.replace("{total}", String(total));
	return SHOWN_OF_ALL.replace("{shown}", String(shown)).replace("{total}", String(total));
}
