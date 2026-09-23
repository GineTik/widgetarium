import { registryRefusal } from "../version.js";
import { isBareFileName, isCleanRepositoryPath, scopedName } from "./github.js";
import { hasStringId } from "./catalogue-index.js";

export const REGISTRY_FILE = "widgetarium-registry.json";

export function readRegistry(text, at) {
	const parsed = registryObjectIn(text);
	if (!parsed) return refuse(`${at} did not come back as a registry object.`);

	const refusal = registryRefusal(parsed, at);
	if (refusal) return refuse(refusal);

	if (!Array.isArray(parsed.widgets))
		return refuse(
			`${at} names no widgets list, so nothing can be read from it. A registry says which folders it serves, and an empty one says "widgets": [].`,
		);

	return {
		refusal: null,
		name: typeof parsed.name === "string" ? parsed.name : null,
		author: typeof parsed.author === "string" ? parsed.author : null,
		movedTo: typeof parsed.deprecated?.movedTo === "string" ? parsed.deprecated.movedTo : null,
		rows: rowsIn(parsed, at),
	};
}

function registryObjectIn(text) {
	let parsed;
	try {
		parsed = JSON.parse(text);
	} catch {
		return null;
	}
	return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
}

function identifiedRow(row, scope) {
	if (hasStringId(row) || typeof scope !== "string" || typeof row?.name !== "string" || row.name === "") return row;
	return { ...row, id: `${scope}/${row.name}` };
}

function rowsIn(parsed, at) {
	const held = [];
	for (const listed of Array.isArray(parsed.widgets) ? parsed.widgets : []) {
		const row = identifiedRow(listed, parsed.scope);
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

function rowNamingAPlaceInsideItsOwnRepository(row) {
	if (!pathStaysInside(row)) return null;
	if (!filesAreBareNames(row)) return null;
	return { ...row, path: row.path ?? null, files: row.files ?? null };
}

const pathStaysInside = (row) => row.path === undefined || row.path === null || isCleanRepositoryPath(row.path);

const filesAreBareNames = (row) =>
	row.files === undefined || (Array.isArray(row.files) && row.files.every(isBareFileName));

function refuse(failure) {
	return { refusal: failure, name: null, author: null, movedTo: null, rows: [] };
}
