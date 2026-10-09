import { z } from "zod";
import type { CollectionGateway, Row } from "@widgetarium/core/gateway/contract.js";
import { RecordRefSchema } from "@widgetarium/core/gateway/declared.js";
import { IQuery } from "@widgetarium/core/gateway/queries.js";
import {
	PageInputSchema,
	PageOf,
	filterRowsIn,
	isMatch,
	offsetOfCursor,
	pageAt,
	sortRows,
	sortRowsIn,
} from "@widgetarium/core/pack-reading.js";
import type { HandlerContext, Page } from "@widgetarium/core/pack-reading.js";

export const FolderPageInputSchema = PageInputSchema.extend({
	where: z.array(z.looseObject({})).optional(),
	sort: z.array(z.looseObject({})).optional(),
});

const NoteRowSchema = z.looseObject({
	ref: RecordRefSchema,
	path: z.string().optional(),
	name: z.string().optional(),
});

export type FolderPageInput = z.output<typeof FolderPageInputSchema>;

const WHOLE_FOLDER = Number.MAX_SAFE_INTEGER;

export class FolderPageQuery extends IQuery.input(FolderPageInputSchema).output(PageOf(NoteRowSchema)) {
	constructor(private readonly rows: CollectionGateway<unknown>) {
		super();
	}

	// TRADE-OFF: reads the whole folder per page and filters in memory; asked where through the slot is next
	async query(input: FolderPageInput, ctx: HandlerContext): Promise<Page<Row<unknown>>> {
		const listed = await this.rows.list({ limit: WHOLE_FOLDER });
		ctx.signal.throwIfAborted();
		const where = filterRowsIn(input.where);
		const kept = sortRows(
			listed.rows.filter((row) => isMatch(row, where)),
			sortRowsIn(input.sort),
		);
		const offset = offsetOfCursor(input.cursor);
		return pageAt(kept.slice(offset, offset + input.limit), offset, kept.length);
	}
}
