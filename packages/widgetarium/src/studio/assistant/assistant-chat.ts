import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { AssistantPort, AssistantSetup } from "@widgetarium/core/engine/assistant-port.js";
import { ReadyChat } from "./ready-chat.js";
import { useAssistantSetup } from "./use-assistant-setup.js";

export interface AssistantChatProps {
	readonly port: AssistantPort;
	readonly setup?: AssistantSetup | undefined;
}

export function AssistantChat({ port, setup }: AssistantChatProps): ReactElement {
	const read = useAssistantSetup(port, setup ?? null);
	if (read.state === "failed") return h("p", { className: "wg-studio-ai-quiet" }, read.failure);
	if (read.state === "reading") return h("div", { className: "wg-studio-ai" });
	return h(ReadyChat, { port, setup: read.setup, setupFailure: read.failure });
}
