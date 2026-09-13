import { registryRefusal } from "../version.js";
import { isBareFileName, isCleanRepositoryPath } from "./github.js";
import { hasStringId } from "./catalogue-index.js";

export const REGISTRY_FILE = "widgetarium-registry.json";

export function readRegistry(text, at) {
	const parsed = registryObjectIn(text);
	if (!parsed) return refuse(`${at} did not come back as a registry object.`);

	const refusal = registryRefusal(parsed, at);
	if (refusal) return refuse(refusal);

	return {
		refusal: null,
		name: typeof parsed.name === "string" ? parsed.name : null,
		author: typeof parsed.author === "string" ? parsed.author : null,
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

function rowsIn(parsed, at) {
	const held = [];
	for (const row of Array.isArray(parsed.widgets) ? parsed.widgets : []) {
		if (!hasStringId(row)) continue;
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

const pathStaysInside = (row) => row.path === undefined || isCleanRepositoryPath(row.path);

const filesAreBareNames = (row) =>
	row.files === undefined || (Array.isArray(row.files) && row.files.every(isBareFileName));

function refuse(failure) {
	return { refusal: failure, name: null, author: null, rows: [] };
}
