import { NO_INSETS, NO_STUDIO_HOST } from "@widgetarium/core/engine/studio-host.js";
import type { ChromeInsets, HostApp, StudioHostPort } from "@widgetarium/core/engine/studio-host.js";
import type { ProjectRouteBoard, WidgetariumAppIdentity } from "@widgetarium/core/app/widgetarium-project.js";

interface ControlsOverlay extends EventTarget {
	readonly visible: boolean;
	getTitlebarAreaRect(): DOMRect;
}

const GEOMETRY_CHANGE = "geometrychange";

export function browserStudioHost(app: WidgetariumAppIdentity, routes: readonly ProjectRouteBoard[]): StudioHostPort {
	const thisApp: HostApp = { id: app.name, name: app.name, pages: routes.length, firstPage: routes[0]?.path ?? null };
	return {
		...NO_STUDIO_HOST,
		insets: overlayInsets,
		onInsets: (changed) => {
			const overlay = controlsOverlay();
			overlay?.addEventListener(GEOMETRY_CHANGE, changed);
			return () => overlay?.removeEventListener(GEOMETRY_CHANGE, changed);
		},
		apps: async () => [thisApp],
	};
}

function overlayInsets(): ChromeInsets {
	const overlay = controlsOverlay();
	if (!overlay?.visible) return NO_INSETS;
	const titlebar = overlay.getTitlebarAreaRect();
	return { left: titlebar.x, right: window.innerWidth - titlebar.x - titlebar.width };
}

function controlsOverlay(): ControlsOverlay | null {
	const overlay: unknown = Reflect.get(navigator, "windowControlsOverlay");
	return isControlsOverlay(overlay) ? overlay : null;
}

function isControlsOverlay(held: unknown): held is ControlsOverlay {
	return (
		held instanceof EventTarget &&
		typeof Reflect.get(held, "visible") === "boolean" &&
		typeof Reflect.get(held, "getTitlebarAreaRect") === "function"
	);
}
