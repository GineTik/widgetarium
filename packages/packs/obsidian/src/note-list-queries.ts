import { z } from "zod";
import type { Query, RowsResult } from "@widgetarium/core/gateway/contract.js";
import { rowOf } from "@widgetarium/core/gateway/create.js";
import { IQuery } from "@widgetarium/core/gateway/queries.js";
import type { ImplementationPorts, VaultNote } from "@widgetarium/core/engine/packs.js";

export const TagFieldsSchema = z.object({ tag: z.string().optional() });
export const SearchFieldsSchema = z.object({ text: z.string().optional() });

export type TagFields = z.infer<typeof TagFieldsSchema>;
export type SearchFields = z.infer<typeof SearchFieldsSchema>;

type NoteRow = Record<string, unknown>;

const PAGE_UNASKED = 100;

export class TagQuery extends IQuery.returnsAny(z.array(z.looseObject({}))) {
	constructor(
		readonly fields: TagFields,
		readonly ports: ImplementationPorts,
	) {
		super();
	}

	async list(query?: Query): Promise<RowsResult<NoteRow>> {
		const tag = this.fields.tag?.trim().replace(/^#/, "") ?? "";
		if (tag === "") return { rows: [], total: 0 };
		return pageOfNotes(await this.ports.vault.notesTagged(tag), query);
	}
}

export class SearchQuery extends IQuery.returnsAny(z.array(z.looseObject({}))) {
	constructor(
		readonly fields: SearchFields,
		readonly ports: ImplementationPorts,
	) {
		super();
	}

	async list(query?: Query): Promise<RowsResult<NoteRow>> {
		const text = this.fields.text?.trim() ?? "";
		if (text === "") return { rows: [], total: 0 };
		return pageOfNotes(await this.ports.vault.notesMatching(text), query);
	}
}

function pageOfNotes(notes: readonly VaultNote[], query: Query | undefined): RowsResult<NoteRow> {
	const offset = query?.offset ?? 0;
	const rows = notes.map((note) => rowOf<NoteRow>({ ...note.props, path: note.path, name: note.name }, note.path));
	return { rows: rows.slice(offset, offset + (query?.limit ?? PAGE_UNASKED)), total: rows.length };
}
