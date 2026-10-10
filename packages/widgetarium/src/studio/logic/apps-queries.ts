import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import type { HostApp } from "@widgetarium/core/engine/studio-host.js";
import { PageInputSchema, PageOf, offsetOfCursor, pageAt } from "@widgetarium/core/gateway/page.js";
import type { Page, PageInput } from "@widgetarium/core/gateway/page.js";
import { IQuery } from "@widgetarium/core/gateway/queries.js";
import { APP_SHAPES, DRAFT_APP, NothingAskedSchema, StudioAppSchema } from "../shared/studio-app.js";
import type { StudioApp } from "../shared/studio-app.js";
import type { AppFields, NoFields } from "./studio-fields.js";

const ONE_PAGE = "1 page";
const PAGES = "{count} pages";
const ON_PAGE = "{pages} · on {page}";
const NO_PAGES = "No pages yet";
const NOT_ON_HOST = 'the host holds no app "{app}"';

export class AppsQuery extends IQuery.input(PageInputSchema).output(PageOf(StudioAppSchema)) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async query({ cursor, limit }: PageInput): Promise<Page<StudioApp>> {
		const apps = await studioAppsOf(this.ports);
		const offset = offsetOfCursor(cursor);
		return pageAt(apps.slice(offset, offset + limit), offset, apps.length);
	}
}

export class CurrentAppQuery extends IQuery.input(NothingAskedSchema).output(StudioAppSchema) {
	constructor(
		private readonly fields: AppFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async query(): Promise<StudioApp> {
		const held = await this.ports.studio.apps();
		if (held.length === 0) return DRAFT_APP;
		const current = held.find((app) => app.id === this.fields.app);
		if (!current) throw new Error(NOT_ON_HOST.replace("{app}", this.fields.app));
		return studioAppOf(current);
	}
}

async function studioAppsOf(ports: ImplementationPorts): Promise<readonly StudioApp[]> {
	const held = await ports.studio.apps();
	return held.length === 0 ? [DRAFT_APP] : held.map(studioAppOf);
}

function studioAppOf({ id, name, pages, firstPage }: HostApp): StudioApp {
	return { id, name, shape: shapeOf(id), line: lineOf(pages, firstPage) };
}

function shapeOf(id: string): StudioApp["shape"] {
	const sum = [...id].reduce((total, letter) => total + letter.charCodeAt(0), 0);
	return APP_SHAPES[sum % APP_SHAPES.length] ?? APP_SHAPES[0];
}

function lineOf(pages: number, firstPage: string | null): string {
	if (pages === 0) return NO_PAGES;
	const counted = pages === 1 ? ONE_PAGE : PAGES.replace("{count}", String(pages));
	return firstPage ? ON_PAGE.replace("{pages}", counted).replace("{page}", firstPage) : counted;
}
