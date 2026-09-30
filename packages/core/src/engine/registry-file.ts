import { registryRefusal } from "../version.js";
import { isCleanRepositoryPath, isPathInsideFolder, scopedName } from "./github.js";
import { hasStringId } from "./catalogue-index.js";
import type { Fields, IdentifiedRow } from "./catalogue-index.js";
import { isObject } from "./is-object.js";

export interface RegistryRow extends IdentifiedRow {
	readonly path: string | null;
	readonly files: readonly string[] | null;
}

export interface RegistryFile {
	readonly refusal: string | null;
	readonly name: string | null;
	readonly author: string | null;
	readonly movedTo: string | null;
	readonly rows: readonly RegistryRow[];
}

export const REGISTRY_FILE = "widgetarium-registry.json";

export function readRegistry(text: string, at: string): RegistryFile {
	const parsed = registryObjectIn(text);
	if (!parsed) return refuse(`${at} did not come back as a registry object.`);

	const refusal = registryRefusal(parsed, at);
	if (refusal) return refuse(refusal);

	const widgets = parsed["widgets"];
	if (!Array.isArray(widgets))
		return refuse(
			`${at} names no widgets list, so nothing can be read from it. A registry says which folders it serves, and an empty one says "widgets": [].`,
		);

	return {
		refusal: null,
		name: textOr(parsed["name"]),
		author: textOr(parsed["author"]),
		movedTo: movedToIn(parsed["deprecated"]),
		rows: rowsIn(widgets, parsed["scope"], at),
	};
}

function textOr(held: unknown): string | null {
	return typeof held === "string" ? held : null;
}

function movedToIn(deprecated: unknown): string | null {
	return isObject(deprecated) ? textOr(deprecated["movedTo"]) : null;
}

function registryObjectIn(text: string): Fields | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		return null;
	}
	return isObject(parsed) && !Array.isArray(parsed) ? parsed : null;
}

function identifyRow(row: unknown, scope: unknown): unknown {
	if (hasStringId(row) || typeof scope !== "string" || !isObject(row)) return row;
	const name = row["name"];
	if (typeof name !== "string" || name === "") return row;
	return { ...row, id: `${scope}/${name}` };
}

function rowsIn(widgets: readonly unknown[], scope: unknown, at: string): RegistryRow[] {
	const held: RegistryRow[] = [];
	for (const listed of widgets) {
		const row = identifyRow(listed, scope);
		if (!hasStringId(row)) continue;
		if (scopedName(row.id) === null) {
			console.error(`[widgetarium] ${at} lists "${row.id}", which is not a scoped widget id, so it was skipped`);
			continue;
		}
		const named = rowNamingAPlaceInsideItsOwnRepository(row);
		if (named) held.push(named);
		else console.error(`[widgetarium] ${at} lists "${row.id}" at a place outside the repository, so it was skipped`);
	}
	return held;
}

function rowNamingAPlaceInsideItsOwnRepository(row: IdentifiedRow): RegistryRow | null {
	const path = row["path"] ?? null;
	if (!(path === null || isCleanRepositoryPath(path))) return null;
	const files = row["files"];
	if (!(files === undefined || isFileList(files))) return null;
	return { ...row, path, files: files ?? null };
}

function isFileList(held: unknown): held is readonly string[] {
	return Array.isArray(held) && held.every(isPathInsideFolder);
}

function refuse(failure: string): RegistryFile {
	return { refusal: failure, name: null, author: null, movedTo: null, rows: [] };
}
