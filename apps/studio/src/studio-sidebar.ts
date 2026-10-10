import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import type { CataloguePort } from "@widgetarium/core/engine/catalogue-port.js";
import type { SurfaceHost } from "@widgetarium/core/surface/use-surface-shared.js";
import { AssistantPanel } from "./assistant/assistant-panel.js";
import { StudioCatalogue } from "./catalogue/studio-catalogue.js";
import type { OpenablePanel } from "@widgetarium/core/engine/studio-state-port.js";

export interface StudioSidebarProps {
	readonly panel: OpenablePanel;
	readonly assistant: AssistantPort;
	readonly catalogue: CataloguePort;
	readonly host: SurfaceHost;
	readonly catalogueAsk: number | null;
}

const SIDEBAR_LABEL: Readonly<Record<OpenablePanel, string>> = {
	assistant: "AI assistant",
	catalogue: "Widget catalogue",
};

export function StudioSidebar({ panel, assistant, catalogue, host, catalogueAsk }: StudioSidebarProps): ReactElement {
	const shown =
		panel === "catalogue"
			? h(StudioCatalogue, { port: catalogue, host, openedBy: catalogueAsk })
			: h(AssistantPanel, { assistant });
	return h("aside", { className: "wg-studio-sidebar", "aria-label": SIDEBAR_LABEL[panel], "data-panel": panel }, shown);
}
