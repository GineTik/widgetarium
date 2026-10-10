import { createElement as h, useMemo, useRef, useSyncExternalStore } from "react";
import type { ReactElement } from "react";
import { ModuleRegistry } from "@widgetarium/core/engine/module-registry.js";
import { registerPacks } from "@widgetarium/core/engine/packs.js";
import type { StudioHostPort } from "@widgetarium/core/engine/studio-host.js";
import { openApp, startOpenedProject } from "../app/widgetarium-app.js";
import type { OpenedApp, ProjectStart, StartedProject } from "../app/widgetarium-app.js";
import type { WidgetariumProject } from "../app/widgetarium-project.js";
import { browserStudioHost } from "./browser-studio-host.js";
import { studioPack } from "./logic/studio-pack.js";
import { StudioBand } from "./studio-band.js";
import { StudioOutlet } from "./studio-outlet.js";
import { STUDIO_STATE } from "./studio-state.js";
import { STUDIO_WIDGETS } from "./studio-widgets.js";
import { useWritesHostInsets } from "./use-writes-host-insets.js";

export interface StartedStudio {
	readonly project: StartedProject;
	readonly studio: StudioHostPort;
	readonly appId: string;
	readonly shellRegistry: ModuleRegistry;
}

export interface StudioStart extends ProjectStart {
	readonly studio?: StudioHostPort;
	readonly appId?: string;
}

export interface WidgetariumStudioProps {
	readonly started: StartedStudio;
}

export function startStudio(project: WidgetariumProject, start: StudioStart = {}): StartedStudio {
	registerPacks(studioPack);
	return startOpenedStudio(openApp(project), start);
}

export function startOpenedStudio(opened: OpenedApp, start: StudioStart): StartedStudio {
	return {
		project: startOpenedProject(opened, start),
		studio: start.studio ?? browserStudioHost(opened.app, opened.routes),
		appId: start.appId ?? opened.app.name,
		shellRegistry: new ModuleRegistry(STUDIO_WIDGETS),
	};
}

export function WidgetariumStudio({ started }: WidgetariumStudioProps): ReactElement {
	const { project, studio, appId, shellRegistry } = started;
	const pathname = useSyncExternalStore(project.router.subscribe, project.router.pathname);
	const { view } = useSyncExternalStore(STUDIO_STATE.subscribe, STUDIO_STATE.now);
	const host = useMemo(() => project.hostOf(pathname), [project, pathname]);
	const frame = useRef<HTMLDivElement | null>(null);
	useWritesHostInsets(frame, studio);
	return h("div", { ref: frame, className: "wg-studio" }, [
		h(StudioBand, {
			key: `band ${appId}`,
			app: appId,
			registry: shellRegistry,
			host,
			studio,
		}),
		h(StudioOutlet, { key: "outlet", project, pathname, view }),
	]);
}
