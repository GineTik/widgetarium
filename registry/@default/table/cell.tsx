import { Icon } from "widgetarium/kit";
import { Emoji } from "widgetarium/kit/emojis";
import type { Drawn } from "./types";

const BLANK = "—";

export function Cell({ drawn }: { drawn: Drawn }) {
	const said = textIn(drawn);
	return (
		<>
			{drawn.kind === "emoji" ? <Emoji name={drawn.name} size={16} /> : null}
			{drawn.kind === "icon" ? <Icon name={drawn.name} size={15} /> : null}
			{said === "" ? null : <span className={drawn.kind === "blank" ? "wg-tbl-blank" : "wg-tbl-text"}>{said}</span>}
		</>
	);
}

function textIn(drawn: Drawn): string {
	return drawn.kind === "blank" ? BLANK : drawn.text;
}
