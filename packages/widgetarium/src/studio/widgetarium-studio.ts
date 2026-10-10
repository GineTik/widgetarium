import { createElement as h, useRef, useSyncExternalStore } from "react";
import type { ReactElement } from "react";
import { ModuleRegistry } from "@widgetarium/core/engine/module-registry.js";
import { registerPacks } from "@widgetarium/core/engine/packs.js";
import type { StudioHostPort } from "@widgetarium/core/engine/studio-host.js";
import { startProject } from "../app/widgetarium-app.js";
import type { StartedProject } from "../app/widgetarium-app.js";
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
	readonly shellRegistry: ModuleRegistry;
}

export interface WidgetariumStudioProps {
	readonly started: StartedStudio;
}

export function startStudio(project: WidgetariumProject, studio?: StudioHostPort): StartedStudio {
	const started = startProject(project);
	registerPacks(studioPack);
	return {
		project: started,
		studio: studio ?? browserStudioHost(project.app, project.routes),
		shellRegistry: new ModuleRegistry(STUDIO_WIDGETS),
	};
}

export function WidgetariumStudio({ started }: WidgetariumStudioProps): ReactElement {
	const { project, studio, shellRegistry } = started;
	const pathname = useSyncExternalStore(project.router.subscribe, project.router.pathname);
	const { view } = useSyncExternalStore(STUDIO_STATE.subscribe, STUDIO_STATE.now);
	const frame = useRef<HTMLDivElement | null>(null);
	useWritesHostInsets(frame, studio);
	return h("div", { ref: frame, className: "wg-studio" }, [
		h(StudioBand, {
			key: `band ${project.app.name}`,
			app: project.app.name,
			registry: shellRegistry,
			router: project.router,
			studio,
			pathname,
		}),
		h(StudioOutlet, { key: "outlet", project, pathname, view }),
	]);
}
