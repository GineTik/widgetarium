import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Said } from "./markdown.js";
import type { MarkdownHost } from "./markdown.js";
import type { KeptTurn } from "./transcript.js";
import { ToolCalls } from "./tool-calls.js";

export interface TurnProps {
	readonly turn: KeptTurn;
	readonly host: MarkdownHost | null | undefined;
	readonly live: boolean;
}

export function Turn({ turn, host, live }: TurnProps): ReactElement {
	const mine = turn.role === "user";
	return h("div", { className: mine ? "wg-ai-turn is-mine" : "wg-ai-turn" }, [
		turn.calls.length > 0 ? h(ToolCalls, { key: "tools", calls: turn.calls }) : null,
		turn.text === "" ? null : h(Said, { key: "said", text: turn.text, host: mine ? null : host, live }),
	]);
}
