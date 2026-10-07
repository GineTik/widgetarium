import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Job } from "@widgetarium/core/app-jobs.js";
import { DESKTOP_FRAME } from "./design-canvas-shapes.js";
import type { Drawing, DrawnReference, DrawnScreen, DrawnWidget } from "./design-canvas-shapes.js";
import { DocsRegion } from "./design-docs.js";
import type { CanvasDocs } from "./design-docs.js";
import { PlannedPageRegion, pagesBeingWorkedOn, runningJobOfPage } from "./design-job.js";
import type { JobControls } from "./design-job.js";
import { JobLine } from "./design-job-line.js";
import { PagesRegion } from "./design-pages.js";
import { ReferencesRegion } from "./design-references.js";
import type { WidgetOpener } from "./design-noted-picture.js";
import { WidgetsRegion } from "./design-widgets.js";
import { VariantSwitch, pageOfScreen, shownVariantOf } from "./design-variants.js";
import type { VariantPick } from "./design-variants.js";

export const WIDGETS_PAGE = "Widgets";
export const BRIEF_PAGE = "Brief";
export const SYSTEM_PAGE = "Design system";

export interface CanvasPageProps extends Drawing {
	readonly page: string;
	readonly screens: readonly DrawnScreen[];
	readonly references: readonly DrawnReference[];
	readonly widgets: readonly DrawnWidget[];
	readonly jobs: readonly Job[];
	readonly docs: CanvasDocs;
	readonly controls: JobControls;
	readonly opener: WidgetOpener;
	readonly pick: VariantPick;
}

export interface CanvasPagesOf {
	readonly screens: readonly DrawnScreen[];
	readonly jobs: readonly Job[];
	readonly docs: CanvasDocs;
}

export function canvasPagesOf({ screens, jobs, docs }: CanvasPagesOf): string[] {
	const drawn = [...new Set(screens.map((screen) => pageOfScreen(screen.name)))];
	const coming = pagesBeingWorkedOn(jobs).filter((page) => !drawn.includes(page));
	return [
		...(docs.brief.length > 0 ? [BRIEF_PAGE] : []),
		...drawn,
		...coming,
		...(docs.system.length > 0 ? [SYSTEM_PAGE] : []),
		WIDGETS_PAGE,
	];
}

export function shownPageOf(page: string, held: CanvasPagesOf): string {
	const pages = canvasPagesOf(held);
	if (pages.includes(page)) return page;
	return pages.find((one) => one !== BRIEF_PAGE) ?? WIDGETS_PAGE;
}

export function regionsOfPage(props: CanvasPageProps): ReactElement[] {
	const { page, screens, references, widgets, jobs, docs, controls, opener, registry, host } = props;
	if (page === WIDGETS_PAGE) return [h(WidgetsRegion, { key: "widgets", widgets, registry, host })];
	if (page === BRIEF_PAGE)
		return [
			h(DocsRegion, { key: "docs", title: BRIEF_PAGE, docs: docs.brief, host }),
			h(ReferencesRegion, { key: "references", references, opener }),
		];
	if (page === SYSTEM_PAGE) return [h(DocsRegion, { key: "docs", title: SYSTEM_PAGE, docs: docs.system, host })];
	const shown = shownVariantOf(screens, page, props.pick);
	const aside = h(VariantSwitch, { screens, page, pick: props.pick });
	const ofPage = references.filter((reference) => reference.pages.length === 0 || reference.pages.includes(page));
	const job = runningJobOfPage(jobs, page);
	const status = job ? h(JobLine, { job, controls, isInline: true }) : null;
	const pages =
		shown.length === 0 && job
			? h(PlannedPageRegion, { key: "pages", job, controls, size: DESKTOP_FRAME })
			: h(PagesRegion, { key: "pages", screens: shown, size: DESKTOP_FRAME, status, aside, registry, host });
	return [h(ReferencesRegion, { key: "references", references: ofPage, opener }), pages];
}

const CANVAS_DOCS: ReadonlySet<string> = new Set([BRIEF_PAGE, SYSTEM_PAGE, WIDGETS_PAGE]);

export function isCanvasDoc(page: string): boolean {
	return CANVAS_DOCS.has(page);
}
