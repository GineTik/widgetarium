import { Button } from "widgetarium/kit";

const SHOW_MORE = "Show more ({rest} left)";

export function MoreRow({ rest, onMore }: { rest: number; onMore: () => void }) {
	if (rest <= 0) return null;
	return (
		<div className="flow-inflight-more">
			<Button onClick={onMore}>{SHOW_MORE.replace("{rest}", String(rest))}</Button>
		</div>
	);
}
