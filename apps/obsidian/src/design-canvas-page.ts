import { createElement as h } from "react";
import type { ReactElement } from "react";
import { DESKTOP_FRAME } from "./design-canvas-shapes.js";
import type { Drawing, DrawnReference, DrawnScreen, DrawnWidget } from "./design-canvas-shapes.js";
import { PagesRegion } from "./design-pages.js";
import { ReferencesRegion } from "./design-references.js";
import { WidgetsRegion } from "./design-widgets.js";

export const WIDGETS_PAGE = "Widgets";

export interface CanvasPageProps extends Drawing {
	readonly page: string;
	readonly screens: readonly DrawnScreen[];
	readonly references: readonly DrawnReference[];
	readonly widgets: readonly DrawnWidget[];
}

export function canvasPagesOf(screens: readonly DrawnScreen[]): string[] {
	return [...screens.map((screen) => screen.name), WIDGETS_PAGE];
}

export function shownPageOf(page: string, screens: readonly DrawnScreen[]): string {
	return canvasPagesOf(screens).includes(page) ? page : (canvasPagesOf(screens)[0] ?? WIDGETS_PAGE);
}

export function regionsOfPage({ page, screens, references, widgets, registry, host }: CanvasPageProps): ReactElement[] {
	if (page === WIDGETS_PAGE) return [h(WidgetsRegion, { key: "widgets", widgets, registry, host })];
	const shown = screens.filter((screen) => screen.name === page);
	const ofPage = references.filter((reference) => reference.pages.length === 0 || reference.pages.includes(page));
	return [
		h(ReferencesRegion, { key: "references", references: ofPage }),
		h(PagesRegion, { key: "pages", screens: shown, size: DESKTOP_FRAME, registry, host }),
	];
}
