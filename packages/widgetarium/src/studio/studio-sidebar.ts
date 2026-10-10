import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ASSISTANT_NOT_AVAILABLE } from "@widgetarium/core/engine/assistant-port.js";
import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import { AssistantChat } from "./assistant/assistant-chat.js";

export interface StudioSidebarProps {
	readonly assistant: AssistantPort;
}

const SIDEBAR = "AI assistant";

export function StudioSidebar({ assistant }: StudioSidebarProps): ReactElement {
	const shown = assistant.can
		? h(AssistantChat, { port: assistant })
		: h("p", { className: "wg-studio-ai-quiet" }, ASSISTANT_NOT_AVAILABLE);
	return h(
		"aside",
		{ className: "wg-studio-sidebar", "aria-label": SIDEBAR },
		h("div", { className: "wg-root wg-studio-ai-host" }, shown),
	);
}
