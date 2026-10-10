import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ASSISTANT_NOT_AVAILABLE } from "@widgetarium/core/engine/assistant-port.js";
import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import { AssistantChat } from "./assistant-chat.js";

export interface AssistantPanelProps {
	readonly assistant: AssistantPort;
}

export function AssistantPanel({ assistant }: AssistantPanelProps): ReactElement {
	const shown = assistant.can
		? h(AssistantChat, { port: assistant })
		: h("p", { className: "wg-studio-ai-quiet" }, ASSISTANT_NOT_AVAILABLE);
	return h("div", { className: "wg-root wg-studio-ai-host" }, shown);
}
