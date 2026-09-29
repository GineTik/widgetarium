import { Button } from "widgetarium/kit";

const SHOW_MORE = "Show more ({rest} left)";
const REST = "{rest}";

export function MoreRow({ rest, onMore }: { rest: number; onMore: () => void }) {
	if (rest <= 0) return null;
	return (
		<div className="ffl-more">
			<Button onClick={onMore}>{SHOW_MORE.replace(REST, String(rest))}</Button>
		</div>
	);
}
