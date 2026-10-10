import { createElement as h } from "react";
import type { ReactElement } from "react";
import type {
	AssistantCall,
	AssistantTurn,
	CallFace,
	RenderMarkdown,
} from "@widgetarium/core/engine/assistant-port.js";
import { Said } from "./said.js";
import { ToolCalls } from "./tool-calls.js";

export interface TurnProps {
	readonly turn: AssistantTurn;
	readonly render: RenderMarkdown | null;
	readonly describe: (call: AssistantCall) => CallFace;
	readonly live: boolean;
}

export function Turn({ turn, render, describe, live }: TurnProps): ReactElement {
	const isMine = turn.role === "user";
	return h("div", { className: isMine ? "wg-studio-ai-turn is-mine" : "wg-studio-ai-turn" }, [
		turn.calls.length > 0 ? h(ToolCalls, { key: "tools", calls: turn.calls, describe }) : null,
		turn.text === "" ? null : h(Said, { key: "said", text: turn.text, render: isMine ? null : render, live }),
	]);
}
