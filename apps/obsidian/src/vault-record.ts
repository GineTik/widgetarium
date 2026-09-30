import type { App, CachedMetadata, TFile } from "obsidian";
import { readBody, replaceBody } from "@widgetarium/core/block-writer.js";
import { typeOf } from "@widgetarium/core/engine/record-type.js";
import { valueOf } from "@widgetarium/core/gateway/match.js";
import type { SortRow } from "@widgetarium/core/gateway/contract.js";
import type { Frontmatter } from "@widgetarium/core/note-mark.js";
import { readId } from "@widgetarium/core/record-id.js";
import { frontmatterOf } from "./note-frontmatter.js";

export interface NoteAddress {
	readonly path: string;
}

export type VaultNoteRecord = {
	readonly path: string;
	readonly ref: NoteAddress;
	readonly props: Frontmatter;
	readonly id: string | null;
	readonly name: string;
	readonly type: string;
	readonly meta: { readonly created: number; readonly modified: number };
	readonly attachments: number;
	readonly body: string | undefined;
};

// TRADE-OFF: body absent on a listed record, present on a fetched one — twenty cards, no reads
export function toRecord(app: App, file: TFile, body?: string): VaultNoteRecord {
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

export async function writeBody(app: App, file: TFile, body: unknown): Promise<string | undefined> {
	const written = readBody(await app.vault.process(file, (text) => replaceBody(text, body) ?? text));
	if (written === String(body ?? "")) return written;
	console.error(`[widgetarium] body write refused: it would have moved the frontmatter of ${file.path}`);
	return undefined;
}

export function sortRecords<T>(records: T[], sort: readonly SortRow[] | null | undefined): T[] {
	const first = sort?.[0];
	if (!first) return records;
	const direction = first.dir === "desc" ? -1 : 1;
	return [...records].sort((left, right) => {
		const a = valueOf(left, first.prop);
		const b = valueOf(right, first.prop);
		const aMissing = isBlank(a);
		const bMissing = isBlank(b);
		if (aMissing || bMissing) return missingGoesLastInEitherDirection(aMissing, bMissing);
		if (a === b) return 0;
		return isLooselyAbove(a, b) ? direction : -direction;
	});
}

export function stringifyFrontmatter(props: Frontmatter): string {
	const lines = Object.entries(props).map(([key, value]) => {
		if (Array.isArray(value)) return `${key}: [${value.map((item: unknown) => JSON.stringify(item)).join(", ")}]`;
		if (typeof value === "string") return `${key}: ${JSON.stringify(value)}`;
		if (value && typeof value === "object") return stringifiedOneLevelDeep(key, value);
		return `${key}: ${String(value)}`;
	});
	return `---\n${lines.join("\n")}\n---\n`;
}

export function slugify(text: unknown): string {
	return (
		String(text ?? "Untitled")
			.replace(/[\\/:*?"<>|#^[\]]/g, "")
			.trim() || "Untitled"
	);
}

function embedsCountedByTheCache(cache: CachedMetadata | null): number {
	return (cache?.embeds ?? []).length;
}

function isBlank(value: unknown): boolean {
	return value === undefined || value === null || value === "";
}

function missingGoesLastInEitherDirection(aMissing: boolean, bMissing: boolean): number {
	if (aMissing && bMissing) return 0;
	return aMissing ? 1 : -1;
}

function isLooselyAbove(left: unknown, right: unknown): boolean {
	const a = primitiveOf(left);
	const b = primitiveOf(right);
	if (typeof a === "string" && typeof b === "string") return a > b;
	return Number(a) > Number(b);
}

function primitiveOf(held: unknown): unknown {
	return typeof held === "object" && held !== null ? String(held) : held;
}

function stringifiedOneLevelDeep(key: string, value: object): string {
	return [`${key}:`, ...Object.entries(value).map(([held, inner]) => `  ${held}: ${JSON.stringify(inner)}`)].join("\n");
}
