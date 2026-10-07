import { createElement as h } from "react";
import type { ReactElement } from "react";
import { isLive, jobOfPage, pagesOfJobs } from "@widgetarium/core/app-jobs.js";
import type { Job } from "@widgetarium/core/app-jobs.js";
import { DESKTOP_FRAME } from "./design-canvas-shapes.js";
import type { Drawing, DrawnReference, DrawnScreen, DrawnWidget } from "./design-canvas-shapes.js";
import { DocsRegion } from "./design-docs.js";
import type { CanvasDocs } from "./design-docs.js";
import { PlannedPageRegion } from "./design-job.js";
import { DraftStatus } from "./design-draft-status.js";
import type { JobControls } from "./design-job.js";
import { PagesRegion } from "./design-pages.js";
import { ReferencesRegion } from "./design-references.js";
import type { WidgetOpener } from "./design-noted-picture.js";
import { WidgetsRegion } from "./design-widgets.js";

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
}

export interface CanvasPagesOf {
	readonly screens: readonly DrawnScreen[];
	readonly jobs: readonly Job[];
	readonly docs: CanvasDocs;
}

export function canvasPagesOf({ screens, jobs, docs }: CanvasPagesOf): string[] {
	const drawn = screens.map((screen) => screen.name);
	const coming = pagesOfJobs(jobs).filter((page) => !drawn.includes(page));
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
	const shown = screens.filter((screen) => screen.name === page);
	const ofPage = references.filter((reference) => reference.pages.length === 0 || reference.pages.includes(page));
	const job = jobOfPage(jobs, page);
	const draft = job && isLive(job) ? h(DraftStatus, { job, jobs, controls }) : null;
	const pages =
		shown.length === 0 && job
			? h(PlannedPageRegion, { key: "pages", job, jobs, controls, size: DESKTOP_FRAME })
			: h(PagesRegion, { key: "pages", screens: shown, size: DESKTOP_FRAME, draft, registry, host });
	return [h(ReferencesRegion, { key: "references", references: ofPage, opener }), pages];
}
