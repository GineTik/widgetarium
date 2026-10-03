import { mapCollection } from "@widgetarium/core/gateway/mapped.js";
import type { MappingSpec } from "@widgetarium/core/gateway/mapped.js";
import type { CollectionGateway, FilterRow, SortRow } from "@widgetarium/core/gateway/contract.js";
import type { NeedOfField } from "@widgetarium/core/gateway/props.js";
import type { ChosenProps } from "@widgetarium/core/gateway/resolve-needs.js";
import { narrowByRefs } from "@widgetarium/core/gateway/refs.js";
import type { RefsReader } from "@widgetarium/core/gateway/refs.js";
import { filterRowsIn, sortRowsIn } from "@widgetarium/core/engine/held-reading.js";
import type { HostFields } from "@widgetarium/core/engine/host-context.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { textIn } from "@widgetarium/core/engine/held-text.js";
import type { NotesPort } from "@widgetarium/core/engine/packs.js";
import { folderGateway } from "./folder-gateway.js";

export interface FolderReading {
	readonly where: readonly FilterRow[];
	readonly sort: readonly SortRow[];
	readonly needs: Readonly<Record<string, NeedOfField>>;
}

export interface FolderRowsAsk {
	readonly notes: NotesPort;
	readonly refs: RefsReader;
	readonly fields: HostFields;
	readonly declared: FolderReading;
	readonly requested: readonly string[];
}

export const READS_AS_IS: FolderReading = { where: [], sort: [], needs: {} };

export function folderRows({ notes, refs, fields, declared, requested }: FolderRowsAsk): CollectionGateway<unknown> {
	const path = textIn(fields.path);
	const baked = { sort: [...declared.sort, ...sortRowsIn(fields.sort)] };
	const base = folderGateway({ host: notes, path, baked, requested });
	const mapping = mappingFor(declared.needs, fields, () => notes.shapes?.readShape?.(path));
	const where = [...declared.where, ...filterRowsIn(fields.where)];
	return narrowByRefs(mapping ? mapCollection(base, mapping) : base, where, refs);
}

function mappingFor(needs: FolderReading["needs"], fields: HostFields, shapeNow: () => unknown): MappingSpec | null {
	if (Object.keys(needs).length === 0) return null;
	return { needs, chosen: { ...chosenIn(shapeNow()), ...chosenIn(fields.map) } };
}

function chosenIn(held: unknown): ChosenProps {
	if (!isObject(held)) return {};
	return Object.fromEntries(
		Object.entries(held).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
	);
}
