import { z } from "zod";
import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import type { Query, Row, RowsResult } from "@widgetarium/core/gateway/contract.js";
import { rowOf } from "@widgetarium/core/gateway/create.js";
import { IQuery } from "@widgetarium/core/gateway/queries.js";
import { docPage, DOC_PAGES, pageAfter, pagesMatching } from "@widgetarium/core/docs.js";
import { DocPageRowSchema, DocPageSchema, SaidSchema } from "./schemas.js";
import type { DocPageRow, DocPageShown, KeywordFields, NoFields, PageFields, Said } from "./schemas.js";
import { EVERY_ROW, pageRows, refsIn, rowAt, textOf, valueAt } from "./query-reads.js";
import type { OnChanged } from "./query-reads.js";

const DOCS_SAID = {
	title: "Documentation",
	lead: "The plugin's own pages, one per file, shipped with the version you are running",
};

export class DocsSaidQuery extends IQuery.returns(SaidSchema) {
	constructor(
		readonly fields: NoFields,
		readonly ports: ImplementationPorts,
	) {
		super();
	}

	async get(): Promise<Said> {
		return { ...DOCS_SAID, mode: "docs", isAsking: false };
	}
}

export class DocPagesQuery extends IQuery.returns(z.array(DocPageRowSchema)) {
	constructor(
		private readonly fields: KeywordFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async get(ref: string): Promise<Row<DocPageRow> | null> {
		return rowAt(await this.list(EVERY_ROW), ref);
	}

	async list(query?: Query): Promise<RowsResult<DocPageRow>> {
		const keyword = textOf(await valueAt(this.ports, this.fields.keyword)) ?? "";
		const rows = pagesMatching(keyword).map((page) => ({ name: page.id, label: page.title, icon: page.icon }));
		return pageRows(
			rows.map((row) => rowOf<DocPageRow>(row, row.name)),
			query,
		);
	}

	override subscribe(changed: OnChanged): () => void {
		return this.ports.refs.watch(refsIn([this.fields.keyword]), changed);
	}
}

export class DocPageQuery extends IQuery.returns(DocPageSchema.nullable()) {
	constructor(
		private readonly fields: PageFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async get(): Promise<DocPageShown | null> {
		const picked = textOf(await valueAt(this.ports, this.fields.picked));
		const page = docPage(picked) ?? DOC_PAGES[0];
		if (!page) return null;
		const next = pageAfter(page.id);
		return {
			id: page.id,
			title: page.title,
			body: page.body,
			source: `docs/catalogue/${page.id}.md`,
			action: page.action ?? null,
			next: next ? { id: next.id, title: next.title } : null,
		};
	}

	override subscribe(changed: OnChanged): () => void {
		return this.ports.refs.watch(refsIn([this.fields.picked]), changed);
	}
}
