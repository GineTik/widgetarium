import { Button } from "widgetarium/kit";
import type { Said } from "./types";

const CLEAR_THE_FILTER = "Clear the filter";

export function Instead({ said, onClear }: { said: Said; onClear: (() => void) | null }) {
	return (
		<div className={said.tone === "muted" ? "wg-list-said" : `wg-list-said is-${said.tone}`}>
			<p>{said.text}</p>
			{said.count === null ? null : <p>{said.count}</p>}
			{onClear === null ? null : (
				<Button size="s" onClick={onClear}>
					{CLEAR_THE_FILTER}
				</Button>
			)}
		</div>
	);
}
