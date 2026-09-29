import { Button } from "widgetarium/kit";
import { CSS } from "./style";

const CLEAR_THE_FILTER = "Clear the filter";

export function Said({
	text,
	tone,
	count,
	onClear,
}: {
	text: string;
	tone: "muted" | "error" | "faint";
	count: string | null;
	onClear: (() => void) | null;
}) {
	return (
		<div className={tone === "muted" ? "mt-said" : `mt-said mt-said-${tone}`}>
			<style>{CSS}</style>
			<p>{text}</p>
			{count === null ? null : <p>{count}</p>}
			{onClear === null ? null : (
				<Button size="s" onClick={onClear}>
					{CLEAR_THE_FILTER}
				</Button>
			)}
		</div>
	);
}
