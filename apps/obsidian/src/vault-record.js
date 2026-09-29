import { readBody, replaceBody } from "@widgetarium/core/block-writer.js";
import { typeOf } from "@widgetarium/core/engine/record-type.js";
import { valueOf } from "@widgetarium/core/gateway/match.ts";
import { readId } from "@widgetarium/core/record-id.js";
import { frontmatterOf } from "./note-frontmatter.js";

// TRADE-OFF: body absent on a listed record, present on a fetched one — twenty cards, no reads
export function toRecord(app, file, body) {
	const cache = app.metadataCache.getFileCache(file);
	const props = frontmatterOf(app, file, cache);
	return {
		path: file.path,
		ref: { path: file.path },
		props: { ...(props ?? {}) },
		id: readId(props),
		name: file.basename,
		type: typeOf(file.path),
		meta: { created: file.stat.ctime, modified: file.stat.mtime },
		attachments: embedsCountedByTheCache(cache),
		body,
	};
}

export async function writeBody(app, file, body) {
	const written = readBody(await app.vault.process(file, (text) => replaceBody(text, body) ?? text));
	if (written === String(body ?? "")) return written;
	console.error(`[widgetarium] body write refused: it would have moved the frontmatter of ${file.path}`);
	return undefined;
}

export function sortRecords(records, sort) {
	if (!sort || sort.length === 0) return records;
	const [{ prop, dir }] = sort;
	const direction = dir === "desc" ? -1 : 1;
	return [...records].sort((first, second) => {
		const a = valueOf(first, prop);
		const b = valueOf(second, prop);
		const aMissing = isBlank(a);
		const bMissing = isBlank(b);
		if (aMissing || bMissing) return missingGoesLastInEitherDirection(aMissing, bMissing);
		if (a === b) return 0;
		return a > b ? direction : -direction;
	});
}

export function stringifyFrontmatter(props) {
	const lines = Object.entries(props).map(([key, value]) => {
		if (Array.isArray(value)) return `${key}: [${value.map((item) => JSON.stringify(item)).join(", ")}]`;
		if (typeof value === "string") return `${key}: ${JSON.stringify(value)}`;
		if (value && typeof value === "object") return stringifiedOneLevelDeep(key, value);
		return `${key}: ${value}`;
	});
	return `---\n${lines.join("\n")}\n---\n`;
}

export function slugify(text) {
	return (
		String(text ?? "Untitled")
			.replace(/[\\/:*?"<>|#^[\]]/g, "")
			.trim() || "Untitled"
	);
}

function embedsCountedByTheCache(cache) {
	return (cache?.embeds ?? []).length;
}

function isBlank(value) {
	return value === undefined || value === null || value === "";
}

function missingGoesLastInEitherDirection(aMissing, bMissing) {
	if (aMissing && bMissing) return 0;
	return aMissing ? 1 : -1;
}

function stringifiedOneLevelDeep(key, value) {
	return [`${key}:`, ...Object.entries(value).map(([held, inner]) => `  ${held}: ${JSON.stringify(inner)}`)].join("\n");
}
