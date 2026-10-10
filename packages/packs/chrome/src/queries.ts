import { z } from "zod";
import type { HostApp } from "@widgetarium/core/engine/apps-port.js";
import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import type { Query, Row, RowsResult } from "@widgetarium/core/gateway/contract.js";
import { rowOf } from "@widgetarium/core/gateway/create.js";
import { pageOf } from "@widgetarium/core/gateway/match.js";
import { IQuery } from "@widgetarium/core/gateway/queries.js";
import { APP_SHAPES, ChromeAppSchema } from "./schemas.js";
import type { AppFields, ChromeApp, NoFields } from "./schemas.js";

type OnChanged = () => void;

const ONE_PAGE = "1 page";
const PAGES = "{count} pages";
const ON_PAGE = "{pages} · on {page}";
const NO_PAGES = "No pages yet";

export class AppsQuery extends IQuery.output(z.array(ChromeAppSchema)) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async get(ref: string): Promise<Row<ChromeApp> | null> {
		return (await this.list()).rows.find((row) => row.ref === ref) ?? null;
	}

	async list(query?: Query): Promise<RowsResult<ChromeApp>> {
		const rows = (await this.ports.apps.list()).map((app) => rowOf<ChromeApp>(chromeAppOf(app), app.id));
		return { rows: pageOf(rows, query), total: rows.length };
	}

	override subscribe(changed: OnChanged): () => void {
		return this.ports.apps.subscribe(changed);
	}
}

export class CurrentAppQuery extends IQuery.output(ChromeAppSchema.optional()) {
	constructor(
		private readonly fields: AppFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async get(): Promise<ChromeApp | undefined> {
		const app = (await this.ports.apps.list()).find((held) => held.id === this.fields.app);
		return app ? chromeAppOf(app) : undefined;
	}

	override subscribe(changed: OnChanged): () => void {
		return this.ports.apps.subscribe(changed);
	}
}

export function chromeAppOf({ id, name, pages, firstPage }: HostApp): ChromeApp {
	return { id, name, shape: shapeOf(id), line: lineOf(pages, firstPage) };
}

function shapeOf(id: string): ChromeApp["shape"] {
	const sum = [...id].reduce((total, letter) => total + letter.charCodeAt(0), 0);
	return APP_SHAPES[sum % APP_SHAPES.length] ?? APP_SHAPES[0];
}

function lineOf(pages: number, firstPage: string | null): string {
	if (pages === 0) return NO_PAGES;
	const counted = pages === 1 ? ONE_PAGE : PAGES.replace("{count}", String(pages));
	return firstPage ? ON_PAGE.replace("{pages}", counted).replace("{page}", firstPage) : counted;
}
