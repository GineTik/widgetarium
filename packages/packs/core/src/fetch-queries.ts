import { z } from "zod";
import type { Query, RowsResult } from "@widgetarium/core/gateway/contract.js";
import { rowOf } from "@widgetarium/core/gateway/create.js";
import { IQuery } from "@widgetarium/core/gateway/queries.js";
import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { fetchJson, valueAt } from "./fetch-json.js";

export const FetchFieldsSchema = z.object({
	url: z.string().optional(),
	path: z.string().optional(),
	refreshSeconds: z.number().optional(),
});

export type FetchFields = z.infer<typeof FetchFieldsSchema>;

const PAGE_UNASKED = 100;
const NOT_A_LIST = "{url} answered {path} with something that is not a list";

export class FetchValueQuery extends IQuery.returnsAny(z.unknown()) {
	constructor(
		readonly fields: FetchFields,
		readonly ports: ImplementationPorts,
	) {
		super();
	}

	override subscribe(changed: () => void): () => void {
		return refreshEvery(this.fields, changed);
	}

	async get(): Promise<unknown> {
		return valueAt(await fetchJson(this.ports, this.fields.url), this.fields.path);
	}
}

export class FetchRowsQuery extends IQuery.returnsAny(z.array(z.unknown())) {
	constructor(
		readonly fields: FetchFields,
		readonly ports: ImplementationPorts,
	) {
		super();
	}

	override subscribe(changed: () => void): () => void {
		return refreshEvery(this.fields, changed);
	}

	async list(query?: Query): Promise<RowsResult<unknown>> {
		const held = valueAt(await fetchJson(this.ports, this.fields.url), this.fields.path);
		if (!Array.isArray(held))
			throw new Error(
				NOT_A_LIST.replace("{url}", this.fields.url ?? "").replace("{path}", this.fields.path || "its body"),
			);
		const offset = query?.offset ?? 0;
		const rows = held.map((row, index) => rowOf<unknown>(row, `i${index}`));
		return { rows: rows.slice(offset, offset + (query?.limit ?? PAGE_UNASKED)), total: rows.length };
	}
}

function refreshEvery(fields: FetchFields, changed: () => void): () => void {
	const seconds = fields.refreshSeconds ?? 0;
	if (seconds <= 0) return () => {};
	const timer = setInterval(changed, seconds * 1000);
	return () => clearInterval(timer);
}
