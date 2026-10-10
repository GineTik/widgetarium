import { createElement as h, useMemo, useRef, useSyncExternalStore } from "react";
import type { ReactElement } from "react";
import { ModuleRegistry } from "@widgetarium/core/engine/module-registry.js";
import { registerPacks } from "@widgetarium/core/engine/packs.js";
import { NO_ASSISTANT } from "@widgetarium/core/engine/assistant-port.js";
import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import type { CataloguePort } from "@widgetarium/core/engine/catalogue-port.js";
import type { StudioHostPort } from "@widgetarium/core/engine/studio-host.js";
import type { StudioState } from "@widgetarium/core/engine/studio-state-port.js";
import { openApp, startOpenedProject } from "../app/widgetarium-app.js";
import type { OpenedApp, ProjectStart, StartedProject } from "../app/widgetarium-app.js";
import type { WidgetariumProject } from "../app/widgetarium-project.js";
import { browserStudioHost } from "./browser-studio-host.js";
import { browserCataloguePort } from "./catalogue/browser-catalogue-port.js";
import { STUDIO_PACKS } from "./logic/studio-pack.js";
import { StudioBand } from "./studio-band.js";
import { StudioOutlet } from "./studio-outlet.js";
import { useTakesCatalogueAsks } from "./studio-on-screen.js";
import { StudioSidebar } from "./studio-sidebar.js";
import { createStudioState } from "./studio-state.js";
import { STUDIO_WIDGETS } from "./studio-widgets.js";
import { useWritesHostInsets } from "./use-writes-host-insets.js";

export interface StartedStudio {
	readonly project: StartedProject;
	readonly studio: StudioHostPort;
	readonly assistant: AssistantPort;
	readonly catalogue: CataloguePort;
	readonly appId: string;
	readonly shellRegistry: ModuleRegistry;
	readonly state: StudioState;
}

export interface StudioStart extends ProjectStart {
	readonly studio?: StudioHostPort;
	readonly assistant?: AssistantPort;
	readonly catalogue?: CataloguePort;
	readonly appId?: string;
	readonly state?: StudioState;
}

export interface WidgetariumStudioProps {
	readonly started: StartedStudio;
}

export function startStudio(project: WidgetariumProject, start: StudioStart = {}): StartedStudio {
	registerPacks(...STUDIO_PACKS);
	return startOpenedStudio(openApp(project), start);
}

export function startOpenedStudio(opened: OpenedApp, start: StudioStart): StartedStudio {
	return {
		project: startOpenedProject(opened, start),
		studio: start.studio ?? browserStudioHost(opened.app, opened.routes),
		assistant: start.assistant ?? NO_ASSISTANT,
		catalogue: start.catalogue ?? browserCataloguePort(opened.registry),
		appId: start.appId ?? opened.app.name,
		shellRegistry: new ModuleRegistry(STUDIO_WIDGETS),
		state: start.state ?? createStudioState(),
	};
}

export function WidgetariumStudio({ started }: WidgetariumStudioProps): ReactElement {
	const { project, studio, assistant, catalogue, appId, shellRegistry, state } = started;
	const pathname = useSyncExternalStore(project.router.subscribe, project.router.pathname);
	const { view, panel } = useSyncExternalStore(state.subscribe, state.now);
	const host = useMemo(() => project.hostOf(pathname), [project, pathname]);
	const frame = useRef<HTMLDivElement | null>(null);
	useWritesHostInsets(frame, studio);
	const catalogueAsk = useTakesCatalogueAsks(frame, catalogue.requests, state);
	return h("div", { ref: frame, className: "wg-studio" }, [
		h(StudioBand, {
			key: `band ${appId}`,
			app: appId,
			registry: shellRegistry,
			host,
			studio,
			state,
		}),
		h(StudioOutlet, { key: "outlet", project, pathname, view }),
		panel === "none" ? null : h(StudioSidebar, { key: "sidebar", panel, assistant, catalogue, host, catalogueAsk }),
	]);
}
