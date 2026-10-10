import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Job } from "@widgetarium/core/app-jobs.js";
import { DESKTOP_FRAME } from "../canvas/frame-size.js";
import type { Drawing, DrawnReference, DrawnScreen, DrawnWidget } from "./design-canvas-shapes.js";
import { DocsRegion } from "./design-docs.js";
import type { CanvasDoc } from "./design-docs.js";
import { KitRegion } from "./design-kit.js";
import { PlannedPageRegion, pagesBeingWorkedOn, runningJobOfPage } from "./design-job.js";
import type { JobControls } from "./design-job.js";
import { JobLine } from "./design-job-line.js";
import { PagesRegion } from "./design-pages.js";
import { ReferencesRegion } from "./design-references.js";
import type { WidgetOpener } from "./design-noted-picture.js";
import { WidgetsRegion } from "./design-widgets.js";
import { VariantSwitch, pageOfScreen, shownVariantOf } from "./design-variants.js";
import type { VariantPick } from "./design-variants.js";

export const DOCS_PAGE = "Docs";
export const REFERENCES_PAGE = "References";
export const COMPONENTS_PAGE = "Components";

const TABS_RENAMED: Readonly<Record<string, string>> = {
	Brief: DOCS_PAGE,
	"Design system": DOCS_PAGE,
	Widgets: COMPONENTS_PAGE,
};

export interface CanvasPageProps extends Drawing {
	readonly page: string;
	readonly screens: readonly DrawnScreen[];
	readonly references: readonly DrawnReference[];
	readonly widgets: readonly DrawnWidget[];
	readonly jobs: readonly Job[];
	readonly docs: readonly CanvasDoc[];
	readonly controls: JobControls;
	readonly opener: WidgetOpener;
	readonly pick: VariantPick;
}

export interface CanvasHeld {
	readonly screens: readonly DrawnScreen[];
	readonly references: readonly DrawnReference[];
	readonly jobs: readonly Job[];
	readonly docs: readonly CanvasDoc[];
	readonly keptPage?: string;
}

export interface CanvasTabs {
	readonly leading: readonly string[];
	readonly screens: readonly string[];
	readonly trailing: readonly string[];
}

export function canvasTabsOf({ screens, references, jobs, docs, keptPage = "" }: CanvasHeld): CanvasTabs {
	const drawn = [...new Set(screens.map((screen) => pageOfScreen(screen.name)))];
	const coming = pagesBeingWorkedOn(jobs).filter((page) => !drawn.includes(page));
	const listed = [...drawn, ...coming];
	// TRADE-OFF: a page the agent deletes stays an empty tab until the person leaves it; moving them would be worse.
	const isKept = keptPage !== "" && !listed.includes(keptPage) && !(keptPage in TAB_REGIONS);
	return {
		leading: docs.length > 0 ? [DOCS_PAGE] : [],
		screens: isKept ? [...listed, keptPage] : listed,
		trailing: [...(references.length > 0 ? [REFERENCES_PAGE] : []), COMPONENTS_PAGE],
	};
}

export function canvasPagesOf(held: CanvasHeld): string[] {
	const { leading, screens, trailing } = canvasTabsOf(held);
	return [...leading, ...screens, ...trailing];
}

export function shownPageOf(page: string, held: CanvasHeld): string {
	const pages = canvasPagesOf(held);
	if (pages.includes(page)) return page;
	const renamed = TABS_RENAMED[page];
	if (renamed !== undefined && pages.includes(renamed)) return renamed;
	return pages.find((one) => one !== DOCS_PAGE) ?? COMPONENTS_PAGE;
}

type TabRegions = (props: CanvasPageProps) => ReactElement[];

const TAB_REGIONS: Readonly<Record<string, TabRegions>> = {
	[DOCS_PAGE]: ({ docs, host }) => [h(DocsRegion, { key: "docs", title: DOCS_PAGE, docs, host })],
	[REFERENCES_PAGE]: ({ references, opener }) => [h(ReferencesRegion, { key: "references", references, opener })],
	[COMPONENTS_PAGE]: ({ widgets, registry, host }) => [
		h("div", { key: "components", className: "wg-design-regions-row" }, [
			h(WidgetsRegion, { key: "widgets", widgets, registry, host }),
			h(KitRegion, { key: "kit" }),
		]),
	],
};

export function regionsOfPage(props: CanvasPageProps): ReactElement[] {
	return TAB_REGIONS[props.page]?.(props) ?? screenRegionsOf(props);
}

function screenRegionsOf(props: CanvasPageProps): ReactElement[] {
	const { page, screens, references, jobs, controls, opener, registry, host } = props;
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
